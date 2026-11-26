import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/index.php", destination: "/", permanent: true },
      { source: "/about.php", destination: "/about", permanent: true },
      { source: "/brand.php", destination: "/brand", permanent: true },
      { source: "/services.php", destination: "/services", permanent: true },
      { source: "/login.php", destination: "/auth/sign-in", permanent: true },
      { source: "/signup.php", destination: "/auth/sign-up", permanent: true },
      { source: "/terms.html", destination: "/legal/terms", permanent: true },
      { source: "/terms.php", destination: "/legal/terms", permanent: true },
      { source: "/privacy.html", destination: "/legal/privacy", permanent: true },
      { source: "/privacy.php", destination: "/legal/privacy", permanent: true },
    ];
  },
};

export default nextConfig;
