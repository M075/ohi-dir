"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";

// Category definitions matching AddProductForm categories
const quickCategories = [
  {
    label: "Fashion",
    value: "Fashion & Apparel",
    icon: (
      <svg className="flex-shrink-0 size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 7h-3a2 2 0 0 1-2-2V2" />
        <path d="M9 18a2 2 0 0 1-2 2H4" />
        <path d="M4 7h3a2 2 0 0 0 2-2V2" />
        <path d="M15 18a2 2 0 0 0 2 2h3" />
        <path d="M12 2v20" />
        <path d="M2 12h20" />
      </svg>
    ),
  },
  {
    label: "Footwear",
    value: "Footwear & Accessories",
    icon: (
      <svg className="flex-shrink-0 size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 15c0 3.87 2.69 7 6 7s6-3.13 6-7" />
        <path d="M14 15c0 3.87 2.69 7 6 7s6-3.13 6-7" />
        <path d="M14 2H2v11c0 2.21 1.79 4 4 4h4c2.21 0 4-1.79 4-4V2Z" />
      </svg>
    ),
  },
  {
    label: "Jewelry",
    value: "Jewelry & Watches",
    icon: (
      <svg className="flex-shrink-0 size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 3h12l4 6-10 13L2 9Z" />
        <path d="M12 22V9" />
        <path d="M2 9h20" />
        <path d="M6 3l-1 6" />
        <path d="M18 3l1 6" />
      </svg>
    ),
  },
  {
    label: "Beauty",
    value: "Beauty & Personal Care",
    icon: (
      <svg className="flex-shrink-0 size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v4" />
        <path d="M12 18v4" />
        <path d="M4.93 10.93l2.83 2.83" />
        <path d="M16.24 16.24l2.83 2.83" />
        <path d="M2 12h4" />
        <path d="M18 12h4" />
        <path d="M4.93 19.07l2.83-2.83" />
        <path d="M16.24 7.76l2.83-2.83" />
      </svg>
    ),
  },
  {
    label: "Health",
    value: "Health & Wellness",
    icon: (
      <svg className="flex-shrink-0 size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      </svg>
    ),
  },
  {
    label: "Electronics",
    value: "Devices & Electronics",
    icon: (
      <svg className="flex-shrink-0 size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
        <path d="M12 18h.01" />
      </svg>
    ),
  },
  {
    label: "Computers",
    value: "Computers & Accessories",
    icon: (
      <svg className="flex-shrink-0 size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="20" height="14" x="2" y="4" rx="2" ry="2" />
        <path d="M8 18h8" />
        <path d="M12 18v4" />
      </svg>
    ),
  },
  {
    label: "Home",
    value: "Home & Living",
    icon: (
      <svg className="flex-shrink-0 size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    label: "Kitchen",
    value: "Kitchen & Dining",
    icon: (
      <svg className="flex-shrink-0 size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z" />
        <line x1="6" x2="18" y1="17" y2="17" />
      </svg>
    ),
  },
  {
    label: "Furniture",
    value: "Furniture & Decor",
    icon: (
      <svg className="flex-shrink-0 size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 9V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v2" />
        <path d="M2 9h20" />
        <path d="M7 9v11a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9" />
        <path d="M8 13h8" />
      </svg>
    ),
  },
  {
    label: "Sports",
    value: "Sports & Outdoors",
    icon: (
      <svg className="flex-shrink-0 size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
        <path d="M2 12h20" />
      </svg>
    ),
  },
  {
    label: "Fitness",
    value: "Fitness & Training",
    icon: (
      <svg className="flex-shrink-0 size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6.5 6.5 17.5 17.5" />
        <path d="m6.5 17.5 11-11" />
        <path d="M2 9.5V14a2 2 0 0 0 4 0V9.5" />
        <path d="M18 9.5V14a2 2 0 0 0 4 0V9.5" />
        <path d="M6 6h12" />
      </svg>
    ),
  },
  {
    label: "Books",
    value: "Books & Stationery",
    icon: (
      <svg className="flex-shrink-0 size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </svg>
    ),
  },
  {
    label: "Toys",
    value: "Toys & Games",
    icon: (
      <svg className="flex-shrink-0 size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="6" x2="10" y1="11" y2="11" />
        <line x1="8" x2="8" y1="9" y2="13" />
        <line x1="15" x2="15.01" y1="12" y2="12" />
        <line x1="18" x2="18.01" y1="10" y2="10" />
        <path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z" />
      </svg>
    ),
  },
  {
    label: "Infants",
    value: "Infants & Toddlers",
    icon: (
      <svg className="flex-shrink-0 size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 12h.01" />
        <path d="M15 12h.01" />
        <path d="M10 16c.5.3 1.2.5 2 .5s1.5-.2 2-.5" />
        <path d="M12 2a9 9 0 1 0 0 18 9 9 0 0 0 0-18z" />
      </svg>
    ),
  },
  {
    label: "Kids",
    value: "Kids & Teens",
    icon: (
      <svg className="flex-shrink-0 size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M8 14s1.5 2 4 2 4-2 4-2" />
        <line x1="9" x2="9.01" y1="9" y2="9" />
        <line x1="15" x2="15.01" y1="9" y2="9" />
      </svg>
    ),
  },
  {
    label: "Pets",
    value: "Pets & Supplies",
    icon: (
      <svg className="flex-shrink-0 size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 5.172C10 3.782 8.423 2.679 6.5 3c-2.823.47-4.113 6.006-4 7 .08.703 1.725 1.722 3.656 1 1.261-.472 1.96-1.45 2.344-2.5" />
        <path d="M14.267 5.172c0-1.39 1.577-2.493 3.5-2.172 2.823.47 4.113 6.006 4 7-.08.703-1.725 1.722-3.656 1-1.261-.472-1.855-1.45-2.239-2.5" />
        <path d="M8 14v.5" />
        <path d="M16 14v.5" />
        <path d="M11.25 16.25h1.5L12 17l-.75-.75Z" />
        <path d="M4.42 11.247A13.152 13.152 0 0 0 4 14.556C4 18.728 7.582 22 12 22s8-3.272 8-7.444c0-1.061-.162-2.2-.493-3.309m-9.243-6.082A8.801 8.801 0 0 1 12 5c.78 0 1.5.108 2.161.306" />
      </svg>
    ),
  },
  {
    label: "Automotive",
    value: "Automotive & Tools",
    icon: (
      <svg className="flex-shrink-0 size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a1 1 0 0 0-.8-.4H5.24a2 2 0 0 0-1.8 1.1l-.8 1.63A6 6 0 0 0 2 12.42V16h2" />
        <circle cx="6.5" cy="16.5" r="2.5" />
        <circle cx="16.5" cy="16.5" r="2.5" />
      </svg>
    ),
  },
  {
    label: "Garden",
    value: "Garden & Outdoor Living",
    icon: (
      <svg className="flex-shrink-0 size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22v-7" />
        <path d="M8 15c-2.5-1-3.5-5-1-8" />
        <path d="M16 15c2.5-1 3.5-5 1-8" />
        <circle cx="12" cy="22" r="2" />
        <path d="M2 9c2-1 6-2 10-2s8 1 10 2" />
      </svg>
    ),
  },
  {
    label: "Groceries",
    value: "Groceries & Essentials",
    icon: (
      <svg className="flex-shrink-0 size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8" cy="21" r="2" />
        <circle cx="20" cy="21" r="2" />
        <path d="M5.67 6H23l-1.68 8.39a2 2 0 0 1-2 1.61H8.75a2 2 0 0 1-2-1.74L5.23 2.74A2 2 0 0 0 3.25 1H1" />
      </svg>
    ),
  },
];

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
        <div className="max-w-[85rem] mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-24" data-oid="gztrv21">
          <div className="text-center" data-oid="lce9elc">
            <h1 className="text-4xl sm:text-6xl font-bold text-gray-800 dark:text-neutral-200" data-oid="j5kh114">
              Search for stores or products...
            </h1>
            <p className="mt-3 text-gray-600 dark:text-neutral-400" data-oid="c_dffhw">
              Stay in the know with insights from industry experts.
            </p>

            <div className="mt-7 sm:mt-12 mx-auto max-w-xl relative" data-oid="9z7:8o-">
              <form onSubmit={handleSearch} data-oid="d4u2ir.">
                <div className="relative z-10 flex space-x-3 p-3 bg-white border rounded-lg shadow-lg shadow-gray-100 dark:bg-neutral-900 dark:border-neutral-700 dark:shadow-gray-900/20" data-oid="2sxn:t6">
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
                      data-oid="7l3o-ai"
                    >
                      <svg
                        className="flex-shrink-0 size-5"
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        data-oid="-r43ot6"
                      >
                        <circle cx="11" cy="11" r="8" data-oid="aum6e4x" />
                        <path d="m21 21-4.3-4.3" data-oid="5js33zj" />
                      </svg>
                    </button>
                  </div>
                </div>
              </form>

              {/* Decorative SVGs */}
              <div className="hidden md:block absolute top-0 end-0 -translate-y-12 translate-x-20" data-oid="w2jva07">
                <svg className="w-16 h-auto text-orange-500" width="121" height="135" viewBox="0 0 121 135" fill="none" xmlns="http://www.w3.org/2000/svg" data-oid="..4d895">
                  <path d="M5 16.4754C11.7688 27.4499 21.2452 57.3224 5 89.0164" stroke="currentColor" strokeWidth="10" strokeLinecap="round" data-oid="ubkvucp" />
                  <path d="M33.6761 112.104C44.6984 98.1239 74.2618 57.6776 83.4821 5" stroke="currentColor" strokeWidth="10" strokeLinecap="round" data-oid="d_xke_d" />
                  <path d="M50.5525 130C68.2064 127.495 110.731 117.541 116 78.0874" stroke="currentColor" strokeWidth="10" strokeLinecap="round" data-oid="2dzqog1" />
                </svg>
              </div>

              <div className="hidden md:block absolute bottom-0 start-0 translate-y-10 -translate-x-32" data-oid="4dbu5hr">
                <svg className="w-40 h-auto text-emerald-500" width="347" height="188" viewBox="0 0 347 188" fill="none" xmlns="http://www.w3.org/2000/svg" data-oid="eym4g-q">
                  <path d="M4 82.4591C54.7956 92.8751 30.9771 162.782 68.2065 181.385C112.642 203.59 127.943 78.57 122.161 25.5053C120.504 2.2376 93.4028 -8.11128 89.7468 25.5053C85.8633 61.2125 130.186 199.678 180.982 146.248L214.898 107.02C224.322 95.4118 242.9 79.2851 258.6 107.02C274.299 134.754 299.315 125.589 309.861 117.539L343 93.4426" stroke="currentColor" strokeWidth="7" strokeLinecap="round" data-oid=".:0g0aw" />
                </svg>
              </div>
            </div>

            {/* Quick Category Links */}
            <div className="mt-10 sm:mt-14" data-oid="quick-cats">
              <p className="text-sm text-gray-500 dark:text-neutral-500 mb-4">
                Browse Popular Categories
              </p>
              <div className="flex flex-wrap justify-center gap-2 max-w-3xl mx-auto" data-oid="cat-grid">
                {quickCategories.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => handleCategoryClick(cat.value)}
                    className="inline-flex items-center gap-x-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-700 shadow-sm hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition-colors duration-200 dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-emerald-900/30 dark:hover:border-emerald-700 dark:hover:text-emerald-400"
                    data-oid={`cat-${cat.label}`}
                  >
                    {cat.icon}
                    {cat.label}
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
