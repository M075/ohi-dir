// app/api/favourites/route.js
import connectDB from '@/config/database';
import User from '@/models/User';
import Product from '@/models/Product';
import Like from '@/models/Like';
import { getSessionUser } from '@/utils/getSessionUser';
import { getImagePresets } from '@/utils/imagekit';

export async function GET(request) {
  try {
    await connectDB();

    const sessionUser = await getSessionUser();
    if (!sessionUser?.userId) {
      return new Response(
        JSON.stringify({ message: 'You must be signed in to view favourites' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Fetch all likes by the current user
    const likes = await Like.find({ user: sessionUser.userId }).lean();

    const storeIds = likes
      .filter(l => l.targetType === 'Store')
      .map(l => l.target);
    const productIds = likes
      .filter(l => l.targetType === 'Product')
      .map(l => l.target);

    // Fetch liked stores
    let likedStores = [];
    if (storeIds.length > 0) {
      const stores = await User.find({ _id: { $in: storeIds } })
        .select('-bookmarks -email')
        .lean();
      likedStores = stores.map(store => ({
        ...store,
        isLiked: true,
      }));
    }

    // Fetch liked products
    let likedProducts = [];
    if (productIds.length > 0) {
      const products = await Product.find({ _id: { $in: productIds } }).lean();
      likedProducts = products.map(product => ({
        ...product,
        optimizedImages: product.images?.map(url => getImagePresets(url)) || [],
        isLiked: true,
      }));
    }

    return new Response(
      JSON.stringify({
        stores: likedStores,
        products: likedProducts,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching favourites:', error);
    return new Response(
      JSON.stringify({ message: 'Something went wrong', error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
