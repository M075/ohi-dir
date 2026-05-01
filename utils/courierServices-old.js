// utils/courierServices.js

const DEFAULT_COUNTRY = 'ZA';

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeCountryCode = (value) => {
  if (!value) {
    return DEFAULT_COUNTRY;
  }

  const trimmed = String(value).trim();
  if (!trimmed) {
    return DEFAULT_COUNTRY;
  }

  if (trimmed.length === 2) {
    return trimmed.toUpperCase();
  }

  if (trimmed.toLowerCase().includes('south africa')) {
    return 'ZA';
  }

  return trimmed;
};

const formatIsoDate = (value) => {
  if (!value) {
    return new Date().toISOString().split('T')[0];
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString().split('T')[0] : date.toISOString().split('T')[0];
};

const formatShiplogicAddress = (address = {}, defaults = {}) => ({
  type: address.type || defaults.type || 'residential',
  company: address.company || defaults.company || '',
  street_address: address.street_address || address.streetAddress || address.address || '',
  local_area: address.local_area || address.suburb || address.apartment || defaults.local_area || '',
  city: address.city || defaults.city || '',
  zone: address.zone || address.province || defaults.zone || '',
  country: normalizeCountryCode(address.country || defaults.country || DEFAULT_COUNTRY),
  code: address.code || address.postalCode || address.zipCode || defaults.code || '',
  lat: address.lat ?? address.latitude ?? null,
  lng: address.lng ?? address.longitude ?? null,
});

const formatShiplogicContact = (source = {}, fallback = {}) => ({
  name: source.contactName || source.name || source.fullName || fallback.name || source.company || 'Contact',
  mobile_number: source.phone || source.mobile_number || fallback.mobile_number || '',
  email: source.email || fallback.email || '',
});

const formatShiplogicParcels = (parcels = []) => {
  const safeParcels = Array.isArray(parcels) && parcels.length > 0 ? parcels : [{}];
  return safeParcels.map((parcel, index) => ({
    parcel_description: parcel.description || parcel.parcel_description || `Parcel ${index + 1}`,
    submitted_length_cm: toNumber(parcel.length || parcel.lengthCm || parcel.submitted_length_cm, 30) || 20,
    submitted_width_cm: toNumber(parcel.width || parcel.widthCm || parcel.submitted_width_cm, 30) || 20,
    submitted_height_cm: toNumber(parcel.height || parcel.heightCm || parcel.submitted_height_cm, 30) || 10,
    submitted_weight_kg: toNumber(parcel.weight || parcel.weightKg || parcel.submitted_weight_kg, 1) || 2,
  }));
};

const calculateEtaDays = (from, to) => {
  if (!from && !to) {
    return undefined;
  }
  const start = from ? new Date(from) : null;
  const end = to ? new Date(to) : null;

  if (start && end && Number.isFinite(start.getTime()) && Number.isFinite(end.getTime())) {
    const diff = end.getTime() - start.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 1;
  }

  if (end && Number.isFinite(end.getTime())) {
    const now = Date.now();
    const diff = end.getTime() - now;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 1;
  }

  return undefined;
};

const extractShiplogicRates = (response = {}) => {
  if (!response) {
    return [];
  }

  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response.service_levels)) {
    return response.service_levels;
  }

  if (Array.isArray(response.rates)) {
    return response.rates;
  }

  if (Array.isArray(response.results)) {
    return response.results;
  }

  return [];
};

const shiplogicQuoteFromRate = (rate, providerName = 'The Courier Guy') => {
  if (!rate) {
    return null;
  }

  const price = toNumber(rate.total ?? rate.rate ?? rate.amount ?? rate.value, 0);
  const etaFrom = rate.estimated_delivery_from || rate.delivery_from || rate.estimated_delivery || null;
  const etaTo = rate.estimated_delivery_to || rate.delivery_to || rate.estimated_delivery || null;
  const defaultId = [
    'courier-guy',
    rate.service_level_id || rate.id || rate.service_level_code,
    rate.rating_reference || rate.provider_id || Date.now(),
  ]
    .filter(Boolean)
    .join('-');

  return {
    id: String(defaultId),
    provider: 'courier-guy',
    name: rate.service_level_name || rate.name || providerName,
    service_level: rate.service_level_code || rate.code || 'standard',
    service_level_code: rate.service_level_code || rate.code,
    service_level_id: rate.service_level_id || rate.id,
    price,
    currency: rate.currency || 'ZAR',
    etaFrom,
    etaTo,
    estimatedDays: calculateEtaDays(etaFrom, etaTo) || rate.estimated_days,
    collectionEta: rate.estimated_collection || rate.collection_estimate,
    rating_reference: rate.rating_reference,
    raw: rate,
  };
};

