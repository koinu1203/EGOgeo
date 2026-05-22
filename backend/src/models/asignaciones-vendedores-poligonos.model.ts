import pool from '../config/database';

export type AsignacionVendedorPoligonoInput = {
  vendedorId: number;
  poligonoId: number;
};

export type AsignacionVendedorPoligono = {
  id: number;
  usuario_id: number;
  vendedor_id: number;
  poligono_id: number;
  fecha_asignacion: string;
};

const SELECT_ASIGNACION_FIELDS = `
  SELECT
    id,
    usuario_id,
    vendedor_id,
    poligono_id,
    fecha_asignacion
  FROM asignacion_vendedores_poligonos
`;

class AsignacionesVendedoresPoligonosModel {
  static async findAll(userId: number): Promise<AsignacionVendedorPoligono[]> {
    const result = await pool.query<AsignacionVendedorPoligono>(`
      ${SELECT_ASIGNACION_FIELDS}
      WHERE usuario_id = $1
      ORDER BY fecha_asignacion DESC, id DESC
    `, [userId]);

    return result.rows;
  }

  static async findById(id: string, userId: number): Promise<AsignacionVendedorPoligono | null> {
    const result = await pool.query<AsignacionVendedorPoligono>(`
      ${SELECT_ASIGNACION_FIELDS}
      WHERE id = $1
        AND usuario_id = $2
    `, [id, userId]);

    return result.rows[0] ?? null;
  }

  static async create(
    input: AsignacionVendedorPoligonoInput,
    userId: number,
  ): Promise<AsignacionVendedorPoligono> {
    const result = await pool.query<AsignacionVendedorPoligono>(
      `
        INSERT INTO asignacion_vendedores_poligonos (
          usuario_id,
          vendedor_id,
          poligono_id
        )
        VALUES ($1, $2, $3)
        RETURNING
          id,
          usuario_id,
          vendedor_id,
          poligono_id,
          fecha_asignacion
      `,
      [userId, input.vendedorId, input.poligonoId],
    );

    return result.rows[0];
  }

  static async update(
    id: string,
    input: AsignacionVendedorPoligonoInput,
    userId: number,
  ): Promise<AsignacionVendedorPoligono | null> {
    const result = await pool.query<AsignacionVendedorPoligono>(
      `
        UPDATE asignacion_vendedores_poligonos
        SET
          vendedor_id = $1,
          poligono_id = $2
        WHERE id = $3
          AND usuario_id = $4
        RETURNING
          id,
          usuario_id,
          vendedor_id,
          poligono_id,
          fecha_asignacion
      `,
      [input.vendedorId, input.poligonoId, id, userId],
    );

    return result.rows[0] ?? null;
  }

  static async delete(id: string, userId: number): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM asignacion_vendedores_poligonos WHERE id = $1 AND usuario_id = $2',
      [id, userId],
    );

    return (result.rowCount ?? 0) > 0;
  }
}

export default AsignacionesVendedoresPoligonosModel;