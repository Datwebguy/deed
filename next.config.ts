import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: { root: __dirname },
  // Load the Coinbase wallet SDKs as plain Node packages; bundling them breaks their exports.
  serverExternalPackages: ["@coinbase/agentkit", "@coinbase/cdp-sdk"],
};

export default nextConfig;
