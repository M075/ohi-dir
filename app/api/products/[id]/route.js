import connectDB from "@/config/database";
import Product from "@/models/Product";
import Like from "@/models/Like";
import { getSessionUser } from "@/utils/getSessionUser";
import { resolveProduct, resolveProductId, isObjectId } from "@/utils/slugify";
import { 
  uploadToImageKit, 
  deleteFromImageKit, 
  deleteMultipleFromImageKit,
  getFileIdFromUrl,
  getImagePresets
} from "@/utils/imagekit";

// GET /api/products/:id (id may be a slug, previousSlug, or ObjectId)
export const GET = async (request, { params }) => {
  try {
    await connectDB();
    const { id } = await params;
    
    if (!id) {
      return new Response(
        JSON.stringify({ message: "Product ID is required" }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const resolved = await resolveProduct(id);
    if (!resolved) {
      return new Response(
        JSON.stringify({ message: "Product Not Found" }), 
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const product = resolved.doc;

    // Check if the current user has liked this product
    let isLiked = false;
    const sessionUser = await getSessionUser();
    if (sessionUser?.userId) {
      const existingLike = await Like.findOne({
        user: sessionUser.userId,
        target: String(product._id),
        targetType: 'Product',
      }).lean();
      isLiked = !!existingLike;
    }
    
    // Add optimized image URLs for different use cases
    const productWithOptimizedImages = {
      ...product,
      optimizedImages: product.images.map(url => getImagePresets(url)),
      likes: product.likes || 0,
      isLiked,
    };
    
    return new Response(
      JSON.stringify(productWithOptimizedImages), 
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("GET Error:", error);
    return new Response(
      JSON.stringify({ message: "Something went wrong", error: error.message }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// DELETE /api/products/:id
export const DELETE = async (request, { params }) => {
  try {
    const sessionUser = await getSessionUser();
    
    if (!sessionUser?.userId) {
      return new Response(
        JSON.stringify({ message: "User ID is required" }), 
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

  await connectDB();
  const { id } = await params;
  
  if (!id) {
    return new Response(
      JSON.stringify({ message: "Product ID is required" }), 
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Accept slug, previousSlug, or ObjectId; resolve to ObjectId for DB ops.
  const productId = isObjectId(id) ? id : await resolveProductId(id);
  if (!productId) {
    return new Response(
      JSON.stringify({ message: "Product Not Found" }), 
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  }
    
  const product = await Product.findById(productId);
    
    if (!product) {
      return new Response(
        JSON.stringify({ message: "Product Not Found" }), 
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verify ownership
    if (product.owner.toString() !== sessionUser.userId) {
      return new Response(
        JSON.stringify({ message: "Unauthorized - You don't own this product" }), 
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Delete all images from ImageKit
    if (product.images && product.images.length > 0) {
      try {
        // If you stored fileIds in the product
        if (product.imageFileIds && product.imageFileIds.length > 0) {
          console.log('Deleting images by fileId:', product.imageFileIds);
          await deleteMultipleFromImageKit(product.imageFileIds);
        } else {
          // Fallback: Extract fileIds from URLs
          console.log('Deleting images by URL extraction');
          const deletePromises = product.images.map(async (imageUrl) => {
            try {
              const fileId = getFileIdFromUrl(imageUrl);
              if (fileId) {
                await deleteFromImageKit(fileId);
                console.log(`Deleted image: ${fileId}`);
              }
            } catch (error) {
              console.error(`Error deleting image ${imageUrl}:`, error);
              // Continue even if individual image deletion fails
            }
          });
          
          await Promise.all(deletePromises);
        }
        
        console.log('All images deleted successfully');
      } catch (error) {
        console.error('Error deleting images from ImageKit:', error);
        // Continue with product deletion even if image deletion fails
      }
    }

    // Delete the product from database
    await product.deleteOne();
    
    return new Response(
      JSON.stringify({ 
        message: "Product and associated images deleted successfully",
        productId: id 
      }), 
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("DELETE Error:", error);
    return new Response(
      JSON.stringify({ message: "Something went wrong", error: error.message }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// PUT /api/products/:id
export const PUT = async (request, { params }) => {
  try {
    await connectDB();
    
    const sessionUser = await getSessionUser();
    
    if (!sessionUser || !sessionUser.userId) {
      return new Response(
        JSON.stringify({ message: "Unauthorized - No valid session" }), 
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const { userId } = sessionUser;
    const { id } = await params;
    
    if (!id) {
      return new Response(
        JSON.stringify({ message: "Product ID is required" }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const formData = await request.formData();

    // Accept slug, previousSlug, or ObjectId; resolve to ObjectId for DB ops.
    const productId = isObjectId(id) ? id : await resolveProductId(id);
    if (!productId) {
      return new Response(
        JSON.stringify({ message: "Product not found" }), 
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const existingProduct = await Product.findById(productId);

    if (!existingProduct) {
      return new Response(
        JSON.stringify({ message: "Product not found" }), 
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (existingProduct.owner.toString() !== userId) {
      return new Response(
        JSON.stringify({ message: "Unauthorized - You don't own this product" }), 
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Handle removed images
    const removedImages = JSON.parse(formData.get("removedImages") || "[]");
    console.log('Images to remove:', removedImages);
    
    // Delete removed images from ImageKit
    if (removedImages.length > 0) {
      try {
        // Try to use stored fileIds first
        if (existingProduct.imageFileIds && existingProduct.imageFileIds.length > 0) {
          const fileIdsToDelete = removedImages
            .map(url => {
              const index = existingProduct.images.indexOf(url);
              return index !== -1 ? existingProduct.imageFileIds[index] : null;
            })
            .filter(Boolean);
          
          if (fileIdsToDelete.length > 0) {
            console.log('Deleting by fileId:', fileIdsToDelete);
            await deleteMultipleFromImageKit(fileIdsToDelete);
          }
        } else {
          // Fallback: Extract fileIds from URLs
          console.log('Deleting by URL extraction');
          await Promise.all(
            removedImages.map(async (imageUrl) => {
              try {
                const fileId = getFileIdFromUrl(imageUrl);
                if (fileId) {
                  await deleteFromImageKit(fileId);
                  console.log(`Deleted: ${fileId}`);
                }
              } catch (error) {
                console.error(`Error deleting ${imageUrl}:`, error);
              }
            })
          );
        }
      } catch (error) {
        console.error('Error deleting images:', error);
        // Continue with update even if deletion fails
      }
    }

    // Filter out removed images and their fileIds
    let imageUrls = [...existingProduct.images].filter(
      url => !removedImages.includes(url)
    );
    
    let imageFileIds = existingProduct.imageFileIds 
      ? [...existingProduct.imageFileIds].filter((_, index) => 
          !removedImages.includes(existingProduct.images[index])
        )
      : [];
    
    // Handle new image uploads
    const files = formData.getAll("images");
    const newFiles = files.filter((file) => file.size > 0);

    if (newFiles.length > 0) {
      console.log('Uploading new images:', newFiles.length);
      
      const uploadPromises = newFiles.map(async (file) => {
        const fileName = `product_${Date.now()}_${file.name}`;
        return await uploadToImageKit(
          file, 
          fileName,
          { 
            folder: `/user_${userId}/products`,
            resize: { width: 1200, height: 1200 } // Optional: resize large images
          }
        );
      });

      const uploadResults = await Promise.all(uploadPromises);
      
      // Add new URLs and fileIds
      const newUrls = uploadResults.map(result => result.url);
      const newFileIds = uploadResults.map(result => result.fileId);
      
      imageUrls = [...imageUrls, ...newUrls];
      imageFileIds = [...imageFileIds, ...newFileIds];
      
      console.log('New images uploaded:', newUrls.length);
    }

    // Prepare updated product data
    const productData = {
      owner: userId,
      title: formData.get("title"),
      description: formData.get("description"),
      price: formData.get("price") || 0,
      discountPercentage: formData.get("discountPercentage") || 0,
      rating: formData.get("rating") || 0,
      stock: formData.get("stock") || 0,
      brand: formData.get("brand"),
      category: formData.get("category"),
      deliveryOptions: JSON.parse(formData.get("deliveryOptions") || "{}"),
      dimensions: JSON.parse(formData.get("dimensions") || "{}"),
      weight: parseFloat(formData.get("weight")) || 0,
      warranty: formData.get("warranty"),
      shippingOrigin: formData.get("shippingOrigin"),
      featured: formData.get("featured"),
      status: formData.get("status"),
      images: imageUrls,
      imageFileIds: imageFileIds, // Store for easier deletion later
    };

    console.log('Updating product with:', {
      ...productData,
      images: `${imageUrls.length} images`,
      imageFileIds: `${imageFileIds.length} fileIds`
    });

    // If the title is changing, regenerate a unique slug and remember the old one.
    // (`findByIdAndUpdate` bypasses pre('save') hooks, so we do this manually.)
    const newTitle = formData.get("title");
    const oldTitle = existingProduct.title;
    if (newTitle && oldTitle && String(newTitle).trim() !== String(oldTitle).trim()) {
      const { toSlug, uniqueSlug } = await import('@/utils/slugify');
      const root = toSlug(newTitle);
      if (root) {
        const exists = async (candidate, excludeId) => {
          const q = { slug: candidate };
          if (excludeId) q._id = { $ne: excludeId };
          const f = await Product.findOne(q).select('_id').lean();
          return !!f;
        };
        try {
          const newSlug = await uniqueSlug(root, exists, { excludeId: productId });
          if (existingProduct.slug && existingProduct.slug !== newSlug) {
            await Product.updateOne(
              { _id: productId },
              { $addToSet: { previousSlugs: existingProduct.slug } }
            );
          }
          productData.slug = newSlug;
        } catch (err) {
          console.warn('Could not regenerate Product slug on rename:', err.message);
        }
      }
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      productData,
      { new: true, runValidators: true }
    );
    
    // Add optimized URLs to response
    const productWithOptimizedImages = {
      ...updatedProduct.toObject(),
      optimizedImages: updatedProduct.images.map(url => getImagePresets(url))
    };
    
    return new Response(
      JSON.stringify(productWithOptimizedImages), 
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Update error:", error);
    return new Response(
      JSON.stringify({ 
        message: `Failed to edit product: ${error.message}`,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};