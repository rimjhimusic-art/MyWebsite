import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/index.php", destination: "/", permanent: true },
      { source: "/about.php", destination: "/about", permanent: true },
      { source: "/brand.php", destination: "/brand", permanent: true },
      { source: "/services.php", destination: "/services", permanent: true },
      { source: "/login.php", destination: "/login", permanent: true },
      { source: "/signup.php", destination: "/register/artist", permanent: true },
      { source: "/terms.html", destination: "/terms", permanent: true },
      { source: "/terms.php", destination: "/terms", permanent: true },
      { source: "/privacy.html", destination: "/privacy", permanent: true },
      { source: "/privacy.php", destination: "/privacy", permanent: true },
    ];
  },
};

export default nextConfig;
