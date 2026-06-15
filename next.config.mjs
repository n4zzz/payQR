/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // QR images + avatars are served from Supabase Storage.
    remotePatterns: [{ protocol: "https", hostname: "*.supabase.co" }],
  },
};

export default nextConfig;
