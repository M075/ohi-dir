"use client";
import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Eye, ShoppingCart, Star, Heart } from "lucide-react";
import { useCart } from "@/assets/contexts/CartContext";
import { toast } from "@/components/hooks/use-toast";

const formatPrice = (value) => {
  const price = Number(value) || 0;
  return price.toFixed(2);
};

const ProductListCard = ({ product = {}, onLike }) => {
  const imageUrl = product?.images?.[0] || "/image.png";
  const { addToCart } = useCart();
  const [adding, setAdding] = useState(false);

  const handleLike = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onLike) onLike(product._id);
  };

  const discountedPrice = product?.discountPercentage
    ? (Number(product.price) || 0) * (1 - product.discountPercentage / 100)
    : Number(product?.price) || 0;

  const handleAddToCart = async () => {
    if (!product?._id) {
      toast({
        variant: "destructive",
        title: "Unable to add",
        description: "Product ID missing",
      });
      return;
    }

    setAdding(true);
    try {
      await addToCart(product._id, 1);
      toast({
        variant: "success",
        title: "Added to cart",
        description: `${product.title || "Product"} added to cart`,
      });
    } catch (error) {
      console.error("Error adding to cart", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add to cart",
      });
    } finally {
      setAdding(false);
    }
  };

  const rating = Number(product?.rating) || 0;

  return (
    <div className="-mx-8 sm:mx-auto transition-all duration-400 ease-in-out border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-zinc-800/50">
      <div className="flex items-center gap-4 py-4 px-2">
        {/* Image Section */}
        <div className="flex-shrink-0">
          <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-muted">
            <Image
              src={imageUrl}
              alt={product?.title || "Product"}
              fill
              className="object-cover"
            />
          </div>
        </div>

        {/* Content Section */}
        <div className="flex-1 min-w-0">
          {product?.ownerName && (
            <span className="inline-block text-xs px-2 py-0.5 mb-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
              {product.ownerName}
            </span>
          )}
          
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 truncate">
            {product?.title || "Untitled Product"}
          </h3>

          {product?.description && (
            <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-1 mb-2">
              {product.description}
            </p>
          )}

          <div className="flex items-center gap-4 text-sm">
            <div>
              <span className="text-base font-semibold text-gray-900 dark:text-white">
                R {formatPrice(discountedPrice)}
              </span>
              {product?.discountPercentage > 0 && (
                <span className="text-xs text-red-500 line-through ml-2">
                  R {formatPrice(product.price)}
                </span>
              )}
            </div>
            
            <span className="hidden sm:block dark:text-gray-400">
              <span className=" font-semibold dark:text-white">{product?.stock ?? 0}</span> Stock
            </span>
            
            <div className="flex items-center gap-1 dark:text-gray-400">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              <span className="font-semibold dark:text-white">
                {rating > 0 ? rating.toFixed(1) : "N/A"}
              </span>
            </div>
          </div>
        </div>

        {/* Actions Section */}
        <div className="flex flex-col gap-2 flex-shrink-0">
          <Button
            size="icon"
            variant="outline"
            onClick={handleLike}
            className={`${
              product?.isLiked
                ? 'bg-red-500 text-white border-red-500 hover:bg-red-600 hover:text-white'
                : 'text-red-500 border-red-500 dark:bg-transparent dark:hover:bg-red-500 hover:text-white'
            }`}
          >
            <Heart className={`h-4 w-4 ${product?.isLiked ? 'fill-current' : ''}`} />
          </Button>
          <Link href={`/products/${product?.slug || product?._id || ""}`}>
            <Button size='icon' variant="outline">
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
          <Button
            size="icon"
            onClick={handleAddToCart}
            disabled={adding || product?.stock === 0}
            variant="secondary"
          >
            <ShoppingCart className="h-4 w-4" /> 
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProductListCard;
