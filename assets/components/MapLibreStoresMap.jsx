import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { ChevronDown, ChevronUp, Maximize2, Minimize2, Navigation, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function MapLibreStoresMap({ stores = [], onStoreSelect, isFullscreen = false }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markers = useRef([]);
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [mapStyle, setMapStyle] = useState('carto-light');
  const [showTileMenu, setShowTileMenu] = useState(false);
  const layersButtonRef = useRef(null);
  const tileMenuRef = useRef(null);
  const { theme, resolvedTheme } = useTheme();
  
  // Free tile providers
  const tileStyles = {
    // 'osm-bright': {
    //   name: 'Bright',
    //   style: {
    //     version: 8,
    //     sources: {
    //       osm: {
    //         type: 'raster',
    //         tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
    //         tileSize: 256,
    //         attribution: '&copy; OpenStreetMap Contributors',
    //         maxzoom: 19
    //       }
    //     },
    //     layers: [{
    //       id: 'osm',
    //       type: 'raster',
    //       source: 'osm',
    //       minzoom: 0,
    //       maxzoom: 22
    //     }]
    //   }
    // },
    'carto-light': {
      name: 'Light',
      style: {
        version: 8,
        sources: {
          carto: {
            type: 'raster',
            tiles: ['https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '&copy; CARTO',
            maxzoom: 19
          }
        },
        layers: [{
          id: 'carto',
          type: 'raster',
          source: 'carto'
        }]
      }
    },
    'carto-dark': {
      name: 'Dark',
      style: {
        version: 8,
        sources: {
          carto: {
            type: 'raster',
            tiles: ['https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '&copy; CARTO',
            maxzoom: 19
          }
        },
        layers: [{
          id: 'carto',
          type: 'raster',
          source: 'carto'
        }]
      }
    },
    'esri-world': {
      name: 'Satellite',
      style: {
        version: 8,
        sources: {
          esri: {
            type: 'raster',
            tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
            tileSize: 256,
            attribution: '&copy; Esri',
            maxzoom: 19
          }
        },
        layers: [{
          id: 'esri',
          type: 'raster',
          source: 'esri'
        }]
      }
    }
  };
  
   // close tile menu when clicking outside
  useEffect(() => {
    const handleClick = (e) => {
      if (!showTileMenu) return;
      const btn = layersButtonRef.current;
      const menu = tileMenuRef.current;
      if (btn && btn.contains(e.target)) return;
      if (menu && menu.contains(e.target)) return;
      setShowTileMenu(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showTileMenu]);

  // respond to theme changes: pick carto-dark for dark theme, carto-light for light
  useEffect(() => {
    const current = (resolvedTheme || theme) === 'dark' ? 'carto-dark' : 'carto-light';
    changeMapStyle(current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedTheme, theme]);

  
  const storesWithCoordinates = stores.filter(
    store => store.latitude && store.longitude
  );
  
  useEffect(() => {
    if (!mapContainer.current || storesWithCoordinates.length === 0) return;
    
    if (!map.current) {
      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style: tileStyles[mapStyle].style,
        center: [28.0473, -26.2041],
        zoom: 5,
        attributionControl: true
      });
      
      map.current.addControl(new maplibregl.NavigationControl(), 'top-right');
      map.current.addControl(new maplibregl.ScaleControl(), 'bottom-right');
      
      // Add geolocate control
      map.current.addControl(
        new maplibregl.GeolocateControl({
          positionOptions: {
            enableHighAccuracy: true
          },
          trackUserLocation: true
        }),
        'top-right'
      );
    }
    
    markers.current.forEach(marker => marker.remove());
    markers.current = [];
    
    const bounds = new maplibregl.LngLatBounds();
    
    storesWithCoordinates.forEach((store) => {
      const el = document.createElement('div');
      el.className = 'custom-marker';
      el.innerHTML = `
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="20" cy="20" r="18" fill="#10b981" fill-opacity="0.2"/>
          <circle cx="20" cy="20" r="12" fill="#10b981"/>
          <circle cx="20" cy="20" r="6" fill="white"/>
        </svg>
      `;
      el.style.width = '40px';
      el.style.height = '40px';
      el.style.cursor = 'pointer';
      el.style.transition = 'transform 0.2s';
      
      el.addEventListener('mouseenter', () => {
        el.style.transform = 'scale(1.2)';
      });
      
      el.addEventListener('mouseleave', () => {
        el.style.transform = 'scale(1)';
      });
      
      const popup = new maplibregl.Popup({ 
        offset: 25,
        closeButton: true,
        closeOnClick: false,
        maxWidth: '300px'
      }).setHTML(`
        <div class="p-3 bg-white dark:bg-zinc-900">
          <h3 class="font-bold text-lg mb-2 text-gray-900 dark:text-white">${store.storename}</h3>
          ${store.about ? `<p class="text-sm text-gray-600 dark:text-gray-300 mb-2">${store.about.substring(0, 100)}...</p>` : ''}
          <div class="text-xs text-gray-500 dark:text-gray-400 mb-3">
            ${store.city && store.province ? `${store.city}, ${store.province}` : ''}
          </div>
          <a 
            href="/stores/${store._id}" 
            class="inline-block bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-emerald-700 transition-colors"
          >
            View Store →
          </a>
        </div>
      `);
      
      const marker = new maplibregl.Marker(el)
        .setLngLat([store.longitude, store.latitude])
        .setPopup(popup)
        .addTo(map.current);
      
      el.addEventListener('click', () => {
        onStoreSelect?.(store._id);
        const element = document.getElementById(`store-${store._id}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
      
      markers.current.push(marker);
      bounds.extend([store.longitude, store.latitude]);
    });
    
    if (storesWithCoordinates.length > 0) {
      map.current.fitBounds(bounds, {
        padding: { top: 50, bottom: 50, left: 50, right: 50 },
        maxZoom: 13
      });
    }
    
    return () => {
      markers.current.forEach(marker => marker.remove());
      markers.current = [];
    };
  }, [storesWithCoordinates, onStoreSelect, mapStyle]);
  
  const changeMapStyle = (newStyle) => {
    // set state first so initial map creation uses this value
    setMapStyle(newStyle);
    if (map.current) {
      try {
        map.current.setStyle(tileStyles[newStyle].style);
      } catch (err) {
        console.warn('Failed to set map style', err);
      }
    }
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
          <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
            <div className="relative">
              <Button
                ref={layersButtonRef}
                onClick={() => setShowTileMenu((s) => !s)}
                className="bg-white dark:bg-zinc-900 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 shadow-lg"
                size="icon"
                variant="outline"
              >
                <Layers className="h-4 w-4" />
              </Button>
              {showTileMenu && (
                <div ref={tileMenuRef} className="absolute left-0 top-full mt-2 bg-white dark:bg-zinc-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-800 p-2 min-w-[140px]">
                  {Object.entries(tileStyles).map(([key, { name }]) => (
                    <button
                      key={key}
                      onClick={() => {
                        changeMapStyle(key);
                        setShowTileMenu(false);
                      }}
                      className={`block w-full text-left px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-zinc-800 text-sm ${
                        mapStyle === key ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300' : ''
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <div className="absolute bottom-4 left-4 z-10 bg-white dark:bg-zinc-900 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
              <span className="text-gray-700 dark:text-gray-300">{storesWithCoordinates.length} Stores</span>
            </div>
          </div>
          
          <div ref={mapContainer} className="h-full w-full" />
        </div>
  );
}

 