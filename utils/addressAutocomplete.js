/**
 * Address autocomplete using Mapbox Geocoding API
 * Restricted to South Africa
 */

export async function searchAddresses(query, country = 'South Africa') {
  if (!query || query.length < 3) {
    return [];
  }

  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  
  if (!mapboxToken) {
    console.error('Mapbox token not configured');
    return [];
  }

  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?` +
      `access_token=${mapboxToken}&` +
      `country=za&` +
      `limit=10&` +
      `autocomplete=true`,
      {
        method: 'GET',
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch addresses from Mapbox');
    }

    const data = await response.json();

    if (!data.features || !Array.isArray(data.features)) {
      return [];
    }

    // Map Mapbox results to our format
    return data.features.map((result) => ({
      label: result.place_name,
      value: result.place_name,
      lat: result.center[1], // Mapbox returns [lng, lat]
      lon: result.center[0],
      address: result,
    }));
  } catch (error) {
    console.error('Address autocomplete error:', error);
    return [];
  }
}

/**
 * Extract city, province, and zip from Mapbox address components
 */
export function extractAddressComponents(selectedAddress) {
  const components = {
    address: '',
    city: '',
    province: '',
    zipCode: '',
    country: 'South Africa',
  };

  // If it's a Mapbox feature object with context
  if (selectedAddress.address && selectedAddress.address.context) {
    const context = selectedAddress.address.context;
    
    // Extract from Mapbox context array
    context.forEach(item => {
      const id = item.id.split('.')[0];
      
      if (id === 'postcode') {
        components.zipCode = item.text;
      } else if (id === 'place') {
        components.city = item.text;
      } else if (id === 'region') {
        // Map Mapbox region to our province names
        const provinceMap = {
          'gauteng': 'Gauteng',
          'western cape': 'Western Cape',
          'kwazulu-natal': 'KwaZulu-Natal',
          'kwazulu natal': 'KwaZulu-Natal',
          'eastern cape': 'Eastern Cape',
          'free state': 'Free State',
          'limpopo': 'Limpopo',
          'mpumalanga': 'Mpumalanga',
          'northern cape': 'Northern Cape',
          'north west': 'North West',
          'northwest': 'North West',
        };
        
        const regionLower = item.text.toLowerCase();
        components.province = provinceMap[regionLower] || item.text;
      }
    });
    
    // Use the full place_name as address
    components.address = selectedAddress.label || selectedAddress.address.place_name;
  } else {
    // Fallback: Parse from label string
    const label = typeof selectedAddress === 'string' ? selectedAddress : selectedAddress.label;
    components.address = label;
    
    const parts = label.split(',').map(p => p.trim());
    
    const provinceMap = {
      'gauteng': 'Gauteng',
      'western cape': 'Western Cape',
      'kwazulu-natal': 'KwaZulu-Natal',
      'kwazulu natal': 'KwaZulu-Natal',
      'eastern cape': 'Eastern Cape',
      'free state': 'Free State',
      'limpopo': 'Limpopo',
      'mpumalanga': 'Mpumalanga',
      'northern cape': 'Northern Cape',
      'north west': 'North West',
      'northwest': 'North West',
    };

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i].toLowerCase().trim();
      
      // Check for province
      for (const [key, value] of Object.entries(provinceMap)) {
        if (part.includes(key)) {
          components.province = value;
          break;
        }
      }
      
      // Check for postal code (4 digits)
      if (/^\d{4}$/.test(parts[i])) {
        components.zipCode = parts[i];
      }
      
      // Extract city (usually appears before province)
      if (!components.city && i > 0 && i < parts.length - 1) {
        if (!/^\d/.test(parts[i]) && !part.includes('south africa')) {
          let isProvince = false;
          for (const key of Object.keys(provinceMap)) {
            if (part.includes(key)) {
              isProvince = true;
              break;
            }
          }
          if (!isProvince && !/^\d{4}$/.test(parts[i])) {
            components.city = parts[i];
          }
        }
      }
    }
  }

  return components;
}
