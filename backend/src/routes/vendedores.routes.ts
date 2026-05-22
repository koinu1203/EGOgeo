import { FastifyPluginAsync } from 'fastify';

import {
  createVendedor,
  deleteVendedor,
  getVendedorById,
  listVendedores,
  updateVendedor,
} from '../controllers/vendedores.controller';
import { verifyJwt } from '../middleware/auth.middleware';

const idParamsSchema = {
  type: 'object',
  required: ['id'],
  properties: {
    id: { type: 'string' },
  },
};

const vendedorBodySchema = {
  type: 'object',
  required: ['codigo', 'nombre'],
  properties: {
    codigo: { type: 'string', minLength: 1, maxLength: 50 },
    nombre: { type: 'string', minLength: 1, maxLength: 150 },
  },
};

const vendedoresRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', verifyJwt);

  app.get(
    '/vendedores',
    {
      schema: {
        tags: ['Vendors'],
        summary: 'List all vendors',
        security: [{ bearerAuth: [] }],
      },
    },
    listVendedores,
  );

  app.get(
    '/vendedores/:id',
    {
      schema: {
        tags: ['Vendors'],
        summary: 'Get one vendor by id',
        security: [{ bearerAuth: [] }],
        params: idParamsSchema,
      },
    },
    getVendedorById,
  );

  app.post(
    '/vendedores',
    {
      schema: {
        tags: ['Vendors'],
        summary: 'Create a vendor',
        security: [{ bearerAuth: [] }],
        body: vendedorBodySchema,
      },
    },
    createVendedor,
  );

  app.put(
    '/vendedores/:id',
    {
      schema: {
        tags: ['Vendors'],
        summary: 'Update a vendor',
        security: [{ bearerAuth: [] }],
        params: idParamsSchema,
        body: vendedorBodySchema,
      },
    },
    updateVendedor,
  );

  app.delete(
    '/vendedores/:id',
    {
      schema: {
        tags: ['Vendors'],
        summary: 'Delete a vendor',
        security: [{ bearerAuth: [] }],
        params: idParamsSchema,
      },
    },
    deleteVendedor,
  );
};

export default vendedoresRoutes;