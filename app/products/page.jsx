"use client";
import React from "react";
import Loading from "@/app/loading";
import { useProducts } from "@/assets/hooks/useProductsHook";
import FilterAndSort from "@/assets/components/ProductFilterAndSort";
import ShopByCategory from "@/assets/components/ShopByCategory";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const ProductsPage = () => {
  const { products, loading, error } = useProducts();

  if (loading) return <Loading />;
  if (error) return <div>Error: {error}</div>;

  return (
    <section className="bg-white dark:bg-zinc-950">
      {/* Centered Dark Panel Header */}
      <div className="mx-auto max-w-7xl sm:px-6 sm:py-32 lg:px-8">
        <div className="relative isolate overflow-hidden bg-gray-200 dark:bg-gray-900 px-6 py-16 sm:py-24 text-center shadow-2xl sm:rounded-3xl sm:px-16">
          <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight dark:text-white sm:text-4xl">
            Products from Sellers Near You
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-gray-500 dark:text-gray-300">
            View our collection of products carefully curated from sellers all around you. Find the perfect item that suits your needs. 
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Link
              href="/stores"
            >
             <Button> Browse Stores</Button>
            </Link>
            <Link href="/dashboard/profile" className="text-sm leading-6 dark:text-white">
              Become a Seller <span aria-hidden="true">→</span>
            </Link>
          </div>
          <svg
            viewBox="0 0 1024 1024"
            aria-hidden="true"
            className="absolute left-1/2 top-1/2 -z-10 h-[64rem] w-[64rem] -translate-x-1/2 [mask-image:radial-gradient(closest-side,white,transparent)]"
          >
            <circle r={512} cx={512} cy={512} fill="url(#products-gradient)" fillOpacity="0.7" />
            <defs>
              <radialGradient id="products-gradient">
                <stop stopColor="#10B981" />
                <stop offset={1} stopColor="#059669" />
              </radialGradient>
            </defs>
          </svg>
        </div>
      </div>

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

        <FilterAndSort products={products} />

        <div className="mt-8 text-sm md:hidden">
          <a href="/stores" className="font-medium text-emerald-600 hover:text-emerald-500">
            Shop from stores
            <span aria-hidden="true"> &rarr;</span>
          </a>
        </div>
      </div>
    </section>
  );
};

export default ProductsPage;