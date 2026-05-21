import { FastifyPluginAsync } from 'fastify';

import {
  createPoligono,
  deletePoligono,
  getPoligonoById,
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