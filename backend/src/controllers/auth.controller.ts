import bcrypt from 'bcryptjs';
import { FastifyReply, FastifyRequest } from 'fastify';
import jwt from 'jsonwebtoken';

import AuthModel from '../models/auth.model';

type AuthBody = {
  correo: string;
  password: string;
};

function signToken(userId: number, email: string): string {
  const secret = process.env.JWT_SECRET;
  const expiresIn = (process.env.JWT_EXPIRES_IN ?? '1d') as jwt.SignOptions['expiresIn'];

  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }

  return jwt.sign(
    { sub: userId, email },
    secret,
    { expiresIn },
  );
}

export async function register(
  request: FastifyRequest<{ Body: AuthBody }>,
  reply: FastifyReply,
) {
  const email = request.body.correo?.trim().toLowerCase();
  const password = request.body.password;

  if (!email || !password) {
    return reply.code(400).send({ message: 'Email and password are required.' });
  }

  const existingUser = await AuthModel.findByEmail(email);

  if (existingUser) {
    return reply.code(409).send({ message: 'Email already registered.' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await AuthModel.createUser(email, passwordHash);
  const token = signToken(user.id, user.correo);

  return reply.code(201).send({
    token,
    user: {
      id: user.id,
      correo: user.correo,
      fecha_creacion: user.fecha_creacion,
    },
  });
}

export async function login(
  request: FastifyRequest<{ Body: AuthBody }>,
  reply: FastifyReply,
) {
  const email = request.body.correo?.trim().toLowerCase();
  const password = request.body.password;

  if (!email || !password) {
    return reply.code(400).send({ message: 'Email and password are required.' });
  }

  const user = await AuthModel.findByEmail(email);

  if (!user) {
    return reply.code(401).send({ message: 'Invalid credentials.' });
  }

  const isValidPassword = await bcrypt.compare(password, user.password_hash);

  if (!isValidPassword) {
    return reply.code(401).send({ message: 'Invalid credentials.' });
  }

  const token = signToken(user.id, user.correo);

  return reply.send({
    token,
    user: {
      id: user.id,
      correo: user.correo,
      fecha_creacion: user.fecha_creacion,
    },
  });
}

export async function logout(request: FastifyRequest, reply: FastifyReply) {
  return reply.send({
    message: `Session closed for ${request.user.email ?? 'user'}.`,
  });
}