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
  static async findAll(): Promise<Cliente[]> {
    const result = await pool.query<Cliente>(`
      ${SELECT_CLIENTE_FIELDS}
      ORDER BY nombre ASC
    `);

    return result.rows;
  }

  static async findById(id: string): Promise<Cliente | null> {
    const result = await pool.query<Cliente>(`
      ${SELECT_CLIENTE_FIELDS}
      WHERE cliente_id = $1
    `, [id]);

    return result.rows[0] ?? null;
  }

  static async create(input: ClienteInput): Promise<Cliente> {
    const result = await pool.query<Cliente>(
      `
        INSERT INTO clientes_ubicacion (
          cliente_id,
          nombre,
          ultima_compra,
          monto_anual,
          moneda,
          coordenadas
        )
        VALUES ($1, $2, $3, $4, $5, ST_SetSRID(ST_MakePoint($6, $7), 4326))
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
      ],
    );

    return result.rows[0];
  }

  static async update(id: string, input: ClienteInput): Promise<Cliente | null> {
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
      ],
    );

    return result.rows[0] ?? null;
  }

  static async delete(id: string): Promise<boolean> {
    const result = await pool.query('DELETE FROM clientes_ubicacion WHERE cliente_id = $1', [id]);

    return (result.rowCount ?? 0) > 0;
  }

  static async findNearby(
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
        ORDER BY coordenadas <-> ST_SetSRID(ST_MakePoint($1, $2), 4326)
        LIMIT $4
      `,
      [longitudCentro, latitudCentro, radioMetros, limiteFilas],
    );

    return result.rows;
  }

  static async findInViewport(
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
        LIMIT $5
      `,
      [lngMin, latMin, lngMax, latMax, limitRows],
    );

    return result.rows;
  }
}

export default ClientesModel;