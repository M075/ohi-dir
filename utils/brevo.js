// utils/brevo.js
//
// Transport layer for all outbound mail. Talks to Brevo's transactional email
// API (v3) over fetch — no SDK, because the SDK pulls in a large dependency
// tree for one POST and doesn't work cleanly on the edge/serverless runtime.
//
// Nothing in this file knows what an order or a password reset is; it only
// knows how to hand a rendered message to Brevo. Message content lives in
// utils/emailTemplates.js, and the per-event send functions live in
// utils/email.js — those are what routes should import.
//
// Required env:
//   BREVO_API_KEY         Brevo "SMTP & API" v3 key (starts with xkeysib-)
//   EMAIL_FROM            Verified sender address on the Brevo account
// Optional env:
//   EMAIL_FROM_NAME       Display name for the sender (default 'Ohi!')
//   EMAIL_REPLY_TO        Reply-to address (defaults to EMAIL_FROM)
//   EMAIL_BCC             Address silently copied on every send (archive/audit)
//   EMAIL_OVERRIDE_TO     Redirect ALL mail here — for staging against real data
//   EMAIL_DISABLED        Set to 'true' to drop every send (logs only)
//   EMAIL_DEBUG           Set to 'true' to log subject + recipients per send

const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';

const REQUEST_TIMEOUT_MS = 10_000;
const MAX_ATTEMPTS = 3;

// Brevo caps a single transactional request at 99 recipients per field.
const MAX_RECIPIENTS = 99;

let warnedMissingConfig = false;

const truthy = (value) => String(value || '').toLowerCase() === 'true';

/**
 * Sender identity, resolved once per call so a changed env var takes effect
 * without a cold start.
 */
function getSender() {
  return {
    email: process.env.EMAIL_FROM || '',
    name: process.env.EMAIL_FROM_NAME || 'Ohi!',
  };
}

export function isBrevoConfigured() {
  return Boolean(process.env.BREVO_API_KEY && process.env.EMAIL_FROM);
}

/**
 * Public base URL for links inside emails.
 *
 * Emails outlive the request that produced them, so a relative path is
 * useless — every link has to be absolute. NEXT_PUBLIC_DOMAIN is the value the
 * rest of the app already uses for this.
 */
export function getPublicBaseUrl() {
  const raw =
    process.env.NEXT_PUBLIC_DOMAIN ||
    process.env.NEXTAUTH_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
    'http://localhost:3000';

  return raw.trim().replace(/\/+$/, '');
}

/**
 * Normalise one recipient into Brevo's { email, name } shape.
 * Returns null for anything that isn't a usable address.
 */
function toRecipient(entry) {
  if (!entry) return null;

  if (typeof entry === 'string') {
    const email = entry.trim();
    return email.includes('@') ? { email } : null;
  }

  const email = (entry.email || '').trim();
  if (!email.includes('@')) return null;

  const name = (entry.name || '').trim();
  return name ? { email, name } : { email };
}

/**
 * Build a deduplicated recipient list. Case-insensitive on the address, since
 * mailbox providers treat the domain (and usually the local part) that way and
 * sending the same person two copies looks broken.
 */
function toRecipientList(input) {
  const entries = Array.isArray(input) ? input : [input];
  const seen = new Set();
  const out = [];

  for (const entry of entries) {
    const recipient = toRecipient(entry);
    if (!recipient) continue;

    const key = recipient.email.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    out.push(recipient);

    if (out.length >= MAX_RECIPIENTS) break;
  }

  return out;
}

