import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Upload } from "@aws-sdk/lib-storage";
import {
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  AWS_REGION,
  AWS_BUCKET_NAME,
} from "../helper/config.js";
import sharp from "sharp";
import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import fs from "fs";
import path from "path";
import os from "os";
import { v4 as uuidv4 } from "uuid";
import { Readable } from "stream";

// Configure FFmpeg
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const s3Client = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  },
});

// Helper to convert stream/buffer to buffer
const streamToBuffer = async (stream) => {
  if (Buffer.isBuffer(stream)) return stream;
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
};

// Upload image to S3 (with Sharp processing)
export const uploadImage = async (fileBuffer, options = {}) => {
  try {
    const buffer = await streamToBuffer(fileBuffer);
    let processedBuffer = buffer;
    let contentType = "image/jpeg"; // Default
    let extension = "jpg";

    // Apply transformations if options provided
    if (options.transformation) {
      const transformer = sharp(buffer);

      // Basic transformation mapping (Cloudinary style to Sharp)
      // This is a simplified mapping; complex Cloudinary transforms check might be needed
      const transform = options.transformation.find((t) => t.width || t.height);
      if (transform) {
        transformer.resize({
          width: transform.width,
          height: transform.height,
          fit: transform.crop === "fill" ? "cover" : "inside",
          position: transform.gravity === "face" ? "entropy" : "center", // approximated
        });
      }

      // Format
      if (options.format) {
        transformer.toFormat(options.format);
        extension = options.format;
        contentType = `image/${options.format}`;
      } else {
        transformer.jpeg({ quality: 80 });
      }

      processedBuffer = await transformer.toBuffer();
    }

    const key = `${options.folder || "techyjaunt/images"}/${options.public_id || uuidv4()}.${extension}`;

    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: AWS_BUCKET_NAME,
        Key: key,
        Body: processedBuffer,
        ContentType: contentType,
        // ACL: "public-read", // Uncomment if bucket is public, otherwise use signed URLs or CloudFront
      },
    });

    const result = await upload.done();

    // Construct return object matching Cloudinary structure where possible
    return {
      secure_url:
        result.Location ||
        `https://${AWS_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${key}`,
      public_id: key,
      format: extension,
      width: 0, // Sharp can provide this if needed
      height: 0,
    };
  } catch (error) {
    console.error("S3 Upload Image Error:", error);
    throw error;
  }
};

// Upload video to S3
export const uploadVideo = async (fileBuffer, options = {}) => {
  try {
    const buffer = await streamToBuffer(fileBuffer);
    const key = `${options.folder || "techyjaunt/videos"}/${options.public_id || uuidv4()}.${options.format || "mp4"}`;

    // Upload to S3
    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: AWS_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: "video/mp4",
      },
    });

    const result = await upload.done();
    const videoUrl =
      result.Location ||
      `https://${AWS_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${key}`;

    // Get Metadata (Duration, etc.) using temp file
    // We write to temp because ffmpeg needs a file path usually, or complex stream handling
    const tempFilePath = path.join(os.tmpdir(), `${uuidv4()}.mp4`);
    await fs.promises.writeFile(tempFilePath, buffer);

    const metadata = await new Promise((resolve, reject) => {
      ffmpeg.ffprobe(tempFilePath, (err, metadata) => {
        if (err) reject(err);
        else resolve(metadata);
      });
    });

    // Cleanup temp file
    await fs.promises.unlink(tempFilePath);

    return {
      secure_url: videoUrl,
      public_id: key,
      format: options.format || "mp4",
      duration: metadata.format.duration,
      bytes: buffer.length,
    };
  } catch (error) {
    console.error("S3 Upload Video Error:", error);
    throw error;
  }
};

