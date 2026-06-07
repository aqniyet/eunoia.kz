/**
 * eunoia.kz webmail API — intentionally primitive.
 *
 * No database: the docker-mailserver accounts file is the user store and
 * IMAP login *is* authentication. Registration (gated by an invite code)
 * appends a SHA512-CRYPT account line to postfix-accounts.cf; the
 * mailserver's changedetector picks it up within seconds.
 *
 * Sessions live in memory (single instance). The IMAP password is kept
 * server-side only, in a Map keyed by session ID — never in the cookie.
 * A restart logs everyone out; that is acceptable here.
 */
import express from 'express';
import session from 'express-session';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';

import { authRouter, requireAuth } from './auth.js';
import { mailRouter } from './mail.js';

const { SESSION_SECRET, INVITE_CODE, MAIL_DOMAIN, MAIL_HOST } = process.env;
for (const [name, value] of Object.entries({ SESSION_SECRET, INVITE_CODE, MAIL_DOMAIN, MAIL_HOST })) {
  if (!value) {
    console.error(`Missing required env var ${name}`);
    process.exit(1);
  }
}

const app = express();
app.set('trust proxy', 1); // behind Caddy
app.use(helmet());
app.use(express.json({ limit: '200kb' }));

app.use(
  session({
    name: 'eunoia.sid',
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 12 * 60 * 60 * 1000, // 12h
    },
  }),
);

// Brute-force guard on the two credential endpoints.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts, try again later.' },
});
app.use(['/api/login', '/api/register'], authLimiter);

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api', authRouter);
app.use('/api', requireAuth, mailRouter);

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal error' });
});

app.listen(3000, () => console.log('eunoia-api listening on :3000'));
