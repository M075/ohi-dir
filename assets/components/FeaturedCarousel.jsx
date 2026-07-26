"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Star, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { isFeatured, MAX_FEATURED } from "@/utils/featured";

const AUTOPLAY_MS = 5000;

export default function FeaturedCarousel({ products = [] }) {
  const featured = products
    .filter((p) => isFeatured(p?.featured))
    .slice(0, MAX_FEATURED);

  const [api, setApi] = useState(null);
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);
  const [paused, setPaused] = useState(false);

  // Track the active slide for the dot indicators.
  useEffect(() => {
    if (!api) return;
    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap());

    const onSelect = () => setCurrent(api.selectedScrollSnap());
    api.on("select", onSelect);
    api.on("reInit", onSelect);
    return () => {
      api.off("select", onSelect);
      api.off("reInit", onSelect);
    };
  }, [api]);

  // Lightweight autoplay (no extra dependency), pauses on hover/focus.
  useEffect(() => {
    if (!api || paused || featured.length <= 1) return;
    const id = setInterval(() => api.scrollNext(), AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [api, paused, featured.length]);

  // No featured products yet — keep the page welcoming with the classic header.
  if (featured.length === 0) return <FallbackHero />;

  return (
    <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 sm:pt-24 lg:px-8">
      <Carousel
        setApi={setApi}
        opts={{ loop: true, align: "start" }}
        className="w-full"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
      >
        <CarouselContent>
          {featured.map((product) => (
            <CarouselItem key={product._id}>
              <FeaturedSlide product={product} />
            </CarouselItem>
          ))}
        </CarouselContent>

        {featured.length > 1 && (
          <>
            <CarouselPrevious className="left-3 top-1/2 -translate-y-1/2 h-10 w-10 border-none bg-white/80 text-gray-900 hover:bg-white sm:left-5" />
            <CarouselNext className="right-3 top-1/2 -translate-y-1/2 h-10 w-10 border-none bg-white/80 text-gray-900 hover:bg-white sm:right-5" />
          </>
        )}
      </Carousel>

      {/* Dot indicators */}
      {count > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          {Array.from({ length: count }).map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to featured product ${i + 1}`}
              onClick={() => api?.scrollTo(i)}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === current
                  ? "w-8 bg-emerald-500"
                  : "w-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FeaturedSlide({ product }) {
  const image =
    product?.images?.find((img) => img && img.trim() !== "") ||
    product?.thumbnail ||
    "/image.png";

  const hasDiscount = product?.discountPercentage > 0;
  const finalPrice = hasDiscount
    ? (product.price * (1 - product.discountPercentage / 100)).toFixed(2)
    : product?.price;

  return (
    <Link
      href={`/products/${product.slug || product._id}`}
      className="group block focus:outline-none"
    >
      <div className="relative h-[380px] w-full overflow-hidden rounded-3xl shadow-2xl ring-1 ring-black/5 sm:h-[460px] lg:h-[520px]">
        {/* Background image */}
        <Image
          src={image}
          alt={product?.title || "Featured product"}
          fill
          priority
          sizes="(max-width: 1280px) 100vw, 1280px"
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        />

        {/* Legibility overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/20 to-transparent" />

        {/* Content */}
        <div className="relative z-10 flex h-full max-w-2xl flex-col justify-end p-6 sm:p-10 lg:p-14">
          <span className="mb-4 inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white shadow-lg">
            <Star className="h-3.5 w-3.5 fill-white" />
            Featured
          </span>

          <h2 className="text-3xl font-extrabold leading-tight text-white drop-shadow-md line-clamp-2 sm:text-4xl lg:text-5xl">
            {product?.title}
          </h2>

          {product?.ownerName && (
            <p className="mt-2 text-sm font-medium text-emerald-200 sm:text-base">
              {product.ownerName}
            </p>
          )}

          {product?.description && (
            <p className="mt-3 max-w-xl text-sm text-gray-200 line-clamp-2 sm:text-base">
              {product.description}
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="text-2xl font-bold text-white sm:text-3xl">
              R {finalPrice}
            </span>
            {hasDiscount && (
              <>
                <span className="text-lg text-gray-300 line-through">
                  R {product.price}
                </span>
                <span className="rounded-md bg-red-500 px-2 py-0.5 text-sm font-semibold text-white">
                  -{product.discountPercentage}% OFF
                </span>
              </>
            )}

            {product?.rating > 0 && (
              <span className="flex items-center gap-1 text-sm text-yellow-300">
                <Star className="h-4 w-4 fill-yellow-300" />
                {product.rating}
              </span>
            )}
          </div>

          <span className="mt-6 inline-flex w-fit items-center gap-2 rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-colors group-hover:bg-emerald-600">
            Shop Now
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

// Original products-page header, shown when nothing is featured yet.
function FallbackHero() {
  return (
    <div className="mx-auto max-w-7xl sm:px-6 sm:py-16 lg:px-8">
      <div className="relative isolate overflow-hidden bg-gray-200 px-6 py-16 text-center shadow-2xl dark:bg-gray-900 sm:rounded-3xl sm:px-16 sm:py-24">
        <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight dark:text-white sm:text-4xl">
          Products from Sellers Near You
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-gray-500 dark:text-gray-300">
          View our collection of products carefully curated from sellers all
          around you. Find the perfect item that suits your needs.
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <Link href="/stores">
            <Button>Browse Stores</Button>
          </Link>
          <Link
            href="/dashboard/profile"
            className="text-sm leading-6 dark:text-white"
          >
            Become a Seller <span aria-hidden="true">→</span>
          </Link>
        </div>
        <svg
          viewBox="0 0 1024 1024"
          aria-hidden="true"
          className="absolute left-1/2 top-1/2 -z-10 h-[64rem] w-[64rem] -translate-x-1/2 [mask-image:radial-gradient(closest-side,white,transparent)]"
        >
          <circle
            r={512}
            cx={512}
            cy={512}
            fill="url(#products-gradient)"
            fillOpacity="0.7"
          />
          <defs>
            <radialGradient id="products-gradient">
              <stop stopColor="#10B981" />
              <stop offset={1} stopColor="#059669" />
            </radialGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
}
