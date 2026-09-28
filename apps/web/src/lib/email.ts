import { Resend } from 'resend'
import { getIntegrationValues } from './integration-secrets'

/**
 * Provider-agnostic transactional email.
 * Brevo when BREVO_API_KEY is set (free tier: 300 emails/day), otherwise
 * Resend. Sender address comes from EMAIL_FROM, falling back to the legacy
 * RESEND_FROM_EMAIL so existing deploys keep working.
 */

const FROM_NAME = 'Coffee Bunn Café'

type EmailOptions = {
  to: string | string[]
  subject: string
  html: string
}

export type EmailResult = { success: true } | {
  success: false
  reason: 'not_configured' | 'provider_error' | 'configuration_error'
}

export async function sendEmailWithResult(opts: EmailOptions): Promise<EmailResult> {
  const to = Array.isArray(opts.to) ? opts.to : [opts.to]
  let config: Record<string, string | undefined>
  try {
    config = await getIntegrationValues(['BREVO_API_KEY', 'RESEND_API_KEY', 'EMAIL_FROM', 'RESEND_FROM_EMAIL'])
  } catch {
    console.error('Email configuration unavailable')
    return { success: false, reason: 'configuration_error' }
  }
  try {
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
      return { success: true }
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
      return { success: true }
    }

    console.warn('No email provider configured — email skipped')
    return { success: false, reason: 'not_configured' }
  } catch {
    console.error('Email delivery failed')
    return { success: false, reason: 'provider_error' }
  }
}

export async function sendEmail(opts: EmailOptions): Promise<boolean> {
  return (await sendEmailWithResult(opts)).success
}
