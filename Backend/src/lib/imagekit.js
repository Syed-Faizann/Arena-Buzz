import ImageKit from "imagekit";
import "dotenv/config";

let imagekitInstance = null;

/**
 * Get or initialize ImageKit client instance safely
 */
export const getImageKit = () => {
  if (imagekitInstance) return imagekitInstance;

  const publicKey = process.env.IMAGEKIT_PUBLIC_KEY;
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT;

  if (
    publicKey &&
    privateKey &&
    urlEndpoint &&
    !publicKey.includes("your_") &&
    !privateKey.includes("your_")
  ) {
    try {
      imagekitInstance = new ImageKit({
        publicKey,
        privateKey,
        urlEndpoint,
      });
      return imagekitInstance;
    } catch (err) {
      console.error("Failed to initialize ImageKit client:", err);
      return null;
    }
  }
  return null;
};

/**
 * Check if valid ImageKit credentials are configured
 */
export const isImageKitConfigured = () => {
  return Boolean(getImageKit());
};

/**
 * Upload a file buffer to ImageKit (with automatic Base64 fallback if credentials are not yet configured)
 * @param {Buffer} fileBuffer - The file buffer
 * @param {string} fileName - Original file name
 * @param {string} folder - Destination folder on ImageKit (default: /fantasy_buzz/avatars)
 * @param {string} mimeType - The mime type of the file
 * @returns {Promise<{ url: string, fileId: string, provider: string }>}
 */
export const uploadToImageKit = async (
  fileBuffer,
  fileName = `avatar_${Date.now()}`,
  folder = "/fantasy_buzz/avatars",
  mimeType = "image/jpeg"
) => {
  const ik = getImageKit();

  if (ik) {
    try {
      const response = await ik.upload({
        file: fileBuffer.toString("base64"),
        fileName: `${Date.now()}_${fileName.replace(/\s+/g, "_")}`,
        folder: folder,
        useUniqueFileName: true,
      });

      return {
        url: response.url,
        fileId: response.fileId,
        provider: "imagekit",
      };
    } catch (err) {
      console.error("ImageKit upload error:", err);
      throw new Error(err.message || "Failed to upload image to ImageKit");
    }
  }

  // Graceful fallback for local development if keys are not yet provided in .env
  console.warn(
    "[ImageKit Notice] ImageKit credentials not configured in Backend/.env. Using Base64 Data URL fallback for local development."
  );

  const base64Data = `data:${mimeType};base64,${fileBuffer.toString("base64")}`;
  return {
    url: base64Data,
    fileId: `local_${Date.now()}`,
    provider: "local_base64",
  };
};

export default { getImageKit, isImageKitConfigured, uploadToImageKit };
