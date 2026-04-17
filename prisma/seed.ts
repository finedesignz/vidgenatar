import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

const templates = [
  {
    name: 'Branded Slide',
    compositionId: 'BrandedSlide',
    description: 'Avatar on animated branded background with title and subtitle',
    propsSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Main title text' },
        subtitle: { type: 'string', description: 'Subtitle text (optional)' },
        brand: { type: 'object', description: 'Brand token overrides' },
      },
      required: ['title'],
    },
    defaultProps: { title: 'Your Title Here', brand: {} },
  },
  {
    name: 'Logo Intro',
    compositionId: 'LogoIntro',
    description: '5-second branded logo reveal intro clip',
    propsSchema: {
      type: 'object',
      properties: { brand: { type: 'object', description: 'Brand tokens (logoUrl, primaryColor, etc.)' } },
    },
    defaultProps: { brand: {} },
  },
  {
    name: 'Product Teaser',
    compositionId: 'ProductTeaser',
    description: '15-second product ad with hook, value prop, and CTA',
    propsSchema: {
      type: 'object',
      properties: {
        headline: { type: 'string' },
        subline: { type: 'string' },
        cta: { type: 'string' },
        brand: { type: 'object' },
      },
      required: ['headline', 'subline', 'cta'],
    },
    defaultProps: { headline: 'Introducing Something New', subline: 'The smarter way to work', cta: 'Learn More', brand: {} },
  },
  {
    name: 'Data Reveal',
    compositionId: 'DataReveal',
    description: '10-second animated metric/milestone reveal',
    propsSchema: {
      type: 'object',
      properties: {
        metric: { type: 'string', description: 'Big number or stat (e.g. "10x")' },
        label: { type: 'string', description: 'Label under the metric' },
        context: { type: 'string', description: 'Optional supporting context' },
        brand: { type: 'object' },
      },
      required: ['metric', 'label'],
    },
    defaultProps: { metric: '10x', label: 'Faster Results', brand: {} },
  },
  {
    name: 'Ad Variant',
    compositionId: 'AdVariant',
    description: 'Vertical 9:16 ad template for Meta/social',
    propsSchema: {
      type: 'object',
      properties: {
        headline: { type: 'string' },
        body: { type: 'string' },
        cta: { type: 'string' },
        imageUrl: { type: 'string', description: 'Optional background image URL' },
        brand: { type: 'object' },
      },
      required: ['headline', 'body', 'cta'],
    },
    defaultProps: { headline: 'Limited Time Offer', body: 'Get started today and save', cta: 'Shop Now', brand: {} },
  },
]

async function main() {
  for (const t of templates) {
    await db.template.upsert({
      where: { compositionId: t.compositionId },
      create: t,
      update: { name: t.name, description: t.description, defaultProps: t.defaultProps, propsSchema: t.propsSchema },
    })
    console.log(`Seeded: ${t.name}`)
  }
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect())
