// utils/courierServices.js
const DEFAULT_COUNTRY = 'ZA';

/**
 * PUDO Locker Size Specifications
 * All dimensions in cm, weight in kg
 * Service level codes for Shiplogic ECO delivery
 */
const LOCKER_SIZES = {
  XS: {
    name: 'Locker XS',
    length: 15,
    width: 58,
    height: 7,
    weight: 2,
    service_level_code: 'L2LXS - ECO',
    price: 49,
  },
  S: {
    name: 'Locker S',
    length: 39,
    width: 58,
    height: 7,
    weight: 5,
    service_level_code: 'L2LS - ECO',
    price: 59,
  },
  M: {
    name: 'Locker M',
    length: 39,
    width: 58,
    height: 17,
    weight: 10,
    service_level_code: 'L2LM - ECO',
    price: 69,
  },
  L: {
    name: 'Locker L',
    length: 39,
    width: 58,
    height: 39,
    weight: 15,
    service_level_code: 'L2LL - ECO',
    price: 89,
  },
};

/**
 * Format parcels for PUDO locker delivery
 * @param {string} lockerSize - Size key: 'XS', 'S', 'M', 'L'
 * @returns {Array} Array with single locker parcel formatted for Shiplogic
 */
const formatLockerParcel = (lockerSize = 'M') => {
  const size = lockerSize.toUpperCase();
  const locker = LOCKER_SIZES[size];
  if (!locker) {
    console.warn(`⚠️ Unknown locker size: ${lockerSize}, defaulting to M`);
    const defaultLocker = LOCKER_SIZES.M;
    return [{
      parcel_description: `${defaultLocker.name}`,
      submitted_length_cm: defaultLocker.length,
      submitted_width_cm: defaultLocker.width,
      submitted_height_cm: defaultLocker.height,
      submitted_weight_kg: defaultLocker.weight,
    }];
  }
  return [{
    parcel_description: `PUDO ${locker.name}`,
    submitted_length_cm: locker.length,
    submitted_width_cm: locker.width,
    submitted_height_cm: locker.height,
    submitted_weight_kg: locker.weight,
  }];
};

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
    return new Date().toISOString();
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
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

const sanitizeCustomTrackingReference = (orderNumber) => {
  const numericOnly = String(orderNumber).replace(/[^0-9]/g, '');
  if (!numericOnly || numericOnly.length === 0) {
    return String(Date.now()).slice(-12);
  }
  return numericOnly;
};

