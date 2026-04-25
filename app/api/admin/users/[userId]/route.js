// app/api/admin/users/[userId]/route.js - COMPLETE VERSION
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

    const { userId } = await params;
    const { action, reason } = await request.json();

    const user = await User.findById(userId);
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    switch (action) {
      case 'suspend':
        user.isActive = false;
        user.suspendedAt = new Date();
        user.suspensionReason = reason || 'Suspended by admin';
        
        // Also suspend all their products
        await Product.updateMany(
          { owner: userId },
          { 
            status: 'suspended',
            flagged: true,
            flagReason: 'Owner account suspended'
          }
        );
        break;
        
      case 'activate':
        user.isActive = true;
        user.suspendedAt = null;
        user.suspensionReason = null;
        
        // Reactivate their products
        await Product.updateMany(
          { owner: userId, flagReason: 'Owner account suspended' },
          { 
            status: 'active',
            flagged: false,
            flagReason: null
          }
        );
        break;
        
      case 'delete':
        // Delete all user's products first
        await Product.deleteMany({ owner: userId });
        
        // Delete user
        await User.findByIdAndDelete(userId);
        
        return new Response(
          JSON.stringify({ message: 'User and all associated data deleted' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
        
      case 'verify':
        user.isEmailVerified = true;
        break;
        
      case 'make_admin':
        if (admin.adminRole !== 'super_admin') {
          return new Response(
            JSON.stringify({ error: 'Only super admins can grant admin privileges' }),
            { status: 403, headers: { 'Content-Type': 'application/json' } }
          );
        }
        user.isAdmin = true;
        user.adminRole = 'admin';
        user.adminPermissions = ['manage_products', 'view_analytics'];
        break;
        
      case 'remove_admin':
        if (admin.adminRole !== 'super_admin') {
          return new Response(
            JSON.stringify({ error: 'Only super admins can revoke admin privileges' }),
            { status: 403, headers: { 'Content-Type': 'application/json' } }
          );
        }
        user.isAdmin = false;
        user.adminRole = null;
        user.adminPermissions = [];
        break;
        
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }

    await user.save();

    return new Response(
      JSON.stringify({ 
        user: {
          _id: user._id,
          email: user.email,
          storename: user.storename,
          isActive: user.isActive,
          suspendedAt: user.suspendedAt,
          suspensionReason: user.suspensionReason,
          isAdmin: user.isAdmin
        }
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Admin user action error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// GET - Get user details with full info
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

    const { userId } = await params;
    
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get user's products count
    const productsCount = await Product.countDocuments({ owner: userId });

    return new Response(
      JSON.stringify({ 
        user: {
          ...user.toObject(),
          productsCount
        }
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Admin user GET error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}