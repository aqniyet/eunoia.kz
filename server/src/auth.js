/**
 * Registration + login.
 *
 * Login: attempt an IMAP LOGIN against the mailserver — success means the
 * credentials are real. The password is parked in `sessionPasswords`
 * (memory only) because IMAP/SMTP need it again on every mail request.
 *
 * Registration: validate invite code + local part, hash the password with
 * `openssl passwd -6` (SHA512-CRYPT, what postfix-accounts.cf expects) and
 * append `user@domain|{SHA512-CRYPT}hash` to the shared accounts file.
 * The accounts file also holds other domains' mailboxes — append only,
 * never rewrite.
 */
import { Router } from 'express';
import { execFile } from 'node:child_process';
import { appendFile, readFile } from 'node:fs/promises';
import { ImapFlow } from 'imapflow';

const { MAIL_DOMAIN, MAIL_HOST, INVITE_CODE } = process.env;
const ACCOUNTS_FILE = process.env.ACCOUNTS_FILE || '/mailcfg/postfix-accounts.cf';

// Local parts that must never become self-service mailboxes.
const RESERVED_LOCALS = new Set([
  'postmaster', 'abuse', 'admin', 'administrator', 'hostmaster', 'webmaster',
  'root', 'security', 'noreply', 'no-reply', 'mailer-daemon', 'support', 'info',
]);
const LOCAL_PART_RE = /^[a-z0-9](?:[a-z0-9._-]{0,30}[a-z0-9])?$/;

/** session.id -> IMAP password (memory only, dies with the process) */
export const sessionPasswords = new Map();

export function requireAuth(req, res, next) {
  if (req.session.user && sessionPasswords.has(req.session.id)) return next();
  return res.status(401).json({ error: 'Not signed in' });
}

export function imapCredentials(req) {
  return { user: req.session.user, pass: sessionPasswords.get(req.session.id) };
}

function sha512Crypt(password) {
  return new Promise((resolve, reject) => {
    const child = execFile(
      'openssl', ['passwd', '-6', '-stdin'],
      (err, stdout) => (err ? reject(err) : resolve(stdout.trim())),
    );
    child.stdin.end(`${password}\n`);
  });
}

async function accountExists(email) {
  let contents = '';
  try {
    contents = await readFile(ACCOUNTS_FILE, 'utf8');
  } catch {
    return false; // file absent on a fresh mailserver — nothing exists yet
  }
  const needle = email.toLowerCase();
  return contents
    .split('\n')
    .some((line) => line.split('|')[0]?.trim().toLowerCase() === needle);
}

async function tryImapLogin(user, pass) {
  const client = new ImapFlow({
    host: MAIL_HOST,
    port: 993,
    secure: true,
    auth: { user, pass },
    logger: false,
  });
  try {
    await client.connect();
    await client.logout();
    return true;
  } catch {
    return false;
  }
}

export const authRouter = Router();

authRouter.post('/register', async (req, res) => {
  const { local, password, invite } = req.body ?? {};

  if (typeof invite !== 'string' || invite !== INVITE_CODE) {
    return res.status(403).json({ error: 'Invalid invite code' });
  }
  const localPart = typeof local === 'string' ? local.trim().toLowerCase() : '';
  if (!LOCAL_PART_RE.test(localPart)) {
    return res.status(400).json({
      error: 'Name must be 1-32 chars: lowercase letters, digits, . _ - (no leading/trailing symbol)',
    });
  }
  if (RESERVED_LOCALS.has(localPart)) {
    return res.status(400).json({ error: 'That name is reserved' });
  }
  if (typeof password !== 'string' || password.length < 10 || password.length > 128) {
    return res.status(400).json({ error: 'Password must be 10-128 characters' });
  }
  if (password.includes('\n') || password.includes('|')) {
    return res.status(400).json({ error: 'Password contains unsupported characters' });
  }

  const email = `${localPart}@${MAIL_DOMAIN}`;
  if (await accountExists(email)) {
    return res.status(409).json({ error: 'That address is already taken' });
  }

  const hash = await sha512Crypt(password);
  // Single O_APPEND write — atomic for a line this size; never rewrites the file.
  await appendFile(ACCOUNTS_FILE, `${email}|{SHA512-CRYPT}${hash}\n`);

  console.log(`registered mailbox ${email}`);
  return res.status(201).json({ email });
});

authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body ?? {};
  const raw = typeof email === 'string' ? email.trim().toLowerCase() : '';
  // Accept "name" or "name@eunoia.kz"; only this domain may sign in here.
  const localPart = raw.endsWith(`@${MAIL_DOMAIN}`) ? raw.slice(0, -(MAIL_DOMAIN.length + 1)) : raw;
  if (!LOCAL_PART_RE.test(localPart) || typeof password !== 'string' || !password) {
    return res.status(400).json({ error: 'Enter your address and password' });
  }

  const user = `${localPart}@${MAIL_DOMAIN}`;
  if (!(await tryImapLogin(user, password))) {
    return res.status(401).json({ error: 'Wrong address or password' });
  }

  await new Promise((resolve, reject) =>
    req.session.regenerate((err) => (err ? reject(err) : resolve())),
  );
  req.session.user = user;
  sessionPasswords.set(req.session.id, password);
  return res.json({ email: user });
});

authRouter.post('/logout', (req, res) => {
  sessionPasswords.delete(req.session.id);
  req.session.destroy(() => res.json({ ok: true }));
});

authRouter.get('/me', (req, res) => {
  if (req.session.user && sessionPasswords.has(req.session.id)) {
    return res.json({ email: req.session.user });
  }
  return res.status(401).json({ error: 'Not signed in' });
});
