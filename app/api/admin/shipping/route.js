

// app/api/admin/shipping/route.js
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

    const admin = await User.findById(sessionUser.userId);
    if (!admin?.isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Forbidden' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let query = {};
    
    if (status) {
      query.status = status;
    } else {
      // Default to orders that need shipping
      query.status = { $in: ['confirmed', 'processing', 'shipped', 'in_transit'] };
    }

    const shipments = await Order.find(query)
      .populate('buyer', 'storename email phone')
      .populate('seller', 'storename email phone')
      .sort({ createdAt: -1 })
      .limit(100);

    // Shipping statistics
    const stats = await Order.aggregate([
      {
        $match: {
          status: { $in: ['confirmed', 'processing', 'shipped', 'in_transit', 'delivered'] }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    return new Response(
      JSON.stringify({
        shipments,
        stats
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Admin shipping GET error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}