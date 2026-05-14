"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { IoSearchOutline } from "react-icons/io5";
import { PRODUCT_CATEGORIES } from "@/utils/categories";

const SearchHero = () => {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const handleSearch = (e) => {
    e.preventDefault();
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;

    // Navigate to the search results page with the query
    router.push(`/search?q=${encodeURIComponent(trimmedQuery)}`);

    // Optionally clear the input after navigation
    setQuery("");
  };

  const handleCategoryClick = (categoryValue) => {
    router.push(`/products?category=${encodeURIComponent(categoryValue)}`);
  };

  return (
    <>
      <div className="relative overflow-hidden" data-oid="xmi7mdy">
        <div
          className="max-w-[85rem] mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-24"
          data-oid="gztrv21"
        >
          <div className="text-center" data-oid="lce9elc">
            <h1
              className="text-4xl sm:text-6xl font-bold text-gray-800 dark:text-neutral-200"
              data-oid="j5kh114"
            >
              Search for stores or products...
            </h1>
            <p
              className="mt-3 text-gray-600 dark:text-neutral-400"
              data-oid="c_dffhw"
            >
              Stay in the know with insights from industry experts.
            </p>

            <div
              className="mt-7 sm:mt-12 mx-auto max-w-xl relative"
              data-oid="9z7:8o-"
            >
              <form onSubmit={handleSearch} data-oid="d4u2ir.">
                <div
                  className="relative z-10 flex space-x-3 p-3 bg-white border rounded-lg shadow-lg shadow-gray-100 dark:bg-neutral-900 dark:border-neutral-700 dark:shadow-gray-900/20"
                  data-oid="2sxn:t6"
                >
                  <div className="flex-[1_0_0%]" data-oid="3kt2-r7">
                    <label htmlFor="search-input" className="sr-only">
                      Search products and stores
                    </label>
                    <input
                      type="search"
                      id="search-input"
                      name="search"
                      autoComplete="off"
                      aria-label="Search products and stores"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      className="py-2.5 px-4 block w-full border-transparent rounded-lg focus:border-emerald-500 focus:ring-emerald-500 dark:bg-neutral-900 dark:border-transparent dark:text-neutral-400 dark:placeholder-neutral-500 dark:focus:ring-neutral-600"
                      placeholder="Search for products or stores..."
                      data-oid="2lrvmm3"
                    />
                  </div>
                  <div className="flex-[0_0_auto]" data-oid="n.vy.xn">
                     <button
                       type="submit"
                       className="size-[46px] inline-flex justify-center items-center gap-x-2 text-sm font-semibold rounded-lg border border-transparent bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:pointer-events-none"
                     >
                       <IoSearchOutline size={20} />
                     </button>
                  </div>
                </div>
              </form>

              {/* Decorative SVGs */}
              <div
                className="hidden md:block absolute top-0 end-0 -translate-y-12 translate-x-20"
                data-oid="w2jva07"
              >
                <svg
                  className="w-16 h-auto text-orange-500"
                  width="121"
                  height="135"
                  viewBox="0 0 121 135"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  data-oid="..4d895"
                >
                  <path
                    d="M5 16.4754C11.7688 27.4499 21.2452 57.3224 5 89.0164"
                    stroke="currentColor"
                    strokeWidth="10"
                    strokeLinecap="round"
                    data-oid="ubkvucp"
                  />
                  <path
                    d="M33.6761 112.104C44.6984 98.1239 74.2618 57.6776 83.4821 5"
                    stroke="currentColor"
                    strokeWidth="10"
                    strokeLinecap="round"
                    data-oid="d_xke_d"
                  />
                  <path
                    d="M50.5525 130C68.2064 127.495 110.731 117.541 116 78.0874"
                    stroke="currentColor"
                    strokeWidth="10"
                    strokeLinecap="round"
                    data-oid="2dzqog1"
                  />
                </svg>
              </div>

              <div
                className="hidden md:block absolute bottom-0 start-0 translate-y-10 -translate-x-32"
                data-oid="4dbu5hr"
              >
                <svg
                  className="w-40 h-auto text-emerald-500"
                  width="347"
                  height="188"
                  viewBox="0 0 347 188"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  data-oid="eym4g-q"
                >
                  <path
                    d="M4 82.4591C54.7956 92.8751 30.9771 162.782 68.2065 181.385C112.642 203.59 127.943 78.57 122.161 25.5053C120.504 2.2376 93.4028 -8.11128 89.7468 25.5053C85.8633 61.2125 130.186 199.678 180.982 146.248L214.898 107.02C224.322 95.4118 242.9 79.2851 258.6 107.02C274.299 134.754 299.315 125.589 309.861 117.539L343 93.4426"
                    stroke="currentColor"
                    strokeWidth="7"
                    strokeLinecap="round"
                    data-oid=".:0g0aw"
                  />
                </svg>
              </div>
            </div>

            {/* Quick Category Links */}
            <div className="mt-10 sm:mt-14" data-oid="quick-cats">
              <p className="text-sm text-gray-500 dark:text-neutral-500 mb-4">
                Browse Popular Categories
              </p>
              <div
                className="flex flex-wrap justify-center gap-2 max-w-3xl mx-auto"
                data-oid="cat-grid"
              >
                {PRODUCT_CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => handleCategoryClick(cat.value)}
                    className="inline-flex items-center gap-x-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-700 shadow-sm hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition-colors duration-200 dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-emerald-900/30 dark:hover:border-emerald-700 dark:hover:text-emerald-400"
                    data-oid={`cat-${cat.shortLabel}`}
                  >
                    {cat.icon}
                    {cat.shortLabel}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SearchHero;
