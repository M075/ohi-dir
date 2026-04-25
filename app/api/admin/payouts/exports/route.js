// ============================================================================
// FILE 7: app/api/admin/payouts/export/route.js
// ============================================================================
import connectDB from '@/config/database';
import Payout from '@/models/Payout';
import User from '@/models/User';
import { getSessionUser } from '@/utils/getSessionUser';

// GET - Export payouts as CSV
export async function GET(request) {
  try {
    await connectDB();
    const sessionUser = await getSessionUser();

    // Check admin access
    const admin = await User.findById(sessionUser.userId);
    if (!admin?.isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let query = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    if (startDate || endDate) {
      query.requestedAt = {};
      if (startDate) query.requestedAt.$gte = new Date(startDate);
      if (endDate) query.requestedAt.$lte = new Date(endDate);
    }

    const payouts = await Payout.find(query)
      .populate('seller', 'storename email')
      .sort({ requestedAt: -1 });

    // Generate CSV
    const csvHeader = 'Reference,Seller,Email,Amount,Status,Requested,Processed,Completed,Bank,Account,Branch Code\n';
    
    const csvRows = payouts.map(payout => {
      return [
        payout.referenceNumber,
        payout.seller.storename,
        payout.seller.email,
        payout.amount.toFixed(2),
        payout.status,
        payout.requestedAt.toISOString(),
        payout.processedAt?.toISOString() || '',
        payout.completedAt?.toISOString() || '',
        payout.bankDetails.bankName || '',
        payout.bankDetails.accountNumber || '',
        payout.bankDetails.branchCode || '',
      ].join(',');
    }).join('\n');

    const csv = csvHeader + csvRows;

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="payouts-${new Date().toISOString().split('T')[0]}.csv"`,
      }
    });

  } catch (error) {
    console.error('Export payouts error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}