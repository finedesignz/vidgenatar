import { db } from '@/lib/db'
import { SyncButton } from '@/components/sync-button'
import { AvatarTabs } from '@/components/avatar-tabs'

export const dynamic = 'force-dynamic'

export default async function AvatarsPage() {
  const avatars = await db.avatar.findMany({ orderBy: { name: 'asc' } })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold tracking-tight">Avatars</h1>
        <SyncButton url="/api/v1/avatars/sync" label="Sync from HeyGen" />
      </div>
      <AvatarTabs avatars={avatars} />
    </div>
  )
}
