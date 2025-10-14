// utils/imageUtils.js - Image compression and upload utilities
import sharp from 'sharp';
import multer from 'multer';

/**
 * Configure Multer for in-memory storage
 */
export const uploadConfig = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.'));
    }
    
    cb(null, true);
  }
});

/**
 * Compress image to target size (100KB)
 * @param {Buffer} imageBuffer - Original image buffer
 * @param {number} targetSizeKB - Target size in KB (default 100KB)
 * @returns {Promise<Buffer>} - Compressed image buffer
 */
export const compressImage = async (imageBuffer, targetSizeKB = 100) => {
  try {
    const targetSizeBytes = targetSizeKB * 1024;
    
    // Get image metadata
    const metadata = await sharp(imageBuffer).metadata();
    console.log('Original image:', {
      format: metadata.format,
      width: metadata.width,
      height: metadata.height,
      size: imageBuffer.length,
      sizeKB: (imageBuffer.length / 1024).toFixed(2)
    });

    // If image is already smaller than target, return as is
    if (imageBuffer.length <= targetSizeBytes) {
      console.log('Image already within size limit');
      return imageBuffer;
    }

    // Start with quality 85 and reduce if needed
    let quality = 85;
    let compressedBuffer;
    let attempts = 0;
    const maxAttempts = 10;

    // Calculate initial resize dimensions (maintain aspect ratio)
    let width = metadata.width;
    let height = metadata.height;

    // If image is very large, resize first
    if (width > 1920 || height > 1920) {
      const maxDimension = 1920;
      if (width > height) {
        height = Math.round((height / width) * maxDimension);
        width = maxDimension;
      } else {
        width = Math.round((width / height) * maxDimension);
        height = maxDimension;
      }
    }

    while (attempts < maxAttempts) {
      // Compress image
      compressedBuffer = await sharp(imageBuffer)
        .resize(width, height, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ 
          quality: quality,
          progressive: true,
          mozjpeg: true // Use mozjpeg for better compression
        })
        .toBuffer();

      console.log(`Attempt ${attempts + 1}: Size = ${(compressedBuffer.length / 1024).toFixed(2)} KB, Quality = ${quality}`);

      // Check if size is acceptable (within 5% of target or below)
      if (compressedBuffer.length <= targetSizeBytes * 1.05) {
        break;
      }

      // Reduce quality and/or dimensions for next attempt
      if (quality > 50) {
        quality -= 5;
      } else if (width > 800 || height > 800) {
        // Further reduce dimensions
        width = Math.round(width * 0.9);
        height = Math.round(height * 0.9);
        quality = 85; // Reset quality when reducing size
      } else {
        // Last resort: aggressive quality reduction
        quality -= 10;
      }

      attempts++;
    }

    console.log('Final compressed image:', {
      size: compressedBuffer.length,
      sizeKB: (compressedBuffer.length / 1024).toFixed(2),
      quality: quality,
      width: width,
      height: height,
      compressionRatio: ((1 - compressedBuffer.length / imageBuffer.length) * 100).toFixed(2) + '%'
    });

    return compressedBuffer;

  } catch (error) {
    console.error('Image compression error:', error);
    throw new Error('Failed to compress image: ' + error.message);
  }
};

/**
 * Validate image file
 * @param {Object} file - File object from multer
 * @param {number} maxSizeMB - Maximum file size in MB
 * @returns {Object} - Validation result
 */
export const validateImage = (file, maxSizeMB = 5) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  if (!file) {
    return { valid: false, error: 'No file provided' };
  }

  if (!allowedTypes.includes(file.mimetype)) {
    return { 
      valid: false, 
      error: 'Invalid file type. Only JPEG, PNG, and WebP images are allowed.' 
    };
  }

  if (file.size > maxSizeBytes) {
    return { 
      valid: false, 
      error: `File too large. Maximum size is ${maxSizeMB}MB.` 
    };
  }

  return { valid: true };
};

/**
 * Convert buffer to base64 data URL for display
 * @param {Buffer} buffer - Image buffer
 * @param {string} contentType - Image content type
 * @returns {string} - Base64 data URL
 */
export const bufferToDataURL = (buffer, contentType) => {
  if (!buffer || !contentType) return null;
  const base64 = buffer.toString('base64');
  return `data:${contentType};base64,${base64}`;
};

/**
 * Process uploaded image for offer
 * @param {Object} file - Multer file object
 * @returns {Promise<Object>} - Processed image data
 */
export const processOfferImage = async (file) => {
  try {
    // Validate image
    const validation = validateImage(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Compress image
    const compressedBuffer = await compressImage(file.buffer, 100);

    return {
      data: compressedBuffer,
      contentType: 'image/jpeg', // Always JPEG after compression
      size: compressedBuffer.length,
      originalName: file.originalname,
      uploadedAt: new Date()
    };
  } catch (error) {
    console.error('Error processing offer image:', error);
    throw error;
  }
};