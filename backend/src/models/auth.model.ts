import pool from '../config/database';

export type User = {
  id: number;
  correo: string;
  password_hash: string;
  fecha_creacion: string;
};

class AuthModel {
  static async findByEmail(email: string): Promise<User | null> {
    const result = await pool.query<User>(
      `
        SELECT id, correo, password_hash, fecha_creacion
        FROM usuarios
        WHERE correo = $1
      `,
      [email],
    );

    return result.rows[0] ?? null;
  }

  static async createUser(email: string, passwordHash: string): Promise<User> {
    const result = await pool.query<User>(
      `
        INSERT INTO usuarios (correo, password_hash)
        VALUES ($1, $2)
        RETURNING id, correo, password_hash, fecha_creacion
      `,
      [email, passwordHash],
    );

    return result.rows[0];
  }
}

export default AuthModel;