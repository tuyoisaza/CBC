export type MessageLeadDraft = {
  companyName?: string
  contactName?: string
  email?: string
  whatsapp?: string
  message: string
}

/** Conservative suggestions only; staff reviews every field before saving. */
export function messageLeadDraft(message: { from: string; body: string; platform: string }): MessageLeadDraft {
  const body = message.body
  const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
  const phone = (value: string) => {
    if (!/^\+?[\d\s().-]+$/.test(value.trim())) return undefined
    const digits = value.replace(/\D/g, '')
    return digits.length >= 8 && digits.length <= 15 ? `${value.trim().startsWith('+') ? '+' : ''}${digits}` : undefined
  }
  // The website form appends this structured signature to the original message.
  const signature = message.platform === 'form'
    ? body.match(/\n— ([^\n]+)\n\(vía formulario del sitio\)\s*$/)?.[1].split(' · ')
    : undefined
  const labelled = (label: string) => body.match(new RegExp(`(?:^|\\n)\\s*(?:${label})\\s*:\\s*([^\\n]+)`, 'i'))?.[1].trim()
  const email = message.from.match(emailPattern)?.[0] ?? signature?.find(part => emailPattern.test(part))?.match(emailPattern)?.[0] ?? body.match(emailPattern)?.[0]
  const whatsapp = phone(message.from) ?? signature?.map(phone).find(Boolean) ?? phone(labelled('whatsapp|teléfono|telefono|tel|celular') ?? '')
  return {
    companyName: labelled('empresa|compañía|compania')?.slice(0, 100),
    contactName: (signature?.[0] ?? labelled('nombre|contacto'))?.slice(0, 100),
    email,
    whatsapp,
    message: body.slice(0, 1000),
  }
}
