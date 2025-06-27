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

export {
  cloudinary,
  uploadVideo,
  uploadImage,
  uploadDocument,
  deleteFile,
  generateThumbnail
};

export default cloudinary;