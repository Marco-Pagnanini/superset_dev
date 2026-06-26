import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // L'embedding usa l'SDK Superset solo lato client; nessuna config server speciale.
  reactStrictMode: true,
  // La lint non deve bloccare la build (nessuna config ESLint in questo progetto).
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
