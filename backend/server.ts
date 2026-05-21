import 'dotenv/config';

import fastify from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import pool from './src/config/database';
import clientesRoutes from './src/routes/clientes.routes';

const app = fastify({ logger: true });

app.decorate('db', pool);

app.register(swagger, {
  openapi: {
    info: {
      title: 'API EGOGeo',
      description: 'API endpoints documentation for customers and geospatial searches',
      version: '1.0.0',
    },
  },
});

app.register(swaggerUi, {
  routePrefix: '/docs',
});

app.register(clientesRoutes);

app.addHook('onClose', async () => {
  await pool.end();
});

app.get('/health', async () => {
  const result = await pool.query('SELECT NOW() AS server_time');

  return {
    ok: true,
    database: 'connected',
    serverTime: result.rows[0].server_time,
  };
});

const start = async (): Promise<void> => {
  try {
    await pool.query('SELECT 1');

    const port = Number(process.env.PORT) || 3000;

    await app.listen({ port, host: '0.0.0.0' });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

start();