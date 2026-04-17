import { db } from '@/lib/db'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'

export const dynamic = 'force-dynamic'

export default async function VoicesPage() {
  const voices = await db.voice.findMany({ orderBy: { name: 'asc' } })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Voices</h1>
        <Button variant="outline" asChild>
          <a href="/api/v1/voices/sync" target="_blank">Sync from ElevenLabs</a>
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>ElevenLabs ID</TableHead>
            <TableHead>Speed</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {voices.map((v) => {
            const settings = (v.settings as Record<string, unknown>) ?? {}
            return (
              <TableRow key={v.id}>
                <TableCell className="font-medium">{v.name}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{v.elevenlabsVoiceId}</TableCell>
                <TableCell>{String(settings.speed ?? '1.0')}x</TableCell>
              </TableRow>
            )
          })}
          {voices.length === 0 && (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-muted-foreground py-8">No voices yet.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
