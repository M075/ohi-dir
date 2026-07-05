// app/api/stores/route.js
import connectDB from '@/config/database';
import User from '@/models/User';
import Product from '@/models/Product';
import Like from '@/models/Like';
import { getSessionUser } from '@/utils/getSessionUser';

export async function GET(request) {
  try {
    await connectDB();

    const sessionUser = await getSessionUser();
    const currentUserId = sessionUser?.userId || null;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const province = searchParams.get('province') || '';
    const city = searchParams.get('city') || '';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build query - Only include sellers and admins, exclude buyers
    let query = {
      role: { $in: ['seller'] }
    };

    if (search) {
      query.$or = [
        { storename: { $regex: search, $options: 'i' } },
        { about: { $regex: search, $options: 'i' } }
      ];
    }

    if (province) {
      query.province = province;
    }

    if (city) {
      query.city = { $regex: city, $options: 'i' };
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const stores = await User.find(query)
      .select('-bookmarks -email') // Exclude sensitive data
      .sort(sort)
      .lean();

    if (stores.length === 0) {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const storeIds = stores.map(store => store._id);

    // Get product counts per store
    const productCounts = await Product.aggregate([
      { $match: { owner: { $in: storeIds } } },
      { $group: { _id: '$owner', count: { $sum: 1 } } }
    ]);
    const productCountMap = new Map(
      productCounts.map(pc => [pc._id.toString(), pc.count])
    );

    // Get the current user's liked stores so we can set isLiked per store
    let likedStoreIds = new Set();
    if (currentUserId) {
      const userLikes = await Like.find({
        user: currentUserId,
        targetType: 'Store',
        target: { $in: storeIds }
      })
        .select('target')
        .lean();
      likedStoreIds = new Set(userLikes.map(like => like.target.toString()));
    }

    const enrichedStores = stores.map(store => {
      const storeIdStr = store._id.toString();
      return {
        ...store,
        likes: store.likes || 0,
        totalProducts: productCountMap.get(storeIdStr) || 0,
        isLiked: likedStoreIds.has(storeIdStr),
      };
    });

    return new Response(JSON.stringify(enrichedStores), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching stores:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
