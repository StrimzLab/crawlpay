import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Address } from 'viem';
import type { AuthService } from '../services/auth-service';

declare module 'fastify' {
  interface FastifyRequest {
    /** Address of the authenticated session. Set by `requireAuth` preHandler. */
    authAddress?: Address;
  }
}

const COOKIE_NAME = 'crawlpay_session';

/**
 * Fastify preHandler that gates a route on a valid session cookie. Attaches
 * the session's lowercased address to `req.authAddress` so the route handler
 * can read it without re-validating.
 *
 * Usage:
 *   app.post('/protected', { preHandler: requireAuth(auth) }, async (req, reply) => {
 *     const address = req.authAddress!;  // safe: preHandler 401'd if missing
 *   });
 */
export function requireAuth(auth: AuthService) {
  return async function preHandler(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const sid = req.cookies[COOKIE_NAME];
    if (!sid) {
      await reply.code(401).send({ error: 'not_authenticated' });
      return;
    }
    const session = await auth.readSession(sid);
    if (!session) {
      await reply.code(401).send({ error: 'invalid_session' });
      return;
    }
    req.authAddress = session.address;
  };
}
