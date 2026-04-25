import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Heart, MapPin } from "lucide-react";
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
        {/* Like button positioned absolutely */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleLike}
          className={`absolute top-2 right-2 z-10 text-red-500 focus:text-red-500 focus-visible:text-red-500 focus-visible:ring-0`}
        >
          <Heart
            className={`h-5 w-5 transition-all ${shop.isLiked ? "fill-red-500" : ""}`}
          />
        </Button>

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

      <CardFooter className="flex p-0 border-t border-zinc-200 dark:border-zinc-800 dark:bg-zinc-900/20 mt-auto">
        <div className="flex-1 px-4 py-3 text-center border-r border-zinc-200 dark:border-zinc-800">
          <div className="text-lg font-semibold dark:text-white">
            {shop.likes}
          </div>
          <div className="text-sm dark:text-gray-400">Likes</div>
        </div>
        <div className="flex-1 px-4 py-3 text-center">
          <div className="text-lg font-semibold dark:text-white">
            {shop.totalProducts}
          </div>
          <div className="text-sm dark:text-gray-400">Products</div>
        </div>
      </CardFooter>
      </Card>
    </Link>
  );
};

export default StoreCard;
