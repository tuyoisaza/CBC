import { db } from '@/lib/db'
import { Instagram, Facebook, Linkedin, CheckCircle2, XCircle, Clock } from 'lucide-react'

export const metadata = { title: 'Historial de posts' }

const PLATFORM_ICONS: Record<string, typeof Instagram> = {
  instagram: Instagram,
  facebook:  Facebook,
  linkedin:  Linkedin,
}

const TYPE_LABELS: Record<string, string> = {
  'product-post':  'Producto',
  'coffee-story':  'Café',
  'linkedin-post': 'LinkedIn',
  'seasonal':      'Temporada',
  'social-proof':  'Social proof',
}

export default async function PostHistoryPage() {
  const posts = await db.post.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: { coffee: { select: { name: true } } },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Historial de posts</h1>
          <p className="text-sm text-muted-foreground mt-1">{posts.length} posts registrados</p>
        </div>
      </div>

      {posts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <p className="text-muted-foreground">Sin posts registrados todavía.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Los posts aparecen aquí cuando el motor publica o cuando generas uno manualmente.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {posts.map((post) => {
            const PlatformIcon = PLATFORM_ICONS[post.platform]
            return (
              <div key={post.id} className="rounded-xl border border-border bg-card overflow-hidden">
                {/* Image */}
                {post.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={post.imageUrl}
                    alt=""
                    className="w-full aspect-square object-cover bg-cbc-black"
                  />
                ) : (
                  <div className="w-full aspect-square bg-muted flex items-center justify-center">
                    <span className="text-3xl">☕</span>
                  </div>
                )}

                {/* Meta */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      {PlatformIcon && <PlatformIcon className="h-3.5 w-3.5 text-muted-foreground" />}
                      <span className="text-xs text-muted-foreground capitalize">{post.platform}</span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground">{TYPE_LABELS[post.contentType] || post.contentType}</span>
                    </div>
                    {post.status === 'published'
                      ? <CheckCircle2 className="h-4 w-4 text-green-500" />
                      : post.status === 'failed'
                      ? <XCircle className="h-4 w-4 text-destructive" />
                      : <Clock className="h-4 w-4 text-muted-foreground" />}
                  </div>

                  <p className="text-xs text-foreground line-clamp-3 leading-relaxed">
                    {post.caption}
                  </p>

                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{post.coffee?.name || '—'}</span>
                    <span>
                      {post.publishedAt
                        ? new Date(post.publishedAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
                        : '—'}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
