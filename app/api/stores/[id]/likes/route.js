// app/api/stores/[id]/likes/route.js
import connectDB from '@/config/database';
import User from '@/models/User';
import Like from '@/models/Like';
import { getSessionUser } from '@/utils/getSessionUser';

export async function POST(request, { params }) {
  try {
    await connectDB();

    const sessionUser = await getSessionUser();
    if (!sessionUser?.userId) {
      return new Response(
        JSON.stringify({ message: 'You must be signed in to like a store' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { id } = await params;
    if (!id) {
      return new Response(
        JSON.stringify({ message: 'Store ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const store = await User.findById(id);
    if (!store) {
      return new Response(
        JSON.stringify({ message: 'Store not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const existingLike = await Like.findOne({
      user: sessionUser.userId,
      target: id,
      targetType: 'Store',
    });

    let isLiked;
    let likes;

    if (existingLike) {
      // Unlike
      await Like.deleteOne({ _id: existingLike._id });
      store.likes = Math.max(0, (store.likes || 0) - 1);
      store.isLiked = false;
      await store.save();
      isLiked = false;
    } else {
      // Like
      await Like.create({
        user: sessionUser.userId,
        target: id,
        targetType: 'Store',
      });
      store.likes = (store.likes || 0) + 1;
      store.isLiked = true;
      await store.save();
      isLiked = true;
    }

    likes = store.likes;

    return new Response(
      JSON.stringify({ isLiked, likes }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error toggling store like:', error);
    return new Response(
      JSON.stringify({ message: 'Something went wrong', error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
