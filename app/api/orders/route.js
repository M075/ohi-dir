// app/api/orders/route.js - FIXED VERSION
import connectDB from '@/config/database';
import Order from '@/models/Order';
import { getSessionUser } from '@/utils/getSessionUser';

// GET - Fetch user's orders (both as buyer and seller)
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

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'purchases' or 'sales'
    const status = searchParams.get('status');

    let query = {};
    
    // FIXED: Query by correct fields
    if (type === 'purchases') {
      query.buyer = sessionUser.userId;
    } else if (type === 'sales') {
      query.seller = sessionUser.userId;
    } else {
      // If no type specified, return both purchases and sales
      query.$or = [
        { buyer: sessionUser.userId },
        { seller: sessionUser.userId }
      ];
    }
    
    if (status) {
      query.status = status;
    }

    const orders = await Order.find(query)
      .populate('buyer', 'storename email image')
      .populate('seller', 'storename email image')
      .populate('items.product', 'title images price stock')
      .sort({ createdAt: -1 });

    return new Response(JSON.stringify(orders), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Orders GET error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}