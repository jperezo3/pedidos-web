import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Pedidos · Seguimiento",
  description: "Consulta el estado de tus pedidos",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
