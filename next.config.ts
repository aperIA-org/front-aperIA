import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // `legacy/` holds the pre-refactor static site for side-by-side reference.
  // It must never be compiled or linted as part of the app.
  eslint: {
    dirs: ['src'],
  },
};

export default nextConfig;
