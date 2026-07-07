import connectDB from '@/config/database';
import Product from '@/models/Product';
import User from '@/models/User';
import { isObjectId } from '@/utils/slugify';

// GET /api/products/user/[userId]   (userId may be a store slug, previousSlug, or ObjectId)
export const GET = async (request, { params }) => {
  try {
    await connectDB();

    const { userId } = await params;

    if (!userId) {
      return new Response('User ID is required', { status: 400 });
    }

    // Resolve slug/previousSlug -> ObjectId for the Product query.
    let ownerId = null;
    if (isObjectId(userId)) {
      ownerId = userId;
    } else {
      const user = await User.findOne({
        $or: [{ slug: userId }, { previousSlugs: userId }],
      })
        .select('_id')
        .lean();
      if (!user) {
        return new Response(JSON.stringify({ error: 'Store not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      ownerId = String(user._id);
    }

    // Get products that belong to the user only
    const products = await Product.find({ owner: ownerId });

    return new Response(JSON.stringify(products), {
      status: 200,
    });
  } catch (error) {
    console.log(error);
    return new Response('Something went wrong', { status: 500 });
  }
};
