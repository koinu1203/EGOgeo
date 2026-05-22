import { FastifyPluginAsync } from 'fastify';

import { login, logout, register } from '../controllers/auth.controller';
import { verifyJwt } from '../middleware/auth.middleware';

const authBodySchema = {
  type: 'object',
  required: ['correo', 'password'],
  properties: {
    correo: { type: 'string', format: 'email' },
    password: { type: 'string', minLength: 6 },
  },
};

const authRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    '/auth/register',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Register a new user account',
        body: authBodySchema,
      },
    },
    register,
  );

  app.post(
    '/auth/login',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Login and receive a JWT token',
        body: authBodySchema,
      },
    },
    login,
  );

  app.post(
    '/auth/logout',
    {
      preHandler: verifyJwt,
      schema: {
        tags: ['Auth'],
        summary: 'Logout current authenticated session',
        security: [{ bearerAuth: [] }],
      },
    },
    logout,
  );
};

export default authRoutes;