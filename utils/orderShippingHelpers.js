// utils/orderShippingHelpers.js
import mongoose from 'mongoose';

export const DEFAULT_PARCEL_DIMENSIONS = {
  weightKg: 2,
  lengthCm: 20,
  widthCm: 20,
  heightCm: 10,
};

const toPositiveNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const buildSellerSnapshot = (ownerDoc = {}) => ({
  name: ownerDoc?.contactName || ownerDoc?.storename || 'Seller',
  company: ownerDoc?.storename || '',
  email: ownerDoc?.email || '',
  phone: ownerDoc?.phone || '',
  address: ownerDoc?.address || '',
  apartment: ownerDoc?.apartment || '',
  city: ownerDoc?.city || '',
  province: ownerDoc?.province || '',
  zipCode: ownerDoc?.zipCode || '',
  country: ownerDoc?.country || 'South Africa',
});

export const buildParcelsForItem = (item = {}) => {
  const product = item.product || {};
  const dimensions = product.dimensions || {};
  const description = product.title || 'Order item';
  const weight = toPositiveNumber(product.weight || dimensions.weight, DEFAULT_PARCEL_DIMENSIONS.weightKg);
  const length = toPositiveNumber(dimensions.length, DEFAULT_PARCEL_DIMENSIONS.lengthCm);
  const width = toPositiveNumber(dimensions.width, DEFAULT_PARCEL_DIMENSIONS.widthCm);
  const height = toPositiveNumber(dimensions.height, DEFAULT_PARCEL_DIMENSIONS.heightCm);

  const parcels = [];
  const quantity = Number(item.quantity) || 1;

  for (let i = 0; i < quantity; i += 1) {
    parcels.push({
      description,
      weightKg: weight,
      lengthCm: length,
      widthCm: width,
      heightCm: height,
      quantity: 1,
      productId: product._id instanceof mongoose.Types.ObjectId ? product._id : undefined,
    });
  }

  return parcels;
};

export const summarizeParcels = (parcels = []) => {
  const totalWeight = parcels.reduce((sum, parcel) => sum + (parcel.weightKg || 0), 0);
  return {
    totalParcels: parcels.length,
    totalWeightKg: Number(totalWeight.toFixed(2)),
    parcels,
  };
};
