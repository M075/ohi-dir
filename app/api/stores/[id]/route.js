// app/api/stores/[id]/route.js
import connectDB from '@/config/database';
import User from '@/models/User';
import Product from '@/models/Product';
import Like from '@/models/Like';
import { getSessionUser } from '@/utils/getSessionUser';

export async function GET(request, { params }) {
  try {
    await connectDB();

    const { id } = await params;

    if (!id) {
      return new Response(
        JSON.stringify({ message: 'Store ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const store = await User.findById(id)
      .select('-bookmarks')
      .lean();

    if (!store) {
      return new Response(
        JSON.stringify({ message: 'Store not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get product count for the store
    const productCount = await Product.countDocuments({ owner: id });

    // Check if the current user has liked this store
    let isLiked = false;
    const sessionUser = await getSessionUser();
    if (sessionUser?.userId) {
      const existingLike = await Like.findOne({
        user: sessionUser.userId,
        target: id,
        targetType: 'Store',
      })
        .lean();
      isLiked = !!existingLike;
    }

    const enrichedStore = {
      ...store,
      likes: store.likes || 0,
      totalProducts: productCount,
      isLiked,
    };

    return new Response(
      JSON.stringify(enrichedStore),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching store:', error);
    return new Response(
      JSON.stringify({ message: 'Something went wrong', error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
