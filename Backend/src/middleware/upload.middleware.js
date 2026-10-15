import multer from "multer";

// Configure memory storage so files are available in buffer for ImageKit
const storage = multer.memoryStorage();

// File filter to allow only image files
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/svg+xml",
  ];

  if (allowedMimeTypes.includes(file.mimetype) || file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only image files (JPEG, PNG, WEBP, GIF, SVG) are allowed."), false);
  }
};

export const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter,
});

// Middleware helper to handle multer upload errors gracefully
export const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ message: "File size exceeds 5MB limit." });
    }
    return res.status(400).json({ message: `Upload error: ${err.message}` });
  } else if (err) {
    return res.status(400).json({ message: err.message || "Failed to process uploaded file." });
  }
  next();
};

export default upload;
