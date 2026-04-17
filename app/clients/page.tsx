import { db } from '@/lib/db'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'

export const dynamic = 'force-dynamic'

export default async function ClientsPage() {
  const clients = await db.client.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { jobs: true } } },
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Clients</h1>
        <Button>New Client</Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Slug</TableHead>
            <TableHead>Jobs</TableHead>
            <TableHead>API Key</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.map((c) => (
            <TableRow key={c.id}>
              <TableCell className="font-medium">{c.name}</TableCell>
              <TableCell className="font-mono text-xs">{c.slug}</TableCell>
              <TableCell>{c._count.jobs}</TableCell>
              <TableCell>
                <span className="font-mono text-xs text-muted-foreground">
                  {c.apiKey.slice(0, 8)}••••••••
                </span>
              </TableCell>
            </TableRow>
          ))}
          {clients.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground py-8">No clients yet.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
