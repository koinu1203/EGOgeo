import { FastifyPluginAsync } from 'fastify';

import {
  createPoligonosBulk,
  createPoligono,
  deletePoligono,
  getPoligonoDetalle,
  getPoligonoById,
  listPointsInsidePoligono,
  listPoligonos,
  updatePoligono,
} from '../controllers/poligonos.controller';
import { verifyJwt } from '../middleware/auth.middleware';

const idParamsSchema = {
  type: 'object',
  required: ['id'],
  properties: {
    id: { type: 'string' },
  },
};

const poligonoBodySchema = {
  type: 'object',
  required: ['areaCoordinates'],
  properties: {
    nombre: { type: 'string', minLength: 1, maxLength: 100 },
    areaCoordinates: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'array',
        minItems: 4,
        items: {
          type: 'array',
          minItems: 2,
          maxItems: 2,
          items: { type: 'number' },
        },
      },
    },
    colorHex: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
    estiloPunto: { type: 'string', minLength: 1, maxLength: 50 },
  },
};

const bulkPoligonosBodySchema = {
  type: 'object',
  required: ['items'],
  properties: {
    items: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
          required: ['areaCoordinates', 'vendedorId', 'clienteIds'],
        properties: {
          nombre: { type: 'string', minLength: 1, maxLength: 100 },
          areaCoordinates: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'array',
              minItems: 4,
              items: {
                type: 'array',
                minItems: 2,
                maxItems: 2,
                items: { type: 'number' },
              },
            },
          },
          colorHex: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
          estiloPunto: { type: 'string', minLength: 1, maxLength: 50 },
          vendedorId: { type: 'integer', minimum: 1 },
          clienteIds: {
            type: 'array',
            minItems: 1,
            items: { type: 'integer', minimum: 1 },
          },
        },
      },
    },
  },
};

const poligonosRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', verifyJwt);

  app.get(
    '/poligonos',
    {
      schema: {
        tags: ['Polygons'],
        summary: 'List all polygons for the authenticated user',
        security: [{ bearerAuth: [] }],
      },
    },
    listPoligonos,
  );

  app.get(
    '/poligonos/:id',
    {
      schema: {
        tags: ['Polygons'],
        summary: 'Get one polygon by id',
        security: [{ bearerAuth: [] }],
        params: idParamsSchema,
      },
    },
    getPoligonoById,
  );

  app.get(
    '/poligonos/:id/puntos',
    {
      schema: {
        tags: ['Polygons'],
        summary: 'List all customer points inside a polygon for the authenticated user',
        security: [{ bearerAuth: [] }],
        params: idParamsSchema,
      },
    },
    listPointsInsidePoligono,
  );

  app.get(
    '/poligonos/:id/detalle',
    {
      schema: {
        tags: ['Polygons'],
        summary: 'Get polygon details and points inside for the authenticated user',
        security: [{ bearerAuth: [] }],
        params: idParamsSchema,
      },
    },
    getPoligonoDetalle,
  );

  app.post(
    '/poligonos',
    {
      schema: {
        tags: ['Polygons'],
        summary: 'Create a polygon',
        security: [{ bearerAuth: [] }],
        body: poligonoBodySchema,
      },
    },
    createPoligono,
  );

  app.post(
    '/poligonos/bulk',
    {
      schema: {
        tags: ['Polygons'],
        summary: 'Create many polygons and save vendor/customer assignments in one transaction',
        security: [{ bearerAuth: [] }],
        body: bulkPoligonosBodySchema,
      },
    },
    createPoligonosBulk,
  );

  app.put(
    '/poligonos/:id',
    {
      schema: {
        tags: ['Polygons'],
        summary: 'Update a polygon',
        security: [{ bearerAuth: [] }],
        params: idParamsSchema,
        body: poligonoBodySchema,
      },
    },
    updatePoligono,
  );

  app.delete(
    '/poligonos/:id',
    {
      schema: {
        tags: ['Polygons'],
        summary: 'Delete a polygon',
        security: [{ bearerAuth: [] }],
        params: idParamsSchema,
      },
    },
    deletePoligono,
  );
};

export default poligonosRoutes;