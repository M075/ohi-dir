// app/api/admin/stores/[id]/route.js - Admin store actions API
import connectDB from '@/config/database';
import User from '@/models/User';
import Product from '@/models/Product';
import { getSessionUser } from '@/utils/getSessionUser';

export async function PATCH(request, { params }) {
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

    const { id } = await params;
    const { action, reason } = await request.json();

    const store = await User.findById(id);
    if (!store) {
      return new Response(
        JSON.stringify({ error: 'Store not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    switch (action) {
      case 'suspend':
        store.isActive = false;
        store.suspendedAt = new Date();
        store.suspensionReason = reason || 'Suspended by admin';
        
        // Also suspend all their products
        await Product.updateMany(
          { owner: id },
          { 
            status: 'suspended',
            flagged: true,
            flagReason: 'Owner account suspended'
          }
        );
        break;
        
      case 'activate':
        store.isActive = true;
        store.suspendedAt = null;
        store.suspensionReason = null;
        
        // Reactivate their products
        await Product.updateMany(
          { owner: id, flagReason: 'Owner account suspended' },
          { 
            status: 'active',
            flagged: false,
            flagReason: null
          }
        );
        break;
        
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }

    await store.save();

    return new Response(
      JSON.stringify({ 
        store: {
          _id: store._id,
          storename: store.storename,
          email: store.email,
          isActive: store.isActive,
        },
        message: `Store ${action}d successfully`
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Admin store action error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function GET(request, { params }) {
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
        JSON.stringify({ error: 'Forbidden' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { id } = await params;
    
    const store = await User.findById(id).select('-password');
    if (!store) {
      return new Response(
        JSON.stringify({ error: 'Store not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get store stats
    const productsCount = await Product.countDocuments({ owner: id });

    return new Response(
      JSON.stringify({ 
        store: {
          ...store.toObject(),
          productsCount
        }
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Admin store GET error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
