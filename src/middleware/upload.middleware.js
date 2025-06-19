import multer from 'multer';
import path from 'path';

// File type validation
const fileFilter = (allowedTypes) => {
  return (req, file, cb) => {
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} is not supported`), false);
    }
  };
};

// Memory storage configuration
const storage = multer.memoryStorage();

// Video upload configuration
const videoUpload = multer({
  storage: storage,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB limit for videos
  },
  fileFilter: fileFilter([
    'video/mp4',
    'video/mpeg',
    'video/quicktime',
    'video/x-msvideo', // AVI
    'video/x-ms-wmv',
    'video/webm'
  ])
});

// Image upload configuration  
const imageUpload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for images
  },
  fileFilter: fileFilter([
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp'
  ])
});

// Document upload configuration
const documentUpload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit for documents
  },
  fileFilter: fileFilter([
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'application/zip',
    'application/x-rar-compressed'
  ])
});

// Audio upload configuration
const audioUpload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit for audio
  },
  fileFilter: fileFilter([
    'audio/mpeg',
    'audio/wav', 
    'audio/mp3',
    'audio/mp4',
    'audio/aac',
    'audio/ogg'
  ])
});

// General file upload (for class resources)
const generalFileUpload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB general limit
  },
  fileFilter: (req, file, cb) => {
    // Allow most common file types
    const allowedMimes = [
      // Videos
      'video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/webm',
      // Images  
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      // Documents
      'application/pdf', 'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain', 'application/zip', 'application/x-rar-compressed',
      // Audio
      'audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/mp4', 'audio/aac', 'audio/ogg',
      // Code files
      'text/javascript', 'text/html', 'text/css', 'application/json'
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} is not supported`), false);
    }
  }
});

// Error handling middleware for multer
const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size too large',
        error: 'File exceeds maximum allowed size'
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected field name',
        error: 'File field name not recognized'
      });
    }
  }
  
  if (error.message.includes('File type') && error.message.includes('not supported')) {
    return res.status(400).json({
      success: false,
      message: 'Invalid file type',
      error: error.message
    });
  }

  next(error);
};

export {
  videoUpload,
  imageUpload,
  documentUpload,
  audioUpload,
  generalFileUpload,
  handleMulterError
};
