import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, Package } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const StoreCard = ({ shop, onLike, isHighlighted }) => {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (isHighlighted) {
      setAnimate(true);
      const timer = setTimeout(() => setAnimate(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isHighlighted]);

  const handleLike = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onLike(shop.id);
  };

  return (
    <Link href={`/stores/${shop.id}`} className="block h-full">
      <Card
        id={`store-${shop.id}`}
        className="relative flex flex-col h-full overflow-hidden hover:cursor-pointer hover:shadow-sm transition-shadow"
      >
        {/* Products badge - top left */}
        <div className="absolute top-2 left-2 z-10 inline-flex items-center gap-1.5 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm border border-zinc-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-200 shadow-sm">
          <Package className="h-4 w-4 text-emerald-500" />
          <span>{shop.totalProducts}</span>
        </div>

        {/* Likes badge - top right */}
        <button
          type="button"
          onClick={handleLike}
          aria-label="Like store"
          className="absolute top-2 right-2 z-10 inline-flex items-center gap-1.5 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm border border-zinc-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-200 shadow-sm hover:border-red-300 dark:hover:border-red-700 transition-colors"
        >
          <Heart
            className={`h-4 w-4 transition-all ${shop.isLiked ? "fill-red-500 text-red-500" : "text-red-500"}`}
          />
          <span>{shop.likes}</span>
        </button>

        <CardContent className="px-4 py-6 flex-1">
          <div className="flex flex-col items-center text-center">
            {/* Large circular avatar like the Tailwind example */}
            <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden mb-6">
              <Image
                src={shop.avatar}
                alt={shop.name}
                fill
                className="object-cover"
              />
            </div>

            <h3 className="text-xl md:text-2xl font-semibold dark:text-white">
              {shop.name}
            </h3>
            {shop.about && (
              <p className="mt-2 text-sm dark:text-gray-300 max-w-[20rem] line-clamp-3">
                {shop.about}
              </p>
            )}

            {(shop.city || shop.province) && (
              <div className="mt-3 text-xs sm:text-sm dark:text-gray-200 inline-flex items-center justify-center gap-1">
                {/* <MapPin className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0 dark:text-gray-200" /> */}
                <span className="text-center">
                  {shop.city && shop.province
                    ? `${shop.city}, ${shop.province}`
                    : shop.city || shop.province}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default StoreCard;
