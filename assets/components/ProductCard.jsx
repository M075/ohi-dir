"use client";
import { StarIcon } from "@heroicons/react/20/solid";
import Link from "next/link";
import React, { useState } from "react";
import { useCart } from "@/assets/contexts/CartContext";
import { toast } from "@/components/hooks/use-toast";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";

function classNames(... classes) {
  return classes.filter(Boolean).join(" ");
}

const ProductCard = ({ product }) => {
  const imageUrl = product?. images?.[0] || "/image. png";
  const { addToCart } = useCart();
  const [isAdding, setIsAdding] = useState(false);

  const handleAddToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!product?._id) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Product ID not found",
      });
      return;
    }

    setIsAdding(true);
    try {
      await addToCart(product._id, 1);
    } catch (error) {
      console.error("Error adding to cart:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add item to cart.  Please try again.",
      });
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="group relative">
      <div className="h-56 w-full overflow-hidden rounded-md bg-gray-200 group-hover:opacity-75 lg:h-72 xl:h-80">
        <Image
          width={300}
          height={320}
          src={imageUrl}
          alt={product?. title || "Product"}
          className="h-full w-full object-cover object-center"
        />
      </div>
      
      {product?. ownerName && (
        <span className="mt-4 inline-block text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
          {product.ownerName}
        </span>
      )}
      
      <h3 className="mt-2 text-sm text-gray-700 dark:text-gray-200">
        <Link href={`/products/${product._id}`}>
          <span className="absolute inset-0" />
          {product?. title}
        </Link>
      </h3>
      
      {(product?.rating > 0 || product?.review.length > 0) && (
        <div className="mt-1 flex items-center">
          {[0, 1, 2, 3, 4]. map((rating) => (
            <StarIcon
              key={rating}
              aria-hidden="true"
              className={classNames(
                product?.rating > rating ? "text-yellow-400" : "text-gray-200",
                "h-4 w-4 flex-shrink-0"
              )}
            />
          ))}
          <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">
            ({product?.review.length || 0})
          </span>
        </div>
      )}
      
      <div className="flex items-center justify-between">
        <div>
          {product?.discountPercentage > 0 && (
            <span className="line-through mr-2 text-sm text-gray-500 dark:text-gray-400">
              R {product?. price}
            </span>
          )}
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            R{" "}
            {product?.discountPercentage > 0
              ? (product. price * (1 - product. discountPercentage / 100)). toFixed(2)
              : product?. price}
          </span>
          {product?.discountPercentage > 0 && (
            <span className="ml-2 inline-flex text-xs bg-red-100 dark:bg-red-700 text-red-600 dark:text-red-200 px-1. 5 py-0.5 rounded">
              -{product.discountPercentage}%
            </span>
          )}
        </div>
        
        <Button
          size="icon"
          variant="secondary"
          className="relative z-10"
          disabled={product?.stock === 0 || isAdding}
          onClick={handleAddToCart}
        >
          <ShoppingCart className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default ProductCard;