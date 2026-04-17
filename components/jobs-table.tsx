import Link from 'next/link'
import { StatusBadge } from './status-badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type Job = {
  id: string
  title: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  createdAt: Date | string
  client: { name: string } | null
  template: { name: string } | null
  videoFilePath: string | null
}

export function JobsTable({ jobs }: { jobs: Job[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead>Client</TableHead>
          <TableHead>Template</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Created</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {jobs.map((job) => (
          <TableRow key={job.id}>
            <TableCell className="font-medium">{job.title}</TableCell>
            <TableCell>{job.client?.name ?? '—'}</TableCell>
            <TableCell>{job.template?.name ?? '—'}</TableCell>
            <TableCell><StatusBadge status={job.status} /></TableCell>
            <TableCell className="text-muted-foreground text-sm">
              {new Date(job.createdAt).toLocaleDateString()}
            </TableCell>
            <TableCell>
              {job.status === 'completed' && job.videoFilePath && (
                <Button variant="outline" size="sm" asChild>
                  <a href={`/api/download?path=${encodeURIComponent(job.videoFilePath)}`}>Download</a>
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
        {jobs.length === 0 && (
          <TableRow>
            <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
              No jobs yet. <Link href="/videos/new" className="underline">Create one</Link>
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  )
}