const formatShiplogicParcels = (parcels = []) => {
  const safeParcels = Array.isArray(parcels) && parcels.length > 0 ? parcels : [{}];
  return safeParcels.map((parcel, index) => ({
    parcel_description: parcel.description || parcel.parcel_description || 'Custom Parcel',
    submitted_length_cm: toNumber(parcel.length || parcel.lengthCm || parcel.submitted_length_cm, 30) || 20,
    submitted_width_cm: toNumber(parcel.width || parcel.widthCm || parcel.submitted_width_cm, 30) || 20,
    submitted_height_cm: toNumber(parcel.height || parcel.heightCm || parcel.submitted_height_cm, 5) || 10,
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
    service_level: rate.service_level_code || rate.code || 'LOF' || 'ECO',
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
 * Normalize a raw locker/pickup-point object from the Shiplogic API
 * into a consistent shape for the frontend and order storage.
 * @param {Object} locker - Raw pickup-point from /pickup-points
 * @returns {Object} Normalized locker with id, name, address, pickupPointId, etc.
 */
const normalizePickupPoint = (locker) => {
  if (!locker) return null;
  const id = locker.id || locker.locker_id || locker.code || locker.identifier || `${locker.name || 'locker'}-${locker.postal_code || locker.postalCode || locker.city || Date.now()}`;
  const addressSource = typeof locker.address === 'object' ? locker.address : null;
  const citySource = locker.city || addressSource?.city || addressSource?.local_area;
  const provinceSource = locker.province || addressSource?.zone || addressSource?.province;
  const postalSource = locker.postal_code || locker.postalCode || addressSource?.code;

  return {
    id,
    name: locker.name || locker.site_name || locker.locker_name || 'PUDO Locker',
    address:
      (typeof locker.address === 'string' ? locker.address : null) ||
      (addressSource ? [addressSource.street_address, addressSource.local_area, addressSource.city].filter(Boolean).join(', ') : null) ||
      locker.street_address ||
      locker.location ||
      '',
    city: citySource || locker.suburb || locker.town || '',
    province: provinceSource || locker.state || '',
    postalCode: postalSource || locker.zip_code || '',
    distanceKm: locker.distance || locker.distance_km || locker.distanceKm || null,
    status: locker.status || locker.availability || locker.state || 'unknown',
    /** The Shiplogic pickup-point ID to use in shipment creation */
    pickupPointId: locker.id || locker.pickup_point_id || locker.locker_id || locker.code || id,
    pickupPointProvider: locker.provider || locker.pickup_point_provider || 'tcg-locker',
    raw: locker,
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

    if (!this.apiKey) {
      console.error('❌ Shiplogic API Key not configured!');
      console.error('Set SHIPLOGIC_API_KEY or COURIER_GUY_API_KEY in environment variables');
    }
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

    console.log(`🔗 Shiplogic ${method} ${path}`, { hasBody: !!payload, url: `${this.apiUrl}${path}` });

    const response = await fetch(`${this.apiUrl}${path}`, {
      method,
      headers: this.buildHeaders(!!payload, headers),
      body: payload,
    });

    const text = await response.text();
    let data = null;

    const contentType = response.headers.get('content-type') || 'unknown';
    const isJson = contentType.includes('application/json');

    console.log(`📨 Shiplogic response: ${response.status} ${response.statusText}`, {
      contentType,
      isJson,
      responseLength: text.length,
      responsePreview: text.substring(0, 500),
    });

    if (response.status === 401 || response.status === 403) {
      console.error('❌ Shiplogic Authentication Failed (401/403)', {
        status: response.status,
        hasApiKey: !!this.apiKey,
        apiKeyPrefix: this.apiKey ? this.apiKey.substring(0, 8) + '...' : 'NOT SET',
      });
      throw new Error(`Shiplogic Authentication Failed: ${response.status}. Check API key configuration.`);
    }

    if (text) {
      try {
        data = JSON.parse(text);
      } catch (error) {
        if (!response.ok) {
          if (text.includes('<html') || text.includes('<!DOCTYPE')) {
            console.error('⚠️ Shiplogic returned HTML error page:', { status: response.status, preview: text.substring(0, 300) });
            throw new Error(`Shiplogic API error ${response.status}: Server returned HTML error page`);
          }
          console.error('Shiplogic error response (not JSON):', { status: response.status, statusText: response.statusText, contentType, preview: text.substring(0, 500) });
          throw new Error(`Shiplogic API error: ${response.status} ${response.statusText} - ${text.substring(0, 200)}`);
        }
        console.error('Shiplogic parse error:', error);
        console.error('Response was not valid JSON (but status was OK):', text.substring(0, 500));
        throw new Error(`Failed to parse Shiplogic response (status ${response.status}): ${error.message}`);
      }
    }

    if (!response.ok) {
      const message = data?.message || data?.error || text || `Shiplogic request failed (${response.status})`;
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
        service_level_code: shipment.service_level_code || shipment.serviceLevelCode || 'LOF' || 'ECO',
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

      const response = await this.request('/rates', { method: 'POST', body: payload });
      const rates = extractShiplogicRates(response);
      const quotes = rates.map(rate => shiplogicQuoteFromRate(rate)).filter(Boolean);

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
        due_date: formatIsoDate(order.deliveryDate),
        delivery_min_date: formatIsoDate(order.deliveryDate),
        special_instructions_collection: order.collectionNotes || '',
        special_instructions_delivery: order.deliveryNotes || '',
        custom_tracking_reference: '',
        customer_reference_name: 'Order no.',
        customer_reference: order.orderNumber,
        service_level_code: serviceLevel.code || 'LOF' || 'ECO',
        mute_notifications: !!order.muteNotifications,
        opt_in_rates: [],
      };

      if (serviceLevel.code) payload.service_level_code = serviceLevel.code;
      if (serviceLevel.id) payload.service_level_id = serviceLevel.id;
      if (serviceLevel.rating_reference) payload.rating_reference = serviceLevel.rating_reference;
      if (Array.isArray(serviceLevel.opt_in_rates) && serviceLevel.opt_in_rates.length) payload.opt_in_rates = serviceLevel.opt_in_rates;
      if (Array.isArray(serviceLevel.opt_in_time_based_rates) && serviceLevel.opt_in_time_based_rates.length) payload.opt_in_time_based_rates = serviceLevel.opt_in_time_based_rates;
      if (this.accountId) payload.account_id = Number(this.accountId);

      console.log(`📤 Sending shipment to Shiplogic with payload:`, {
        orderNumber: payload.custom_tracking_reference,
        originalOrderNumber: order.orderNumber,
        customerReference: payload.customer_reference,
        serviceLevel: payload.service_level_code,
        collection: { address: `${payload.collection_address.street_address}, ${payload.collection_address.city}`, contact: payload.collection_contact.name },
        delivery: { address: `${payload.delivery_address.street_address}, ${payload.delivery_address.city}`, contact: payload.delivery_contact.name },
        parcels: payload.parcels.length,
        declaredValue: payload.declared_value,
        payloadSize: JSON.stringify(payload).length,
      });

      const response = await this.request('/shipments', { method: 'POST', body: payload });
      return response;
    } catch (error) {
      console.error('Shiplogic shipment error:', error);
      throw error;
    }
  }

  /**
   * Create a PUDO locker-to-locker shipment using Shiplogic pickup-point API.
   * Uses collection_pickup_point_id / delivery_pickup_point_id instead of street addresses.
   *
   * @param {Object} order - Order data with collectionLocker and deliveryLocker
   * @param {string} lockerSize - Locker size: 'XS', 'S', 'M', 'L'
   * @param {Object} selectedService - Service level details (optional overrides)
   * @returns {Object} Shiplogic shipment response
   */
  async createLockerShipment(order, lockerSize = 'M', selectedService = {}) {
    try {
      const size = lockerSize.toUpperCase();
      const locker = LOCKER_SIZES[size];
      if (!locker) {
        throw new Error(`Invalid locker size: ${lockerSize}. Must be one of: XS, S, M, L`);
      }

      const serviceLevel = this.resolveServiceLevel({
        ...selectedService,
        service_level_code: selectedService.service_level_code || locker.service_level_code,
      });

      if (!serviceLevel.code && !serviceLevel.id) {
        throw new Error('Shiplogic service level code or ID is required to create a locker shipment');
      }

      // Validate pickup point IDs
      const collectionPickupPointId = order.collectionLocker?.pickupPointId || order.collection_pickup_point_id;
      const deliveryPickupPointId = order.deliveryLocker?.pickupPointId || order.delivery_pickup_point_id;

      if (!collectionPickupPointId) {
        throw new Error('Collection locker pickup_point_id is required for PUDO locker shipment');
      }
      if (!deliveryPickupPointId) {
        throw new Error('Delivery locker pickup_point_id is required for PUDO locker shipment');
      }

      const collectionContact = formatShiplogicContact(order.collectionContact || order.collectionLocker, {
        name: order.collectionContact?.name || order.collectionLocker?.name || 'Sender',
        email: order.collectionContact?.email,
        mobile_number: order.collectionContact?.phone || order.collectionContact?.mobile_number,
      });

      const deliveryContact = formatShiplogicContact(order.deliveryContact || order.deliveryLocker, {
        name: order.deliveryContact?.name || order.deliveryLocker?.name || 'Recipient',
        email: order.deliveryContact?.email,
        mobile_number: order.deliveryContact?.phone || order.deliveryContact?.mobile_number,
      });

      // Build PUDO locker payload using pickup-point format
      const payload = {
        collection_pickup_point_id: String(collectionPickupPointId),
        collection_pickup_point_provider: order.collectionLocker?.pickupPointProvider || 'tcg-locker',
        collection_contact: collectionContact,
        delivery_pickup_point_id: String(deliveryPickupPointId),
        delivery_pickup_point_provider: order.deliveryLocker?.pickupPointProvider || 'tcg-locker',
        delivery_contact: deliveryContact,
        parcels: formatLockerParcel(lockerSize),
        declared_value: 0,
        collection_min_date: formatIsoDate(order.collectionDate),
        collection_after: order.collectionAfter || '08:00',
        collection_before: order.collectionBefore || '16:00',
        delivery_min_date: formatIsoDate(order.deliveryDate),
        delivery_after: order.deliveryAfter || '10:00',
        delivery_before: order.deliveryBefore || '17:00',
        customer_reference: order.orderNumber,
        service_level_code: serviceLevel.code || locker.service_level_code,
        mute_notifications: !!order.muteNotifications,
      };

      if (serviceLevel.id) payload.service_level_id = serviceLevel.id;
      if (serviceLevel.rating_reference) payload.rating_reference = serviceLevel.rating_reference;
      if (this.accountId) payload.account_id = Number(this.accountId);

      console.log(`📦 Sending PUDO locker shipment to Shiplogic:`, {
        orderNumber: order.orderNumber,
        lockerSize: size,
        lockerSpecs: locker,
        serviceLevel: payload.service_level_code,
        collection: { pickupPointId: payload.collection_pickup_point_id, provider: payload.collection_pickup_point_provider, contact: payload.collection_contact.name },
        delivery: { pickupPointId: payload.delivery_pickup_point_id, provider: payload.delivery_pickup_point_provider, contact: payload.delivery_contact.name },
      });

      const response = await this.request('/shipments', { method: 'POST', body: payload });
      return response;
    } catch (error) {
      console.error('Shiplogic locker shipment error:', error);
      throw error;
    }
  }

  async trackShipment(trackingNumber) {
    try {
      const params = new URLSearchParams({ tracking_reference: trackingNumber });
      const data = await this.request(`/shipments?${params.toString()}`);
      const shipments = Array.isArray(data) ? data : data?.shipments || data?.results || data?.data || [];
      if (Array.isArray(shipments) && shipments.length) {
        return shipments[0];
      }
      return data;
    } catch (error) {
      console.error('Shiplogic tracking error:', error);
      throw error;
    }
  }

  /**
   * Find nearby PUDO lockers using Shiplogic pickup-points API
   * @param {string} search - Search term (city, postal code, or location)
   * @param {Object} options - Additional search options (lat, lng, type, etc.)
   * @returns {Array} Array of PUDO locker locations (normalized)
   */
  async findNearbyLockers(search, options = {}) {
    try {
      if (!this.apiKey) {
        throw new Error('Shiplogic API key is not configured');
      }

      const params = new URLSearchParams();

      if (options.type || options.types) {
        if (options.type) params.set('type', options.type);
        if (options.types) params.set('types', options.types);
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

      const passthroughKeys = ['min_lat', 'max_lat', 'min_lng', 'max_lng', 'order_closest', 'types', 'type'];
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
          console.error('PUDO locker parse error:', { error: parseError, snippet: rawText.slice(0, 200) });
          if (response.ok) {
            const malformedError = new Error('Shiplogic returned malformed JSON response');
            malformedError.status = response.status;
            malformedError.details = rawText;
            throw malformedError;
          }
        }
      }

      if (!response.ok) {
        const message = data?.message || data?.error || data?.errors?.[0]?.message || rawText || `Shiplogic pickup-point request failed (${response.status})`;
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

      // Normalize the response into a consistent array of locker objects
      const rawLockers = extractLockerResults(data);
      return rawLockers.map(normalizePickupPoint).filter(Boolean);
    } catch (error) {
      console.error('PUDO locker search error:', error);
      throw error;
    }
  }
}

/**
 * Helper: extract locker array from various Shiplogic response shapes
 */
const extractLockerResults = (payload, depth = 0) => {
  if (!payload || depth > 5) return [];

  if (Array.isArray(payload)) return payload;

  const candidateKeys = ['results', 'data', 'items', 'pickup_points', 'pickupPoints', 'lockers'];
  for (const key of candidateKeys) {
    if (!Object.prototype.hasOwnProperty.call(payload, key)) continue;
    const value = payload[key];
    if (Array.isArray(value)) return value;
    if (value && typeof value === 'object') {
      const nested = extractLockerResults(value, depth + 1);
      if (nested.length) return nested;
    }
  }

  if (typeof payload === 'object') {
    for (const value of Object.values(payload)) {
      if (!value || typeof value !== 'object') continue;
      const nested = extractLockerResults(value, depth + 1);
      if (nested.length) return nested;
    }
  }

  return [];
};

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
        headers: { 'api_key': this.apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          franchisecode: this.franchiseCode,
          destination: { type: shipment.to.type || 'residential', postal_code: shipment.to.postalCode, suburb: shipment.to.suburb },
          items: shipment.parcels.map(p => ({ references: [p.reference || ''], weight: p.weight || p.weightKg || 1, length: p.length || p.lengthCm || 30, width: p.width || p.widthCm || 30, height: p.height || p.heightCm || 30 })),
        }),
      });
      if (!response.ok) throw new Error('Failed to get Fastway quote');
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
        headers: { 'api_key': this.apiKey, 'Content-Type': 'application/json' },
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
      if (!response.ok) throw new Error('Failed to create Fastway shipment');
      return await response.json();
    } catch (error) {
      console.error('Fastway shipment error:', error);
      throw error;
    }
  }

  async trackShipment(trackingNumber) {
    try {
      const response = await fetch(`${this.apiUrl}/v4/tracktrace/detail/${trackingNumber}`, { headers: { 'api_key': this.apiKey } });
      if (!response.ok) throw new Error('Failed to track shipment');
      return await response.json();
    } catch (error) {
      console.error('Fastway tracking error:', error);
      throw error;
    }
  }
}

