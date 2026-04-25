// app/api/admin/products/route.js - FIXED VERSION
import connectDB from '@/config/database';
import Product from '@/models/Product';
import User from '@/models/User';
import { getSessionUser } from '@/utils/getSessionUser';
import mongoose from 'mongoose';

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
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const category = searchParams.get('category');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    let query = {};

    // FIXED: Better status filtering logic
    if (status && status !== 'all') {
      if (status === 'flagged') {
        query.flagged = true;
      } else if (status === 'active') {
        // Products that are NOT flagged and NOT suspended
        query.flagged = { $ne: true };
        query.status = { $ne: 'suspended' };
      } else if (status === 'suspended') {
        query.status = 'suspended';
      } else if (status === 'lowstock') {
        query.stock = { $lt: 10 };
      }
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { ownerName: { $regex: search, $options: 'i' } }
      ];
    }

    if (category && category !== 'all') {
      query.category = category;
    }

    console.log('Admin Products Query:', JSON.stringify(query, null, 2));

    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      Product.find(query)
        .populate('owner', 'storename email image')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(query)
    ]);

    console.log(`Found ${products.length} products out of ${total} total`);

    return new Response(
      JSON.stringify({
        products,
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
    console.error('Admin products GET error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}