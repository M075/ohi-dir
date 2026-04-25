import connectDB from '@/config/database';
import Product from '@/models/Product';

// GET /api/products/user/[userId]
export const GET = async (request, { params }) => {
  try {
    await connectDB();

    // Get user ID from URL which is the folder name /api/products/user/[userId]
    const { userId } = await params;

    if (!userId) {
      return new Response('User ID is required', { status: 400 });
    }

    // Get products tha belong to the user only
    const products = await Product.find({ owner: userId });

    return new Response(JSON.stringify(products), {
      status: 200,
    });
  } catch (error) {
    console.log(error);
    return new Response('Something went wrong', { status: 500 });
  }
};