/** Crude HTML → text fallback, used when a template supplies no text part. */
function htmlToText(html) {
  return String(html || '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<head[\s\S]*?<\/head>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|h[1-6]|li)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * A 4xx other than 429 means the request itself is wrong (bad address,
 * unverified sender, malformed payload). Retrying it just burns the function's
 * remaining execution time, so only rate limits and server faults are retried.
 */
function isRetryableStatus(status) {
  return status === 429 || status === 408 || status >= 500;
}

/**
 * Send one transactional email through Brevo.
 *
 * Resolves with { success, skipped?, reason?, messageId?, status?, error? }
 * and never throws: callers are routes whose actual job is something else, and
 * a mail outage must not fail a checkout or a password reset. Callers that
 * want to know generally only check `success`.
 *
 * @param {object}   options
 * @param {string|object|Array} options.to        Recipient(s)
 * @param {string}   options.subject
 * @param {string}   [options.html]               HTML body (required unless templateId)
 * @param {string}   [options.text]               Plain-text body (derived from html if omitted)
 * @param {string|object} [options.replyTo]
 * @param {Array}    [options.cc]
 * @param {Array}    [options.bcc]
 * @param {string[]} [options.tags]               Brevo tags, for filtering in their UI
 * @param {number}   [options.templateId]         Use a Brevo-hosted template instead of html
 * @param {object}   [options.params]             Merge params for templateId
 * @param {object}   [options.headers]            Extra SMTP headers
 */
export async function sendTransactionalEmail({
  to,
  subject,
  html,
  text,
  replyTo,
  cc,
  bcc,
  tags,
  templateId,
  params,
  headers,
} = {}) {
  if (truthy(process.env.EMAIL_DISABLED)) {
    console.log(`[email] disabled by EMAIL_DISABLED — dropped "${subject}"`);
    return { success: false, skipped: true, reason: 'disabled' };
  }

  if (!isBrevoConfigured()) {
    // Warn once rather than on every send, so a local dev run isn't buried in
    // identical lines.
    if (!warnedMissingConfig) {
      warnedMissingConfig = true;

      const missing = [
        !process.env.BREVO_API_KEY && 'BREVO_API_KEY',
        !process.env.EMAIL_FROM && 'EMAIL_FROM',
      ].filter(Boolean);

      console.warn(
        `[email] outbound email is disabled: ${missing.join(' and ')} not set. ` +
        'EMAIL_FROM must be a sender address verified in the Brevo account.'
      );
    }
    console.log(`[email] not configured — would have sent "${subject}"`);
    return { success: false, skipped: true, reason: 'not-configured' };
  }

  // EMAIL_OVERRIDE_TO exists so staging can run against production-shaped data
  // without mailing real buyers and sellers.
  const override = (process.env.EMAIL_OVERRIDE_TO || '').trim();
  const recipients = toRecipientList(override || to);

  if (!recipients.length) {
    console.warn(`[email] no valid recipient for "${subject}" — skipped`);
    return { success: false, skipped: true, reason: 'no-recipient' };
  }

  if (!subject) {
    console.warn('[email] missing subject — skipped');
    return { success: false, skipped: true, reason: 'no-subject' };
  }

  if (!html && !templateId) {
    console.warn(`[email] no body for "${subject}" — skipped`);
    return { success: false, skipped: true, reason: 'no-body' };
  }

  const sender = getSender();
  const replyToRecipient = toRecipient(replyTo || process.env.EMAIL_REPLY_TO || sender.email);

  // An override send must not also fan out to the real cc/bcc lists.
  const ccList = override ? [] : toRecipientList(cc);
  const bccList = override
    ? []
    : toRecipientList([...(Array.isArray(bcc) ? bcc : [bcc]), process.env.EMAIL_BCC]);

  const payload = {
    sender,
    to: recipients,
    subject,
  };

  if (templateId) {
    payload.templateId = Number(templateId);
    if (params) payload.params = params;
  } else {
    payload.htmlContent = html;
    payload.textContent = text || htmlToText(html);
  }

  if (replyToRecipient) payload.replyTo = replyToRecipient;
  if (ccList.length) payload.cc = ccList;
  if (bccList.length) payload.bcc = bccList;
  if (tags?.length) payload.tags = tags.filter(Boolean).map(String);
  if (headers) payload.headers = headers;

  if (truthy(process.env.EMAIL_DEBUG)) {
    console.log('[email] sending', {
      to: recipients.map((r) => r.email),
      subject,
      tags: payload.tags,
      overridden: Boolean(override),
    });
  }

  let lastError = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    // Per-attempt timeout. Without this a hung connection holds the serverless
    // invocation open until the platform kills it mid-write.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(BREVO_ENDPOINT, {
        method: 'POST',
        headers: {
          'api-key': process.env.BREVO_API_KEY,
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
        cache: 'no-store',
      });

      clearTimeout(timer);

      if (response.ok) {
        // 201 carries { messageId }; 204 (template sends) carries nothing.
        let messageId = null;
        try {
          const data = await response.json();
          messageId = data?.messageId || data?.messageIds?.[0] || null;
        } catch {
          // Empty body is a valid success response.
        }

        if (truthy(process.env.EMAIL_DEBUG)) {
          console.log(`[email] sent "${subject}"`, { messageId });
        }

        return { success: true, messageId, status: response.status };
      }

      const body = await response.text().catch(() => '');
      lastError = `Brevo responded ${response.status}: ${body.slice(0, 300)}`;

      if (!isRetryableStatus(response.status) || attempt === MAX_ATTEMPTS) {
        console.error(`[email] failed to send "${subject}" — ${lastError}`);
        return { success: false, status: response.status, error: lastError };
      }
    } catch (error) {
      clearTimeout(timer);
      lastError = error.name === 'AbortError'
        ? `timed out after ${REQUEST_TIMEOUT_MS}ms`
        : error.message;

      if (attempt === MAX_ATTEMPTS) {
        console.error(`[email] failed to send "${subject}" — ${lastError}`);
        return { success: false, error: lastError };
      }
    }

    // Exponential backoff with jitter, so a burst of sends hitting the rate
    // limit together doesn't retry in lockstep.
    const backoff = 300 * 2 ** (attempt - 1) + Math.floor(Math.random() * 200);
    console.warn(`[email] attempt ${attempt} for "${subject}" failed (${lastError}); retrying in ${backoff}ms`);
    await sleep(backoff);
  }

  return { success: false, error: lastError };
}

export default sendTransactionalEmail;
