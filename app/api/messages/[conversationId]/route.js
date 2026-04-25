// app/api/messages/[conversationId]/route.js
import connectDB from '@/config/database';
import Message from '@/models/Message';
import Conversation from '@/models/Conversation';
import { getSessionUser } from '@/utils/getSessionUser';

// GET - Fetch messages for a conversation
export async function GET(request, { params }) {
  try {
    await connectDB();
    const sessionUser = await getSessionUser();

    if (!sessionUser?.userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { conversationId } = await params;

    // Verify user is part of conversation
    const conversation = await Conversation.findById(conversationId);
    
    if (!conversation) {
      return new Response(
        JSON.stringify({ error: 'Conversation not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!conversation.participants.some(p => p.toString() === sessionUser.userId)) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Fetch messages
    const messages = await Message.find({ conversationId })
      .populate('sender', 'storename image')
      .sort({ createdAt: 1 });

    // Mark messages as read
    await Message.updateMany(
      {
        conversationId,
        sender: { $ne: sessionUser.userId },
        read: false,
      },
      {
        $set: { read: true, readAt: new Date() }
      }
    );

    // Reset unread count for current user
    conversation.resetUnread(sessionUser.userId);
    await conversation.save();

    return new Response(JSON.stringify(messages), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Messages GET error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// POST - Send message in conversation
export async function POST(request, { params }) {
  try {
    await connectDB();
    const sessionUser = await getSessionUser();

    if (!sessionUser?.userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { conversationId } = await params;
    const { content } = await request.json();

    if (!content || !content.trim()) {
      return new Response(
        JSON.stringify({ error: 'Message content is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verify conversation exists and user is participant
    const conversation = await Conversation.findById(conversationId);
    
    if (!conversation) {
      return new Response(
        JSON.stringify({ error: 'Conversation not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!conversation.participants.some(p => p.toString() === sessionUser.userId)) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create message
    const message = await Message.create({
      conversationId,
      sender: sessionUser.userId,
      content: content.trim(),
    });

    // Update conversation
    conversation.lastMessage = {
      content: content.trim(),
      sender: sessionUser.userId,
      timestamp: new Date(),
    };

    // Increment unread for other participants
    conversation.participants.forEach(participantId => {
      if (participantId.toString() !== sessionUser.userId) {
        conversation.incrementUnread(participantId);
      }
    });

    await conversation.save();

    // Populate sender info
    await message.populate('sender', 'storename image');

    return new Response(JSON.stringify(message), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Message POST error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// DELETE - Delete conversation
export async function DELETE(request, { params }) {
  try {
    await connectDB();
    const sessionUser = await getSessionUser();

    if (!sessionUser?.userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { conversationId } = await params;

    // Verify conversation exists and user is participant
    const conversation = await Conversation.findById(conversationId);
    
    if (!conversation) {
      return new Response(
        JSON.stringify({ error: 'Conversation not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!conversation.participants.some(p => p.toString() === sessionUser.userId)) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Delete all messages in conversation
    await Message.deleteMany({ conversationId });

    // Delete conversation
    await Conversation.findByIdAndDelete(conversationId);

    return new Response(
      JSON.stringify({ message: 'Conversation deleted' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Conversation DELETE error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}