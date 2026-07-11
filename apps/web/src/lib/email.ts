import { Resend } from 'resend'

/**
 * Provider-agnostic transactional email.
 * Brevo when BREVO_API_KEY is set (free tier: 300 emails/day), otherwise
 * Resend. Sender address comes from EMAIL_FROM, falling back to the legacy
 * RESEND_FROM_EMAIL so existing deploys keep working.
 */

const FROM_NAME = 'Coffee Bunn Café'

function fromAddress(): string {
  return process.env.EMAIL_FROM || process.env.RESEND_FROM_EMAIL || 'hola@coffeebunncafe.com'
}

export async function sendEmail(opts: {
  to: string | string[]
  subject: string
  html: string
}): Promise<boolean> {
  const to = Array.isArray(opts.to) ? opts.to : [opts.to]

  try {
    if (process.env.BREVO_API_KEY) {
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': process.env.BREVO_API_KEY,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          sender: { name: FROM_NAME, email: fromAddress() },
          to: to.map((email) => ({ email })),
          subject: opts.subject,
          htmlContent: opts.html,
        }),
      })
      if (!res.ok) throw new Error(`Brevo ${res.status}: ${await res.text()}`)
      return true
    }

    if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.length > 5) {
      const resend = new Resend(process.env.RESEND_API_KEY)
      await resend.emails.send({
        from: `${FROM_NAME} <${fromAddress()}>`,
        to,
        subject: opts.subject,
        html: opts.html,
      })
      return true
    }

    console.warn('No email provider configured (set BREVO_API_KEY or RESEND_API_KEY) — email skipped:', opts.subject)
    return false
  } catch (err) {
    console.error('Email send error:', err)
    return false
  }
}
