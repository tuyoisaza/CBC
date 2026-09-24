import type { Metadata } from 'next'
import React from 'react'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { AdminNav } from '@/components/admin/AdminNav'
import { requireAdminAccess, isSuperadminSession } from '@/lib/superadmin'

export const metadata: Metadata = {
  title: { default: 'CBC Admin', template: '%s | CBC Admin' },
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)
  if (await requireAdminAccess(session)) redirect('/login')
  const isSuperadmin = await isSuperadminSession(session)

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AdminNav isSuperadmin={isSuperadmin} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
