import "./globals.css"

export const metadata = {
  title: "Swayam Yatri | Your city, connected",
  description: "Explore public transport and city services with Swayam Yatri.",
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
