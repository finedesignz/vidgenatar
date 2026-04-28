import { db } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SyncButton } from '@/components/sync-button'

export const dynamic = 'force-dynamic'

export default async function AvatarsPage() {
  const avatars = await db.avatar.findMany({ orderBy: { name: 'asc' } })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Avatars</h1>
        <SyncButton url="/api/v1/avatars/sync" label="Sync from HeyGen" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {avatars.map((a) => (
          <Card key={a.id}>
            {a.thumbnailUrl && (
              <img src={a.thumbnailUrl} className="w-full h-40 object-cover rounded-t-lg" alt={a.name} />
            )}
            <CardHeader className="py-3">
              <CardTitle className="text-sm">{a.name}</CardTitle>
            </CardHeader>
            <CardContent className="py-0 pb-3">
              <p className="text-xs text-muted-foreground font-mono truncate">{a.heygenAvatarId}</p>
            </CardContent>
          </Card>
        ))}
        {avatars.length === 0 && (
          <p className="text-muted-foreground col-span-full">No avatars. Click &quot;Sync from HeyGen&quot; to import.</p>
        )}
      </div>
    </div>
  )
}
