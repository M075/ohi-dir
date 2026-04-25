// app/api/messages/start-conversation/route.js
import connectDB from '@/config/database';
import Conversation from '@/models/Conversation';
import { getSessionUser } from '@/utils/getSessionUser';

// POST - Create or get existing conversation
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

    const { recipientId, productId, storeId } = await request.json();

    if (!recipientId) {
      return new Response(
        JSON.stringify({ error: 'Recipient ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Can't message yourself
    if (recipientId === sessionUser.userId) {
      return new Response(
        JSON.stringify({ error: 'Cannot start conversation with yourself' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Build query to find existing conversation
    const query = {
      participants: { $all: [sessionUser.userId, recipientId] },
    };

    // If productId is provided, look for conversation about that product
    if (productId) {
      query.product = productId;
    }

    // Check for existing conversation
    let conversation = await Conversation.findOne(query);

    // If no conversation exists, create a new one
    if (!conversation) {
      conversation = await Conversation.create({
        participants: [sessionUser.userId, recipientId],
        product: productId || undefined,
        store: storeId || undefined,
        unreadCounts: new Map([
          [sessionUser.userId, 0],
          [recipientId, 0],
        ]),
      });
    }

    return new Response(
      JSON.stringify({ 
        conversationId: conversation._id,
        isNew: !conversation.lastMessage 
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Start conversation error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
