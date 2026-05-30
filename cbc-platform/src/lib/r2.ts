import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

export const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_KEY!,
  },
})

const BUCKET = process.env.CLOUDFLARE_R2_BUCKET!
const PUBLIC_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL!

export async function getUploadUrl(key: string, contentType: string) {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  })
  const url = await getSignedUrl(r2, command, { expiresIn: 300 }) // 5 min
  return { uploadUrl: url, publicUrl: `${PUBLIC_URL}/${key}` }
}

export async function uploadBuffer(key: string, buffer: Buffer, contentType: string) {
  await r2.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }))
  return `${PUBLIC_URL}/${key}`
}

export function logoKey(leadId: string, filename: string) {
  return `logos/${leadId}/${Date.now()}-${filename}`
}

export function cfdiKey(orderId: string, type: 'pdf' | 'xml') {
  return `cfdis/${orderId}/factura.${type}`
}

export function quoteKey(quoteId: string) {
  return `quotes/${quoteId}/cotizacion.pdf`
}
