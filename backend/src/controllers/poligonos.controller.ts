import { FastifyReply, FastifyRequest } from 'fastify';

import PoligonosModel, {
  BulkPoligonoInput,
  PoligonoInput,
  PuntoDentroPoligono,
  PolygonCoordinates,
} from '../models/poligonos.model';

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

type BulkPoligonoRequestItem = {
  nombre?: string;
  areaCoordinates: PolygonCoordinates;
  colorHex?: string;
  estiloPunto?: string;
  vendedorId: number;
  clienteIds: number[];
};

type BulkPoligonosBody = {
  items: BulkPoligonoRequestItem[];
};

function validateBulkItem(item: BulkPoligonoRequestItem, index: number, reply: FastifyReply): BulkPoligonoInput | null {
  if (!item.areaCoordinates || !isValidPolygonCoordinates(item.areaCoordinates)) {
    reply.code(400).send({ message: `Invalid polygon coordinates at item ${index}.` });
    return null;
  }

  if (!Number.isInteger(item.vendedorId) || item.vendedorId <= 0) {
    reply.code(400).send({ message: `vendedorId must be a positive integer at item ${index}.` });
    return null;
  }

  if (item.colorHex && !isValidHexColor(item.colorHex)) {
    reply.code(400).send({ message: `colorHex must follow #RRGGBB format at item ${index}.` });
    return null;
  }

  if (!Array.isArray(item.clienteIds) || item.clienteIds.length === 0) {
    reply.code(400).send({ message: `clienteIds must contain at least one id at item ${index}.` });
    return null;
  }

  const normalizedClienteIds = [...new Set(item.clienteIds.map((id) => Number(id)))].filter(
    (id) => Number.isInteger(id) && id > 0,
  );

  if (normalizedClienteIds.length === 0) {
    reply.code(400).send({ message: `clienteIds must contain positive integers at item ${index}.` });
    return null;
  }

  return {
    nombre: item.nombre,
    areaCoordinates: item.areaCoordinates,
    colorHex: item.colorHex,
    estiloPunto: item.estiloPunto,
    vendedorId: item.vendedorId,
    clienteIds: normalizedClienteIds,
  };
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

export async function listPointsInsidePoligono(
  request: FastifyRequest<{ Params: IdParams }>,
  reply: FastifyReply,
) {
  const poligono = await PoligonosModel.findById(request.params.id, request.user.id);

  if (!poligono) {
    return reply.code(404).send({ message: 'Polygon not found' });
  }

  const points: PuntoDentroPoligono[] = await PoligonosModel.listPointsInsidePolygon(
    request.params.id,
    request.user.id,
  );

  return {
    poligonoId: poligono.id,
    total: points.length,
    points,
  };
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

export async function createPoligonosBulk(
  request: FastifyRequest<{ Body: BulkPoligonosBody }>,
  reply: FastifyReply,
) {
  const items = Array.isArray(request.body?.items) ? request.body.items : [];

  if (items.length === 0) {
    return reply.code(400).send({ message: 'items must contain at least one polygon.' });
  }

  const normalizedItems: BulkPoligonoInput[] = [];

  for (let index = 0; index < items.length; index += 1) {
    const normalized = validateBulkItem(items[index], index, reply);

    if (!normalized) {
      return;
    }

    normalizedItems.push(normalized);
  }

  try {
    const result = await PoligonosModel.createManyWithAssignments(normalizedItems, request.user.id);

    return reply.code(201).send(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to process bulk polygon creation.';

    if (message.startsWith('Missing vendors:')) {
      return reply.code(404).send({ message });
    }

    if (message.startsWith('Missing customers:')) {
      return reply.code(404).send({ message });
    }

    throw error;
  }
}