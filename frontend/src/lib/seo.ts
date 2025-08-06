import type { Metadata } from 'next'

interface SEOProps {
  title?: string
  description?: string
  keywords?: string[]
  url?: string
  image?: string
  noIndex?: boolean
}

export function generateMetadata({
  title,
  description,
  keywords = [],
  url,
  image,
  noIndex = false
}: SEOProps): Metadata {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://schedule-maker.vercel.app'
  const fullUrl = url ? `${baseUrl}${url}` : baseUrl
  const defaultImage = `${baseUrl}/og-image.png`

  return {
    title,
    description,
    keywords: [
      ...keywords,
      'generador de horarios',
      'horarios universitarios',
      'planificador académico',
      'schedule maker',
      'university schedule'
    ],
    openGraph: {
      title: title || 'Schedule Maker',
      description: description || 'Generador de horarios universitarios inteligente',
      url: fullUrl,
      images: [
        {
          url: image || defaultImage,
          width: 1200,
          height: 630,
          alt: title || 'Schedule Maker'
        }
      ],
      type: 'website',
      locale: 'es_PE',
    },
    twitter: {
      card: 'summary_large_image',
      title: title || 'Schedule Maker',
      description: description || 'Generador de horarios universitarios inteligente',
      images: [image || defaultImage],
    },
    robots: noIndex ? 'noindex,nofollow' : 'index,follow',
    alternates: {
      canonical: fullUrl,
    }
  }
}

// Structured data for organization
export function generateOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Schedule Maker',
    description: 'Generador de horarios universitarios inteligente con colaboración en tiempo real',
    url: process.env.NEXT_PUBLIC_BASE_URL || 'https://schedule-maker.vercel.app',
    logo: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://schedule-maker.vercel.app'}/logo.png`,
    sameAs: [
      // Add your social media links here
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      email: 'support@schedule-maker.com'
    }
  }
}

// Structured data for software application
export function generateSoftwareApplicationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Schedule Maker',
    description: 'Aplicación web para crear horarios universitarios optimizados con inteligencia artificial',
    url: process.env.NEXT_PUBLIC_BASE_URL || 'https://schedule-maker.vercel.app',
    applicationCategory: 'Education',
    operatingSystem: 'Web Browser',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD'
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '150'
    },
    featureList: [
      'Generación automática de horarios',
      'Colaboración en tiempo real',
      'Detección de conflictos',
      'Múltiples universidades',
      'Interfaz intuitiva'
    ]
  }
}

// Structured data for educational organization
export function generateEducationalOrganizationSchema(universityName: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    name: universityName,
    description: `Horarios y cursos disponibles para ${universityName}`,
    url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://schedule-maker.vercel.app'}/universities/${universityName.toLowerCase()}`,
    sameAs: [
      // University official website and social media
    ]
  }
}
