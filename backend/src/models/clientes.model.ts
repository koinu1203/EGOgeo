import pool from '../config/database';

export type ClienteInput = {
  clienteId: string;
  nombre: string;
  ultimaCompra: string;
  montoAnual: number;
  moneda: string;
  longitud: number;
  latitud: number;
};

export type Cliente = {
  cliente_id: string;
  nombre: string;
  ultima_compra: string;
  monto_anual: string;
  moneda: string;
  longitud: number;
  latitud: number;
};

export type ClienteCercano = {
  cliente_id: string;
  nombre: string;
  ultima_compra: string;
  monto_anual: string;
  moneda: string;
  distancia_metros: number;
};

export type ClienteViewport = {
  cliente_id: string;
  nombre: string;
  longitud: number;
  latitud: number;
};

const SELECT_CLIENTE_FIELDS = `
  SELECT
    cliente_id,
    nombre,
    ultima_compra,
    monto_anual,
    moneda,
    ST_X(coordenadas) AS longitud,
    ST_Y(coordenadas) AS latitud
  FROM clientes_ubicacion
`;

class ClientesModel {
  static async findAll(userId: number): Promise<Cliente[]> {
    const result = await pool.query<Cliente>(`
      ${SELECT_CLIENTE_FIELDS}
      WHERE usuario_id = $1
      ORDER BY nombre ASC
    `, [userId]);

    return result.rows;
  }

  static async findById(id: string, userId: number): Promise<Cliente | null> {
    const result = await pool.query<Cliente>(`
      ${SELECT_CLIENTE_FIELDS}
      WHERE cliente_id = $1
        AND usuario_id = $2
    `, [id, userId]);

    return result.rows[0] ?? null;
  }

  static async create(input: ClienteInput, userId: number): Promise<Cliente> {
    const result = await pool.query<Cliente>(
      `
        INSERT INTO clientes_ubicacion (
          cliente_id,
          nombre,
          ultima_compra,
          monto_anual,
          moneda,
          coordenadas,
          usuario_id
        )
        VALUES ($1, $2, $3, $4, $5, ST_SetSRID(ST_MakePoint($6, $7), 4326), $8)
        RETURNING
          cliente_id,
          nombre,
          ultima_compra,
          monto_anual,
          moneda,
          ST_X(coordenadas) AS longitud,
          ST_Y(coordenadas) AS latitud
      `,
      [
        input.clienteId,
        input.nombre,
        input.ultimaCompra,
        input.montoAnual,
        input.moneda,
        input.longitud,
        input.latitud,
        userId,
      ],
    );

    return result.rows[0];
  }

  static async update(id: string, input: ClienteInput, userId: number): Promise<Cliente | null> {
    const result = await pool.query<Cliente>(
      `
        UPDATE clientes_ubicacion
        SET
          cliente_id = $1,
          nombre = $2,
          ultima_compra = $3,
          monto_anual = $4,
          moneda = $5,
          coordenadas = ST_SetSRID(ST_MakePoint($6, $7), 4326)
        WHERE cliente_id = $8
          AND usuario_id = $9
        RETURNING
          cliente_id,
          nombre,
          ultima_compra,
          monto_anual,
          moneda,
          ST_X(coordenadas) AS longitud,
          ST_Y(coordenadas) AS latitud
      `,
      [
        input.clienteId,
        input.nombre,
        input.ultimaCompra,
        input.montoAnual,
        input.moneda,
        input.longitud,
        input.latitud,
        id,
        userId,
      ],
    );

    return result.rows[0] ?? null;
  }

  static async delete(id: string, userId: number): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM clientes_ubicacion WHERE cliente_id = $1 AND usuario_id = $2',
      [id, userId],
    );

    return (result.rowCount ?? 0) > 0;
  }

  static async findNearby(
    userId: number,
    longitudCentro: number,
    latitudCentro: number,
    radioMetros: number,
    limiteFilas: number,
  ): Promise<ClienteCercano[]> {
    const result = await pool.query<ClienteCercano>(
      `
        SELECT
          cliente_id,
          nombre,
          ultima_compra,
          monto_anual,
          moneda,
          ST_Distance(
            coordenadas::geography,
            ST_MakePoint($1, $2)::geography
          ) AS distancia_metros
        FROM clientes_ubicacion
        WHERE ST_DWithin(
          coordenadas::geography,
          ST_MakePoint($1, $2)::geography,
          $3
        )
          AND usuario_id = $4
        ORDER BY coordenadas <-> ST_SetSRID(ST_MakePoint($1, $2), 4326)
        LIMIT $5
      `,
      [longitudCentro, latitudCentro, radioMetros, userId, limiteFilas],
    );

    return result.rows;
  }

  static async findInViewport(
    userId: number,
    lngMin: number,
    latMin: number,
    lngMax: number,
    latMax: number,
    limitRows: number,
  ): Promise<ClienteViewport[]> {
    const result = await pool.query<ClienteViewport>(
      `
        SELECT
          cliente_id,
          nombre,
          ST_X(coordenadas) AS longitud,
          ST_Y(coordenadas) AS latitud
        FROM clientes_ubicacion
        WHERE coordenadas && ST_MakeEnvelope($1, $2, $3, $4, 4326)
          AND usuario_id = $5
        LIMIT $6
      `,
      [lngMin, latMin, lngMax, latMax, userId, limitRows],
    );

    return result.rows;
  }
}

export default ClientesModel;