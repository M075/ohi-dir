// app/api/stores/[id]/route.js
import connectDB from '@/config/database';
import User from '@/models/User';
import Product from '@/models/Product';
import Like from '@/models/Like';
import { getSessionUser } from '@/utils/getSessionUser';
import { resolveStore, isObjectId } from '@/utils/slugify';

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

    const resolved = await resolveStore(id);
    if (!resolved) {
      return new Response(
        JSON.stringify({ message: 'Store not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 301 redirect to the canonical slug URL when the request used a
    // non-canonical identifier (legacy ObjectId or an old previousSlug).
    const canonicalSlug = resolved.canonicalSlug;
    if (resolved.redirectNeeded && canonicalSlug && id !== canonicalSlug) {
      const url = new URL(`/stores/${canonicalSlug}`, request.url);
      return new Response(null, {
        status: 301,
        headers: {
          Location: url.toString(),
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }

    const store = resolved.doc;
    const storeId = String(store._id);

    // Get product count for the store
    const productCount = await Product.countDocuments({ owner: storeId });

    // Check if the current user has liked this store
    let isLiked = false;
    const sessionUser = await getSessionUser();
    if (sessionUser?.userId) {
      const existingLike = await Like.findOne({
        user: sessionUser.userId,
        target: storeId,
        targetType: 'Store',
      })
        .lean();
      isLiked = !!existingLike;
    }

    const enrichedStore = {
      ...store,
      likes: store.likes || 0,
      totalProducts: productCount,
      isLiked,
    };

    return new Response(
      JSON.stringify(enrichedStore),
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
