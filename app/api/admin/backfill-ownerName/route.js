import connectDB from '@/config/database';
import Product from '@/models/Product';
import User from '@/models/User';

export async function POST(request) {
  try {
    // Simple token-based protection: require ADMIN_TOKEN header (Bearer)
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
      return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    await connectDB();

    const filter = { $or: [ { ownerName: { $exists: false } }, { ownerName: '' } ] };
    const cursor = Product.find(filter).cursor();
    let total = 0;
    let updated = 0;

    for await (const prod of cursor) {
      total++;
      if (!prod.owner) continue;
      try {
        const user = await User.findById(prod.owner).select('storename');
        if (user && user.storename) {
          await Product.updateOne({ _id: prod._id }, { $set: { ownerName: user.storename } });
          updated++;
        }
      } catch (err) {
        console.warn(`Failed to update product ${prod._id}:`, err.message);
      }
    }

    return new Response(JSON.stringify({ message: 'Backfill complete', totalScanned: total, updated }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Backfill API error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
