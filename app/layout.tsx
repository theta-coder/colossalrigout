import type { Metadata } from 'next';
import { Poppins, Playfair_Display } from 'next/font/google';
import { AuthProvider } from '../context/AuthContext';
import { ProductsProvider } from '../context/ProductsContext';
import { CartProvider } from '../context/CartContext';
import { ToastProvider } from '../context/ToastContext';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { getAnnouncementSettings, getFooterSettings } from '../lib/server/storefront-settings';
import WhatsAppFloatingButton from '../components/WhatsAppFloatingButton';
import GoogleAnalytics from '../components/GoogleAnalytics';
import './globals.css';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-display',
  display: 'swap',
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://colossalrigout.pk';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Colossal Rigout | Wear Your Confidence',
    template: '%s | Colossal Rigout',
  },
  description: 'Trendy pieces, timeless style. Wear your confidence with premium fashion apparel from Colossal Rigout in Pakistan.',
  keywords: [
    'Colossal Rigout',
    'Clothing Pakistan',
    'Men Fashion Pakistan',
    'Premium Apparel',
    'Online Shopping Pakistan',
    'Streetwear Pakistan',
    'Trendy Clothes',
  ],
  authors: [{ name: 'Colossal Rigout' }],
  creator: 'Colossal Rigout',
  publisher: 'Colossal Rigout',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: siteUrl,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_PK',
    url: siteUrl,
    siteName: 'Colossal Rigout',
    title: 'Colossal Rigout | Wear Your Confidence',
    description: 'Trendy pieces, timeless style. Wear your confidence with premium fashion apparel from Colossal Rigout in Pakistan.',
    images: [
      {
        url: `${siteUrl}/colossal-rigout-logo.png`,
        width: 1200,
        height: 630,
        alt: 'Colossal Rigout Logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Colossal Rigout | Wear Your Confidence',
    description: 'Trendy pieces, timeless style. Wear your confidence with premium fashion apparel from Colossal Rigout in Pakistan.',
    images: [`${siteUrl}/colossal-rigout-logo.png`],
  },
  icons: {
    icon: '/colossal-rigout-logo.png',
    apple: '/colossal-rigout-logo.png',
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [announcement, footer] = await Promise.all([
    getAnnouncementSettings(),
    getFooterSettings(),
  ]);

  const organizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Colossal Rigout',
    url: siteUrl,
    logo: `${siteUrl}/colossal-rigout-logo.png`,
    sameAs: ['https://instagram.com/colossalrigout'],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      email: 'support@colossalrigout.pk',
      areaServed: 'PK',
      availableLanguage: ['en', 'ur'],
    },
  };

  const webSiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Colossal Rigout',
    url: siteUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${siteUrl}/shop?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <html
      lang="en"
      className={`${poppins.variable} ${playfairDisplay.variable} scroll-smooth`}
      suppressHydrationWarning
    >
      <head>
        <GoogleAnalytics />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteJsonLd) }}
        />
      </head>
      <body className="bg-[#f4f4f3] text-neutral-900 font-sans" suppressHydrationWarning>
        <ToastProvider>
          <AuthProvider>
            <ProductsProvider>
              <CartProvider>
                <div className="flex flex-col min-h-screen">
                  <Header announcement={announcement} />
                  <main className="flex-grow">{children}</main>
                  <Footer settings={footer} />
                  <WhatsAppFloatingButton />
                </div>
              </CartProvider>
            </ProductsProvider>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
