import type { Metadata } from "next"
import { Inter } from "next/font/google"
import Link from "next/link"
import Image from "next/image"
import "./globals.css"

const inter = Inter({ subsets: ["latin"], variable: '--font-inter' })

export const metadata: Metadata = {
  title: "Portfolio Intelligence Dashboard",
  description: "Local-first portfolio tracker",
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen flex flex-col">
          <header className="app-nav sticky top-0 z-50">
            <div className="container mx-auto px-6 py-3">
              <nav className="flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2.5">
                  <Image
                    src="/brand/logo.svg"
                    alt="Portfolio Logo"
                    width={28}
                    height={28}
                    priority
                  />
                  <span className="text-[17px] font-semibold text-foreground">
                    Portfolio
                  </span>
                </Link>
                <div className="flex gap-0.5">
                  <NavLink href="/">Dashboard</NavLink>
                  <NavLink href="/history">Analytics / History</NavLink>
                  <NavLink href="/briefs">Intelligence / Reports</NavLink>
                  <NavLink href="/liquidity">Liquidity</NavLink>
                  <NavLink href="/settings">Data</NavLink>
                </div>
              </nav>
            </div>
          </header>
          <main className="flex-1 container mx-auto px-6 py-6 sm:py-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="px-3 py-1.5 rounded-lg text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
    >
      {children}
    </Link>
  )
}
