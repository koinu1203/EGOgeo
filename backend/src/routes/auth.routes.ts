import { FastifyPluginAsync } from 'fastify';

import { login, register } from '../controllers/auth.controller';

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
};

export default authRoutes;