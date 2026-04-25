// API route: app/api/users/upgrade-to-seller/route.js
import connectDB from '@/config/database';
import User from '@/models/User';
import { getSessionUser } from '@/utils/getSessionUser';

export async function POST(request) {
  try {
    await connectDB();
    const sessionUser = await getSessionUser();

    if (!sessionUser?.userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401 }
      );
    }

    // Update user role to seller
    const user = await User.findByIdAndUpdate(
      sessionUser.userId,
      { 
        role: 'seller',
        isVerifiedSeller: false, // Requires verification
      },
      { new: true }
    );

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404 }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        user: {
          id: user._id,
          role: user.role,
          isVerifiedSeller: user.isVerifiedSeller,
        }
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Upgrade to seller error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to upgrade account' }),
      { status: 500 }
    );
  }
}