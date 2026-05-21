import { FastifyReply, FastifyRequest } from 'fastify';

import PoligonosModel, { PoligonoInput, PolygonCoordinates } from '../models/poligonos.model';

type IdParams = {
  id: string;
};

function isValidHexColor(value: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(value);
}

function isValidPolygonCoordinates(coordinates: PolygonCoordinates): boolean {
  if (!Array.isArray(coordinates) || coordinates.length === 0) {
    return false;
  }

  const outerRing = coordinates[0];

  if (!Array.isArray(outerRing) || outerRing.length < 4) {
    return false;
  }

  for (const point of outerRing) {
    if (!Array.isArray(point) || point.length < 2) {
      return false;
    }

    if (!Number.isFinite(point[0]) || !Number.isFinite(point[1])) {
      return false;
    }
  }

  return true;
}

function validatePoligonoInput(input: PoligonoInput, reply: FastifyReply): boolean {
  if (!input.areaCoordinates || !isValidPolygonCoordinates(input.areaCoordinates)) {
    reply.code(400).send({ message: 'Invalid polygon coordinates.' });
    return false;
  }

  if (input.colorHex && !isValidHexColor(input.colorHex)) {
    reply.code(400).send({ message: 'colorHex must follow #RRGGBB format.' });
    return false;
  }

  return true;
}

export async function listPoligonos(request: FastifyRequest) {
  return PoligonosModel.findAll(request.user.id);
}

export async function getPoligonoById(
  request: FastifyRequest<{ Params: IdParams }>,
  reply: FastifyReply,
) {
  const poligono = await PoligonosModel.findById(request.params.id, request.user.id);

  if (!poligono) {
    return reply.code(404).send({ message: 'Polygon not found' });
  }

  return poligono;
}

export async function createPoligono(
  request: FastifyRequest<{ Body: PoligonoInput }>,
  reply: FastifyReply,
) {
  if (!validatePoligonoInput(request.body, reply)) {
    return;
  }

  const poligono = await PoligonosModel.create(request.body, request.user.id);

  return reply.code(201).send(poligono);
}

export async function updatePoligono(
  request: FastifyRequest<{ Params: IdParams; Body: PoligonoInput }>,
  reply: FastifyReply,
) {
  if (!validatePoligonoInput(request.body, reply)) {
    return;
  }

  const poligono = await PoligonosModel.update(request.params.id, request.body, request.user.id);

  if (!poligono) {
    return reply.code(404).send({ message: 'Polygon not found' });
  }

  return poligono;
}

export async function deletePoligono(
  request: FastifyRequest<{ Params: IdParams }>,
  reply: FastifyReply,
) {
  const deleted = await PoligonosModel.delete(request.params.id, request.user.id);

  if (!deleted) {
    return reply.code(404).send({ message: 'Polygon not found' });
  }

  return reply.code(204).send();
}