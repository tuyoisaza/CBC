import { CatalogDetail } from '@/components/catalog/CatalogDetail'
export const dynamic = 'force-dynamic'
export default function Page({ params }: { params: { kind: string; slug: string } }) {
  return <CatalogDetail {...params} lang="en" />
}
