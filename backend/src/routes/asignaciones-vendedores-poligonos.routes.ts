import { FastifyPluginAsync } from 'fastify';

import {
  createAsignacion,
  deleteAsignacion,
  getAsignacionById,
  listAsignaciones,
  updateAsignacion,
} from '../controllers/asignaciones-vendedores-poligonos.controller';
import { verifyJwt } from '../middleware/auth.middleware';

const idParamsSchema = {
  type: 'object',
  required: ['id'],
  properties: {
    id: { type: 'string' },
  },
};

const asignacionBodySchema = {
  type: 'object',
  required: ['vendedorId', 'poligonoId'],
  properties: {
    vendedorId: { type: 'integer', minimum: 1 },
    poligonoId: { type: 'integer', minimum: 1 },
  },
};

const asignacionesVendedoresPoligonosRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', verifyJwt);

  app.get(
    '/asignaciones-vendedores-poligonos',
    {
      schema: {
        tags: ['Vendor Assignments'],
        summary: 'List vendor assignments for the authenticated user',
        security: [{ bearerAuth: [] }],
      },
    },
    listAsignaciones,
  );

  app.get(
    '/asignaciones-vendedores-poligonos/:id',
    {
      schema: {
        tags: ['Vendor Assignments'],
        summary: 'Get one vendor assignment by id',
        security: [{ bearerAuth: [] }],
        params: idParamsSchema,
      },
    },
    getAsignacionById,
  );

  app.post(
    '/asignaciones-vendedores-poligonos',
    {
      schema: {
        tags: ['Vendor Assignments'],
        summary: 'Create a vendor assignment for the current user',
        security: [{ bearerAuth: [] }],
        body: asignacionBodySchema,
      },
    },
    createAsignacion,
  );

  app.put(
    '/asignaciones-vendedores-poligonos/:id',
    {
      schema: {
        tags: ['Vendor Assignments'],
        summary: 'Update a vendor assignment for the current user',
        security: [{ bearerAuth: [] }],
        params: idParamsSchema,
        body: asignacionBodySchema,
      },
    },
    updateAsignacion,
  );

  app.delete(
    '/asignaciones-vendedores-poligonos/:id',
    {
      schema: {
        tags: ['Vendor Assignments'],
        summary: 'Delete a vendor assignment for the current user',
        security: [{ bearerAuth: [] }],
        params: idParamsSchema,
      },
    },
    deleteAsignacion,
  );
};

export default asignacionesVendedoresPoligonosRoutes;