import mongoose from 'mongoose';
const { Schema, model, models } = mongoose;

const SettingSchema = new Schema(
  {
    taxEnabled: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const Setting = models.Setting || model('Setting', SettingSchema);

export default Setting;
