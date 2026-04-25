import connectDB from '@/config/database';
import User from '@/models/User';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/utils/authOptions';

// GET /api/users/[id]
export const GET = async (request, { params }) => {
  try {
    await connectDB();
    const {userId} = await params;

    if (!userId) {
      return new Response('User ID is required', { status: 400 });
    }

    const user = await User.findById(userId).select('-bookmarks');

    if (!user) {
      return new Response('User not found', { status: 404 });
    }

    return new Response(JSON.stringify(user), {
      status: 200,
    });
  } catch (error) {
    console.log(error);
    return new Response('Something went wrong', { status: 500 });
  }
};

// PUT /api/users/[id]
export const PUT = async (request, { params }) => {
  try {
    await connectDB();
    
    const session = await getServerSession(authOptions);
    if (!session) {
      return new Response('Unauthorized', { status: 401 });
    }

    const {userId} = await params;
    const data = await request.json();

    if (!userId) {
      return new Response('User ID is required', { status: 400 });
    }

    // Ensure user can only update their own profile
    if (session.user.id !== userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { ...data },
      { new: true, runValidators: true }
    );

    if (!user) {
      return new Response('User not found', { status: 404 });
    }

    return new Response(JSON.stringify(user), {
      status: 200,
    });
  } catch (error) {
    console.log(error);
    return new Response('Something went wrong', { status: 500 });
  }
};

// DELETE /api/users/[id]
export const DELETE = async (request, { params }) => {
  try {
    await connectDB();
    
    const session = await getServerSession(authOptions);
    if (!session) {
      return new Response('Unauthorized', { status: 401 });
    }

    const {userId} = await params;

    if (!userId) {
      return new Response('User ID is required', { status: 400 });
    }

    // Ensure user can only delete their own profile
    if (session.user.id !== userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    const user = await User.findByIdAndDelete(userId);

    if (!user) {
      return new Response('User not found', { status: 404 });
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    console.log(error);
    return new Response('Something went wrong', { status: 500 });
  }
};