import ImageKit from 'imagekit';

// Server-side ImageKit instance
export const getImageKitInstance = () => {
  return new ImageKit({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
  });
};

// Upload file to ImageKit (Direct buffer - no base64 conversion)
export const uploadToImageKit = async (file, fileName, options = {}) => {
  try {
    const imagekit = getImageKitInstance();
    
    // Convert file to buffer directly (more efficient than base64)
    const buffer = Buffer.from(await file.arrayBuffer());
    
    const uploadResponse = await imagekit.upload({
      file: buffer, // Direct buffer upload
      fileName: fileName || `product_${Date.now()}_${file.name}`,
      folder: options.folder || '/products',
      useUniqueFileName: true,
      tags: options.tags || ['product'],
      // Optional: Server-side transformations during upload
      ...(options.resize && {
        transformation: {
          pre: `w-${options.resize.width},h-${options.resize.height},c-at_max`,
        }
      })
    });

    // Return the CDN URL
    return {
      url: uploadResponse.url,
      fileId: uploadResponse.fileId,
      name: uploadResponse.name,
      size: uploadResponse.size,
      filePath: uploadResponse.filePath,
      thumbnailUrl: uploadResponse.thumbnailUrl
    };
  } catch (error) {
    console.error('ImageKit upload error:', error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }
};

// Batch upload multiple files
export const uploadMultipleToImageKit = async (files, folderName = 'products') => {
  try {
    const uploadPromises = files.map(async (file, index) => {
      const fileName = `product_${Date.now()}_${index}_${file.name}`;
      return await uploadToImageKit(file, fileName, { folder: `/${folderName}` });
    });

    return await Promise.all(uploadPromises);
  } catch (error) {
    console.error('Batch upload error:', error);
    throw error;
  }
};

// Delete file from ImageKit
export const deleteFromImageKit = async (fileId) => {
  try {
    const imagekit = getImageKitInstance();
    await imagekit.deleteFile(fileId);
    return true;
  } catch (error) {
    console.error('ImageKit delete error:', error);
    throw new Error(`Failed to delete image: ${error.message}`);
  }
};

// Batch delete multiple files
export const deleteMultipleFromImageKit = async (fileIds) => {
  try {
    const deletePromises = fileIds.map(fileId => deleteFromImageKit(fileId));
    return await Promise.all(deletePromises);
  } catch (error) {
    console.error('Batch delete error:', error);
    throw error;
  }
};

// Get file ID from ImageKit URL
export const getFileIdFromUrl = (url) => {
  // Extract fileId from ImageKit URL structure
  const matches = url.match(/\/([^/]+)\.[^.]+$/);
  return matches ? matches[1] : null;
};

// Get optimized CDN URL with real-time transformations
export const getOptimizedUrl = (url, options = {}) => {
  const {
    width,
    height,
    quality = 80,
    format = 'auto', // auto, webp, jpg, png, avif
    crop = 'maintain_ratio', // maintain_ratio, force, at_max, at_least
    focus = 'auto', // auto, face, custom
    blur,
    grayscale = false,
    rotate,
    radius,
    border,
    progressive = true,
  } = options;
  
  const transformations = [];
  
  // Dimensions
  if (width) transformations.push(`w-${width}`);
  if (height) transformations.push(`h-${height}`);
  
  // Quality and format
  transformations.push(`q-${quality}`);
  transformations.push(`f-${format}`);
  
  // Cropping
  if (crop) transformations.push(`c-${crop}`);
  
  // Focus area
  if (focus && focus !== 'auto') transformations.push(`fo-${focus}`);
  
  // Effects
  if (blur) transformations.push(`bl-${blur}`);
  if (grayscale) transformations.push('e-grayscale');
  if (rotate) transformations.push(`rt-${rotate}`);
  if (radius) transformations.push(`r-${radius}`);
  if (border) transformations.push(`b-${border}`);
  if (progressive) transformations.push('pr-true');
  
  const trParams = transformations.join(',');
  
  // Add transformation parameters to URL
  if (url.includes('?tr=')) {
    return url; // Already has transformations
  }
  if (url.includes('?')) {
    return `${url}&tr=${trParams}`;
  }
  return `${url}?tr=${trParams}`;
};

// Preset transformations for common use cases
export const getImagePresets = (url) => ({
  // Thumbnail - small preview
  thumbnail: getOptimizedUrl(url, {
    width: 150,
    height: 150,
    crop: 'at_max',
    quality: 70
  }),
  
  // Card image - medium size for product cards
  card: getOptimizedUrl(url, {
    width: 400,
    height: 400,
    crop: 'maintain_ratio',
    quality: 80
  }),
  
  // Detail view - large but optimized
  detail: getOptimizedUrl(url, {
    width: 1200,
    height: 1200,
    crop: 'at_max',
    quality: 85,
    format: 'auto'
  }),
  
  // Mobile optimized
  mobile: getOptimizedUrl(url, {
    width: 800,
    height: 800,
    crop: 'at_max',
    quality: 75,
    format: 'webp'
  }),
  
  // Original with minimal optimization
  original: getOptimizedUrl(url, {
    quality: 90,
    format: 'auto'
  })
});

// Get responsive srcset for Next.js Image component
export const getResponsiveSrcSet = (url, widths = [320, 640, 750, 828, 1080, 1200]) => {
  return widths
    .map(width => {
      const optimizedUrl = getOptimizedUrl(url, {
        width,
        quality: 80,
        format: 'auto'
      });
      return `${optimizedUrl} ${width}w`;
    })
    .join(', ');
};

// Purge cache for specific file
export const purgeImageKitCache = async (url) => {
  try {
    const imagekit = getImageKitInstance();
    await imagekit.purgeCache(url);
    return true;
  } catch (error) {
    console.error('Cache purge error:', error);
    throw new Error(`Failed to purge cache: ${error.message}`);
  }
};

// Get file details
export const getFileDetails = async (fileId) => {
  try {
    const imagekit = getImageKitInstance();
    const details = await imagekit.getFileDetails(fileId);
    return details;
  } catch (error) {
    console.error('Get file details error:', error);
    throw new Error(`Failed to get file details: ${error.message}`);
  }
};

// List all files in a folder
export const listFiles = async (path = '', options = {}) => {
  try {
    const imagekit = getImageKitInstance();
    const files = await imagekit.listFiles({
      path,
      searchQuery: options.searchQuery || '',
      tags: options.tags || [],
      limit: options.limit || 100,
      skip: options.skip || 0,
      sort: options.sort || 'DESC_CREATED'
    });
    return files;
  } catch (error) {
    console.error('List files error:', error);
    throw new Error(`Failed to list files: ${error.message}`);
  }
};

// Update file metadata
export const updateFileMetadata = async (fileId, updates) => {
  try {
    const imagekit = getImageKitInstance();
    const result = await imagekit.updateFileDetails(fileId, {
      tags: updates.tags,
      customCoordinates: updates.customCoordinates,
      extensions: updates.extensions
    });
    return result;
  } catch (error) {
    console.error('Update metadata error:', error);
    throw new Error(`Failed to update metadata: ${error.message}`);
  }
};