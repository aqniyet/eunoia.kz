/**
 * Mailbox endpoints — one short-lived IMAP connection per request
 * (localhost mailserver, the handshake is cheap; no pooling to babysit).
 *
 * Reading returns plain text only: HTML bodies are reduced to text and
 * never rendered, which closes the whole HTML-mail XSS category.
 * Sending builds the raw message once, submits it over SMTP :587 and
 * appends the same bytes to the Sent folder.
 */
import { Router } from 'express';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import nodemailer from 'nodemailer';
import MailComposer from 'nodemailer/lib/mail-composer/index.js';

import { imapCredentials } from './auth.js';

const { MAIL_HOST } = process.env;

const BOXES = { inbox: 'INBOX', sent: 'Sent', spam: 'Junk' };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LIST_LIMIT = 50;

function imapClient(req) {
  const { user, pass } = imapCredentials(req);
  return new ImapFlow({
    host: MAIL_HOST,
    port: 993,
    secure: true,
    auth: { user, pass },
    logger: false,
  });
}

function addressText(addr) {
  return addr?.map((a) => (a.name ? `${a.name} <${a.address}>` : a.address)).join(', ') ?? '';
}

function resolveBox(query) {
  return BOXES[(query || 'inbox').toLowerCase()];
}

export const mailRouter = Router();

mailRouter.get('/messages', async (req, res) => {
  const box = resolveBox(req.query.box);
  if (!box) return res.status(400).json({ error: 'Unknown mailbox' });

  const client = imapClient(req);
  const messages = [];
  try {
    await client.connect();
    let lock;
    try {
      lock = await client.getMailboxLock(box);
    } catch {
      // Folder not created yet (e.g. Junk before first use) — empty, not an error.
      await client.logout();
      return res.json({ box, messages });
    }
    try {
      const total = client.mailbox.exists;
      if (total > 0) {
        const first = Math.max(1, total - LIST_LIMIT + 1);
        for await (const msg of client.fetch(`${first}:*`, { envelope: true, flags: true, uid: true })) {
          messages.push({
            uid: msg.uid,
            subject: msg.envelope.subject || '(no subject)',
            from: addressText(msg.envelope.from),
            to: addressText(msg.envelope.to),
            date: msg.envelope.date,
            seen: msg.flags.has('\\Seen'),
          });
        }
      }
    } finally {
      lock.release();
    }
    await client.logout();
  } catch (err) {
    client.close();
    throw err;
  }
  messages.reverse(); // newest first
  return res.json({ box, messages });
});

