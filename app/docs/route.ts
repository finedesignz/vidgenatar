import { ApiReference } from '@scalar/nextjs-api-reference';

// Scalar API Reference UI for Next.js App Router.
// Mounts at GET /docs and renders an interactive viewer over /openapi.json.
const config = {
  url: '/openapi.json',
  theme: 'purple',
};

export const GET = ApiReference(config);
