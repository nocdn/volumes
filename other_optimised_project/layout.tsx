import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import localFont from "next/font/local"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

const lars = localFont({
  src: "../public/fonts/F-Regular.otf",
  variable: "--font-lars",
})

export const metadata: Metadata = {
  title: "Bookmark",
  description: "Bookmark",
  icons: {
    icon: "/star.svg",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <meta
          name="viewport"
          content="user-scalable=no, initial-scale=1, maximum-scale=1, minimum-scale=1, width=device-width, height=device-height"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${lars.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  )
}
