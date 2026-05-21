import { FastifyReply, FastifyRequest } from 'fastify';
import jwt, { JwtPayload } from 'jsonwebtoken';

type TokenPayload = JwtPayload & {
  sub: string | number;
  email?: string;
};

export async function verifyJwt(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return reply.code(401).send({ message: 'Missing or invalid Authorization header.' });
  }

  const token = authHeader.replace('Bearer ', '').trim();
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    request.log.error('JWT_SECRET is not configured');

    return reply.code(500).send({ message: 'Server configuration error.' });
  }

  try {
    const decoded = jwt.verify(token, secret) as TokenPayload;
    const userId = Number(decoded.sub);

    if (!decoded.sub || Number.isNaN(userId)) {
      return reply.code(401).send({ message: 'Invalid token payload.' });
    }

    request.user = {
      id: userId,
      email: decoded.email,
    };
  } catch {
    return reply.code(401).send({ message: 'Invalid or expired token.' });
  }
}