import "./globals.css"

export const metadata = {
  title: "Swaym Yatri | Your city, connected",
  description: "Explore public transport and city services with Swaym Yatri.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Swaym Yatri",
  },
  icons: {
    icon: "/favicon.png",
    apple: "/icon-512.png",
  },
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#fbfcfa",
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  )
}
