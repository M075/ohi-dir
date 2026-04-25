"use client";
import Link from "next/link";
import Image from "next/image";
import { useRef } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/20/solid";

const categories = [
  {
    name: "Fashion & Apparel",
    image: "/apparel.jpg",
    href: "/products?category=fashion-apparel",
  },
  {
    name: "Footwear & Accessories",
    image: "/trainers.png",
    href: "/products?category=footwear-accessories",
  },
  {
    name: "Jewelry & Watches",
    image: "/jewellery.png",
    href: "/products?category=jewelry-watches",
  },
  {
    name: "Beauty & Personal Care",
    image: "/makeup.webp",
    href: "/products?category=beauty-personal-care",
  },
  {
    name: "Health & Wellness",
    image: "/wellness.webp",
    href: "/products?category=health-wellness",
  },
  {
    name: "Devices & Electronics",
    image: "/devices.png",
    href: "/products?category=devices-electronics",
  },
  {
    name: "Computers & Consoles",
    image: "/consoles.jpg",
    href: "/products?category=computers-consoles",
  },
  {
    name: "Home & Living",
    image: "/couch.jpg",
    href: "/products?category=home-living",
  },
  {
    name: "Kitchen & Dining",
    image: "/kitchen.webp",
    href: "/products?category=kitchen-dining",
  },
  {
    name: "Furniture & Decor",
    image: "/furniture.webp",
    href: "/products?category=furniture-decor",
  },
  {
    name: "Sports & Outdoors",
    image: "/sports.webp",
    href: "/products?category=sports-outdoors",
  },
  {
    name: "Fitness & Training",
    image: "/training.jpg",
    href: "/products?category=fitness-training",
  },
  {
    name: "Books & Stationery",
    image: "/stationery.avif",
    href: "/products?category=books-stationery",
  },
  {
    name: "Toys & Games",
    image: "/toys.jpg",
    href: "/products?category=toys-games",
  },
  {
    name: "Infants & Toddlers",
    image: "/infants.webp",
    href: "/products?category=infants-toddlers",
  },
  {
    name: "Pets & Supplies",
    image: "/pets.webp",
    href: "/products?category=pets-supplies",
  },
  {
    name: "Automotive & Tools",
    image: "/automotive.jpg",
    href: "/products?category=automotive-tools",
  },
  {
    name: "Garden & Outdoor Living",
    image: "/gardening.jpg",
    href: "/products?category=garden-outdoor",
  },
  {
    name: "Groceries & Essentials",
    image: "/groceries.webp",
    href: "/products?category=groceries-essentials",
  }
  
];

const ShopByCategory = () => {
  const scrollContainerRef = useRef(null);

  const scroll = (direction) => {
    if (scrollContainerRef.current) {
      const scrollAmount = 400;
      scrollContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="bg-zinc-100/40 dark:bg-zinc-900/40 py-12 mx-4 my-4 rounded-lg sm:py-14">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
            Shop by Category
          </h2>
          {/* <Link
            href="/products"
            className="text-lg font-semibold text-emerald-600 dark:text-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-400"
          >
            Browse all categories <span aria-hidden="true">&rarr;</span>
          </Link> */}
        </div>

        {/* Scrollable Categories Container */}
        <div className="relative">
          {/* Scroll Buttons */}
          <button
            onClick={() => scroll("left")}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white dark:bg-zinc-800 rounded-full p-2 shadow-lg hover:shadow-xl transition-shadow hidden lg:flex items-center justify-center"
            aria-label="Scroll left"
          >
            <ChevronLeftIcon className="h-6 w-6 text-gray-900 dark:text-white" />
          </button>

          <button
            onClick={() => scroll("right")}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white dark:bg-zinc-800 rounded-full p-2 shadow-lg hover:shadow-xl transition-shadow hidden lg:flex items-center justify-center"
            aria-label="Scroll right"
          >
            <ChevronRightIcon className="h-6 w-6 text-gray-900 dark:text-white" />
          </button>

          {/* Categories Scroll Container */}
          <div
            ref={scrollContainerRef}
            className="flex gap-6 overflow-x-auto scroll-smooth scrollbar-hide"
          >
            {categories.map((category) => (
              <Link
                key={category.name}
                href={category.href}
                className="group relative flex-shrink-0 w-36 h-48 md:w-64 md:h-72 overflow-hidden rounded-lg shadow-md transition-all duration-300 hover:shadow-xl"
              >
                {/* Image Container */}
                <div className="relative h-full w-full overflow-hidden bg-gray-200 dark:bg-gray-700">
                  <Image
                    src={category.image}
                    alt={category.name}
                    fill
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                  />

                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black to-zinc-800/20  opacity-70 group-hover:opacity-25 transition-opacity duration-300" />
                </div>

                {/* Category Name */}
                <div className="absolute inset-0 flex items-end justify-start p-6">
                  <h3 className="text-lg font-semibold text-white drop-shadow-lg">
                    {category.name}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default ShopByCategory;
