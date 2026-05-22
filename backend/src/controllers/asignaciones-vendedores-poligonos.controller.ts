import { FastifyReply, FastifyRequest } from 'fastify';

import PoligonosModel from '../models/poligonos.model';
import AsignacionesVendedoresPoligonosModel, {
  AsignacionVendedorPoligonoInput,
} from '../models/asignaciones-vendedores-poligonos.model';
import VendedoresModel from '../models/vendedores.model';

type IdParams = {
  id: string;
};

function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === '23505';
}

function validateAsignacionInput(
  input: AsignacionVendedorPoligonoInput,
  reply: FastifyReply,
): boolean {
  if (!Number.isInteger(input.vendedorId) || input.vendedorId <= 0) {
    reply.code(400).send({ message: 'vendedorId must be a positive integer.' });
    return false;
  }

  if (!Number.isInteger(input.poligonoId) || input.poligonoId <= 0) {
    reply.code(400).send({ message: 'poligonoId must be a positive integer.' });
    return false;
  }

  return true;
}

export async function listAsignaciones(request: FastifyRequest) {
  return AsignacionesVendedoresPoligonosModel.findAll(request.user.id);
}

export async function getAsignacionById(
  request: FastifyRequest<{ Params: IdParams }>,
  reply: FastifyReply,
) {
  const asignacion = await AsignacionesVendedoresPoligonosModel.findById(request.params.id, request.user.id);

  if (!asignacion) {
    return reply.code(404).send({ message: 'Assignment not found' });
  }

  return asignacion;
}

export async function createAsignacion(
  request: FastifyRequest<{ Body: AsignacionVendedorPoligonoInput }>,
  reply: FastifyReply,
) {
  if (!validateAsignacionInput(request.body, reply)) {
    return;
  }

  const vendedor = await VendedoresModel.findById(String(request.body.vendedorId));

  if (!vendedor) {
    return reply.code(404).send({ message: 'Vendor not found' });
  }

  const poligono = await PoligonosModel.findById(String(request.body.poligonoId), request.user.id);

  if (!poligono) {
    return reply.code(404).send({ message: 'Polygon not found' });
  }

  try {
    const asignacion = await AsignacionesVendedoresPoligonosModel.create(request.body, request.user.id);

    return reply.code(201).send(asignacion);
  } catch (error) {
    if (isUniqueViolation(error)) {
      return reply.code(409).send({ message: 'This polygon already has an assignment for the user.' });
    }

    throw error;
  }
}

export async function updateAsignacion(
  request: FastifyRequest<{ Params: IdParams; Body: AsignacionVendedorPoligonoInput }>,
  reply: FastifyReply,
) {
  if (!validateAsignacionInput(request.body, reply)) {
    return;
  }

  const existingAsignacion = await AsignacionesVendedoresPoligonosModel.findById(request.params.id, request.user.id);

  if (!existingAsignacion) {
    return reply.code(404).send({ message: 'Assignment not found' });
  }

  const vendedor = await VendedoresModel.findById(String(request.body.vendedorId));

  if (!vendedor) {
    return reply.code(404).send({ message: 'Vendor not found' });
  }

  const poligono = await PoligonosModel.findById(String(request.body.poligonoId), request.user.id);

  if (!poligono) {
    return reply.code(404).send({ message: 'Polygon not found' });
  }

  try {
    const asignacion = await AsignacionesVendedoresPoligonosModel.update(
      request.params.id,
      request.body,
      request.user.id,
    );

    if (!asignacion) {
      return reply.code(404).send({ message: 'Assignment not found' });
    }

    return asignacion;
  } catch (error) {
    if (isUniqueViolation(error)) {
      return reply.code(409).send({ message: 'This polygon already has an assignment for the user.' });
    }

    throw error;
  }
}

export async function deleteAsignacion(
  request: FastifyRequest<{ Params: IdParams }>,
  reply: FastifyReply,
) {
  const deleted = await AsignacionesVendedoresPoligonosModel.delete(request.params.id, request.user.id);

  if (!deleted) {
    return reply.code(404).send({ message: 'Assignment not found' });
  }

  return reply.code(204).send();
}