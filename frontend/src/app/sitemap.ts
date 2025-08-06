import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://schedule-maker.vercel.app'

  // Static pages
  const staticPages = [
    '',
    '/auth',
    '/universities',
    '/how-it-works',
  ]

  const staticRoutes = staticPages.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: route === '' ? 1 : 0.8,
  }))

  // Dynamic university pages (add your universities here)
  const universities = ['utec'] // Add more universities as you support them
  const universityRoutes = universities.map((university) => ({
    url: `${baseUrl}/universities/${university}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }))

  return [...staticRoutes, ...universityRoutes]
}
