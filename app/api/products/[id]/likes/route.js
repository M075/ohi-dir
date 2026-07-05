// app/api/products/[id]/likes/route.js
import connectDB from '@/config/database';
import Product from '@/models/Product';
import Like from '@/models/Like';
import { getSessionUser } from '@/utils/getSessionUser';

export async function POST(request, { params }) {
  try {
    await connectDB();

    const sessionUser = await getSessionUser();
    if (!sessionUser?.userId) {
      return new Response(
        JSON.stringify({ message: 'You must be signed in to like a product' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { id } = await params;
    if (!id) {
      return new Response(
        JSON.stringify({ message: 'Product ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const product = await Product.findById(id);
    if (!product) {
      return new Response(
        JSON.stringify({ message: 'Product not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const existingLike = await Like.findOne({
      user: sessionUser.userId,
      target: id,
      targetType: 'Product',
    });

    let isLiked;
    let likes;

    if (existingLike) {
      // Unlike
      await Like.deleteOne({ _id: existingLike._id });
      product.likes = Math.max(0, (product.likes || 0) - 1);
      product.isLiked = false;
      await product.save();
      isLiked = false;
    } else {
      // Like
      await Like.create({
        user: sessionUser.userId,
        target: id,
        targetType: 'Product',
      });
      product.likes = (product.likes || 0) + 1;
      product.isLiked = true;
      await product.save();
      isLiked = true;
    }

    likes = product.likes;

    return new Response(
      JSON.stringify({ isLiked, likes }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error toggling product like:', error);
    return new Response(
      JSON.stringify({ message: 'Something went wrong', error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
