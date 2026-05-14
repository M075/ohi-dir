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
  },
  {
    timestamps: true,
  }
);

const Setting = models.Setting || model('Setting', SettingSchema);

export default Setting;
