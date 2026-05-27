import { NextResponse } from 'next/server';
import { buildOpenApiDocument } from '@/lib/openapi';

// Side-effect imports: every route that calls registry.registerPath() MUST be imported here.
import '@/app/api/health/route';

export const dynamic = 'force-static';

export async function GET() {
  const doc = buildOpenApiDocument();
  return NextResponse.json(doc);
}
