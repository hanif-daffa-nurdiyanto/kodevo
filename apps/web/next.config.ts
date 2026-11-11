import path from "node:path";
import type { NextConfig } from "next";

const adminAppUrl = process.env.ADMIN_APP_URL ?? "http://localhost:3001";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(process.cwd(), "../.."),
  transpilePackages: ["@kodevo/auth", "@kodevo/db", "@kodevo/email", "@kodevo/ui", "@kodevo/utils"],
  async redirects() {
    return [
      {
        source: "/studio",
        destination: adminAppUrl,
        permanent: false,
      },
      {
        source: "/studio/:path*",
        destination: `${adminAppUrl}/:path*`,
        permanent: false,
      },
      {
        source: "/setup",
        destination: `${adminAppUrl}/setup`,
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
