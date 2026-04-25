"use client";
import Image from "next/image";
import { useState, useEffect } from "react";

// Client-side URL transformation helper
const getOptimizedUrl = (url, options = {}) => {
  if (!url) return '/image.png'; // fallback
  
  const {
    width,
    height,
    quality = 80,
    format = 'auto',
    crop = 'maintain_ratio',
  } = options;
  
  const transformations = [];
  
  if (width) transformations.push(`w-${width}`);
  if (height) transformations.push(`h-${height}`);
  transformations.push(`q-${quality}`);
  transformations.push(`f-${format}`);
  if (crop) transformations.push(`c-${crop}`);
  
  const trParams = transformations.join(',');
  
  // Check if it's an ImageKit URL
  if (!url.includes('ik.imagekit.io')) {
    return url; // Return as-is if not ImageKit
  }
  
  if (url.includes('?tr=')) {
    return url; // Already has transformations
  }
  if (url.includes('?')) {
    return `${url}&tr=${trParams}`;
  }
  return `${url}?tr=${trParams}`;
};

// Optimized Image Component
export const OptimizedImage = ({ 
  src, 
  alt, 
  width, 
  height, 
  quality = 80,
  preset = null, // 'thumbnail', 'card', 'detail', 'mobile'
  className = "",
  priority = false,
  ...props 
}) => {
  const [imgSrc, setImgSrc] = useState(src);
  const [isLoading, setIsLoading] = useState(true);

  // Keep internal imgSrc in sync when src prop changes (important for controlled updates)
  useEffect(() => {
    setImgSrc(src);
    setIsLoading(true);
  }, [src]);

  // Preset configurations
  const presets = {
    thumbnail: { width: 150, height: 150, quality: 70 },
    card: { width: 400, height: 400, quality: 80 },
    detail: { width: 1200, height: 1200, quality: 85 },
    mobile: { width: 800, height: 800, quality: 75 },
  };

  // Use preset or custom dimensions
  const imageOptions = preset 
    ? presets[preset] 
    : { width, height, quality };

  const optimizedSrc = getOptimizedUrl(imgSrc, imageOptions);

  const handleError = () => {
    setImgSrc('/image.png'); // Fallback image
    setIsLoading(false);
  };

  const handleLoad = () => {
    setIsLoading(false);
  };

  return (
    <div className={`relative ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 bg-gray-200 dark:bg-gray-800 animate-pulse rounded-md" />
      )}
      <Image
        src={optimizedSrc}
        alt={alt}
        width={width || imageOptions.width}
        height={height || imageOptions.height}
        className={`${className} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        onError={handleError}
        onLoad={handleLoad}
        priority={priority}
        {...props}
      />
    </div>
  );
};

// Product Card Image (preset: card)
export const ProductCardImage = ({ src, alt, className = "" }) => (
  <OptimizedImage
    src={src}
    alt={alt}
    preset="card"
    className={className}
  />
);

// Product Thumbnail (preset: thumbnail)
export const ProductThumbnail = ({ src, alt, className = "" }) => (
  <OptimizedImage
    src={src}
    alt={alt}
    preset="thumbnail"
    width={150}
    height={150}
    className={className}
  />
);

// Product Detail Image (preset: detail)
export const ProductDetailImage = ({ src, alt, className = "" }) => (
  <OptimizedImage
    src={src}
    alt={alt}
    preset="detail"
    width={1200}
    height={1200}
    className={className}
    priority
  />
);

// Mobile Optimized Image (preset: mobile)
export const MobileImage = ({ src, alt, className = "" }) => (
  <OptimizedImage
    src={src}
    alt={alt}
    preset="mobile"
    width={800}
    height={800}
    className={className}
  />
);

// Responsive Image with srcSet
export const ResponsiveImage = ({ src, alt, className = "" }) => {
  const widths = [320, 640, 750, 828, 1080, 1200];
  
  const srcSet = widths
    .map(width => {
      const url = getOptimizedUrl(src, { width, quality: 80, format: 'auto' });
      return `${url} ${width}w`;
    })
    .join(', ');

  return (
    <img
      src={getOptimizedUrl(src, { width: 800, quality: 80 })}
      srcSet={srcSet}
      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
      alt={alt}
      className={className}
      loading="lazy"
    />
  );
};

export default OptimizedImage;