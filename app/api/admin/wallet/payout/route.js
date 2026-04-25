// app/api/admin/wallet/payout/route.js - Admin payout processing API
import connectDB from '@/config/database';
import User from '@/models/User';
import Wallet from '@/models/Wallet';
import { getSessionUser } from '@/utils/getSessionUser';

export async function POST(request) {
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

    const { sellerId, amount } = await request.json();

    if (!sellerId || !amount) {
      return new Response(
        JSON.stringify({ error: 'Seller ID and amount are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const wallet = await Wallet.findOne({ seller: sellerId });
    if (!wallet) {
      return new Response(
        JSON.stringify({ error: 'Wallet not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (wallet.availableBalance < amount) {
      return new Response(
        JSON.stringify({ error: 'Insufficient balance' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create payout transaction
    // Note: Transaction is marked as 'processing' initially. 
    // In a production system, this should be updated to 'completed' 
    // after actual bank transfer confirmation.
    const payoutTransaction = {
      type: 'payout',
      amount: -amount, // Negative for payout
      fee: 0,
      net: -amount,
      status: 'processing',
      description: `Payout initiated by admin - awaiting bank transfer`,
      metadata: {
        processedBy: admin._id,
        initiatedAt: new Date()
      }
    };

    wallet.transactions.push(payoutTransaction);
    wallet.availableBalance -= amount;
    wallet.totalPayouts += amount;

    await wallet.save();

    // Get seller info for response
    const seller = await User.findById(sellerId).select('storename email');

    return new Response(
      JSON.stringify({
        success: true,
        message: `Payout of R ${amount.toFixed(2)} processed successfully`,
        payout: {
          sellerId,
          sellerName: seller?.storename,
          amount,
          newBalance: wallet.availableBalance
        }
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Admin payout error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
