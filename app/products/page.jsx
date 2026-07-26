"use client";
import React, { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Loading from "@/app/loading";
import { useProducts } from "@/assets/hooks/useProductsHook";
import FilterAndSort from "@/assets/components/ProductFilterAndSort";
import ShopByCategory from "@/assets/components/ShopByCategory";
import FeaturedCarousel from "@/assets/components/FeaturedCarousel";

function ProductsContent() {
  const searchParams = useSearchParams();
  const { products, loading, error, setProducts } = useProducts();
  const initialCategory = searchParams.get("category") || "all";

  const handleLike = async (productId) => {
    // Optimistic update
    setProducts(prev =>
      prev.map(p =>
        p._id === productId
          ? {
              ...p,
              isLiked: !p.isLiked,
              likes: p.isLiked ? Math.max(0, (p.likes || 0) - 1) : (p.likes || 0) + 1,
            }
          : p
      )
    );

    try {
      const res = await fetch(`/api/products/${productId}/likes`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to toggle like');
      const data = await res.json();
      setProducts(prev =>
        prev.map(p =>
          p._id === productId
            ? { ...p, isLiked: data.isLiked, likes: data.likes }
            : p
        )
      );
    } catch (err) {
      console.error('Error liking product:', err);
      // Revert on error
      setProducts(prev =>
        prev.map(p =>
          p._id === productId
            ? {
                ...p,
                isLiked: !p.isLiked,
                likes: p.isLiked ? Math.max(0, (p.likes || 0) - 1) : (p.likes || 0) + 1,
              }
            : p
        )
      );
    }
  };

  if (loading) return <Loading />;
  if (error) return <div>Error: {error}</div>;

  return (
    <section className="bg-white dark:bg-zinc-950">
      {/* Featured products carousel (falls back to a hero when none are featured) */}
      <FeaturedCarousel products={products} />

      <ShopByCategory />

      {/* Products Section with CTA Link */}
      <div className="m-4 rounded-lg p-4">
        <div className="md:flex md:items-center md:justify-between mb-6">
          <h2 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
            All Products
          </h2>
          <a href="/stores" className="hidden text-sm font-medium text-emerald-600 hover:text-emerald-500 md:block">
            Shop from stores
            <span aria-hidden="true"> &rarr;</span>
          </a>
        </div>

        <FilterAndSort products={products} initialCategory={initialCategory} onLike={handleLike} />

        <div className="mt-8 text-sm md:hidden">
          <a href="/stores" className="font-medium text-emerald-600 hover:text-emerald-500">
            Shop from stores
            <span aria-hidden="true"> &rarr;</span>
          </a>
        </div>
      </div>
    </section>
  );
}

const ProductsPage = () => (
  <Suspense fallback={<Loading />}>
    <ProductsContent />
  </Suspense>
);

export default ProductsPage;
