// app/api/users/route.js
import connectDB from '@/config/database';
import User from '@/models/User';
import { PUBLIC_USER_FIELDS } from '@/utils/userProjections';

export async function GET(request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const province = searchParams.get('province') || '';
    const city = searchParams.get('city') || '';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build query
    let query = {};
    
    if (search) {
      query.$or = [
        { storename: { $regex: search, $options: 'i' } },
        { about: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (province) {
      query.province = province;
    }
    
    if (city) {
      query.city = { $regex: city, $options: 'i' };
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // This endpoint is public — name the fields that may go out. `.lean()`
    // returns raw BSON, so a projection is the only thing standing between a
    // caller and every field on the document.
    const stores = await User.find(query)
      .select(PUBLIC_USER_FIELDS)
      .sort(sort)
      .lean();

    return new Response(JSON.stringify(stores), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching stores:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}