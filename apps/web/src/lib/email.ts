import { Resend } from 'resend'
import { getIntegrationValues } from './integration-secrets'

/**
 * Provider-agnostic transactional email.
 * Brevo when BREVO_API_KEY is set (free tier: 300 emails/day), otherwise
 * Resend. Sender address comes from EMAIL_FROM, falling back to the legacy
 * RESEND_FROM_EMAIL so existing deploys keep working.
 */

const FROM_NAME = 'Coffee Bunn Café'

export async function sendEmail(opts: {
  to: string | string[]
  subject: string
  html: string
}): Promise<boolean> {
  const to = Array.isArray(opts.to) ? opts.to : [opts.to]

  try {
    const config = await getIntegrationValues(['BREVO_API_KEY', 'RESEND_API_KEY', 'EMAIL_FROM', 'RESEND_FROM_EMAIL'])
    const from = config.EMAIL_FROM || config.RESEND_FROM_EMAIL || 'hola@coffeebunncafe.com'
    if (config.BREVO_API_KEY) {
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': config.BREVO_API_KEY,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          sender: { name: FROM_NAME, email: from },
          to: to.map((email) => ({ email })),
          subject: opts.subject,
          htmlContent: opts.html,
        }),
      })
      if (!res.ok) throw new Error('Email provider request failed')
      return true
    }

    if (config.RESEND_API_KEY && config.RESEND_API_KEY.length > 5) {
      const resend = new Resend(config.RESEND_API_KEY)
      const result = await resend.emails.send({
        from: `${FROM_NAME} <${from}>`,
        to,
        subject: opts.subject,
        html: opts.html,
      })
      if (result.error) throw new Error('Email provider request failed')
      return true
    }

    console.warn('No email provider configured — email skipped')
    return false
  } catch {
    console.error('Email delivery failed')
    return false
  }
}
