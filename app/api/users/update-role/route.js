// app/api/users/update-role/route.js - API to update user role after social auth
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
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { role } = await request.json();

    // Validate role
    if (!['buyer', 'seller'].includes(role)) {
      return new Response(
        JSON.stringify({ error: 'Invalid role' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Update user role
    const user = await User.findByIdAndUpdate(
      sessionUser.userId,
      { 
        role,
        isOnboarded: role === 'buyer', // Buyers skip onboarding, sellers need it
        isVerifiedSeller: false,
      },
      { new: true }
    );

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: user._id,
          role: user.role,
          isOnboarded: user.isOnboarded,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Update role error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to update role' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}