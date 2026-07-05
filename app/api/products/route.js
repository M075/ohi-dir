import connectDB from '@/config/database';
import Product from '@/models/Product';
import User from '@/models/User';
import Like from '@/models/Like';
import { getSessionUser } from '@/utils/getSessionUser';
import { uploadMultipleToImageKit, getImagePresets } from '@/utils/imagekit';

export const GET = async (request) => {
  try {
    await connectDB();
    const products = await Product.find().lean();

    const sessionUser = await getSessionUser();
    const currentUserId = sessionUser?.userId || null;

    let likedProductIds = new Set();
    if (currentUserId && products.length > 0) {
      const productIds = products.map(p => p._id);
      const userLikes = await Like.find({
        user: currentUserId,
        targetType: 'Product',
        target: { $in: productIds },
      })
        .select('target')
        .lean();
      likedProductIds = new Set(userLikes.map(like => like.target.toString()));
    }

    // Optionally add optimized URLs and like status to response
    const productsWithOptimizedImages = products.map(product => ({
      ...product,
      optimizedImages: product.images.map(url => getImagePresets(url)),
      likes: product.likes || 0,
      isLiked: likedProductIds.has(product._id.toString()),
    }));

    return new Response(JSON.stringify(productsWithOptimizedImages), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const POST = async (request) => {
  try {
    await connectDB();
    const sessionUser = await getSessionUser();

    if (!sessionUser?.userId) {
      return new Response('User ID is required', { status: 401 });
    }

    const formData = await request.formData();
    const imageFiles = formData.getAll('images').filter(image => image.name !== '');
    
    console.log('Processing images:', imageFiles.map(f => ({
      name: f.name,
      type: f.type,
      size: f.size
    })));

    // Upload all images to ImageKit (batch upload, direct buffer)
    const uploadResults = await uploadMultipleToImageKit(
      imageFiles,
      `user_${sessionUser.userId}/products`
    );
    
    // Extract URLs from upload results
    const imageUrls = uploadResults.map(result => result.url);
    
    console.log('Upload successful:', imageUrls);

    const productData = {
      owner: sessionUser.userId,
      title: formData.get('title'),
      description: formData.get('description'),
      price: formData.get('price') || 0,
      stock: formData.get('stock') || 0,
      brand: formData.get('brand'),
      category: formData.get('category'),
      status: formData.get('status'),
      deliveryOptions: JSON.parse(formData.get('deliveryOptions')),
      dimensions: JSON.parse(formData.get('dimensions')),
      weight: parseFloat(formData.get('weight')) || 0,
      featured: formData.get('featured'),
      rating: formData.get('rating') || 0,
      warranty: formData.get('warranty'),
      shippingOrigin: formData.get('shippingOrigin'),
      review: formData.getAll('review').map(review => JSON.parse(review)),
      discountPercentage: formData.get('discountPercentage') || 0,
      images: imageUrls,
      // Store file IDs for easier deletion later
      imageFileIds: uploadResults.map(result => result.fileId),
    };

    console.log('Creating product with data:', {
      ...productData,
      images: `${imageUrls.length} images`
    });

    // fetch user storename to denormalize into the product for fast reads
    try {
      const user = await User.findById(sessionUser.userId).select('storename');
      if (user && user.storename) productData.ownerName = user.storename;
    } catch (err) {
      console.warn('Could not fetch user storename for product creation', err);
    }

    const newProduct = new Product(productData);
    await newProduct.save();

    return new Response(JSON.stringify({ 
      success: true,
      productId: newProduct._id,
      message: 'Product created successfully'
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error creating product:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
     

   