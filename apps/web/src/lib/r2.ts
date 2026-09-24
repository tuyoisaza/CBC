import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { getIntegrationValues } from './integration-secrets'

async function storage() {
  const config = await getIntegrationValues(['CLOUDFLARE_R2_ACCOUNT_ID', 'CLOUDFLARE_R2_ACCESS_KEY', 'CLOUDFLARE_R2_SECRET_KEY', 'CLOUDFLARE_R2_BUCKET', 'NEXT_PUBLIC_R2_PUBLIC_URL'])
  if (!config.CLOUDFLARE_R2_ACCOUNT_ID || !config.CLOUDFLARE_R2_ACCESS_KEY ||
      !config.CLOUDFLARE_R2_SECRET_KEY || !config.CLOUDFLARE_R2_BUCKET || !config.NEXT_PUBLIC_R2_PUBLIC_URL) {
    throw new Error('Object storage is not configured')
  }
  const r2 = new S3Client({
    region: 'auto',
    endpoint: `https://${config.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.CLOUDFLARE_R2_ACCESS_KEY,
      secretAccessKey: config.CLOUDFLARE_R2_SECRET_KEY,
    },
  })
  return { r2, bucket: config.CLOUDFLARE_R2_BUCKET!, publicUrl: config.NEXT_PUBLIC_R2_PUBLIC_URL!.replace(/\/$/, '') }
}

export async function getUploadUrl(key: string, contentType: string) {
  try {
    const { r2, bucket, publicUrl } = await storage()
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    })
    const url = await getSignedUrl(r2, command, { expiresIn: 300 }) // 5 min
    return { uploadUrl: url, publicUrl: `${publicUrl}/${key}` }
  } catch { throw new Error('Object storage upload URL unavailable') }
}

export async function uploadBuffer(key: string, buffer: Buffer, contentType: string) {
  try {
    const { r2, bucket, publicUrl } = await storage()
    await r2.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }))
    return `${publicUrl}/${key}`
  } catch { throw new Error('Object storage upload failed') }
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

export function productImageKey(productId: string, filename: string) {
  return `products/${productId}/${Date.now()}-${filename}`
}
