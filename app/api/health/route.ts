import { NextResponse } from 'next/server';
import { HealthResponse } from '@/lib/openapi';

export async function GET() {
  const payload = HealthResponse.parse({ status: 'ok', service: 'next-app' });
  return NextResponse.json(payload);
}
