import "./globals.css"
import type { Metadata } from "next"
import { AuthProvider } from "@/hooks/useAuth"

export const metadata: Metadata = {
  title: "My App",
  description: "Next.js App with Auth",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <AuthProvider>

          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
