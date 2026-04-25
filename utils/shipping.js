// utils/shipping.js

/**
 * Calculate shipping costs based on weight, distance, and method
 */
export function calculateShipping(items, destination, method = 'standard') {
  // Base rates (in Rands)
  const baseRates = {
    standard: 50,
    express: 100,
    collection: 0,
    pudo: 0,
  };

  // Weight-based calculation (simplified)
  const totalWeight = items.reduce((sum, item) => sum + (item.weight || 0.5) * item.quantity, 0);
  
  // Distance-based modifier (you can enhance this with real distance calculation)
  let distanceModifier = 1;
  
  // Major cities get standard rate
  const majorCities = ['Johannesburg', 'Cape Town', 'Durban', 'Pretoria', 'Port Elizabeth'];
  if (!majorCities.includes(destination.city)) {
    distanceModifier = 1.3; // 30% more for remote areas
  }

  // Calculate base cost
  const resolvedMethod = Object.prototype.hasOwnProperty.call(baseRates, method) ? method : 'standard';
  let shippingCost = baseRates[resolvedMethod];
  
  // Add weight surcharge (R10 per kg over 5kg)
  if (totalWeight > 5) {
    shippingCost += (totalWeight - 5) * 10;
  }
  
  // Apply distance modifier
  shippingCost *= distanceModifier;
  
  // Free shipping over R500 for standard
  if (resolvedMethod === 'standard') {
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    if (subtotal >= 500) {
      shippingCost = 0;
    }
  }
  
  return Math.round(shippingCost * 100) / 100; // Round to 2 decimals
}

/**
 * Estimate delivery date based on shipping method
 */
export function estimateDelivery(method = 'standard', origin = 'Johannesburg', destination = 'Johannesburg') {
  const today = new Date();
  let businessDays = 0;

  switch (method) {
    case 'express':
      businessDays = 1; // Next business day
      break;
    case 'standard':
      businessDays = 3; // 3-5 business days (average)
      break;
    case 'pudo':
      businessDays = 2; // Delivery timing for PUDO lockers
      break;
    case 'collection':
      businessDays = 0; // Same day or next day
      break;
    default:
      businessDays = 3;
  }

  // Add extra days for remote locations
  const majorCities = ['Johannesburg', 'Cape Town', 'Durban', 'Pretoria', 'Port Elizabeth'];
  if (!majorCities.includes(destination)) {
    businessDays += 2;
  }

  // Calculate delivery date (excluding weekends)
  let deliveryDate = new Date(today);
  let addedDays = 0;
  
  while (addedDays < businessDays) {
    deliveryDate.setDate(deliveryDate.getDate() + 1);
    const dayOfWeek = deliveryDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday (0) or Saturday (6)
      addedDays++;
    }
  }

  return deliveryDate;
}

/**
 * Get available shipping methods based on cart items
 */
export function getAvailableShippingMethods(items, destination, courierQuotes = []) {
  const methods = [];

  // Check if all items support delivery
  const supportsDelivery = items.every(item => 
    item.product?.deliveryOptions?.delivery !== false
  );
  
  // Check if all items support collection
  const supportsCollection = items.some(item => 
    item.product?.deliveryOptions?.collection === true
  );

  const courierOptions = courierQuotes.map((quote, index) => ({
    id: `courier-${quote.provider}-${index}`,
    name: quote.name || quote.provider,
    description: quote.service_level || quote.serviceName || 'Courier service',
    cost: quote.price || quote.amount || 0,
    estimatedDelivery: quote.estimated_delivery || quote.estimatedDelivery || estimateDelivery('standard', 'Johannesburg', destination.city),
    provider: quote.provider,
    courierQuote: quote,
    type: 'courier',
  }));

  if (supportsDelivery) {
    methods.push({
      id: 'standard',
      name: 'Standard Delivery',
      description: '3-5 business days',
      cost: calculateShipping(items, destination, 'standard'),
      estimatedDelivery: estimateDelivery('standard', 'Johannesburg', destination.city),
    });

    methods.push({
      id: 'express',
      name: 'Express Delivery',
      description: '1-2 business days',
      cost: calculateShipping(items, destination, 'express'),
      estimatedDelivery: estimateDelivery('express', 'Johannesburg', destination.city),
    });
  }

  if (courierOptions.length > 0) {
    methods.push(...courierOptions);
  }

  if (supportsCollection) {
    methods.push({
      id: 'collection',
      name: 'Store Collection',
      description: 'Collect from store',
      cost: 0,
      estimatedDelivery: estimateDelivery('collection'),
    });
  }

  return methods;
}

/**
 * Validate shipping address
 */
export function validateShippingAddress(address) {
  const errors = [];

  // Email is now required instead of fullName
  if (!address.email || address.email.trim().length < 5) {
    errors.push('Valid email address is required');
  }

  // Phone is optional but if provided, must be valid
  if (address.phone && !/^0\d{9}$/.test(address.phone.replace(/\s/g, ''))) {
    errors.push('Valid South African phone number required (e.g., 0821234567)');
  }

  if (!address.address || address.address.trim().length < 5) {
    errors.push('Street address is required');
  }

  if (!address.city || address.city.trim().length < 2) {
    errors.push('City is required');
  }

  // Support both 'region' and 'province' field names
  const province = address.region || address.province;
  if (!province) {
    errors.push('Province/State is required');
  }

  if (!address.postalCode || !/^\d{4}$/.test(address.postalCode)) {
    errors.push('Valid 4-digit postal code required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
} 