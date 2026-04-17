export type BrandTokens = {
  primaryColor: string
  secondaryColor: string
  backgroundColor: string
  textColor: string
  fontFamily: string
  logoUrl?: string
}

export const defaultBrand: BrandTokens = {
  primaryColor: '#6366f1',
  secondaryColor: '#818cf8',
  backgroundColor: '#0f0f1a',
  textColor: '#ffffff',
  fontFamily: 'Inter, sans-serif',
}
