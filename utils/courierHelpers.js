// utils/courierHelpers.js
// Shared helpers for courier-related API routes

export const DEFAULT_LENGTH = 20;
export const DEFAULT_WIDTH = 20;
export const DEFAULT_HEIGHT = 10;
export const DEFAULT_WEIGHT = 2;

export const normalizeAddress = (address = {}, overrides = {}) => ({
  type: overrides.type || address.type || 'residential',
  name: overrides.name || address.fullName || address.name || '',
  company: overrides.company || address.company || address.storename || '',
  email: overrides.email || address.email || '',
  phone: overrides.phone || address.phone || '',
  address: overrides.address || address.address || address.street_address || address.streetAddress || '',
  suburb: overrides.suburb || address.apartment || address.suburb || address.local_area || '',
  city: overrides.city || address.city || '',
  province: overrides.province || address.province || '',
  postalCode: overrides.postalCode || address.zipCode || address.postalCode || address.code || '',
  country: overrides.country || address.country || 'South Africa',
});

export const normalizeParcels = (parcels = [], fallbackDescription = 'Order parcel') => {
  if (Array.isArray(parcels) && parcels.length > 0) {
    return parcels.map((parcel, idx) => ({
      description: parcel.description || `${fallbackDescription} #${idx + 1}`,
      weight: parcel.weight || parcel.weightKg || DEFAULT_WEIGHT,
      length: parcel.length || parcel.lengthCm || DEFAULT_LENGTH,
      width: parcel.width || parcel.widthCm || DEFAULT_WIDTH,
      height: parcel.height || parcel.heightCm || DEFAULT_HEIGHT,
      reference: parcel.reference,
    }));
  }

  return [{
    description: fallbackDescription,
    weight: DEFAULT_WEIGHT,
    length: DEFAULT_LENGTH,
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
  }];
};

export const buildParcelsFromOrder = (order, fallbackDescription = 'Order parcel') => {
  if (order?.parcelSummary?.parcels?.length) {
    return normalizeParcels(order.parcelSummary.parcels, fallbackDescription);
  }

  const legacyParcels = [];
  order?.items?.forEach((item) => {
    const qty = Math.max(1, Number(item.quantity) || 1);
    for (let i = 0; i < qty; i += 1) {
      legacyParcels.push({
        description: item.productSnapshot?.title || fallbackDescription,
      });
    }
  });

  return normalizeParcels(legacyParcels, fallbackDescription);
};
