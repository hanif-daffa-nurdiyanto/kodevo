import path from "node:path"
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(process.cwd(), "../.."),
  transpilePackages: ["@kodevo/auth", "@kodevo/db", "@kodevo/email", "@kodevo/ui", "@kodevo/utils"],
}

export default nextConfig
