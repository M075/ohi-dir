// app/api/admin/stores/route.js - Admin stores API
import connectDB from '@/config/database';
import User from '@/models/User';
import Product from '@/models/Product';
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

    // Query for sellers (users with role 'seller' or who have products)
    let query = {
      $or: [
        { role: 'seller' },
        { isVerifiedSeller: true }
      ]
    };

    if (status === 'active') {
      query.isActive = true;
    } else if (status === 'suspended') {
      query.isActive = false;
    }

    if (search) {
      query.$and = [
        { $or: query.$or },
        {
          $or: [
            { storename: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } }
          ]
        }
      ];
      delete query.$or;
    }

    const skip = (page - 1) * limit;

    const [stores, total] = await Promise.all([
      User.find(query)
        .select('storename email image city province isActive createdAt role isVerifiedSeller')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(query)
    ]);

    // Get products count and total sales for each store
    const storesWithStats = await Promise.all(
      stores.map(async (store) => {
        const [productsCount, salesData] = await Promise.all([
          Product.countDocuments({ owner: store._id }),
          Order.aggregate([
            { $match: { seller: store._id, status: 'delivered' } },
            { $group: { _id: null, total: { $sum: '$total' } } }
          ])
        ]);

        return {
          ...store,
          productsCount,
          totalSales: salesData[0]?.total || 0
        };
      })
    );

    return new Response(
      JSON.stringify({
        stores: storesWithStats,
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
    console.error('Admin stores GET error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
