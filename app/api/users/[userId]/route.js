import connectDB from '@/config/database';
import User from '@/models/User';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/utils/authOptions';
import {
  PUBLIC_USER_FIELDS,
  OWNER_USER_FIELDS,
  pickUpdatableUserFields,
} from '@/utils/userProjections';

// GET /api/users/[id]
export const GET = async (request, { params }) => {
  try {
    await connectDB();
    const {userId} = await params;

    if (!userId) {
      return new Response('User ID is required', { status: 400 });
    }

    // Anyone may look up a store's public profile, but contact details are
    // only returned to the account owner and to admins. This endpoint
    // previously returned the whole document to unauthenticated callers.
    const session = await getServerSession(authOptions);
    const isOwner = session?.user?.id === userId;
    const isAdmin = !!session?.user?.isAdmin;
    const projection = (isOwner || isAdmin) ? OWNER_USER_FIELDS : PUBLIC_USER_FIELDS;

    const user = await User.findById(userId).select(projection);

    if (!user) {
      return new Response('User not found', { status: 404 });
    }

    return new Response(JSON.stringify(user), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('User lookup error:', error);
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
      return new Response('Forbidden', { status: 403 });
    }

    // Only fields on the allowlist are applied. Spreading the request body
    // here let any signed-in user grant themselves `isAdmin: true` by posting
    // it at their own id.
    const update = pickUpdatableUserFields(data);

    if (!Object.keys(update).length) {
      return new Response(
        JSON.stringify({ error: 'No updatable fields supplied' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const user = await User.findByIdAndUpdate(
      userId,
      update,
      { new: true, runValidators: true }
    ).select(OWNER_USER_FIELDS);

    if (!user) {
      return new Response('User not found', { status: 404 });
    }

    return new Response(JSON.stringify(user), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
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