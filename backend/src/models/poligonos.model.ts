import pool from '../config/database';

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
  static async findAll(userId: number): Promise<Poligono[]> {
    const result = await pool.query<Poligono>(
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
    const result = await pool.query<Poligono>(
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

    const result = await pool.query<Poligono>(
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

    const result = await pool.query<Poligono>(
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
    const result = await pool.query(
      'DELETE FROM poligonos_usuario WHERE id = $1 AND usuario_id = $2',
      [id, userId],
    );

    return (result.rowCount ?? 0) > 0;
  }
}

export default PoligonosModel;