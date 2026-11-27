import Link from "next/link"

const highlights = [
  { icon: "↗", title: "Live bus tracking", detail: "Real-time GPS positions from ETM telemetry" },
  { icon: "●", title: "Seat availability", detail: "Live passenger load & crowdedness badges" },
  { icon: "₹", title: "Instant trip fares", detail: "Point-to-point fares with active concessions" },
]

export default function HomePage() {
  return (
    <main className="welcome-page">
      <header className="topbar welcome-topbar">
        <Link className="brand" href="/" aria-label="Swaym Yatri home">
          <span className="brand-mark">s</span>
          <span>Swaym Yatri</span>
        </Link>
        <Link className="quiet-link" href="/login">Sign in</Link>
      </header>

      <section className="welcome-hero">
        <div className="hero-copy">
          <span className="eyebrow"><span className="eyebrow-dot" /> LIVE MSRTC TRANSIT</span>
          <h1>Everyday bus<br />travel, <em>made clear.</em></h1>
          <p>Track active buses on your route, check live seat occupancy, and view accurate stop arrival times powered by PostGIS.</p>
          <div className="hero-actions">
            <Link className="button button-primary button-large" href="/dashboard">
              Track live buses <span aria-hidden="true">→</span>
            </Link>
          </div>
          <div className="guest-note"><span aria-hidden="true">✓</span> Live routes, ETAs, and fares are open to all commuters</div>
        </div>
        <div className="hero-art" aria-label="Illustration of connected city bus routes">
          <div className="art-sun" />
          <div className="art-path art-path-one" />
          <div className="art-path art-path-two" />
          <div className="art-pin pin-one"><span>✦</span></div>
          <div className="art-pin pin-two"><span>🚌</span></div>
          <div className="art-pin pin-three"><span>↗</span></div>
          <div className="art-card art-card-top"><span className="art-card-icon">⌖</span><span><b>PostGIS ETA Engine</b><small>Stop-by-stop arrival times</small></span></div>
          <div className="art-card art-card-bottom"><span className="live-dot" /><span><b>Live ETM Telemetry</b><small>GPS · Seat Load · Fares</small></span></div>
          <div className="art-hill hill-back" />
          <div className="art-hill hill-front" />
        </div>
      </section>

      <section className="welcome-highlights" aria-label="What you can do">
        {highlights.map((item) => (
          <Link className="highlight-item" href="/dashboard" key={item.title}>
            <span className="highlight-icon">{item.icon}</span>
            <span><b>{item.title}</b><small>{item.detail}</small></span>
            <span className="highlight-arrow" aria-hidden="true">↗</span>
          </Link>
        ))}
      </section>
      <footer className="welcome-footer"><span>SWAYM YATRI · TRIXUL PUBLIC PLATFORM</span><span>English · मराठी · हिन्दी</span></footer>
    </main>
  )
}
