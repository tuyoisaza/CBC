import axios from 'axios'

const BASE_URL = 'https://www.facturapi.io/v2'

function client() {
  return axios.create({
    baseURL: BASE_URL,
    auth: { username: process.env.FACTURAPI_KEY!, password: '' },
    headers: { 'Content-Type': 'application/json' },
  })
}

export interface CfdiData {
  customer: {
    legal_name: string
    tax_id: string           // RFC
    tax_system: string       // régimen fiscal code e.g. "601"
    email: string
    address: { zip: string } // código postal fiscal
  }
  items: Array<{
    quantity: number
    product: {
      description: string
      product_key: string  // SAT product/service key — 90101500 = specialty food
      unit_key: string     // SAT unit key — H87 = piece
      price: number        // unit price without IVA
      tax_included: boolean
      taxes: Array<{ type: 'IVA'; rate: number; factor: 'Tasa' }>
    }
  }>
  use: string              // CFDI use code — "G03" = general expenses
  payment_form: string     // "03"=transfer, "04"=card, "99"=to be defined
  payment_method: string   // "PUE"=single payment, "PPD"=deferred
  folio_number?: number
  series?: string
}

export async function createCfdi(data: CfdiData) {
  const res = await client().post('/invoices', data)
  return res.data as {
    id: string
    uuid: string
    folio_number: number
    series: string
    status: string
    created_at: string
  }
}

export async function getCfdiPdfUrl(invoiceId: string): Promise<string> {
  const res = await client().get(`/invoices/${invoiceId}/pdf`, {
    responseType: 'arraybuffer',
  })
  // Return as base64 — caller saves to R2
  return Buffer.from(res.data).toString('base64')
}

export async function getCfdiXmlUrl(invoiceId: string): Promise<string> {
  const res = await client().get(`/invoices/${invoiceId}/xml`, {
    responseType: 'arraybuffer',
  })
  return Buffer.from(res.data).toString('base64')
}

export async function cancelCfdi(invoiceId: string, motive: string) {
  // Motives: "01"=error without replacement, "02"=error with replacement,
  //          "03"=not carried out, "04"=normative operation
  const res = await client().delete(`/invoices/${invoiceId}`, {
    data: { motive },
  })
  return res.data
}

// Build CBC CFDI data from an order
export function buildCfdiFromOrder(opts: {
  customer: {
    razonSocial: string
    rfc: string
    regimenFiscal: string
    codigoPostalFiscal: string
    emailFacturacion: string
    usoCfdi: string
  }
  items: Array<{ description: string; quantity: number; unitPrice: number }>
  paymentForm: string
  folioNumber?: number
}): CfdiData {
  return {
    customer: {
      legal_name: opts.customer.razonSocial,
      tax_id: opts.customer.rfc,
      tax_system: opts.customer.regimenFiscal,
      email: opts.customer.emailFacturacion,
      address: { zip: opts.customer.codigoPostalFiscal },
    },
    items: opts.items.map((item) => ({
      quantity: item.quantity,
      product: {
        description: item.description,
        product_key: '90101500', // Specialty food preparations
        unit_key: 'H87',         // Piece
        price: item.unitPrice,
        tax_included: false,
        taxes: [{ type: 'IVA', rate: 0.16, factor: 'Tasa' }],
      },
    })),
    use: opts.customer.usoCfdi || 'G03',
    payment_form: opts.paymentForm,
    payment_method: 'PUE',
    series: 'CBC',
    folio_number: opts.folioNumber,
  }
}
