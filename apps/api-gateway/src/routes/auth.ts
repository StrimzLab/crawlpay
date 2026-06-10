import type { FastifyInstance } from 'fastify';
import type { AuthService } from '../services/auth-service';

const COOKIE_NAME = 'crawlpay_session';
const COOKIE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

interface LoginBody {
  message?: unknown;
  signature?: unknown;
}

export function authRoutes(app: FastifyInstance, service: AuthService): void {
  // Mint a fresh nonce. The client embeds this in their SIWE message
  // before signing. Nonces auto-expire after 5 minutes.
  app.get('/auth/nonce', async (_req, reply) => {
    const nonce = await service.issueNonce();
    return reply.send({ nonce });
  });

  // Verify a signed SIWE message and start a session.
  app.post('/auth/login', async (req, reply) => {
    const body = (req.body ?? {}) as LoginBody;
    if (typeof body.message !== 'string' || typeof body.signature !== 'string') {
      return reply
        .code(400)
        .send({ error: 'invalid_payload', detail: 'message and signature required (strings)' });
    }

    const result = await service.verifyAndCreateSession(body.message, body.signature);
    if (!result.ok) {
      return reply.code(401).send({ error: result.error });
    }

    reply.setCookie(COOKIE_NAME, result.sid, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: COOKIE_MAX_AGE_SECONDS,
    });
    return reply.send({ address: result.address });
  });

  // Return the authenticated address, or 401 if no valid session.
  app.get('/auth/me', async (req, reply) => {
    const sid = req.cookies[COOKIE_NAME];
    if (!sid) return reply.code(401).send({ error: 'no_session' });
    const session = await service.readSession(sid);
    if (!session) return reply.code(401).send({ error: 'invalid_session' });
    return reply.send({ address: session.address });
  });

  app.post('/auth/logout', async (req, reply) => {
    const sid = req.cookies[COOKIE_NAME];
    if (sid) await service.destroySession(sid);
    reply.clearCookie(COOKIE_NAME, { path: '/' });
    return reply.send({ ok: true });
  });
}
