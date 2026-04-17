import React from 'react'
import { Composition } from 'remotion'
import { BrandedSlide } from './compositions/BrandedSlide'
import { LogoIntro } from './compositions/LogoIntro'
import { ProductTeaser } from './compositions/ProductTeaser'
import { DataReveal } from './compositions/DataReveal'
import { AdVariant } from './compositions/AdVariant'

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="BrandedSlide"
      component={BrandedSlide}
      durationInFrames={300}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={{ title: 'Your Title Here', brand: {} }}
    />
    <Composition
      id="LogoIntro"
      component={LogoIntro}
      durationInFrames={150}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={{ brand: {} }}
    />
    <Composition
      id="ProductTeaser"
      component={ProductTeaser}
      durationInFrames={450}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={{ headline: 'Product Name', subline: 'Tagline', cta: 'Learn More', brand: {} }}
    />
    <Composition
      id="DataReveal"
      component={DataReveal}
      durationInFrames={300}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={{ metric: '10x', label: 'Faster Results', brand: {} }}
    />
    <Composition
      id="AdVariant"
      component={AdVariant}
      durationInFrames={450}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{ headline: 'Headline', body: 'Body copy', cta: 'Shop Now', brand: {} }}
    />
  </>
)
