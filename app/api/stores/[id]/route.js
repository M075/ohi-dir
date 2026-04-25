// app/api/stores/[id]/route.js
import connectDB from '@/config/database';
import User from '@/models/User';

export async function GET(request, { params }) {
  try {
    await connectDB();
    
    const { id } = await params;
    
    if (!id) {
      return new Response(
        JSON.stringify({ message: 'Store ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const store = await User.findById(id)
      .select('-bookmarks')
      .lean();

    if (!store) {
      return new Response(
        JSON.stringify({ message: 'Store not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify(store),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching store:', error);
    return new Response(
      JSON.stringify({ message: 'Something went wrong', error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}