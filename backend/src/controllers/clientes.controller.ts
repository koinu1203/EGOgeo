import { FastifyReply, FastifyRequest } from 'fastify';

import ClientesModel, { ClienteInput } from '../models/clientes.model';

type IdParams = {
  id: string;
};

type ClientesCercanosQuery = {
  longitud: string;
  latitud: string;
  radioMetros: string;
  limite?: string;
};

type ClientesViewportQuery = {
  lngMin: string;
  latMin: string;
  lngMax: string;
  latMax: string;
  limit?: string;
};

export async function listClientes() {
  return ClientesModel.findAll();
}

export async function listClientesInViewport(
  request: FastifyRequest<{ Querystring: ClientesViewportQuery }>,
  reply: FastifyReply,
) {
  const lngMin = Number(request.query.lngMin);
  const latMin = Number(request.query.latMin);
  const lngMax = Number(request.query.lngMax);
  const latMax = Number(request.query.latMax);
  const limitRaw = request.query.limit ? Number(request.query.limit) : 1000;
  const limit = Math.min(Math.max(limitRaw, 1), 1000);

  if (
    Number.isNaN(lngMin)
    || Number.isNaN(latMin)
    || Number.isNaN(lngMax)
    || Number.isNaN(latMax)
    || Number.isNaN(limitRaw)
  ) {
    return reply.code(400).send({
      message: 'Invalid parameters. Use lngMin, latMin, lngMax, latMax and optionally limit.',
    });
  }

  return ClientesModel.findInViewport(lngMin, latMin, lngMax, latMax, limit);
}

export async function listClientesCercanos(
  request: FastifyRequest<{ Querystring: ClientesCercanosQuery }>,
  reply: FastifyReply,
) {
  const longitud = Number(request.query.longitud);
  const latitud = Number(request.query.latitud);
  const radioMetros = Number(request.query.radioMetros);
  const limiteRaw = request.query.limite ? Number(request.query.limite) : 100;

  const limite = Math.min(Math.max(limiteRaw, 1), 1000);

  if (
    Number.isNaN(longitud)
    || Number.isNaN(latitud)
    || Number.isNaN(radioMetros)
    || Number.isNaN(limiteRaw)
  ) {
    return reply.code(400).send({
      message: 'Invalid parameters. Use longitud, latitud, radioMetros and optionally limite.',
    });
  }

  if (radioMetros <= 0) {
    return reply.code(400).send({
      message: 'radioMetros must be greater than zero.',
    });
  }

  return ClientesModel.findNearby(longitud, latitud, radioMetros, limite);
}

export async function getClienteById(
  request: FastifyRequest<{ Params: IdParams }>,
  reply: FastifyReply,
) {
  const cliente = await ClientesModel.findById(request.params.id);

  if (!cliente) {
    return reply.code(404).send({ message: 'Customer not found' });
  }

  return cliente;
}

export async function createCliente(
  request: FastifyRequest<{ Body: ClienteInput }>,
  reply: FastifyReply,
) {
  const cliente = await ClientesModel.create(request.body);

  return reply.code(201).send(cliente);
}

export async function updateCliente(
  request: FastifyRequest<{ Params: IdParams; Body: ClienteInput }>,
  reply: FastifyReply,
) {
  const cliente = await ClientesModel.update(request.params.id, request.body);

  if (!cliente) {
    return reply.code(404).send({ message: 'Customer not found' });
  }

  return cliente;
}

export async function deleteCliente(
  request: FastifyRequest<{ Params: IdParams }>,
  reply: FastifyReply,
) {
  const removed = await ClientesModel.delete(request.params.id);

  if (!removed) {
    return reply.code(404).send({ message: 'Customer not found' });
  }

  return reply.code(204).send();
}