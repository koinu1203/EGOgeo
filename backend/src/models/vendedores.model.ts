import pool from '../config/database';

export type VendedorInput = {
  codigo: string;
  nombre: string;
};

export type Vendedor = {
  id: number;
  codigo: string;
  nombre: string;
  fecha_creacion: string;
};

const SELECT_VENDEDOR_FIELDS = `
  SELECT
    id,
    codigo,
    nombre,
    fecha_creacion
  FROM vendedores
`;

class VendedoresModel {
  static async findAll(): Promise<Vendedor[]> {
    const result = await pool.query<Vendedor>(`
      ${SELECT_VENDEDOR_FIELDS}
      ORDER BY fecha_creacion DESC, id DESC
    `);

    return result.rows;
  }

  static async findById(id: string): Promise<Vendedor | null> {
    const result = await pool.query<Vendedor>(`
      ${SELECT_VENDEDOR_FIELDS}
      WHERE id = $1
    `, [id]);

    return result.rows[0] ?? null;
  }

  static async create(input: VendedorInput): Promise<Vendedor> {
    const result = await pool.query<Vendedor>(
      `
        INSERT INTO vendedores (codigo, nombre)
        VALUES ($1, $2)
        RETURNING
          id,
          codigo,
          nombre,
          fecha_creacion
      `,
      [input.codigo, input.nombre],
    );

    return result.rows[0];
  }

  static async update(id: string, input: VendedorInput): Promise<Vendedor | null> {
    const result = await pool.query<Vendedor>(
      `
        UPDATE vendedores
        SET
          codigo = $1,
          nombre = $2
        WHERE id = $3
        RETURNING
          id,
          codigo,
          nombre,
          fecha_creacion
      `,
      [input.codigo, input.nombre, id],
    );

    return result.rows[0] ?? null;
  }

  static async delete(id: string): Promise<boolean> {
    const result = await pool.query('DELETE FROM vendedores WHERE id = $1', [id]);

    return (result.rowCount ?? 0) > 0;
  }
}

export default VendedoresModel;