/**
 * Signup verification codes (email free tier via Brevo or Resend; SMS via Semaphore or Twilio).
 *
 * Providers are chosen by environment variables and default to "mock":
 *   EMAIL_PROVIDER = mock | brevo | resend
 *   SMS_PROVIDER   = mock | semaphore | twilio
 * In "mock" mode nothing is sent; the code is written to the Worker log.
 * Set OTP_DEV_ECHO=true (local/testing only) to also return the code in the API response.
 */

export type OtpChannel = 'sms' | 'email';

export type OtpEnv = {
  OTP_ENABLED?: string;
  OTP_DEV_ECHO?: string;
  OTP_EMAIL_FROM?: string;
  OTP_EMAIL_FROM_NAME?: string;
  EMAIL_PROVIDER?: string;
  BREVO_API_KEY?: string;
  RESEND_API_KEY?: string;
  SMS_PROVIDER?: string;
  SEMAPHORE_API_KEY?: string;
  SMS_SENDER_NAME?: string;
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_PHONE_NUMBER?: string;
};

export const OTP_TTL_MINUTES = 5;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_COOLDOWN_SECONDS = 60;
export const OTP_MAX_SENDS_PER_HOUR = 5;

/** SMS is offered only when a real provider and its key are configured. */
export function isSmsEnabled(env: OtpEnv): boolean {
  const p = (env.SMS_PROVIDER || '').toLowerCase();
  if (p === 'semaphore') return Boolean(env.SEMAPHORE_API_KEY);
  if (p === 'twilio') return Boolean(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_PHONE_NUMBER);
  return false;
}

/** Email is offered only when a real provider and its key are configured. */
export function isEmailEnabled(env: OtpEnv): boolean {
  const p = (env.EMAIL_PROVIDER || '').toLowerCase();
  if (p === 'brevo') return Boolean(env.BREVO_API_KEY && env.OTP_EMAIL_FROM);
  if (p === 'resend') return Boolean(env.RESEND_API_KEY && env.OTP_EMAIL_FROM);
  return false;
}

export function generateOtpCode(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
  return String(n).padStart(6, '0');
}

/** "09171234567" -> "+639171234567" (E.164 for Twilio). */
function toE164Ph(local: string): string {
  return `+63${local.replace(/^0/, '')}`;
}

export function maskDestination(channel: OtpChannel, destination: string): string {
  if (channel === 'sms') return `${destination.slice(0, 4)}${'•'.repeat(5)}${destination.slice(-2)}`;
  const [name, domain] = destination.split('@');
  if (!domain) return '•••';
  return `${name.slice(0, 1)}${'•'.repeat(Math.max(2, name.length - 1))}@${domain}`;
}

export type SendResult = { delivered: boolean; provider: string; error?: string };

export async function sendOtpMessage(
  env: OtpEnv,
  channel: OtpChannel,
  destination: string,
  code: string
): Promise<SendResult> {
  const text = `Your Brigada Onse verification code is ${code}. It expires in ${OTP_TTL_MINUTES} minutes. Do not share it.`;

  if (channel === 'sms') {
    const provider = (env.SMS_PROVIDER || 'mock').toLowerCase();
    try {
      if (provider === 'semaphore' && env.SEMAPHORE_API_KEY) {
        const body = new URLSearchParams({
          apikey: env.SEMAPHORE_API_KEY,
          number: destination,
          message: text,
          sendername: env.SMS_SENDER_NAME || 'BrigadaOnse',
        });
        const res = await fetch('https://api.semaphore.co/api/v4/messages', { method: 'POST', body });
        return { delivered: res.ok, provider, error: res.ok ? undefined : `HTTP ${res.status}` };
      }
      if (provider === 'twilio' && env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_PHONE_NUMBER) {
        const body = new URLSearchParams({
          To: toE164Ph(destination),
          From: env.TWILIO_PHONE_NUMBER,
          Body: text,
        });
        const auth = btoa(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`);
        const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`, {
          method: 'POST',
          headers: { Authorization: `Basic ${auth}` },
          body,
        });
        return { delivered: res.ok, provider, error: res.ok ? undefined : `HTTP ${res.status}` };
      }
    } catch (err) {
      return { delivered: false, provider, error: err instanceof Error ? err.message : 'send failed' };
    }
    console.log(`[OTP mock sms] to=${destination} code=${code}`);
    return { delivered: false, provider: 'mock' };
  }

  const provider = (env.EMAIL_PROVIDER || 'mock').toLowerCase();
  const fromName = env.OTP_EMAIL_FROM_NAME || 'Brigada Onse';
  try {
    if (provider === 'brevo' && env.BREVO_API_KEY && env.OTP_EMAIL_FROM) {
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': env.BREVO_API_KEY, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          sender: { email: env.OTP_EMAIL_FROM, name: fromName },
          to: [{ email: destination }],
          subject: 'Your verification code',
          textContent: text,
        }),
      });
      return { delivered: res.ok, provider, error: res.ok ? undefined : `HTTP ${res.status}` };
    }
    if (provider === 'resend' && env.RESEND_API_KEY && env.OTP_EMAIL_FROM) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: env.OTP_EMAIL_FROM,
          to: [destination],
          subject: 'Your verification code',
          text,
        }),
      });
      return { delivered: res.ok, provider, error: res.ok ? undefined : `HTTP ${res.status}` };
    }
  } catch (err) {
    return { delivered: false, provider, error: err instanceof Error ? err.message : 'send failed' };
  }
  console.log(`[OTP mock email] to=${destination} code=${code}`);
  return { delivered: false, provider: 'mock' };
}

/** Rate-limit check per destination (phone or email) so one number cannot be spammed through new signups. */
export async function otpDestinationOverLimit(db: D1Database, destination: string): Promise<boolean> {
  const row = await db
    .prepare("SELECT COUNT(*) AS n FROM signup_otps WHERE destination = ? AND created_at > datetime('now', '-1 hour')")
    .bind(destination)
    .first<{ n: number }>();
  return Number(row?.n ?? 0) >= OTP_MAX_SENDS_PER_HOUR;
}
