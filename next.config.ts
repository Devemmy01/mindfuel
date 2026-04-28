import withPWAInit from "next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  // disable: process.env.NODE_ENV === "development",
  disable: false,
  register: true,
  skipWaiting: true,
  customWorkerDir: "worker",
});


/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https" as const,
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https" as const,
        hostname: "**",
      },
    ],
  },
};

export default withPWA(nextConfig);
