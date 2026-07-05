import { Schema, model, models } from 'mongoose';

const LikeSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    target: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    targetType: {
      type: String,
      enum: ['Store', 'Product'],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

LikeSchema.index({ user: 1, target: 1, targetType: 1 }, { unique: true });

const Like = models.Like || model('Like', LikeSchema);

export default Like;