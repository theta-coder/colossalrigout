import type { Metadata } from 'next';
import { Poppins, Playfair_Display } from 'next/font/google';
import { AuthProvider } from '../context/AuthContext';
import { ProductsProvider } from '../context/ProductsContext';
import { CartProvider } from '../context/CartContext';
import Header from '../components/Header';
import Footer from '../components/Footer';
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

export const metadata: Metadata = {
  title: 'Colossal Rigout | Wear Your Confidence',
  description: 'Trendy pieces, timeless style. Wear your confidence with Colossal Rigout.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${poppins.variable} ${playfairDisplay.variable} scroll-smooth`}
    >
      <body className="bg-[#f4f4f3] text-neutral-900 font-sans" suppressHydrationWarning>
        <AuthProvider>
          <ProductsProvider>
            <CartProvider>
              <div className="flex flex-col min-h-screen">
                <Header />
                <main className="flex-grow">{children}</main>
                <Footer />
              </div>
            </CartProvider>
          </ProductsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
