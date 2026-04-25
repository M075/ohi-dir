// models/Conversation.js
import mongoose from 'mongoose';
const { Schema, model, models } = mongoose;

const ConversationSchema = new Schema(
  {
    participants: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    }],
    // Reference to product/store if conversation started from there
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
    },
    store: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    lastMessage: {
      content: String,
      sender: {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
      timestamp: Date,
    },
    // Track unread count per participant
    unreadCount: {
      type: Map,
      of: Number,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for finding conversations between users
ConversationSchema.index({ participants: 1 });
ConversationSchema.index({ 'lastMessage.timestamp': -1 });

// Method to get unread count for a specific user
ConversationSchema.methods.getUnreadCount = function(userId) {
  return this.unreadCount.get(userId.toString()) || 0;
};

// Method to increment unread count
ConversationSchema.methods.incrementUnread = function(userId) {
  const userIdStr = userId.toString();
  const current = this.unreadCount.get(userIdStr) || 0;
  this.unreadCount.set(userIdStr, current + 1);
};

// Method to reset unread count
ConversationSchema.methods.resetUnread = function(userId) {
  this.unreadCount.set(userId.toString(), 0);
};

const Conversation = models.Conversation || model('Conversation', ConversationSchema);

export default Conversation;