/**
 * PUDO Locker Integration
 * Uses Shiplogic API for locker discovery and delivery management.
 * PUDO lockers are a subsidiary of The Courier Guy, so they share
 * the same Shiplogic /shipments endpoint with pickup-point fields.
 */
export class PUDOLockerService {
  constructor() {
    this.apiKey = process.env.PUDO_API_KEY
    this.apiUrl = process.env.PUDO_API_URL || process.env.COURIER_GUY_API_URL || process.env.SHIPLOGIC_API_URL || 'https://api.shiplogic.com';
  }

  /**
   * Find nearby PUDO lockers via Shiplogic pickup-points API
   * @param {string} search - Search term (city, postal code, or location)
   * @param {Object} options - Additional search options
   * @returns {Array} Array of normalized PUDO locker locations
   */
  async findNearbyLockers(search, options = {}) {
    try {
      if (!this.apiKey) {
        throw new Error('Shiplogic API key is not configured');
      }

      const params = new URLSearchParams();
      if (options.type || options.types) {
        if (options.type) params.set('type', options.type);
        if (options.types) params.set('types', options.types);
      } else {
        params.set('type', 'locker');
      }

      if (options.lat && options.lng) {
        params.set('lat', options.lat);
        params.set('lng', options.lng);
        if (options.order_closest) params.set('order_closest', String(options.order_closest));
      }

      const passthroughKeys = ['min_lat', 'max_lat', 'min_lng', 'max_lng', 'order_closest', 'types', 'type'];
      for (const key of passthroughKeys) {
        if (options[key] && !params.has(key)) params.set(key, options[key]);
      }

      if (search) params.set('search', search);

      const query = params.toString();
      const response = await fetch(
        `${this.apiUrl}/pickup-points${query ? `?${query}` : ''}`,
        { headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Accept': 'application/json' } }
      );

      const text = await response.text();
      const rawText = typeof text === 'string' ? text.trim() : '';
      const contentType = response.headers.get('content-type') || '';
      let data = null;

      if (rawText && contentType.includes('application/json')) {
        try {
          data = JSON.parse(rawText);
        } catch (parseError) {
          console.error('PUDO locker parse error:', { error: parseError, snippet: rawText.slice(0, 200) });
          if (response.ok) {
            const malformedError = new Error('Shiplogic returned malformed JSON response');
            malformedError.status = response.status;
            malformedError.details = rawText;
            throw malformedError;
          }
        }
      }

      if (!response.ok) {
        const message = data?.message || data?.error || data?.errors?.[0]?.message || rawText || `Shiplogic pickup-point request failed (${response.status})`;
        const error = new Error(message);
        error.status = response.status;
        throw error;
      }

      if (!data) {
        if (rawText) throw new Error(`Unexpected Shiplogic pickup-point response: ${rawText.slice(0, 160)}`);
        return [];
      }

      const rawLockers = extractLockerResults(data);
      return rawLockers.map(normalizePickupPoint).filter(Boolean);
    } catch (error) {
      console.error('PUDO locker search error:', error);
      throw error;
    }
  }

  /**
   * Create a PUDO locker-to-locker shipment using Shiplogic /shipments endpoint.
   * This replaces the old createDelivery method with the correct Shiplogic PUDO format.
   *
   * Required order fields:
   *   order.collectionLocker.pickupPointId  - Seller's drop-off locker ID
   *   order.deliveryLocker.pickupPointId    - Buyer's collection locker ID
   *   order.collectionContact               - Seller contact info
   *   order.deliveryContact                 - Buyer contact info
   *   order.lockerSize                       - 'XS', 'S', 'M', or 'L'
   *
   * @param {Object} order - Order data with locker and contact details
   * @param {Object} service - Service details (lockerSize, service_level_code, etc.)
   * @returns {Object} Shiplogic shipment response
   */
  async createDelivery(order, service = {}) {
    try {
      const lockerSize = service.lockerSize || order.lockerSize || 'M';
      const size = lockerSize.toUpperCase();
      const locker = LOCKER_SIZES[size];

      if (!locker) {
        throw new Error(`Invalid locker size: ${lockerSize}. Must be one of: XS, S, M, L`);
      }

      const collectionPickupPointId = order.collectionLocker?.pickupPointId || service.collectionLockerId;
      const deliveryPickupPointId = order.deliveryLocker?.pickupPointId || service.deliveryLockerId || service.lockerId;

      if (!collectionPickupPointId) {
        throw new Error('Collection locker pickup_point_id is required for PUDO delivery');
      }
      if (!deliveryPickupPointId) {
        throw new Error('Delivery locker pickup_point_id is required for PUDO delivery');
      }

      const collectionContact = formatShiplogicContact(order.collectionContact, {
        name: 'Sender',
      });
      const deliveryContact = formatShiplogicContact(order.deliveryContact, {
        name: 'Recipient',
      });

      const serviceLevelCode = service.service_level_code || locker.service_level_code;

      const payload = {
        collection_pickup_point_id: String(collectionPickupPointId),
        collection_pickup_point_provider: order.collectionLocker?.pickupPointProvider || 'tcg-locker',
        collection_contact: collectionContact,
        delivery_pickup_point_id: String(deliveryPickupPointId),
        delivery_pickup_point_provider: order.deliveryLocker?.pickupPointProvider || 'tcg-locker',
        delivery_contact: deliveryContact,
        parcels: formatLockerParcel(lockerSize),
        declared_value: 0,
        collection_min_date: formatIsoDate(order.collectionDate),
        collection_after: order.collectionAfter || '08:00',
        collection_before: order.collectionBefore || '16:00',
        delivery_min_date: formatIsoDate(order.deliveryDate),
        delivery_after: order.deliveryAfter || '10:00',
        delivery_before: order.deliveryBefore || '17:00',
        customer_reference: order.orderNumber,
        service_level_code: serviceLevelCode,
        mute_notifications: !!order.muteNotifications,
      };

      if (service.service_level_id) payload.service_level_id = service.service_level_id;
      if (service.rating_reference) payload.rating_reference = service.rating_reference;

      console.log(`📦 PUDO locker shipment via Shiplogic:`, {
        orderNumber: order.orderNumber,
        lockerSize: size,
        serviceLevel: payload.service_level_code,
        collection: { pickupPointId: payload.collection_pickup_point_id, contact: payload.collection_contact.name },
        delivery: { pickupPointId: payload.delivery_pickup_point_id, contact: payload.delivery_contact.name },
      });

      const response = await fetch(`${this.apiUrl}/shipments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const text = await response.text();
      let data = null;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error(`Shiplogic PUDO shipment error: ${response.status} - ${text.substring(0, 200)}`);
      }

      if (!response.ok) {
        const message = data?.message || data?.error || data?.errors?.[0]?.message || `PUDO shipment failed (${response.status})`;
        throw new Error(message);
      }

      return data;
    } catch (error) {
      console.error('PUDO delivery error:', error);
      throw error;
    }
  }

  async trackDelivery(trackingNumber) {
    try {
      const response = await fetch(
        `${this.apiUrl}/shipments?tracking_reference=${encodeURIComponent(trackingNumber)}`,
        { headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Accept': 'application/json' } }
      );
      if (!response.ok) throw new Error('Failed to track PUDO delivery');
      const data = await response.json();
      const shipments = Array.isArray(data) ? data : data?.shipments || data?.results || data?.data || [];
      if (Array.isArray(shipments) && shipments.length) return shipments[0];
      return data;
    } catch (error) {
      console.error('PUDO tracking error:', error);
      throw error;
    }
  }
}

/**
 * CourierServiceManager - unified interface for all courier providers.
 *
 * PUDO lockers are handled through CourierGuy/Shiplogic with specific locker dimensions.
 * When provider='pudo', the manager routes to PUDOLockerService which uses the
 * Shiplogic /shipments endpoint with pickup-point fields.
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
        quotes.push({ provider: 'courier-guy', name: 'The Courier Guy', ...courierGuyQuotes });
      }
    } catch (error) {
      console.error('Courier Guy quote failed:', error);
    }
    try {
      const fastwayQuote = await this.fastway.getQuote(shipment);
      quotes.push({ provider: 'fastway', name: 'Fastway Couriers', ...fastwayQuote });
    } catch (error) {
      console.error('Fastway quote failed:', error);
    }
    return quotes.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
  }

  /**
   * Create a shipment with the specified provider.
   * For PUDO locker shipments, pass provider='pudo' with:
   *   service.lockerSize - 'XS', 'S', 'M', 'L'
   *   service.collectionLockerId - Seller's drop-off locker pickup_point_id
   *   service.deliveryLockerId - Buyer's collection locker pickup_point_id
   *   order.deliveryLocker - Buyer's locker details
   *   order.collectionLocker - Seller's locker details
   */
  async createShipment(provider, order, service) {
    switch (provider) {
      case 'courier-guy':
        return await this.courierGuy.createShipment(order, service);
      case 'pudo':
        return await this.pudo.createDelivery(order, service);
      case 'fastway':
        return await this.fastway.createShipment(order, service);
      default:
        throw new Error('Invalid courier provider');
    }
  }

  /**
   * Create a PUDO locker-to-locker shipment.
   * Convenience method that wraps createShipment('pudo', ...).
   *
   * @param {Object} order - Order data with collectionLocker, deliveryLocker, contacts
   * @param {string} lockerSize - 'XS', 'S', 'M', 'L'
   * @param {Object} selectedService - Optional service level overrides
   */
  async createPUDOShipment(order, lockerSize = 'M', selectedService = {}) {
    return await this.courierGuy.createLockerShipment(order, lockerSize, selectedService);
  }

  async trackShipment(provider, trackingNumber) {
    switch (provider) {
      case 'courier-guy':
        return await this.courierGuy.trackShipment(trackingNumber);
      case 'pudo':
        return await this.pudo.trackDelivery(trackingNumber);
      case 'fastway':
        return await this.fastway.trackShipment(trackingNumber);
      default:
        throw new Error('Invalid courier provider');
    }
  }
}

// Create a Shiplogic shipment directly from an order document
export async function createShiplogicShipmentFromOrder(order) {
  const service = new CourierGuyService();
  const serviceLevelCode = order?.courierQuote?.serviceCode || order?.courierQuote?.service_code || order?.courierQuote?.service_level_code || 'LOF';
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

  const missingFields = [];
  if (!collectionAddress.street_address) missingFields.push('collectionAddress.street_address');
  if (!collectionAddress.city) missingFields.push('collectionAddress.city');
  if (!collectionAddress.zone) missingFields.push('collectionAddress.zone');
  if (!deliveryAddress.street_address) missingFields.push('deliveryAddress.street_address');
  if (!deliveryAddress.city) missingFields.push('deliveryAddress.city');
  if (!deliveryAddress.zone) missingFields.push('deliveryAddress.zone');
  if (!deliveryAddress.name) missingFields.push('deliveryAddress.name');
  if (!parcels?.length) missingFields.push('parcels');

  if (missingFields.length > 0) {
    const error = `Missing required fields for Shiplogic shipment: ${missingFields.join(', ')}`;
    console.error(`❌ ${error}`, { orderNumber: order?.orderNumber, orderId: order?._id });
    throw new Error(error);
  }

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

  console.log(`📋 Shipment payload for ${order?.orderNumber}:`, {
    collection: { address: `${collectionAddress.street_address}, ${collectionAddress.city}, ${collectionAddress.zone}`, contact: collectionAddress.name },
    delivery: { address: `${deliveryAddress.street_address}, ${deliveryAddress.city}, ${deliveryAddress.zone}`, contact: deliveryAddress.name },
    parcels: parcels.length,
    declared_value: shipmentPayload.declaredValue,
    service_level_code: serviceLevelCode,
  });

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

/**
 * Create a Shiplogic PUDO locker shipment directly from an order document.
 * Used when order.fulfillmentOption === 'pudo' and both lockers are selected.
 */
export async function createPUDOShipmentFromOrder(order) {
  const service = new CourierGuyService();

  const lockerSize = order?.lockerDetails?.lockerSize || 'M';
  const collectionLocker = order?.collectionLocker;
  const deliveryLocker = order?.lockerDetails;

  if (!collectionLocker?.pickupPointId) {
    throw new Error('Collection locker pickup_point_id is required. Seller must select a drop-off locker first.');
  }
  if (!deliveryLocker?.pickupPointId) {
    throw new Error('Delivery locker pickup_point_id is required. Buyer must select a collection locker first.');
  }

  const shipmentPayload = {
    orderNumber: order?.orderNumber,
    collectionLocker: {
      pickupPointId: collectionLocker.pickupPointId,
      pickupPointProvider: collectionLocker.pickupPointProvider || 'tcg-locker',
      name: collectionLocker.lockerName,
    },
    deliveryLocker: {
      pickupPointId: deliveryLocker.pickupPointId,
      pickupPointProvider: deliveryLocker.pickupPointProvider || 'tcg-locker',
      name: deliveryLocker.lockerName,
    },
    collectionContact: {
      name: order?.sellerName || order?.sellerAddressSnapshot?.name || 'Sender',
      email: order?.sellerAddressSnapshot?.email,
      phone: order?.sellerAddressSnapshot?.phone,
      mobile_number: order?.sellerAddressSnapshot?.phone,
    },
    deliveryContact: {
      name: order?.shippingAddress?.fullName || 'Recipient',
      email: order?.shippingAddress?.email || order?.buyerEmail,
      phone: order?.shippingAddress?.phone,
      mobile_number: order?.shippingAddress?.phone,
    },
    declaredValue: order?.total || order?.subtotal || 0,
    collectionDate: order?.confirmedAt || order?.createdAt,
    deliveryDate: order?.estimatedDelivery,
    lockerSize,
  };

  console.log(`📦 PUDO shipment payload for ${order?.orderNumber}:`, {
    collection: { pickupPointId: collectionLocker.pickupPointId, name: collectionLocker.lockerName },
    delivery: { pickupPointId: deliveryLocker.pickupPointId, name: deliveryLocker.lockerName },
    lockerSize,
  });

  const response = await service.createLockerShipment(shipmentPayload, lockerSize);
  const trackingReference = response?.short_tracking_reference || response?.tracking_reference || response?.tracking_reference_number;

  return {
    raw: response,
    trackingReference,
    shipmentId: response?.id || response?.shipment_id,
    parcelTrackingReferences: response?.parcel_tracking_references,
    labelUrl: response?.label_url || response?.label || null,
  };
}

/**
 * Determine the appropriate PUDO locker size based on cart items
 * @param {Array} items - Array of products with dimensions (length, width, height in cm) and weight (in kg)
 * @returns {string} Locker size key: 'XS', 'S', 'M', 'L'
 */
export const calculateRequiredLockerSize = (items = []) => {
  if (!items || !Array.isArray(items) || items.length === 0) return 'M';

  let totalWeight = 0;
  let totalVolume = 0;

  let maxItemLength = 0;
  let maxItemWidth = 0;
  let totalStackedHeight = 0;

  for (const item of items) {
    const weight = toNumber(item.weight || item.weightKg || item.shippingWeight, 0);
    totalWeight += weight;

    const l = toNumber(item.length || item.lengthCm || item.submitted_length_cm, 10);
    const w = toNumber(item.width || item.widthCm || item.submitted_width_cm, 10);
    const h = toNumber(item.height || item.heightCm || item.submitted_height_cm, 10);

    totalVolume += (l * w * h);

    // Sort dimensions largest to smallest to find best fit orientation
    const dims = [l, w, h].sort((a, b) => b - a);

    maxItemLength = Math.max(maxItemLength, dims[0]);
    maxItemWidth = Math.max(maxItemWidth, dims[1]);
    totalStackedHeight += dims[2]; // Stack on the smallest dimension
  }

  const sizes = ['XS', 'S', 'M', 'L'];

  for (const size of sizes) {
    const locker = LOCKER_SIZES[size];
    // Sort locker dimensions largest to smallest
    const lockerDims = [locker.length, locker.width, locker.height].sort((a, b) => b - a);

    const canFitWeight = totalWeight <= locker.weight;

    const canFitDims =
      maxItemLength <= lockerDims[0] &&
      maxItemWidth <= lockerDims[1] &&
      totalStackedHeight <= lockerDims[2];

    const lockerVolume = locker.length * locker.width * locker.height;
    const canFitVolume = totalVolume <= lockerVolume;

    if (canFitWeight && canFitDims && canFitVolume) {
      return size;
    }
  }

  // If it doesn't fit in any locker, return 'L' as fallback
  console.warn('📦 Items exceed maximum locker size dimensions. Defaulting to L.');
  return 'L';
};

// Export PUDO locker utilities
export { LOCKER_SIZES, formatLockerParcel, normalizePickupPoint, extractLockerResults, calculateRequiredLockerSize };