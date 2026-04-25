// app/api/admin/dashboard/route.js
import connectDB from '@/config/database';
import User from '@/models/User';
import Product from '@/models/Product';
import Order from '@/models/Order';
import { getSessionUser } from '@/utils/getSessionUser';

export async function GET(request) {
  try {
    await connectDB();
    const sessionUser = await getSessionUser();

    // Check admin privileges
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

    // Gather statistics
    const [
      totalUsers,
      totalProducts,
      totalOrders,
      recentOrders,
      recentUsers,
      flaggedProducts
    ] = await Promise.all([
      User.countDocuments(),
      Product.countDocuments(),
      Order.countDocuments(),
      Order.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('buyer', 'storename email')
        .populate('seller', 'storename'),
      User.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .select('storename email image isActive createdAt'),
      Product.find({ flagged: true })
        .limit(20)
        .select('title images flagReason')
    ]);

    const totalRevenue = await Order.aggregate([
      { $match: { status: 'delivered' } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);

    const activeStores = await User.countDocuments({ 
      isActive: true,
      storename: { $exists: true, $ne: '' }
    });

    const stats = {
      totalUsers,
      totalSellers: activeStores,
      totalBuyers: totalUsers - activeStores,
      totalProducts,
      totalOrders,
      pendingOrders: await Order.countDocuments({ status: 'pending' }),
      totalRevenue: totalRevenue[0]?.total || 0,
      activeStores,
    };

    return new Response(
      JSON.stringify({ 
        stats, 
        recentOrders, 
        recentUsers,
        flaggedProducts 
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Admin dashboard error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