/**
 * Shiplogic (Courier Guy) API Integration
 * Documentation: https://api.shiplogic.com
 */
export class CourierGuyService {
  constructor() {
    this.apiKey = process.env.COURIER_GUY_API_KEY || process.env.SHIPLOGIC_API_KEY;
    this.apiUrl = process.env.COURIER_GUY_API_URL || process.env.SHIPLOGIC_API_URL || 'https://api.shiplogic.com';
    this.accountId = process.env.SHIPLOGIC_ACCOUNT_ID;
  }

  buildHeaders(hasBody, extraHeaders = {}) {
    const headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      ...extraHeaders,
    };

    if (hasBody && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    return headers;
  }

  async request(path, { method = 'GET', body, headers = {} } = {}) {
    const hasJsonBody = body !== undefined;
    const payload = hasJsonBody && typeof body === 'object' ? JSON.stringify(body) : body;

    const response = await fetch(`${this.apiUrl}${path}`, {
      method,
      headers: this.buildHeaders(!!payload, headers),
      body: payload,
    });

    const text = await response.text();
    let data = null;

    if (text) {
      try {
        data = JSON.parse(text);
      } catch (error) {
        console.error('Shiplogic parse error:', error);
        throw new Error('Failed to parse Shiplogic response');
      }
    }

    if (!response.ok) {
      const message = data?.message || data?.error || text || 'Shiplogic request failed';
      throw new Error(message);
    }

    return data ?? {};
  }

  async getQuote(shipment) {
    try {
      const payload = {
        collection_address: formatShiplogicAddress(shipment.from, { type: 'residential' }),
        delivery_address: formatShiplogicAddress(shipment.to, { type: 'residential' }),
        parcels: formatShiplogicParcels(shipment.parcels),
        declared_value: toNumber(shipment.declaredValue, 0),
        collection_min_date: formatIsoDate(shipment.collectionDate),
        delivery_min_date: formatIsoDate(shipment.deliveryDate),
        service_level_code: shipment.service_level_code || shipment.serviceLevelCode || 'ECO',
      };

      if (this.accountId) {
        payload.account_id = Number(this.accountId);
      }

      if (Array.isArray(shipment.opt_in_rates) && shipment.opt_in_rates.length) {
        payload.opt_in_rates = shipment.opt_in_rates;
      }

      if (Array.isArray(shipment.opt_in_time_based_rates) && shipment.opt_in_time_based_rates.length) {
        payload.opt_in_time_based_rates = shipment.opt_in_time_based_rates;
      }

      const response = await this.request('/rates', {
        method: 'POST',
        body: payload,
      });

      const rates = extractShiplogicRates(response);
      const quotes = rates
        .map(rate => shiplogicQuoteFromRate(rate))
        .filter(Boolean);

      if (!quotes.length) {
        throw new Error('Shiplogic did not return any rates for this route');
      }

      return quotes;
    } catch (error) {
      console.error('Shiplogic quote error:', error);
      throw error;
    }
  }

  resolveServiceLevel(selectedService = {}) {
    return {
      code: selectedService.service_level_code || selectedService.serviceLevelCode || selectedService.code,
      id: selectedService.service_level_id || selectedService.serviceLevelId || selectedService.id,
      rating_reference: selectedService.rating_reference || selectedService.ratingReference,
      opt_in_rates: selectedService.opt_in_rates || selectedService.optInRates,
      opt_in_time_based_rates: selectedService.opt_in_time_based_rates || selectedService.optInTimeBasedRates,
    };
  }

