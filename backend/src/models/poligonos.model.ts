import pool from '../config/database';
import type { PoolClient, QueryResultRow } from 'pg';

export type PolygonCoordinates = number[][][];

export type PoligonoInput = {
  nombre?: string;
  areaCoordinates: PolygonCoordinates;
  colorHex?: string;
  estiloPunto?: string;
};

export type Poligono = {
  id: number;
  usuario_id: number;
  nombre: string;
  area: {
    type: 'Polygon';
    coordinates: PolygonCoordinates;
  };
  color_hex: string;
  estilo_punto: string;
  fecha_creacion: string;
};

export type BulkPoligonoInput = {
  nombre?: string;
  areaCoordinates: PolygonCoordinates;
  colorHex?: string;
  estiloPunto?: string;
  vendedorId: number;
  clienteIds: number[];
};

export type PuntoDentroPoligono = {
  cliente_id: string;
  nombre: string;
  longitud: number;
  latitud: number;
};

export type BulkPoligonoCreateResult = {
  polygonIds: number[];
  createdPolygons: number;
  vendorAssignmentsUpserted: number;
  clientAssignmentsUpserted: number;
};

const SELECT_POLIGONO_FIELDS = `
  SELECT
    id,
    usuario_id,
    nombre,
    ST_AsGeoJSON(area)::json AS area,
    color_hex,
    estilo_punto,
    fecha_creacion
  FROM poligonos_usuario
`;

class PoligonosModel {
  private static query<T extends QueryResultRow>(
    text: string,
    values: unknown[],
    client?: PoolClient,
  ) {
    if (client) {
      return client.query<T>(text, values);
    }

    return pool.query<T>(text, values);
  }

  static async findAll(userId: number): Promise<Poligono[]> {
    const result = await this.query<Poligono>(
      `
        ${SELECT_POLIGONO_FIELDS}
        WHERE usuario_id = $1
        ORDER BY fecha_creacion DESC
      `,
      [userId],
    );

    return result.rows;
  }

  static async findById(id: string, userId: number): Promise<Poligono | null> {
    const result = await this.query<Poligono>(
      `
        ${SELECT_POLIGONO_FIELDS}
        WHERE id = $1
          AND usuario_id = $2
      `,
      [id, userId],
    );

    return result.rows[0] ?? null;
  }

  static async create(input: PoligonoInput, userId: number): Promise<Poligono> {
    const geojson = JSON.stringify({ type: 'Polygon', coordinates: input.areaCoordinates });

    const result = await this.query<Poligono>(
      `
        INSERT INTO poligonos_usuario (
          usuario_id,
          nombre,
          area,
          color_hex,
          estilo_punto
        )
        VALUES (
          $1,
          COALESCE($2, 'Mi Poligono'),
          ST_SetSRID(ST_GeomFromGeoJSON($3), 4326),
          COALESCE($4, '#3388ff'),
          COALESCE($5, 'default')
        )
        RETURNING
          id,
          usuario_id,
          nombre,
          ST_AsGeoJSON(area)::json AS area,
          color_hex,
          estilo_punto,
          fecha_creacion
      `,
      [
        userId,
        input.nombre ?? null,
        geojson,
        input.colorHex ?? null,
        input.estiloPunto ?? null,
      ],
    );

    return result.rows[0];
  }

  static async update(id: string, input: PoligonoInput, userId: number): Promise<Poligono | null> {
    const geojson = JSON.stringify({ type: 'Polygon', coordinates: input.areaCoordinates });

    const result = await this.query<Poligono>(
      `
        UPDATE poligonos_usuario
        SET
          nombre = COALESCE($1, nombre),
          area = ST_SetSRID(ST_GeomFromGeoJSON($2), 4326),
          color_hex = COALESCE($3, color_hex),
          estilo_punto = COALESCE($4, estilo_punto)
        WHERE id = $5
          AND usuario_id = $6
        RETURNING
          id,
          usuario_id,
          nombre,
          ST_AsGeoJSON(area)::json AS area,
          color_hex,
          estilo_punto,
          fecha_creacion
      `,
      [
        input.nombre ?? null,
        geojson,
        input.colorHex ?? null,
        input.estiloPunto ?? null,
        id,
        userId,
      ],
    );

    return result.rows[0] ?? null;
  }

  static async delete(id: string, userId: number): Promise<boolean> {
    const result = await this.query(
      'DELETE FROM poligonos_usuario WHERE id = $1 AND usuario_id = $2',
      [id, userId],
    );

    return (result.rowCount ?? 0) > 0;
  }

