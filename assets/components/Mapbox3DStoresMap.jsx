"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Layers, RotateCcw, MapPin, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Link from 'next/link';

// Set Mapbox access token
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export default function Mapbox3DStoresMap({ stores = [], onStoreSelect }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markers = useRef([]);
  const initialBoundsSet = useRef(false);
  
  const [mapStyle, setMapStyle] = useState('dawn');
  const [showStyleMenu, setShowStyleMenu] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [hoveredStore, setHoveredStore] = useState(null);
  const [selectedStore, setSelectedStore] = useState(null);
  const layersButtonRef = useRef(null);
  const styleMenuRef = useRef(null);
  const { theme, resolvedTheme } = useTheme();
  
  // Mapbox Standard styles with different lighting presets
  const mapStyles = {
    'dawn': {
      name: 'Dawn',
      description: 'Soft morning light',
      lightPreset: 'dawn'
    },
    'day': {
      name: 'Day',
      description: 'Bright daylight',
      lightPreset: 'day'
    },
    'dusk': {
      name: 'Dusk',
      description: 'Evening golden hour',
      lightPreset: 'dusk'
    },
    'night': {
      name: 'Night',
      description: 'Night time view',
      lightPreset: 'night'
    }
  };

  // Filter stores with valid coordinates
  const storesWithCoordinates = stores.filter(
    store => store.latitude && store.longitude
  );

  // Close style menu when clicking outside
  useEffect(() => {
    const handleClick = (e) => {
      if (!showStyleMenu) return;
      const btn = layersButtonRef.current;
      const menu = styleMenuRef.current;
      if (btn && btn.contains(e.target)) return;
      if (menu && menu.contains(e.target)) return;
      setShowStyleMenu(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showStyleMenu]);

  // Respond to theme changes: use dusk for dark theme, dawn for light
  useEffect(() => {
    const isDark = (resolvedTheme || theme) === 'dark';
    const newStyle = isDark ? 'dusk' : 'dawn';
    setMapStyle(newStyle);
    
    if (map.current && mapLoaded) {
      updateLightPreset(newStyle);
    }
  }, [resolvedTheme, theme, mapLoaded]);

  // Update the light preset without reloading the map
  const updateLightPreset = (style) => {
    if (!map.current) return;
    
    try {
      map.current.setConfigProperty('basemap', 'lightPreset', mapStyles[style].lightPreset);
    } catch (err) {
      console.warn('Failed to set light preset:', err);
    }
  };

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || storesWithCoordinates.length === 0) return;
    if (!mapboxgl.accessToken) {
      console.error('Mapbox token not configured');
      return;
    }

    if (!map.current) {
      const isDark = (resolvedTheme || theme) === 'dark';
      const initialStyle = isDark ? 'dusk' : 'dawn';
      
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/standard',
        center: [28.0473, -26.2041], // South Africa center
        zoom: 5,
        pitch: 45, // Enable 3D perspective
        bearing: -17.6,
        antialias: true,
        attributionControl: true
      });

      map.current.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'top-right');
      map.current.addControl(new mapboxgl.ScaleControl(), 'bottom-right');
      
      // Add geolocate control
      map.current.addControl(
        new mapboxgl.GeolocateControl({
          positionOptions: {
            enableHighAccuracy: true
          },
          trackUserLocation: true,
          showUserHeading: true
        }),
        'top-right'
      );

      // Add fullscreen control
      map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right');

      map.current.on('style.load', () => {
        setMapLoaded(true);
        
        // Set initial light preset
        try {
          map.current.setConfigProperty('basemap', 'lightPreset', mapStyles[initialStyle].lightPreset);
          // Enable 3D buildings
          map.current.setConfigProperty('basemap', 'showPlaceLabels', true);
          map.current.setConfigProperty('basemap', 'showPointOfInterestLabels', true);
          map.current.setConfigProperty('basemap', 'showRoadLabels', true);
          map.current.setConfigProperty('basemap', 'showTransitLabels', true);
        } catch (err) {
          console.warn('Failed to set initial config:', err);
        }
      });
    }

    return () => {
      // Cleanup on unmount
    };
  }, [storesWithCoordinates.length, resolvedTheme, theme]);

  // Add markers when map is loaded
  useEffect(() => {
    if (!map.current || !mapLoaded || storesWithCoordinates.length === 0) return;

    // Clear existing markers
    markers.current.forEach(marker => marker.remove());
    markers.current = [];

    const bounds = new mapboxgl.LngLatBounds();

    storesWithCoordinates.forEach((store) => {
      // Create custom marker element
      const el = document.createElement('div');
      el.className = 'mapbox-3d-marker';
      el.innerHTML = `
        <div class="marker-pin">
          <svg width="30" height="38" viewBox="0 0 40 50" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <filter id="shadow-${store._id}" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.3"/>
              </filter>
              <linearGradient id="gradient-${store._id}" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:#34d399;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#10b981;stop-opacity:1" />
              </linearGradient>
            </defs>
            <path d="M20 0C8.954 0 0 8.954 0 20c0 11.046 20 30 20 30s20-18.954 20-30C40 8.954 31.046 0 20 0z" 
                  fill="url(#gradient-${store._id})" filter="url(#shadow-${store._id})"/>
            <circle cx="20" cy="18" r="8" fill="white"/>
            <circle cx="20" cy="18" r="4" fill="#10b981"/>
          </svg>
        </div>
      `;
      el.style.width = '30px';
      el.style.height = '38px';
      el.style.cursor = 'pointer';

      el.addEventListener('mouseenter', () => {
        el.classList.add('marker-hovered');
        setHoveredStore(store);
      });

      el.addEventListener('mouseleave', () => {
        el.classList.remove('marker-hovered');
        setHoveredStore(null);
      });

      el.addEventListener('click', () => {
        setSelectedStore(store);
        onStoreSelect?.(store._id);
        
        // Fly to the store location
        map.current.flyTo({
          center: [store.longitude, store.latitude],
          zoom: 14,
          pitch: 60,
          duration: 1000
        });
      });

      const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([store.longitude, store.latitude])
        .addTo(map.current);

      markers.current.push(marker);
      bounds.extend([store.longitude, store.latitude]);
    });

    // Fit bounds with 3D perspective - only on initial load
    if (storesWithCoordinates.length > 0 && !initialBoundsSet.current) {
      map.current.fitBounds(bounds, {
        padding: { top: 80, bottom: 80, left: 80, right: 80 },
        maxZoom: 14,
        pitch: 45,
        bearing: -17.6
      });
      initialBoundsSet.current = true;
    }

    return () => {
      markers.current.forEach(marker => marker.remove());
      markers.current = [];
    };
  }, [storesWithCoordinates, onStoreSelect, mapLoaded]);

  // Change map style
  const changeMapStyle = (style) => {
    setMapStyle(style);
    updateLightPreset(style);
    setShowStyleMenu(false);
  };

  // Close selected store card and zoom out
  const handleCloseSelectedStore = () => {
    setSelectedStore(null);
    
    // Zoom out to show all stores
    if (map.current && storesWithCoordinates.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      storesWithCoordinates.forEach(store => {
        bounds.extend([store.longitude, store.latitude]);
      });
      
      map.current.fitBounds(bounds, {
        padding: { top: 80, bottom: 80, left: 80, right: 80 },
        maxZoom: 14,
        pitch: 45,
        bearing: -17.6,
        duration: 1000
      });
    }
  };

  // Reset map view
  const resetView = () => {
    if (!map.current || storesWithCoordinates.length === 0) return;
    
    const bounds = new mapboxgl.LngLatBounds();
    storesWithCoordinates.forEach(store => {
      bounds.extend([store.longitude, store.latitude]);
    });
    
    map.current.fitBounds(bounds, {
      padding: { top: 80, bottom: 80, left: 80, right: 80 },
      maxZoom: 14,
      pitch: 45,
      bearing: -17.6,
      duration: 1500
    });
  };

  if (storesWithCoordinates.length === 0) {
    return (
      <Card className="p-8 mt-10 text-center bg-gray-50 dark:bg-zinc-900">
        <p className="text-gray-500 dark:text-gray-400">
          No stores with location data available for map view
        </p>
      </Card>
    );
  }

  return (
    <div className="relative w-full h-full">
      {/* Controls */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        {/* Style Selector */}
        <div className="relative">
          <Button
            ref={layersButtonRef}
            onClick={() => setShowStyleMenu((s) => !s)}
            className="bg-white dark:bg-zinc-900 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 shadow-lg"
            size="icon"
            variant="outline"
            title="Change lighting"
          >
            <Layers className="h-4 w-4" />
          </Button>
          
          {showStyleMenu && (
            <div 
              ref={styleMenuRef} 
              className="absolute left-0 top-full mt-2 bg-white dark:bg-zinc-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-2 min-w-[160px]"
            >
              <p className="text-xs text-gray-500 dark:text-gray-400 px-3 py-1 font-medium">Lighting</p>
              {Object.entries(mapStyles).map(([key, { name, description }]) => (
                <button
                  key={key}
                  onClick={() => changeMapStyle(key)}
                  className={`block w-full text-left px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-zinc-800 text-sm transition-colors ${
                    mapStyle === key ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300' : ''
                  }`}
                >
                  <span className="font-medium">{name}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">{description}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Reset View Button */}
        <Button
          onClick={resetView}
          className="bg-white dark:bg-zinc-900 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 shadow-lg"
          size="icon"
          variant="outline"
          title="Reset view"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      {/* Store Count Legend */}
      <div className="absolute bottom-4 left-4 z-10 bg-white dark:bg-zinc-900 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 text-sm">
          <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
          <span className="text-gray-700 dark:text-gray-300">{storesWithCoordinates.length} Stores</span>
        </div>
      </div>

      {/* Hovered Store Card - Hidden on mobile */}
      {hoveredStore && !selectedStore && (
        <div className="hidden md:block absolute top-4 right-4 z-10 w-72 animate-in fade-in slide-in-from-right-2 duration-200">
          <Card className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden">
            <div className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {hoveredStore.image ? (
                    <img 
                      src={hoveredStore.image} 
                      alt={hoveredStore.storename || 'Store'} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <MapPin className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                    {hoveredStore.storename || 'Store'}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {hoveredStore.city && hoveredStore.province 
                      ? `${hoveredStore.city}, ${hoveredStore.province}` 
                      : 'Location not specified'}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Selected Store Card - Bottom Right */}
      {selectedStore && (
        <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 z-20 md:w-80 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <Card className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden">
            <div className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {selectedStore.image ? (
                      <img 
                        src={selectedStore.image} 
                        alt={selectedStore.storename || 'Store'} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <MapPin className="w-5 h-5 md:w-6 md:h-6 text-emerald-600 dark:text-emerald-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-base md:text-lg text-gray-900 dark:text-white truncate">
                      {selectedStore.storename || 'Store'}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {selectedStore.city && selectedStore.province 
                        ? `${selectedStore.city}, ${selectedStore.province}` 
                        : 'Location not specified'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={handleCloseSelectedStore}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 flex-shrink-0"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {selectedStore.about && (
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-2">
                  {selectedStore.about}
                </p>
              )}
              
              <Link 
                href={`/stores/${selectedStore._id}`}
                className="inline-flex items-center justify-center w-full bg-emerald-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
              >
                View Store
                <ExternalLink className="w-4 h-4 ml-2" />
              </Link>
            </div>
          </Card>
        </div>
      )}

      {/* Current Style Indicator - hidden on mobile when selected store card is shown */}
      {/* <div className={`absolute ${selectedStore ? 'hidden md:block md:bottom-48' : 'bottom-4'} right-4 z-10 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 transition-all duration-200`}>
        <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
          {mapStyles[mapStyle].name} Mode
        </span>
      </div> */}

      {/* Map Container */}
      <div ref={mapContainer} className="h-full w-full rounded-lg overflow-hidden" />

      {/* Custom Styles */}
      <style jsx global>{`
        .mapbox-3d-marker .marker-pin svg {
          transition: transform 0.2s ease;
          transform-origin: center bottom;
        }
        
        .mapbox-3d-marker.marker-hovered .marker-pin svg {
          transform: scale(1.2);
        }
      `}</style>
    </div>
  );
}
