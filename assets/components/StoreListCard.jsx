import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Eye, Heart, MapPin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const StoreListCard = ({ shop, onLike, isHighlighted }) => {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (isHighlighted) {
      setAnimate(true);
      const timer = setTimeout(() => setAnimate(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isHighlighted]);

  return (
    <div
      id={`store-${shop.id}`}
      className={`
        transition-all duration-400 ease-in-out border-b border-gray-200 dark:border-gray-700
        ${animate ? 'bg-emerald-50 dark:bg-emerald-900/20' : ''}
        hover:bg-gray-50 dark:hover:bg-zinc-800/50
      `}
    >
      <div className="flex items-center gap-4 py-4 px-2">
        {/* Image Section */}
        <div className="flex-shrink-0">
          <div className="relative w-16 h-16 rounded-full overflow-hidden">
            <Image
              src={shop.avatar}
              alt={shop.name}
              fill
              className="object-cover"
            />
          </div>
        </div>

        {/* Content Section */}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold dark:text-white mb-1">
            {shop.name}
          </h3>
          
          

          <div className="flex flex-col gap-4 text-sm">
            {(shop.city || shop.province) && (
              <div className="dark:text-gray-400 flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                <span>
                  {shop.city && shop.province 
                    ? `${shop.city}, ${shop.province}` 
                    : shop.city || shop.province}
                </span>
              </div>
            )}
              {shop.about && (
            <div className="flex items-start gap-2">
                <p className="dark:text-gray-400">
                  {shop.about}
                </p>
              </div>
              )}
            
            <div className="flex items-start gap-3">
              <span className="dark:text-gray-400">
                <span className="font-semibold dark:text-white">{shop.likes}</span> Likes
              </span>
              <span className="dark:text-gray-400">
                <span className="font-semibold dark:text-white">{shop.totalProducts}</span> Products
              </span>
            </div>
          </div>
        </div>

        {/* Actions Section */}
        <div className="flex flex-col items-center gap-2 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onLike(shop.id)}
            className={`${
              shop.isLiked 
                ? 'bg-red-500 text-white border-red-500 hover:bg-red-600 hover:text-white' 
                : 'text-red-500 border-red-500 dark:bg-transparent dark:hover:bg-red-500 hover:text-white'
            }`}
          >
            <Heart className={`h-4 w-4 ${shop.isLiked ? 'fill-current' : ''}`} />
          </Button>
          <Link href={`/stores/${shop.id}`}>
            <Button size="sm" variant="outline">
              <Eye className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">View</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default StoreListCard;