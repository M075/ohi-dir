import connectDB from "@/config/database";
import Product from "@/models/Product";
import { getSessionUser } from "@/utils/getSessionUser";
import { google } from 'googleapis';
import { getGoogleDriveClient } from '@/utils/googleDrive';


// GET /api/properties/:id
export const GET = async (request, { params }) => {
  try {
    await connectDB();

    const product = await Product.findById(params.id);

    if (!product) return new Response("Product Not Found", { status: 404 });

    return new Response(JSON.stringify(product), {
      status: 200,
    });
  } catch (error) {
    return new Response("Something went wrong", { status: 500 });
  }
};

export const DELETE = async (request, { params }) => {
  try {
    const productId = params.id;

    const sessionUser = await getSessionUser();

    if (!sessionUser || !sessionUser.userId) {
      return new Response("User ID is required", { status: 401 });
    }

    const { userId } = sessionUser;

    await connectDB();

    const product = await Product.findById(productId);

    if (!product) return new Response("Product Not Found", { status: 404 });

    // Verify ownership
    if (product.owner.toString() !== userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Delete product
    await product.deleteOne();

    return new Response("Product Deleted", { status: 200 });
  } catch (error) {
    console.log(error);
    return new Response("Something went wrong", { status: 500 });
  }
};

export const PUT = async (request, { params }) => {
  try {
    await connectDB();

    const { id } = params;
    const { userId } = await getSessionUser();
    const formData = await request.formData();

   
    // Fetch the existing product's data
    const existingProduct = await Product.findById(id);

    // Check if the user is the owner of the product
    if (existingProduct.owner.toString() !== userId) {
      return new Response("Unauthorized", { status: 401 });
    }
// Handle image uploads
// Handle image uploads
let imageUrls = [];
const files = formData.getAll('images');

if (files.length > 0) {
  const drive = await getGoogleDriveClient();
  
  for (const file of files) {
    if (file.size > 0) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const response = await drive.files.create({
        requestBody: {
          name: file.name,
          mimeType: file.type,
          // parents: [process.env.GOOGLE_DRIVE_FOLDER_ID]
        },
        media: {
          mimeType: file.type,
          // Convert buffer to readable stream
          body: require('stream').Readable.from(buffer)
        },
        fields: 'id'
      });
      
      imageUrls.push(`https://drive.google.com/uc?id=${response.data.id}`);
    }
  }
}
    // Create the productData object with updated values
    const productData = {
      owner: userId,
      title: formData.get("title"),
      description: formData.get("description"),
      price: formData.get("price") || 0,
      discountPercentage: formData.get("discountPercentage") || 0,
      rating: formData.get("rating") || 0,
      reviews: formData.get("reviews"),
      stock: formData.get("stock") || 0,
      brand: formData.get("brand"),
      category: formData.get("category"),
      deliveryOptions: JSON.parse(formData.get('deliveryOptions')),
      keywords: formData.get("keywords"),
      warranty: formData.get("warranty"),
      shippingOrigin: formData.get("shippingOrigin"),
      featured: formData.get("featured"),
      thumbnail: formData.get("thumbnail"),
      images: imageUrls.length > 0 ? imageUrls : existingProduct.images,
    };

    // Update the product with the productData object
    await Product.findByIdAndUpdate(id, productData);
    return new Response("Product Updated", { status: 200 });

  } catch (error) {
    console.error(error);
    return new Response("Failed to edit product", { status: 500 });
  }
};

// POST /api/products/[id]/review
export async function POST(request, { params }) {
  try {
    await connectDB();
    const { userId } = await getSessionUser();
    
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { id } = params;
    const { reviewer, rating, comment } = await request.json();

    const product = await Product.findById(id);
    if (!product) {
      return new Response("Product not found", { status: 404 });
    }

    product.review.push({
      reviewer,
      rating,
      comment,
      date: new Date()
    });

    // Update product rating
    const totalRatings = product.review.reduce((acc, review) => acc + review.rating, 0);
    product.rating = (totalRatings / product.review.length).toFixed(1);

    await product.save();

    return new Response(JSON.stringify(product), { status: 200 });
  } catch (error) {
    return new Response("Failed to add review", { status: 500 });
  }
}