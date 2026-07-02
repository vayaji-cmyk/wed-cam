const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!;

export type CloudinaryUploadResult = {
  secure_url: string;
  public_id: string;
};

/**
 * Uploads a single image file directly from the guest's browser to
 * Cloudinary using an unsigned upload preset. Our own server never
 * touches the image bytes — only the resulting URL gets saved to
 * Supabase afterward.
 */
export async function uploadToCloudinary(
  file: File,
  folder: string
): Promise<CloudinaryUploadResult> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);
  formData.append("folder", folder);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: "POST", body: formData }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Cloudinary upload failed: ${errorBody}`);
  }

  const data = await response.json();
  return { secure_url: data.secure_url, public_id: data.public_id };
}
