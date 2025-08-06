import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://schedule-maker.vercel.app'

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/dashboard/*', // Private user areas
        '/api/*',       // API endpoints
        '/_next/*',     // Next.js internals
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
