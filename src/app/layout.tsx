import type { Metadata } from "next"
import { Geist } from "next/font/google"
import { ClerkProvider } from "@clerk/nextjs"
import "./globals.css"

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Realm — Your City. Your Life.",
  description: "A gamified world where AI-powered buildings help you manage your finances, get work done, learn anything, and live your best life.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
        <body className="min-h-full bg-[#080810] text-white">
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}