  async createShipment(order, selectedService = {}) {
    try {
      const serviceLevel = this.resolveServiceLevel(selectedService);

      if (!serviceLevel.code && !serviceLevel.id) {
        throw new Error('Shiplogic service level code or ID is required to create a shipment');
      }

      const payload = {
        collection_address: formatShiplogicAddress(order.collectionAddress, { type: 'residential' }),
        collection_contact: formatShiplogicContact(order.collectionContact || order.collectionAddress, {
          name: order.collectionAddress?.name || order.collectionAddress?.company || 'Sender',
          email: order.collectionAddress?.email,
          mobile_number: order.collectionAddress?.phone,
        }),
        delivery_address: formatShiplogicAddress(order.deliveryAddress, { type: 'residential' }),
        delivery_contact: formatShiplogicContact(order.deliveryContact || order.deliveryAddress, {
          name: order.deliveryAddress?.name || order.deliveryAddress?.fullName || 'Recipient',
          email: order.deliveryAddress?.email,
          mobile_number: order.deliveryAddress?.phone,
        }),
        parcels: formatShiplogicParcels(order.parcels),
        declared_value: toNumber(order.declaredValue, 0),
        collection_min_date: formatIsoDate(order.collectionDate),
        delivery_min_date: formatIsoDate(order.deliveryDate),
        special_instructions_collection: order.collectionNotes || '',
        special_instructions_delivery: order.deliveryNotes || '',
        custom_tracking_reference: order.orderNumber,
        customer_reference: order.orderNumber,
        service_level_code: serviceLevel.code,
        mute_notifications: !!order.muteNotifications,
      };

      if (serviceLevel.code) {
        payload.service_level_code = serviceLevel.code;
      }

      if (serviceLevel.id) {
        payload.service_level_id = serviceLevel.id;
      }

      if (serviceLevel.rating_reference) {
        payload.rating_reference = serviceLevel.rating_reference;
      }

      if (Array.isArray(serviceLevel.opt_in_rates) && serviceLevel.opt_in_rates.length) {
        payload.opt_in_rates = serviceLevel.opt_in_rates;
      }

      if (Array.isArray(serviceLevel.opt_in_time_based_rates) && serviceLevel.opt_in_time_based_rates.length) {
        payload.opt_in_time_based_rates = serviceLevel.opt_in_time_based_rates;
      }

      if (this.accountId) {
        payload.account_id = Number(this.accountId);
      }

      const response = await this.request('/shipments', {
        method: 'POST',
        body: payload,
      });

      return response;
    } catch (error) {
      console.error('Shiplogic shipment error:', error);
      throw error;
    }
  }

  async trackShipment(trackingNumber) {
    try {
      const params = new URLSearchParams({ tracking_reference: trackingNumber });
      const data = await this.request(`/shipments?${params.toString()}`);

      const shipments = Array.isArray(data)
        ? data
        : data?.shipments || data?.results || data?.data || [];

      if (Array.isArray(shipments) && shipments.length) {
        return shipments[0];
      }

      return data;
    } catch (error) {
      console.error('Shiplogic tracking error:', error);
      throw error;
    }
  }
}

/**
 * Fastway API Integration
 * Documentation: https://www.fastway.co.za/api-integration
 */
export class FastwayService {
  constructor() {
    this.apiKey = process.env.FASTWAY_API_KEY;
    this.franchiseCode = process.env.FASTWAY_FRANCHISE_CODE;
    this.apiUrl = process.env.FASTWAY_API_URL || 'https://api.fastway.co.za';
  }

