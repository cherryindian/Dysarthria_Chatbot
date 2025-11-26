import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images:{
    remotePatterns: [
      {
        protocol: "https",
        hostname: "upload.wikimedia.org",
      },
      {
        protocol: "https",
        hostname: "ui-avatars.com",
      },
      {
        protocol: "https", 
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https", 
        hostname: "i.ibb.co.com",
      },
      {
        protocol:"https",
        hostname:"res.cloudnary.com",
      },

]}
  
};

export default nextConfig;
