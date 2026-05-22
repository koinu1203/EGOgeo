import { FastifyReply, FastifyRequest } from 'fastify';

import VendedoresModel, { VendedorInput } from '../models/vendedores.model';

type IdParams = {
  id: string;
};

function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === '23505';
}

function validateVendedorInput(input: VendedorInput, reply: FastifyReply): boolean {
  if (!input.codigo?.trim() || !input.nombre?.trim()) {
    reply.code(400).send({ message: 'codigo and nombre are required.' });
    return false;
  }

  return true;
}

export async function listVendedores() {
  return VendedoresModel.findAll();
}

export async function getVendedorById(
  request: FastifyRequest<{ Params: IdParams }>,
  reply: FastifyReply,
) {
  const vendedor = await VendedoresModel.findById(request.params.id);

  if (!vendedor) {
    return reply.code(404).send({ message: 'Vendor not found' });
  }

  return vendedor;
}

export async function createVendedor(
  request: FastifyRequest<{ Body: VendedorInput }>,
  reply: FastifyReply,
) {
  if (!validateVendedorInput(request.body, reply)) {
    return;
  }

  try {
    const vendedor = await VendedoresModel.create(request.body);

    return reply.code(201).send(vendedor);
  } catch (error) {
    if (isUniqueViolation(error)) {
      return reply.code(409).send({ message: 'codigo already exists.' });
    }

    throw error;
  }
}

export async function updateVendedor(
  request: FastifyRequest<{ Params: IdParams; Body: VendedorInput }>,
  reply: FastifyReply,
) {
  if (!validateVendedorInput(request.body, reply)) {
    return;
  }

  try {
    const vendedor = await VendedoresModel.update(request.params.id, request.body);

    if (!vendedor) {
      return reply.code(404).send({ message: 'Vendor not found' });
    }

    return vendedor;
  } catch (error) {
    if (isUniqueViolation(error)) {
      return reply.code(409).send({ message: 'codigo already exists.' });
    }

    throw error;
  }
}

export async function deleteVendedor(
  request: FastifyRequest<{ Params: IdParams }>,
  reply: FastifyReply,
) {
  const deleted = await VendedoresModel.delete(request.params.id);

  if (!deleted) {
    return reply.code(404).send({ message: 'Vendor not found' });
  }

  return reply.code(204).send();
}