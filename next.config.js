/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY || "",
  },
};

module.exports = nextConfig;
