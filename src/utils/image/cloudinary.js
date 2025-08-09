import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import dotenv from "dotenv";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Upload video to Cloudinary
const uploadVideo = async (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: "video",
        folder: options.folder || "techyjaunt/videos",
        quality: options.quality || "auto",
        format: options.format || "mp4",
        transformation: options.transformation || [
          { quality: "auto:good" },
          { fetch_format: "auto" }
        ],
        ...options
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    const stream = Readable.from(buffer);
    stream.pipe(uploadStream);
  });
};

// Upload image to Cloudinary
const uploadImage = async (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: "image",
        folder: options.folder || "techyjaunt/images",
        transformation: options.transformation || [
          { quality: "auto:good" },
          { fetch_format: "auto" }
        ],
        ...options
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    const stream = Readable.from(buffer);
    stream.pipe(uploadStream);
  });
};

// Upload document/file to Cloudinary
const uploadDocument = async (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: "raw", // For non-media files
        folder: options.folder || "techyjaunt/documents",
        ...options
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    const stream = Readable.from(buffer);
    stream.pipe(uploadStream);
  });
};

// Delete file from Cloudinary
const deleteFile = async (publicId, resourceType = "image") => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType
    });
    return result;
  } catch (error) {
    throw error;
  }
};

// Generate video thumbnail
const generateThumbnail = async (videoPublicId, options = {}) => {
  try {
    const thumbnailUrl = cloudinary.url(videoPublicId, {
      resource_type: "video",
      format: "jpg",
      transformation: [
        { quality: "auto:good" },
        { width: options.width || 480 },
        { height: options.height || 360 },
        { crop: "fill" }
      ]
    });
    return thumbnailUrl;
  } catch (error) {
    throw error;
  }
};

// Get video metadata including duration from Cloudinary URL
const getVideoMetadata = async (videoUrl) => {
  try {
    // Extract public ID from Cloudinary URL
    const publicId = extractPublicIdFromUrl(videoUrl);
    if (!publicId) {
      throw new Error('Invalid Cloudinary URL format');
    }

    // Get resource details from Cloudinary
    const result = await cloudinary.api.resource(publicId, {
      resource_type: "video"
    });

    return {
      duration: result.duration || 0, // Duration in seconds
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes,
      url: result.secure_url,
      publicId: result.public_id
    };
  } catch (error) {
    console.error('Error getting video metadata:', error);
    throw new Error('Failed to get video metadata from Cloudinary');
  }
};

// Extract public ID from Cloudinary URL
const extractPublicIdFromUrl = (url) => {
  try {
    // Handle different Cloudinary URL formats
    const regex = /(?:cloudinary\.com\/[^\/]+\/(?:image|video)\/upload\/(?:v\d+\/)?)(.*?)(?:\.[^.]+)?$/;
    const match = url.match(regex);
    
    if (match && match[1]) {
      // Remove file extension and return public ID
      return match[1].replace(/\.[^.]+$/, '');
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting public ID from URL:', error);
    return null;
  }
};

// Get video duration from URL (convenience function)
const getVideoDurationFromUrl = async (videoUrl) => {
  try {
    const metadata = await getVideoMetadata(videoUrl);
    return metadata.duration;
  } catch (error) {
    console.error('Error getting video duration:', error);
    return 0; // Return 0 if unable to get duration
  }
};

export {
  cloudinary,
  uploadVideo,
  uploadImage,
  uploadDocument,
  deleteFile,
  generateThumbnail,
  getVideoMetadata,
  getVideoDurationFromUrl,
  extractPublicIdFromUrl
};

export default cloudinary;