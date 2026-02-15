import { AuthProvider } from '@/features/auths/contexts/auth-context';
import '@/styles/css/globals.css';
import { geistMono, geistSans } from '@/styles/fonts/geist';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Next.js RBAC Template',
  description:
    'A complete Role-Based Access Control implementation with Next.js 14 and Prisma',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
