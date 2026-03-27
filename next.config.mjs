/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // cache-bust: 20260327-alert-layer-v2
 
}

export default nextConfig
