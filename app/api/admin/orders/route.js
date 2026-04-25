// app/api/admin/orders/route.js
import connectDB from '@/config/database';
import Order from '@/models/Order';
import User from '@/models/User';
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

    const admin = await User.findById(sessionUser.userId);
    if (!admin?.isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Forbidden - Admin access required' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const dateRange = searchParams.get('dateRange');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    let query = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    if (search) {
      // Search by order number or populate buyer/seller names
      query.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { buyerEmail: { $regex: search, $options: 'i' } },
        { sellerName: { $regex: search, $options: 'i' } },
      ];
    }

    // Date range filter
    if (dateRange && dateRange !== 'all') {
      const now = new Date();
      let startDate;
      
      switch (dateRange) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
      }
      
      if (startDate) {
        query.createdAt = { $gte: startDate };
      }
    }

    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate('buyer', 'storename email image')
        .populate('seller', 'storename email image')
        .populate('items.product', 'title images price')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments(query)
    ]);

    // Calculate stats
    const stats = {
      total: await Order.countDocuments(),
      pending: await Order.countDocuments({ status: 'pending' }),
      processing: await Order.countDocuments({ 
        status: { $in: ['confirmed', 'processing', 'shipped'] } 
      }),
      completed: await Order.countDocuments({ status: 'delivered' }),
      cancelled: await Order.countDocuments({ status: 'cancelled' }),
      totalRevenue: await Order.aggregate([
        { $match: { status: 'delivered' } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]).then(result => result[0]?.total || 0),
    };

    return new Response(
      JSON.stringify({
        orders,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        },
        stats
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Admin orders GET error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}