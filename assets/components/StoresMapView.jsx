import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { ChevronDown, ChevronUp, Maximize2, Minimize2, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default markers in React Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom marker icon for stores
const storeIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Component to handle map bounds updates
function MapBoundsUpdater({ stores }) {
  const map = useMap();
  
  useEffect(() => {
    if (stores && stores.length > 0) {
      const bounds = stores
        .filter(store => store.latitude && store.longitude)
        .map(store => [store.latitude, store.longitude]);
      
      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
      }
    }
  }, [stores, map]);
  
  return null;
}

// Component to handle locate user
function LocateControl({ onLocate }) {
  const map = useMap();
  
  const handleLocate = () => {
    map.locate({ setView: true, maxZoom: 13 });
    map.on('locationfound', (e) => {
      onLocate?.(e.latlng);
      L.marker(e.latlng, {
        icon: new L.Icon({
          iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41]
        })
      }).addTo(map).bindPopup('You are here').openPopup();
    });
  };
  
  return (
    <Button
      onClick={handleLocate}
      className="absolute top-4 right-4 z-[1000] bg-white dark:bg-zinc-900 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 shadow-lg"
      size="icon"
      variant="outline"
    >
      <Navigation className="h-4 w-4" />
    </Button>
  );
}

export default function StoresMapView({ stores = [], onStoreSelect }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(window.innerWidth < 768); // Collapsed on mobile by default
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  // Default center (South Africa - Johannesburg area)
  const defaultCenter = [-26.2041, 28.0473];
  
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile && !isCollapsed) {
        setIsCollapsed(true);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isCollapsed]);
  
  // Filter stores with valid coordinates
  const storesWithCoordinates = stores.filter(
    store => store.latitude && store.longitude
  );
  
  const mapHeight = isFullscreen 
    ? 'h-screen' 
    : isExpanded 
      ? 'h-96' 
      : 'h-64';
  
  const handleMarkerClick = (store) => {
    onStoreSelect?.(store._id);
    // Scroll to store card
    const element = document.getElementById(`store-${store._id}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };
  
  if (storesWithCoordinates.length === 0) {
    return (
      <Card className="p-8 text-center bg-gray-50 dark:bg-zinc-900">
        <p className="text-gray-500 dark:text-gray-400">
          No stores with location data available for map view
        </p>
      </Card>
    );
  }
  
  return (
    <div className={`relative ${isFullscreen ? 'fixed inset-0 z-50 bg-white dark:bg-zinc-900' : 'mb-8'}`}>
      {/* Mobile Collapse Header */}
      {isMobile && !isFullscreen && (
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full flex items-center justify-between p-4 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 rounded-t-lg hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
        >
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900 rounded-lg">
              <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-gray-900 dark:text-white">Map View</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {storesWithCoordinates.length} stores on map
              </p>
            </div>
          </div>
          {isCollapsed ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
        </button>
      )}
      
      {/* Map Container */}
      {(!isMobile || !isCollapsed) && (
        <div className={`relative ${mapHeight} transition-all duration-300 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800`}>
          {/* Map Controls */}
          <div className="absolute top-4 left-4 z-[1000] flex gap-2">
            {!isMobile && (
              <>
                <Button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="bg-white dark:bg-zinc-900 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 shadow-lg"
                  size="sm"
                  variant="outline"
                  disabled={isFullscreen}
                >
                  {isExpanded ? 'Shrink' : 'Expand'}
                </Button>
                <Button
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="bg-white dark:bg-zinc-900 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 shadow-lg"
                  size="icon"
                  variant="outline"
                >
                  {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>
              </>
            )}
            {isMobile && (
              <Button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="bg-white dark:bg-zinc-900 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 shadow-lg"
                size="sm"
                variant="outline"
              >
                {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              </Button>
            )}
          </div>
          
          {/* Legend */}
          <div className="absolute bottom-4 left-4 z-[1000] bg-white dark:bg-zinc-900 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
              <span className="text-gray-700 dark:text-gray-300">{storesWithCoordinates.length} Stores</span>
            </div>
          </div>
          
          <MapContainer
            center={defaultCenter}
            zoom={6}
            className="h-full w-full"
            zoomControl={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            <LocateControl />
            <MapBoundsUpdater stores={storesWithCoordinates} />
            
            <MarkerClusterGroup
              chunkedLoading
              maxClusterRadius={60}
              spiderfyOnMaxZoom={true}
              showCoverageOnHover={false}
            >
              {storesWithCoordinates.map((store) => (
                <Marker
                  key={store._id}
                  position={[store.latitude, store.longitude]}
                  icon={storeIcon}
                  eventHandlers={{
                    click: () => handleMarkerClick(store),
                  }}
                >
                  <Popup className="custom-popup">
                    <div className="p-2 min-w-[200px]">
                      <h3 className="font-bold text-lg mb-1 text-gray-900">{store.storename}</h3>
                      {store.about && (
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">{store.about}</p>
                      )}
                      <div className="text-xs text-gray-500 mb-2">
                        {store.city && store.province && (
                          <span>{store.city}, {store.province}</span>
                        )}
                      </div>
                      <a
                        href={`/stores/${store._id}`}
                        className="inline-block text-sm bg-emerald-600 text-white px-3 py-1 rounded hover:bg-emerald-700 transition-colors"
                      >
                        View Store →
                      </a>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MarkerClusterGroup>
          </MapContainer>
        </div>
      )}
    </div>
  );
}