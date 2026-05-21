import { FastifyPluginAsync } from 'fastify';

import {
  createCliente,
  deleteCliente,
  getClienteById,
  listClientesCercanos,
  listClientesInViewport,
  listClientes,
  updateCliente,
} from '../controllers/clientes.controller';
import { verifyJwt } from '../middleware/auth.middleware';

const idParamsSchema = {
  type: 'object',
  required: ['id'],
  properties: {
    id: { type: 'string' },
  },
};

const clienteBodySchema = {
  type: 'object',
  required: ['clienteId', 'nombre', 'ultimaCompra', 'montoAnual', 'moneda', 'longitud', 'latitud'],
  properties: {
    clienteId: { type: 'string' },
    nombre: { type: 'string' },
    ultimaCompra: { type: 'string', format: 'date' },
    montoAnual: { type: 'number' },
    moneda: { type: 'string', minLength: 3, maxLength: 3 },
    longitud: { type: 'number' },
    latitud: { type: 'number' },
  },
};

const cercanosQuerySchema = {
  type: 'object',
  required: ['longitud', 'latitud', 'radioMetros'],
  properties: {
    longitud: { type: 'number' },
    latitud: { type: 'number' },
    radioMetros: { type: 'number', minimum: 1 },
    limite: { type: 'integer', minimum: 1, maximum: 1000 },
  },
};

const viewportQuerySchema = {
  type: 'object',
  required: ['lngMin', 'latMin', 'lngMax', 'latMax'],
  properties: {
    lngMin: { type: 'number' },
    latMin: { type: 'number' },
    lngMax: { type: 'number' },
    latMax: { type: 'number' },
    limit: { type: 'integer', minimum: 1, maximum: 1000 },
  },
};

const clientesRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', verifyJwt);

  app.get(
    '/clientes',
    {
      schema: {
        tags: ['Customers'],
        summary: 'List all customers',
        security: [{ bearerAuth: [] }],
      },
    },
    listClientes,
  );

  app.get(
    '/clientes/cercanos',
    {
      schema: {
        tags: ['Customers'],
        summary: 'Find customers near a geographic point',
        security: [{ bearerAuth: [] }],
        querystring: cercanosQuerySchema,
      },
    },
    listClientesCercanos,
  );

  app.get(
    '/clientes/viewport',
    {
      schema: {
        tags: ['Customers'],
        summary: 'Find customers inside a viewport bounding box',
        security: [{ bearerAuth: [] }],
        querystring: viewportQuerySchema,
      },
    },
    listClientesInViewport,
  );

  app.get(
    '/clientes/:id',
    {
      schema: {
        tags: ['Customers'],
        summary: 'Get one customer by id',
        security: [{ bearerAuth: [] }],
        params: idParamsSchema,
      },
    },
    getClienteById,
  );

  app.post(
    '/clientes',
    {
      schema: {
        tags: ['Customers'],
        summary: 'Create a customer',
        security: [{ bearerAuth: [] }],
        body: clienteBodySchema,
      },
    },
    createCliente,
  );

  app.put(
    '/clientes/:id',
    {
      schema: {
        tags: ['Customers'],
        summary: 'Update a customer',
        security: [{ bearerAuth: [] }],
        params: idParamsSchema,
        body: clienteBodySchema,
      },
    },
    updateCliente,
  );

  app.delete(
    '/clientes/:id',
    {
      schema: {
        tags: ['Customers'],
        summary: 'Delete a customer',
        security: [{ bearerAuth: [] }],
        params: idParamsSchema,
      },
    },
    deleteCliente,
  );
};

export default clientesRoutes;