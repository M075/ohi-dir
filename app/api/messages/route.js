// app/api/messages/route.js
import connectDB from '@/config/database';
import Message from '@/models/Message';
import Conversation from '@/models/Conversation';
import { getSessionUser } from '@/utils/getSessionUser';

// GET - Fetch user's conversations
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

    const conversations = await Conversation.find({
      participants: sessionUser.userId
    })
      .populate('participants', 'storename image email')
      .populate('product', 'title images')
      .populate('store', 'storename image')
      .sort({ 'lastMessage.timestamp': -1 });

    // Add unread count for current user
    const conversationsWithUnread = conversations.map(conv => ({
      ...conv.toObject(),
      unreadCount: conv.getUnreadCount(sessionUser.userId),
    }));

    return new Response(JSON.stringify(conversationsWithUnread), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Conversations GET error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// POST - Start new conversation or send message
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

    const { recipientId, content, productId, storeId } = await request.json();

    if (!recipientId || !content) {
      return new Response(
        JSON.stringify({ error: 'Recipient and content are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if conversation already exists between these users
    let conversation = await Conversation.findOne({
      participants: { $all: [sessionUser.userId, recipientId] }
    });

    // Create new conversation if doesn't exist
    if (!conversation) {
      conversation = await Conversation.create({
        participants: [sessionUser.userId, recipientId],
        product: productId || undefined,
        store: storeId || undefined,
        unreadCount: new Map([[recipientId, 1]]),
      });
    } else {
      // Increment unread count for recipient
      conversation.incrementUnread(recipientId);
    }

    // Create message
    const message = await Message.create({
      conversationId: conversation._id,
      sender: sessionUser.userId,
      content,
    });

    // Update conversation's last message
    conversation.lastMessage = {
      content,
      sender: sessionUser.userId,
      timestamp: new Date(),
    };
    await conversation.save();

    // Populate conversation before sending response
    await conversation.populate('participants', 'storename image email');
    if (conversation.product) {
      await conversation.populate('product', 'title images');
    }

    return new Response(
      JSON.stringify({ 
        conversation: {
          ...conversation.toObject(),
          unreadCount: conversation.getUnreadCount(sessionUser.userId),
        },
        message 
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Messages POST error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}