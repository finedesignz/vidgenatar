import { Badge } from '@/components/ui/badge'

type Status = 'queued' | 'processing' | 'completed' | 'failed'

const variants: Record<Status, 'secondary' | 'default' | 'destructive' | 'outline'> = {
  queued: 'secondary',
  processing: 'default',
  completed: 'outline',
  failed: 'destructive',
}

export function StatusBadge({ status }: { status: Status }) {
  return <Badge variant={variants[status]}>{status}</Badge>
}
