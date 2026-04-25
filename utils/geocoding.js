// utils/geocoding.js

/**
 * Geocode an address to latitude/longitude coordinates
 * Uses multiple providers with fallback for reliability
 */

// Option 1: Nominatim (OpenStreetMap) - Free, no API key needed
async function geocodeWithNominatim(address) {
  try {
    const encodedAddress = encodeURIComponent(address);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1`,
      {
        headers: {
          'User-Agent': 'YourAppName/1.0' // Required by Nominatim
        }
      }
    );
    
    if (!response.ok) throw new Error('Nominatim request failed');
    
    const data = await response.json();
    
    if (data && data.length > 0) {
      return {
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon),
        displayName: data[0].display_name,
        provider: 'nominatim'
      };
    }
    
    return null;
  } catch (error) {
    console.error('Nominatim geocoding error:', error);
    return null;
  }
}

// Option 2: LocationIQ - Free tier: 5000 requests/day
async function geocodeWithLocationIQ(address, apiKey) {
  try {
    const encodedAddress = encodeURIComponent(address);
    const response = await fetch(
      `https://us1.locationiq.com/v1/search.php?key=${apiKey}&q=${encodedAddress}&format=json&limit=1`
    );
    
    if (!response.ok) throw new Error('LocationIQ request failed');
    
    const data = await response.json();
    
    if (data && data.length > 0) {
      return {
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon),
        displayName: data[0].display_name,
        provider: 'locationiq'
      };
    }
    
    return null;
  } catch (error) {
    console.error('LocationIQ geocoding error:', error);
    return null;
  }
}

// Option 3: Google Maps Geocoding API
async function geocodeWithGoogle(address, apiKey) {
  try {
    const encodedAddress = encodeURIComponent(address);
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`
    );
    
    if (!response.ok) throw new Error('Google geocoding request failed');
    
    const data = await response.json();
    
    if (data.status === 'OK' && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      return {
        latitude: location.lat,
        longitude: location.lng,
        displayName: data.results[0].formatted_address,
        provider: 'google'
      };
    }
    
    return null;
  } catch (error) {
    console.error('Google geocoding error:', error);
    return null;
  }
}

// Option 4: Mapbox Geocoding API
async function geocodeWithMapbox(address, apiKey) {
  try {
    const encodedAddress = encodeURIComponent(address);
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${apiKey}&limit=1`
    );
    
    if (!response.ok) throw new Error('Mapbox geocoding request failed');
    
    const data = await response.json();
    
    if (data.features && data.features.length > 0) {
      const [lng, lat] = data.features[0].center;
      return {
        latitude: lat,
        longitude: lng,
        displayName: data.features[0].place_name,
        provider: 'mapbox'
      };
    }
    
    return null;
  } catch (error) {
    console.error('Mapbox geocoding error:', error);
    return null;
  }
}

/**
 * Main geocoding function with fallback providers
 * Tries providers in order until one succeeds
 */
export async function geocodeAddress(address, options = {}) {
  const {
    googleApiKey = process.env.GOOGLE_MAPS_API_KEY,
    mapboxApiKey = process.env.NEXT_PUBLIC_MAPBOX_TOKEN,
    locationiqApiKey = process.env.LOCATIONIQ_API_KEY,
    preferredProvider = 'mapbox'
  } = options;

  // Build full address string from components
  const fullAddress = typeof address === 'string' 
    ? address 
    : [address.address, address.city, address.province, address.zipCode, address.country]
        .filter(Boolean)
        .join(', ');

  if (!fullAddress || fullAddress.trim().length < 3) {
    throw new Error('Invalid address provided');
  }

  // Try providers in order based on preference and available API keys
  const providers = [];
  
  if (preferredProvider === 'google' && googleApiKey) {
    providers.push(() => geocodeWithGoogle(fullAddress, googleApiKey));
  }
  
  if (preferredProvider === 'mapbox' && mapboxApiKey) {
    providers.push(() => geocodeWithMapbox(fullAddress, mapboxApiKey));
  }
  
  if (locationiqApiKey) {
    providers.push(() => geocodeWithLocationIQ(fullAddress, locationiqApiKey));
  }
  
  // Always add Nominatim as fallback (free, no key needed)
  providers.push(() => geocodeWithNominatim(fullAddress));

  // Try each provider until one succeeds
  for (const provider of providers) {
    try {
      const result = await provider();
      if (result) {
        console.log(`Geocoded with ${result.provider}:`, result);
        return result;
      }
    } catch (error) {
      console.error('Provider failed, trying next...', error);
      continue;
    }
  }

  throw new Error('All geocoding providers failed');
}

/**
 * Reverse geocode: Convert coordinates to address
 */
export async function reverseGeocode(latitude, longitude, options = {}) {
  const {
    locationiqApiKey = process.env.LOCATIONIQ_API_KEY,
  } = options;

  try {
    // Using Nominatim for reverse geocoding (free)
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
      {
        headers: {
          'User-Agent': 'YourAppName/1.0'
        }
      }
    );
    
    if (!response.ok) throw new Error('Reverse geocoding failed');
    
    const data = await response.json();
    
    if (data && data.address) {
      return {
        address: data.display_name,
        city: data.address.city || data.address.town || data.address.village,
        province: data.address.state,
        country: data.address.country,
        zipCode: data.address.postcode
      };
    }
    
    return null;
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return null;
  }
}

/**
 * Batch geocode multiple addresses
 * Includes rate limiting to respect API limits
 */
export async function batchGeocode(addresses, options = {}) {
  const {
    delayMs = 1000, // 1 second delay between requests (Nominatim requirement)
    ...geocodeOptions
  } = options;

  const results = [];
  
  for (const address of addresses) {
    try {
      const result = await geocodeAddress(address, geocodeOptions);
      results.push({ address, ...result, success: true });
    } catch (error) {
      results.push({ address, error: error.message, success: false });
    }
    
    // Rate limiting delay
    if (addresses.indexOf(address) < addresses.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  return results;
}

/**
 * Validate South African address format
 */
export function validateSAAddress(address) {
  const errors = [];
  
  if (!address.city) errors.push('City is required');
  if (!address.province) errors.push('Province is required');
  
  const validProvinces = [
    'Gauteng', 'Western Cape', 'KwaZulu-Natal', 'Eastern Cape',
    'Free State', 'Limpopo', 'Mpumalanga', 'Northern Cape', 'North West'
  ];
  
  if (address.province && !validProvinces.includes(address.province)) {
    errors.push('Invalid province');
  }
  
  if (address.zipCode && !/^\d{4}$/.test(address.zipCode)) {
    errors.push('ZIP code must be 4 digits');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}