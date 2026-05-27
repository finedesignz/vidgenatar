import { OpenAPIRegistry, OpenApiGeneratorV31, extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

extendZodWithOpenApi(z);

export const registry = new OpenAPIRegistry();

export const HealthResponse = registry.register(
  'HealthResponse',
  z.object({
    status: z.literal('ok'),
    service: z.string(),
  }),
);

registry.registerPath({
  method: 'get',
  path: '/api/health',
  summary: 'Health check',
  tags: ['system'],
  responses: {
    200: {
      description: 'Service is healthy',
      content: { 'application/json': { schema: HealthResponse } },
    },
  },
});

export function buildOpenApiDocument() {
  const generator = new OpenApiGeneratorV31(registry.definitions);
  return generator.generateDocument({
    openapi: '3.1.0',
    info: { title: 'vidgenatar', version: '0.1.0' },
    servers: [{ url: '/' }],
  });
}