// Upload document
export const uploadDocument = async (fileBuffer, options = {}) => {
  try {
    const buffer = await streamToBuffer(fileBuffer);
    const key = `${options.folder || "techyjaunt/documents"}/${options.public_id || uuidv4()}`;

    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: AWS_BUCKET_NAME,
        Key: key,
        Body: buffer,
        // ContentType: match mimetype or generic binary
      },
    });

    const result = await upload.done();

    return {
      secure_url:
        result.Location ||
        `https://${AWS_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${key}`,
      public_id: key,
      format: path.extname(key).substring(1),
    };
  } catch (error) {
    console.error("S3 Upload Document Error:", error);
    throw error;
  }
};

// Delete file
export const deleteFile = async (publicId, resourceType) => {
  try {
    const command = new DeleteObjectCommand({
      Bucket: AWS_BUCKET_NAME,
      Key: publicId,
    });
    await s3Client.send(command);
    return { result: "ok" };
  } catch (error) {
    console.error("S3 Delete Error:", error);
    throw error;
  }
};

// Generate Thumbnail
export const generateThumbnail = async (videoPublicId, options = {}) => {
  try {
    const thumbFilename = `thumb_${uuidv4()}.jpg`;
    const thumbPath = path.join(os.tmpdir(), thumbFilename);

    // Generate signed URL for reading the video securely
    const getObjectParams = {
      Bucket: AWS_BUCKET_NAME,
      Key: videoPublicId,
    };
    const command = new GetObjectCommand(getObjectParams);
    const signedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600,
    });

    await new Promise((resolve, reject) => {
      ffmpeg(signedUrl)
        .screenshots({
          count: 1,
          folder: os.tmpdir(),
          filename: thumbFilename,
          size: `${options.width || 480}x${options.height || 360}`,
        })
        .on("end", resolve)
        .on("error", reject);
    });

    // Upload thumbnail
    const thumbBuffer = await fs.promises.readFile(thumbPath);
    const uploadResult = await uploadImage(thumbBuffer, {
      folder: options.folder || "techyjaunt/thumbnails",
      public_id: `thumb_${uuidv4()}`,
    });

    // Cleanup
    await fs.promises.unlink(thumbPath);

    return uploadResult.secure_url;
  } catch (error) {
    console.error("Generate Thumbnail Error:", error);
    throw error;
  }
};

// Get Video Metadata (from URL - likely S3 URL)
export const getVideoMetadata = async (videoUrl) => {
  try {
    let probeUrl = videoUrl;

    // Try to extract key to sign the URL if it's from our bucket
    const publicId = extractPublicIdFromUrl(videoUrl);
    if (publicId) {
      try {
        const command = new GetObjectCommand({
          Bucket: AWS_BUCKET_NAME,
          Key: publicId,
        });
        probeUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
      } catch (signErr) {
        console.warn(
          "Failed to sign URL for metadata, using original:",
          signErr.message,
        );
      }
    }

    const metadata = await new Promise((resolve, reject) => {
      ffmpeg.ffprobe(probeUrl, (err, metadata) => {
        if (err) reject(err);
        else resolve(metadata);
      });
    });

    return {
      duration: metadata.format.duration,
      width: metadata.streams[0]?.width,
      height: metadata.streams[0]?.height,
      format: metadata.format.format_name,
      url: videoUrl,
    };
  } catch (error) {
    console.error("Get Metadata Error:", error);
    throw error;
  }
};

export const getVideoDurationFromUrl = async (videoUrl) => {
  const meta = await getVideoMetadata(videoUrl);
  return meta.duration;
};

// Utils
export const extractPublicIdFromUrl = (url) => {
  // S3 URL: https://bucket.s3.region.amazonaws.com/folder/file.ext
  // Key: folder/file.ext
  try {
    const urlObj = new URL(url);
    // Path matches key (remove leading slash)
    return urlObj.pathname.substring(1);
  } catch (e) {
    return null;
  }
};

export default {
  uploadImage,
  uploadVideo,
  uploadDocument,
  deleteFile,
  generateThumbnail,
  getVideoMetadata,
  getVideoDurationFromUrl,
  extractPublicIdFromUrl,
};
