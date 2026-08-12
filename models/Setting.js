import mongoose from 'mongoose';
const { Schema, model, models } = mongoose;

const SettingSchema = new Schema(
  {
    taxEnabled: {
      type: Boolean,
      default: true,
    },
    commissionPercentage: {
      type: Number,
      default: 15,
      min: 0,
      max: 100,
    },
    // When the abandoned-checkout sweep last ran. Used to throttle the
    // opportunistic expiry that runs off organic traffic, since Vercel's Hobby
    // plan only permits a once-daily cron. See utils/expirePendingOrders.js.
    lastOrderExpirySweepAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const Setting = models.Setting || model('Setting', SettingSchema);

export default Setting;
