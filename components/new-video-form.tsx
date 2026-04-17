'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type Option = { id: string; name: string }
type Template = { id: string; name: string; propsSchema: unknown; defaultProps: unknown }

type Props = {
  avatars: Option[]
  voices: Option[]
  clients: Option[]
  templates: Template[]
}

export function NewVideoForm({ avatars, voices, clients, templates }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const data = new FormData(e.currentTarget)
    const body: Record<string, unknown> = {
      title: data.get('title'),
      script: data.get('script'),
      avatar_id: data.get('avatar_id'),
      voice_id: data.get('voice_id'),
    }
    const clientId = data.get('client_id')
    const templateId = data.get('template_id')
    if (clientId) body.client_id = clientId
    if (templateId) body.template_id = templateId

    try {
      const res = await fetch('/api/v1/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.NEXT_PUBLIC_ADMIN_KEY ?? ''}` },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) { setError(JSON.stringify(json.error)); return }
      router.push('/')
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader><CardTitle>New Video Job</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Title</label>
            <Input name="title" required placeholder="My Video" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Script</label>
            <Textarea name="script" required placeholder="Enter your script..." rows={8} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Avatar</label>
            <Select name="avatar_id" required>
              <SelectTrigger><SelectValue placeholder="Select avatar" /></SelectTrigger>
              <SelectContent>{avatars.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Voice</label>
            <Select name="voice_id" required>
              <SelectTrigger><SelectValue placeholder="Select voice" /></SelectTrigger>
              <SelectContent>{voices.map((v) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Client (optional)</label>
            <Select name="client_id">
              <SelectTrigger><SelectValue placeholder="No client" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Template (optional)</label>
            <Select name="template_id">
              <SelectTrigger><SelectValue placeholder="No template" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {templates.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <Button type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create Video Job'}</Button>
        </form>
      </CardContent>
    </Card>
  )
}