mailRouter.get('/messages/:uid', async (req, res) => {
  const box = resolveBox(req.query.box);
  const uid = Number.parseInt(req.params.uid, 10);
  if (!box || !Number.isInteger(uid) || uid <= 0) {
    return res.status(400).json({ error: 'Bad message reference' });
  }

  const client = imapClient(req);
  let parsed;
  try {
    await client.connect();
    const lock = await client.getMailboxLock(box);
    try {
      const msg = await client.fetchOne(uid, { source: true }, { uid: true });
      if (!msg?.source) {
        return res.status(404).json({ error: 'Message not found' });
      }
      parsed = await simpleParser(msg.source);
      await client.messageFlagsAdd({ uid }, ['\\Seen'], { uid: true });
    } finally {
      lock.release();
    }
    await client.logout();
  } catch (err) {
    client.close();
    throw err;
  }

  // Text only — strip HTML rather than render it.
  let text = parsed.text || '';
  if (!text && parsed.html) {
    text = parsed.html
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  return res.json({
    uid,
    subject: parsed.subject || '(no subject)',
    from: parsed.from?.text || '',
    to: parsed.to?.text || '',
    date: parsed.date,
    text,
    attachments: (parsed.attachments || []).map((a, index) => ({
      index,
      filename: a.filename || `attachment-${index + 1}`,
      contentType: a.contentType || 'application/octet-stream',
      size: a.size || 0,
    })),
  });
});

// Images (except SVG, which can execute scripts when opened directly) are
// served inline so the UI can embed them; everything else is forced to
// download as octet-stream — never rendered in the page's origin.
mailRouter.get('/messages/:uid/attachments/:idx', async (req, res) => {
  const box = resolveBox(req.query.box);
  const uid = Number.parseInt(req.params.uid, 10);
  const idx = Number.parseInt(req.params.idx, 10);
  if (!box || !Number.isInteger(uid) || uid <= 0 || !Number.isInteger(idx) || idx < 0) {
    return res.status(400).json({ error: 'Bad attachment reference' });
  }

  const client = imapClient(req);
  let attachment;
  try {
    await client.connect();
    const lock = await client.getMailboxLock(box);
    try {
      const msg = await client.fetchOne(uid, { source: true }, { uid: true });
      if (!msg?.source) return res.status(404).json({ error: 'Message not found' });
      const parsed = await simpleParser(msg.source);
      attachment = (parsed.attachments || [])[idx];
    } finally {
      lock.release();
    }
    await client.logout();
  } catch (err) {
    client.close();
    throw err;
  }
  if (!attachment) return res.status(404).json({ error: 'Attachment not found' });

  const type = attachment.contentType || 'application/octet-stream';
  const inlineImage = type.startsWith('image/') && type !== 'image/svg+xml';
  const safeName = (attachment.filename || 'attachment').replace(/[^\w.\- ]/g, '_');
  res.setHeader('Content-Type', inlineImage ? type : 'application/octet-stream');
  res.setHeader('Content-Disposition', `${inlineImage ? 'inline' : 'attachment'}; filename="${safeName}"`);
  res.setHeader('Cache-Control', 'private, max-age=3600');
  return res.send(attachment.content);
});

mailRouter.post('/messages/:uid/move', async (req, res) => {
  const from = resolveBox(req.body?.from);
  const to = resolveBox(req.body?.to);
  const uid = Number.parseInt(req.params.uid, 10);
  if (!from || !to || from === to || !Number.isInteger(uid) || uid <= 0) {
    return res.status(400).json({ error: 'Bad move request' });
  }

  const client = imapClient(req);
  try {
    await client.connect();
    const lock = await client.getMailboxLock(from);
    try {
      try {
        await client.messageMove({ uid }, to, { uid: true });
      } catch {
        await client.mailboxCreate(to).catch(() => {});
        await client.messageMove({ uid }, to, { uid: true });
      }
    } finally {
      lock.release();
    }
    await client.logout();
  } catch (err) {
    client.close();
    throw err;
  }
  return res.json({ ok: true });
});

mailRouter.post('/send', async (req, res) => {
  const { to, subject, text } = req.body ?? {};
  const recipients = typeof to === 'string'
    ? to.split(',').map((r) => r.trim()).filter(Boolean)
    : [];
  if (recipients.length === 0 || recipients.length > 10 || !recipients.every((r) => EMAIL_RE.test(r))) {
    return res.status(400).json({ error: 'Provide 1-10 valid recipient addresses (comma-separated)' });
  }
  if (typeof subject !== 'string' || subject.length > 300) {
    return res.status(400).json({ error: 'Subject is required (max 300 chars)' });
  }
  if (typeof text !== 'string' || !text.trim() || text.length > 100_000) {
    return res.status(400).json({ error: 'Message text is required' });
  }

  const { user, pass } = imapCredentials(req);

  const composer = new MailComposer({
    from: user,
    to: recipients.join(', '),
    subject,
    text,
    date: new Date(),
  });
  const raw = await composer.compile().build();

  const transport = nodemailer.createTransport({
    host: MAIL_HOST,
    port: 587,
    secure: false,
    requireTLS: true,
    auth: { user, pass },
  });
  await transport.sendMail({ envelope: { from: user, to: recipients }, raw });

  // Best effort: file a copy into Sent. Delivery already succeeded.
  const client = imapClient(req);
  try {
    await client.connect();
    try {
      await client.append('Sent', raw, ['\\Seen']);
    } catch {
      await client.mailboxCreate('Sent').catch(() => {});
      await client.append('Sent', raw, ['\\Seen']).catch(() => {});
    }
    await client.logout();
  } catch {
    client.close();
  }

  return res.json({ ok: true });
});
