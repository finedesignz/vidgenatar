import { db } from '@/lib/db'
import { NewVideoForm } from '@/components/new-video-form'

export default async function NewVideoPage() {
  const [avatars, voices, clients, templates] = await Promise.all([
    db.avatar.findMany({ orderBy: { name: 'asc' } }),
    db.voice.findMany({ orderBy: { name: 'asc' } }),
    db.client.findMany({ orderBy: { name: 'asc' } }),
    db.template.findMany({ orderBy: { name: 'asc' } }),
  ])

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">New Video</h1>
      <NewVideoForm avatars={avatars} voices={voices} clients={clients} templates={templates} />
    </div>
  )
}
