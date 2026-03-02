import multer from 'multer';
import { Request } from 'express';

// Configure multer for in-memory storage
// Files are stored in memory as Buffer objects
const storage = multer.memoryStorage();

// File filter to accept text, markdown, and JSON files.
// ImportAgentModal accepts .json, .md, and .txt — keep this in sync with the UI.
const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedMimeTypes = [
    'text/plain',
    'application/json',
    'text/json',
    'text/markdown',
  ];

  const allowedExtensions = ['.txt', '.json', '.md'];

  const isAllowedMimeType = allowedMimeTypes.includes(file.mimetype);
  const hasAllowedExtension = allowedExtensions.some(ext =>
    file.originalname.toLowerCase().endsWith(ext)
  );

  if (isAllowedMimeType || hasAllowedExtension) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only .txt, .json, and .md files are allowed.'));
  }
};

// Configure multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15 MB max file size
    files: 1, // Only one file at a time
  },
});

/**
 * Middleware for uploading a single transcript file
 */
export const uploadTranscript: ReturnType<typeof upload.single> = upload.single('transcript');

/**
 * Helper to extract text content from uploaded file
 */
export const extractFileContent = (file?: Express.Multer.File): string => {
  if (!file) {
    throw new Error('No file uploaded');
  }

  // Convert buffer to string
  return file.buffer.toString('utf-8');
};

export default upload;
