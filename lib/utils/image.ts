export function getFullImageUrl(imagePath?: string | null): string {
  if (!imagePath) return "/default-profile.jpg";

  if (imagePath.startsWith("/uploads/")) {
    return `${process.env.NEXT_PUBLIC_BACKEND_URL}${imagePath}`;
  }

  return imagePath;
}