  async getQuote(shipment) {
    try {
      const response = await fetch(`${this.apiUrl}/v4/pudo/quote`, {
        method: 'POST',
        headers: {
          'api_key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          franchisecode: this.franchiseCode,
          destination: {
            type: shipment.to.type || 'residential',
            postal_code: shipment.to.postalCode,
            suburb: shipment.to.suburb,
          },
          items: shipment.parcels.map(p => ({
            references: [p.reference || ''],
            weight: p.weight || p.weightKg || 1,
            length: p.length || p.lengthCm || 30,
            width: p.width || p.widthCm || 30,
            height: p.height || p.heightCm || 30,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get Fastway quote');
      }

      return await response.json();
    } catch (error) {
      console.error('Fastway quote error:', error);
      throw error;
    }
  }

  async createShipment(order, selectedService) {
    try {
      const response = await fetch(`${this.apiUrl}/v4/pudo/create`, {
        method: 'POST',
        headers: {
          'api_key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          franchisecode: this.franchiseCode,
          service_level: selectedService.code,
          destination: order.deliveryAddress,
          items: order.parcels,
          collection_info: {
            company_name: order.collectionAddress.company,
            contact_name: order.collectionAddress.contactName,
            contact_phone: order.collectionAddress.phone,
            address: order.collectionAddress.streetAddress,
            suburb: order.collectionAddress.suburb,
            postal_code: order.collectionAddress.postalCode,
          },
          reference: order.orderNumber,
          instructions: order.deliveryNotes,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create Fastway shipment');
      }

      return await response.json();
    } catch (error) {
      console.error('Fastway shipment error:', error);
      throw error;
    }
  }

  async trackShipment(trackingNumber) {
    try {
      const response = await fetch(
        `${this.apiUrl}/v4/tracktrace/detail/${trackingNumber}`,
        {
          headers: {
            'api_key': this.apiKey,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to track shipment');
      }

      return await response.json();
    } catch (error) {
      console.error('Fastway tracking error:', error);
      throw error;
    }
  }
}

/**
 * PUDO Locker Integration
 * Documentation: https://www.pudo.co.za/api
 */
export class PUDOLockerService {
  constructor() {
    this.apiKey =
      process.env.PUDO_API_KEY 
    this.apiUrl =
      process.env.PUDO_API_URL ||
      'https://api.shiplogic.com';
  }

  async findNearbyLockers(search, options = {}) {
    try {
      if (!this.apiKey) {
        throw new Error('Shiplogic API key is not configured');
      }

      const params = new URLSearchParams();

      // Default to lockers unless explicitly overridden
      if (options.type || options.types) {
        if (options.type) {
          params.set('type', options.type);
        }
        if (options.types) {
          params.set('types', options.types);
        }
      } else {
        params.set('type', 'locker');
      }

      if (options.lat && options.lng) {
        params.set('lat', options.lat);
        params.set('lng', options.lng);
        if (options.order_closest) {
          params.set('order_closest', String(options.order_closest));
        }
      }

      const passthroughKeys = [
        'min_lat',
        'max_lat',
        'min_lng',
        'max_lng',
        'order_closest',
        'types',
        'type',
      ];

      for (const key of passthroughKeys) {
        if (options[key] && !params.has(key)) {
          params.set(key, options[key]);
        }
      }

      if (search) {
        params.set('search', search);
      }

      const query = params.toString();
      const response = await fetch(
        `${this.apiUrl}/pickup-points${query ? `?${query}` : ''}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Accept': 'application/json',
          },
        }
      );

      const text = await response.text();
      const rawText = typeof text === 'string' ? text.trim() : '';
      const contentType = response.headers.get('content-type') || '';
      let data = null;

      if (rawText && contentType.includes('application/json')) {
        try {
          data = JSON.parse(rawText);
        } catch (parseError) {
          console.error('PUDO locker parse error:', {
            error: parseError,
            snippet: rawText.slice(0, 200),
          });

          if (response.ok) {
            const malformedError = new Error('Shiplogic returned malformed JSON response');
            malformedError.status = response.status;
            malformedError.details = rawText;
            throw malformedError;
          }
        }
      }

      if (!response.ok) {
        const message =
          data?.message ||
          data?.error ||
          data?.errors?.[0]?.message ||
          rawText ||
          `Shiplogic pickup-point request failed (${response.status})`;
        const error = new Error(message);
        error.status = response.status;
        throw error;
      }

      if (!data) {
        if (rawText) {
          throw new Error(`Unexpected Shiplogic pickup-point response: ${rawText.slice(0, 160)}`);
        }
        return [];
      }

      return data;
    } catch (error) {
      console.error('PUDO locker search error:', error);
      throw error;
    }
  }

  async createDelivery(order, lockerId) {
    try {
      const response = await fetch(`${this.apiUrl}/v1/deliveries`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          locker_id: lockerId,
          recipient: {
            name: order.recipientName,
            phone: order.recipientPhone,
            email: order.recipientEmail,
          },
          parcel: {
            reference: order.orderNumber,
            description: order.description,
            weight: order.weight,
            dimensions: {
              length: order.length,
              width: order.width,
              height: order.height,
            },
          },
          sender: {
            name: order.senderName,
            phone: order.senderPhone,
            reference: order.orderNumber,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create PUDO delivery');
      }

      return await response.json();
    } catch (error) {
      console.error('PUDO delivery error:', error);
      throw error;
    }
  }

  async trackDelivery(trackingNumber) {
    try {
      const response = await fetch(
        `${this.apiUrl}/v1/deliveries/${trackingNumber}/track`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to track PUDO delivery');
      }

      return await response.json();
    } catch (error) {
      console.error('PUDO tracking error:', error);
      throw error;
    }
  }
}

/**
 * Unified Courier Service Manager
 */
export class CourierServiceManager {
  constructor() {
    this.courierGuy = new CourierGuyService();
    this.fastway = new FastwayService();
    this.pudo = new PUDOLockerService();
  }

  async getAllQuotes(shipment) {
    const quotes = [];

    try {
      const courierGuyQuotes = await this.courierGuy.getQuote(shipment);

      if (Array.isArray(courierGuyQuotes)) {
        quotes.push(...courierGuyQuotes);
      } else if (courierGuyQuotes) {
        quotes.push({
          provider: 'courier-guy',
          name: 'The Courier Guy',
          ...courierGuyQuotes,
        });
      }
    } catch (error) {
      console.error('Courier Guy quote failed:', error);
    }

    try {
      const fastwayQuote = await this.fastway.getQuote(shipment);
      quotes.push({
        provider: 'fastway',
        name: 'Fastway Couriers',
        ...fastwayQuote,
      });
    } catch (error) {
      console.error('Fastway quote failed:', error);
    }

    return quotes.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
  }

  async createShipment(provider, order, service) {
    switch (provider) {
      case 'courier-guy':
        return await this.courierGuy.createShipment(order, service);
      case 'fastway':
        return await this.fastway.createShipment(order, service);
      case 'pudo':
        return await this.pudo.createDelivery(order, service.lockerId);
      default:
        throw new Error('Invalid courier provider');
    }
  }

  async trackShipment(provider, trackingNumber) {
    switch (provider) {
      case 'courier-guy':
        return await this.courierGuy.trackShipment(trackingNumber);
      case 'fastway':
        return await this.fastway.trackShipment(trackingNumber);
      case 'pudo':
        return await this.pudo.trackDelivery(trackingNumber);
      default:
        throw new Error('Invalid courier provider');
    }
  }
}

// Create a Shiplogic shipment directly from an order document
export async function createShiplogicShipmentFromOrder(order) {
  const service = new CourierGuyService();

  const serviceLevelCode = order?.courierQuote?.serviceCode || order?.courierQuote?.service_code || order?.courierQuote?.service_level_code || 'ECO';
  const parcels = order?.parcelSummary?.parcels?.length ? order.parcelSummary.parcels : [{ description: 'Parcel', weightKg: 1 }];

  const collectionAddress = {
    type: 'residential',
    company: order?.sellerName || order?.sellerAddressSnapshot?.company,
    street_address: order?.sellerAddressSnapshot?.address,
    local_area: order?.sellerAddressSnapshot?.local_area,
    city: order?.sellerAddressSnapshot?.city,
    zone: order?.sellerAddressSnapshot?.province,
    code: order?.sellerAddressSnapshot?.zipCode,
    country: order?.sellerAddressSnapshot?.country || 'ZA',
    email: order?.sellerAddressSnapshot?.email,
    phone: order?.sellerAddressSnapshot?.phone,
    name: order?.sellerAddressSnapshot?.name || order?.sellerName,
  };

  const deliveryAddress = {
    type: 'residential',
    company: order?.shippingAddress?.company,
    street_address: order?.shippingAddress?.address,
    local_area: order?.shippingAddress?.apartment,
    city: order?.shippingAddress?.city,
    zone: order?.shippingAddress?.province,
    code: order?.shippingAddress?.zipCode,
    country: order?.shippingAddress?.country || 'ZA',
    email: order?.shippingAddress?.email,
    phone: order?.shippingAddress?.phone,
    name: order?.shippingAddress?.fullName,
  };

  const shipmentPayload = {
    collectionAddress,
    collectionContact: collectionAddress,
    deliveryAddress,
    deliveryContact: deliveryAddress,
    parcels,
    declaredValue: order?.total || order?.subtotal || 0,
    collectionDate: order?.confirmedAt || order?.createdAt,
    deliveryDate: order?.estimatedDelivery,
    collectionNotes: order?.pickupInstructions,
    deliveryNotes: order?.deliveryInstructions,
    orderNumber: order?.orderNumber,
    muteNotifications: false,
  };

  const response = await service.createShipment(shipmentPayload, { service_level_code: serviceLevelCode });

  const trackingReference = response?.short_tracking_reference || response?.tracking_reference || response?.tracking_reference_number;

  return {
    raw: response,
    trackingReference,
    shipmentId: response?.id || response?.shipment_id,
    parcelTrackingReferences: response?.parcel_tracking_references,
    serviceLevelCode,
    labelUrl: response?.label_url || response?.label || null,
  };
}