  static async listPointsInsidePolygon(
    poligonoId: string,
    userId: number,
  ): Promise<PuntoDentroPoligono[]> {
    const result = await this.query<PuntoDentroPoligono>(
      `
        SELECT
          c.cliente_id,
          c.nombre,
          ST_X(c.coordenadas) AS longitud,
          ST_Y(c.coordenadas) AS latitud
        FROM poligonos_usuario p
        JOIN clientes_ubicacion c
          ON ST_Contains(p.area, c.coordenadas)
        WHERE p.id = $1
          AND p.usuario_id = $2
          AND (c.usuario_id = $2 OR c.usuario_id IS NULL)
        ORDER BY c.nombre ASC
      `,
      [poligonoId, userId],
    );

    return result.rows;
  }

  static async createManyWithAssignments(
    inputs: BulkPoligonoInput[],
    userId: number,
  ): Promise<BulkPoligonoCreateResult> {
    if (inputs.length === 0) {
      return {
        polygonIds: [],
        createdPolygons: 0,
        vendorAssignmentsUpserted: 0,
        clientAssignmentsUpserted: 0,
      };
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const vendorIds = [...new Set(inputs.map((item) => item.vendedorId))];
      const clienteIds = [
        ...new Set(inputs.flatMap((item) => item.clienteIds)),
      ];

      const existingVendedores = await client.query<{ id: number }>(
        'SELECT id FROM vendedores WHERE id = ANY($1::int[])',
        [vendorIds],
      );

      const existingVendorIds = new Set(existingVendedores.rows.map((row) => row.id));
      const missingVendorIds = vendorIds.filter((id) => !existingVendorIds.has(id));

      if (missingVendorIds.length > 0) {
        throw new Error(`Missing vendors: ${missingVendorIds.join(', ')}`);
      }

      const existingClientes = await client.query<{ id: number }>(
        `
          SELECT DISTINCT id
          FROM clientes_ubicacion
          WHERE id = ANY($1::int[])
            AND (usuario_id = $2 OR usuario_id IS NULL)
        `,
        [clienteIds, userId],
      );

      const existingClienteIds = new Set(existingClientes.rows.map((row) => row.id));
      const missingClienteIds = clienteIds.filter((id) => !existingClienteIds.has(id));

      if (missingClienteIds.length > 0) {
        throw new Error(`Missing customers: ${missingClienteIds.join(', ')}`);
      }

      const polygonIds: number[] = [];
      let vendorAssignmentsUpserted = 0;
      let clientAssignmentsUpserted = 0;

      for (const item of inputs) {
        const geojson = JSON.stringify({
          type: 'Polygon',
          coordinates: item.areaCoordinates,
        });

        const createdPolygon = await client.query<{ id: number }>(
          `
            INSERT INTO poligonos_usuario (
              usuario_id,
              nombre,
              area,
              color_hex,
              estilo_punto
            )
            VALUES (
              $1,
              COALESCE($2, 'Mi Poligono'),
              ST_SetSRID(ST_GeomFromGeoJSON($3), 4326),
              COALESCE($4, '#3388ff'),
              COALESCE($5, 'generated')
            )
            RETURNING id
          `,
          [
            userId,
            item.nombre ?? null,
            geojson,
            item.colorHex ?? null,
            item.estiloPunto ?? null,
          ],
        );

        const poligonoId = createdPolygon.rows[0].id;
        polygonIds.push(poligonoId);

        const vendorAssignment = await client.query(
          `
            INSERT INTO asignacion_vendedores_poligonos (
              usuario_id,
              vendedor_id,
              poligono_id
            )
            VALUES ($1, $2, $3)
            ON CONFLICT ON CONSTRAINT unique_poligono_por_usuario
            DO UPDATE SET
              poligono_id = EXCLUDED.poligono_id,
              vendedor_id = EXCLUDED.vendedor_id,
              fecha_asignacion = NOW()
          `,
          [userId, item.vendedorId, poligonoId],
        );

        vendorAssignmentsUpserted += vendorAssignment.rowCount ?? 0;

        const clientAssignment = await client.query(
          `
            INSERT INTO asignacion_clientes_vendedores_poligonos (
              usuario_id,
              vendedor_id,
              poligono_id,
              cliente_id
            )
            SELECT
              $1,
              $2,
              $3,
              unnest($4::int[])
            ON CONFLICT (usuario_id, poligono_id, cliente_id)
            DO UPDATE SET
              vendedor_id = EXCLUDED.vendedor_id,
              fecha_asignacion = NOW()
          `,
          [userId, item.vendedorId, poligonoId, item.clienteIds],
        );

        clientAssignmentsUpserted += clientAssignment.rowCount ?? 0;
      }

      await client.query('COMMIT');

      return {
        polygonIds,
        createdPolygons: polygonIds.length,
        vendorAssignmentsUpserted,
        clientAssignmentsUpserted,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

export default PoligonosModel;