import { db } from '@/lib/db'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const dynamic = 'force-dynamic'

export default async function TemplatesPage() {
  const templates = await db.template.findMany({ orderBy: { name: 'asc' } })

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Templates</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.length === 0 && (
        <p className="text-muted-foreground text-sm">No templates yet. Templates are created via the API.</p>
      )}
      {templates.map((t) => (
          <Card key={t.id}>
            {t.previewThumbnailUrl && (
              <img src={t.previewThumbnailUrl} className="w-full h-36 object-cover rounded-t-lg" alt={t.name} />
            )}
            <CardHeader>
              <CardTitle className="text-base">{t.name}</CardTitle>
              <CardDescription>{t.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground font-mono">{t.compositionId}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
