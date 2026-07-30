import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://colossalrigout.pk';

  return {
    rules: [
      {
        userAgent: 'Googlebot',
        allow: ['/', '/api/homepage-image/'],
        disallow: ['/admin/', '/checkout/'],
      },
      {
        userAgent: 'Googlebot-Image',
        allow: ['/', '/api/homepage-image/', '/_next/image/'],
        disallow: ['/admin/', '/checkout/'],
      },
      {
        userAgent: 'AdsBot-Google',
        allow: ['/'],
        disallow: ['/admin/', '/checkout/'],
      },
      {
        userAgent: '*',
        allow: ['/', '/api/homepage-image/'],
        disallow: ['/admin/', '/checkout/'],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
