// app/api/admin/ledger/route.js — Admin ledger aggregation API
import connectDB from '@/config/database';
import User from '@/models/User';
import LedgerEntry from '@/models/LedgerEntry';
import { getSessionUser } from '@/utils/getSessionUser';

const jsonResponse = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export async function GET(request) {
  try {
    await connectDB();
    const sessionUser = await getSessionUser();

    if (!sessionUser?.userId) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const user = await User.findById(sessionUser.userId);
    if (!user?.isAdmin) {
      return jsonResponse({ error: 'Forbidden - Admin access required' }, 403);
    }

    // Aggregate totals by account
    const accountTotals = await LedgerEntry.aggregate([
      {
        $group: {
          _id: '$account',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    // Build summary object
    const summaryMap = {};
    accountTotals.forEach((item) => {
      summaryMap[item._id] = { total: item.total, count: item.count };
    });

    const summary = {
      totalCommission: summaryMap['platform_commission']?.total || 0,
      totalSellerEarnings: summaryMap['seller_earnings']?.total || 0,
      totalShippingCourierGuy: summaryMap['shipping_courier_guy']?.total || 0,
      totalShippingPudo: summaryMap['shipping_pudo']?.total || 0,
      totalShippingCollection: summaryMap['shipping_collection']?.total || 0,
      totalTax: summaryMap['tax_collected']?.total || 0,
      totalBuyerPayments: summaryMap['buyer_payment']?.total || 0,
    };

    const shippingBreakdown = {
      courierGuy: {
        count: summaryMap['shipping_courier_guy']?.count || 0,
        total: summaryMap['shipping_courier_guy']?.total || 0,
      },
      pudo: {
        count: summaryMap['shipping_pudo']?.count || 0,
        total: summaryMap['shipping_pudo']?.total || 0,
      },
      collection: {
        count: summaryMap['shipping_collection']?.count || 0,
        total: summaryMap['shipping_collection']?.total || 0,
      },
    };

    // Recent ledger entries (last 50)
    const recentEntries = await LedgerEntry.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('seller', 'storename email')
      .lean();

    return jsonResponse({
      summary,
      shippingBreakdown,
      recentEntries,
    });
  } catch (error) {
    console.error('Admin ledger GET error:', error);
    return jsonResponse({ error: error.message }, 500);
  }
}
