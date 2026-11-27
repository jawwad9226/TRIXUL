export default function manifest() {
  return {
    name: "Swaym Yatri",
    short_name: "Swaym Yatri",
    description: "Live bus tracking, ETAs, and city transit guide for commuters.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#fbfcfa",
    theme_color: "#2c6d45",
    icons: [
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable",
      },
      {
        src: "/favicon.png",
        sizes: "48x48",
        type: "image/png",
      },
    ],
  }
}
