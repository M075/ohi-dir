'use client'
import React, { useState, useEffect } from "react";
import StoreFilterSort from "@/assets/components/StoreFilterSort";
import Loading from "@/app/loading";
import Mapbox3DStoresMap from '@/assets/components/Mapbox3DStoresMap';

const StoresPage = () => {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStoreId, setSelectedStoreId] = useState(null);
  const [viewMode, setViewMode] = useState('grid');

  useEffect(() => {
    const fetchStores = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/stores');
        
        if (!response. ok) {
          throw new Error('Failed to fetch stores');
        }

        const data = await response.json();
        setStores(data);
        setError(null);
      } catch (err) {
        setError(err. message);
        console.error('Error fetching stores:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStores();
  }, []);

  const handleLike = (storeId) => {
    setStores(
      stores.map((store) => {
        if (store._id === storeId) {
          return {
            ...store,
            likes: store.isLiked ? (store.likes || 0) - 1 : (store.likes || 0) + 1,
            isLiked: ! store.isLiked,
          };
        }
        return store;
      })
    );
  };

  const handleStoreSelect = (storeId) => {
    setSelectedStoreId(storeId);
  };

  if (loading) return <Loading />;

  if (error) {
    return (
      <div className="mt-20 p-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600">Error Loading Stores</h2>
          <p className="text-gray-600 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-950 min-h-screen flex flex-col">
      <section className="w-full px-0 sm:px-4 lg:px-8 sm:pt-20 flex-shrink-0">
        <div className="mx-auto w-full max-w-7xl">
          <div className="h-[70vh] md:h-[520px] lg:h-[500px] rounded-b-[28px] sm:rounded-b-[0px] overflow-hidden shadow-xl bg-gray-100 dark:bg-zinc-900">
            <Mapbox3DStoresMap 
              stores={stores} 
              onStoreSelect={(storeId) => {
                handleStoreSelect(storeId);
              }}
            />
          </div>
        </div>
      </section>

      {/* Stores Grid Section */}
      <div className="container-xl lg:container m-auto p-4 sm:p-10 w-full mt-4 mb-12 sm:mt-8 flex-1 md:flex-none min-h-[25vh]">
        <div className="md:flex md:items-center md:justify-between sm:mb-4">
          <h2 className="hidden sm:block text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            All Stores
          </h2>
          <a href="/products" className="hidden text-sm font-medium text-emerald-600 hover:text-emerald-500 md:block">
            Browse all products
            <span aria-hidden="true"> &rarr;</span>
          </a>
        </div>

        <StoreFilterSort 
          stores={stores} 
          onLike={handleLike}
          selectedStoreId={selectedStoreId}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />

      </div>
    </div>
  );
};

export default StoresPage;