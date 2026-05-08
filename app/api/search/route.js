import connectDB from '@/config/database';
import Product from '@/models/Product';
import User from '@/models/User';

export const GET = async (request) => {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim() || '';
    const type = searchParams.get('type') || 'all'; // 'products', 'sellers', or 'all'
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    if (!q) {
      return new Response(JSON.stringify({ products: [], sellers: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const results = { products: [], sellers: [] };

    // Escape special regex characters
    const escapedQuery = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    if (type === 'all' || type === 'products') {
      const productQuery = {
        $or: [
          { title: { $regex: escapedQuery, $options: 'i' } },
          { description: { $regex: escapedQuery, $options: 'i' } },
          { brand: { $regex: escapedQuery, $options: 'i' } },
          { category: { $regex: escapedQuery, $options: 'i' } },
          { ownerName: { $regex: escapedQuery, $options: 'i' } },
        ],
      };

      const products = await Product.find(productQuery)
        .select('title price discountPercentage thumbnail images category ownerName brand rating stock')
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      results.products = products.map((product) => ({
        ...product,
        _id: product._id.toString(),
      }));
    }

    if (type === 'all' || type === 'sellers') {
      const sellerQuery = {
        role: { $in: ['seller'] },
        $or: [
          { storename: { $regex: escapedQuery, $options: 'i' } },
          { about: { $regex: escapedQuery, $options: 'i' } },
          { city: { $regex: escapedQuery, $options: 'i' } },
          { province: { $regex: escapedQuery, $options: 'i' } },
        ],
      };

      const sellers = await User.find(sellerQuery)
        .select('storename image about city province isVerifiedSeller role')
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      results.sellers = sellers.map((seller) => ({
        ...seller,
        _id: seller._id.toString(),
      }));
    }

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Search API error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};