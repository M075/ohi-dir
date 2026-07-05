"use client";
import React, { useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import StoreCard from "@/assets/components/StoreCard";
import ProductCard from "@/assets/components/ProductCard";
import { Heart, Store as StoreIcon, Package } from "lucide-react";

export default function FavouritesClient() {
  const [stores, setStores] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchFavourites = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/favourites', { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to fetch favourites');
        const data = await res.json();
        if (isMounted) {
          setStores(data.stores || []);
          setProducts(data.products || []);
          setError(null);
        }
      } catch (err) {
        if (isMounted) setError(err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchFavourites();
    return () => { isMounted = false; };
  }, []);

  const handleUnlikeStore = async (storeId) => {
    // Optimistic update
    const prevStores = stores;
    setStores(stores.filter(s => s._id !== storeId));
    try {
      const res = await fetch(`/api/stores/${storeId}/likes`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to unlike store');
    } catch (err) {
      console.error('Error unliking store:', err);
      setStores(prevStores);
    }
  };

  const handleUnlikeProduct = async (productId) => {
    // Optimistic update
    const prevProducts = products;
    setProducts(products.filter(p => p._id !== productId));
    try {
      const res = await fetch(`/api/products/${productId}/likes`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to unlike product');
    } catch (err) {
      console.error('Error unliking product:', err);
      setProducts(prevProducts);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse text-gray-500">Loading favourites...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold text-red-600">Error Loading Favourites</h2>
        <p className="text-gray-600 mt-2">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Heart className="h-6 w-6 text-red-500" />
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          Favourites
        </h1>
      </div>

      <Tabs defaultValue="stores">
        <TabsList>
          <TabsTrigger value="stores" className="gap-2">
            <StoreIcon className="h-4 w-4" />
            Liked Stores
            <span className="ml-1 text-xs text-muted-foreground">
              ({stores.length})
            </span>
          </TabsTrigger>
          <TabsTrigger value="products" className="gap-2">
            <Package className="h-4 w-4" />
            Liked Products
            <span className="ml-1 text-xs text-muted-foreground">
              ({products.length})
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stores">
          {stores.length === 0 ? (
            <div className="text-center py-16">
              <StoreIcon className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-4 text-lg text-gray-500">No liked stores yet</p>
              <p className="text-sm text-gray-400 mt-2">
                Tap the heart icon on a store to add it here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stores.map(store => (
                <StoreCard
                  key={store._id}
                  shop={{
                    id: store._id,
                    name: store.storename,
                    avatar: store.image || '/profile.png',
                    likes: store.likes || 0,
                    totalProducts: store.totalProducts || 0,
                    isLiked: true,
                    province: store.province,
                    city: store.city,
                    about: store.about,
                  }}
                  onLike={handleUnlikeStore}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="products">
          {products.length === 0 ? (
            <div className="text-center py-16">
              <Package className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-4 text-lg text-gray-500">No liked products yet</p>
              <p className="text-sm text-gray-400 mt-2">
                Tap the heart icon on a product to add it here.
              </p>
            </div>
          ) : (
            <div className="-mx-4 sm:mx-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-4">
              {products.map(product => (
                <ProductCard
                  key={product._id}
                  product={product}
                  onLike={handleUnlikeProduct}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
