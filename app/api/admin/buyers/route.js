// app/api/admin/buyers/route.js - Admin buyers API
import connectDB from '@/config/database';
import User from '@/models/User';
import Order from '@/models/Order';
import { getSessionUser } from '@/utils/getSessionUser';

export async function GET(request) {
  try {
    await connectDB();
    const sessionUser = await getSessionUser();

    if (!sessionUser?.userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const user = await User.findById(sessionUser.userId);
    if (!user?.isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Forbidden - Admin access required' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Query for buyers (users with role 'buyer' or who don't have seller role)
    let query = {
      role: { $ne: 'admin' }
    };

    if (status === 'active') {
      query.isActive = true;
    } else if (status === 'suspended') {
      query.isActive = false;
    }

    if (search) {
      query.$or = [
        { storename: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;

    const [buyers, total] = await Promise.all([
      User.find(query)
        .select('storename email image city province isActive createdAt role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(query)
    ]);

    // Get order stats for each buyer
    const buyersWithStats = await Promise.all(
      buyers.map(async (buyer) => {
        const orderStats = await Order.aggregate([
          { $match: { buyer: buyer._id } },
          { 
            $group: { 
              _id: null, 
              totalOrders: { $sum: 1 },
              totalSpent: { $sum: '$total' }
            } 
          }
        ]);

        return {
          ...buyer,
          totalOrders: orderStats[0]?.totalOrders || 0,
          totalSpent: orderStats[0]?.totalSpent || 0
        };
      })
    );

    return new Response(
      JSON.stringify({
        buyers: buyersWithStats,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Admin buyers GET error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
