import Link from 'next/link'
import { db } from '@/lib/db'
import { JobsTable } from '@/components/jobs-table'
import { Button } from '@/components/ui/button'

export const dynamic = 'force-dynamic'

export default async function JobsPage() {
  const jobs = await db.videoJob.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { client: true, template: true },
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Video Jobs</h1>
        <Button asChild><Link href="/videos/new">New Video</Link></Button>
      </div>
      <JobsTable jobs={jobs as Parameters<typeof JobsTable>[0]['jobs']} />
    </div>
  )
}
