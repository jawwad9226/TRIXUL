import Link from "next/link"

const highlights = [
  { icon: "↗", title: "Get around", detail: "Bus routes and live locations" },
  { icon: "⌖", title: "Find what you need", detail: "Places and public services" },
  { icon: "▤", title: "Stay informed", detail: "Useful updates from your city" },
]

export default function HomePage() {
  return (
    <main className="welcome-page">
      <header className="topbar welcome-topbar">
        <Link className="brand" href="/" aria-label="Swayam Yatri home">
          <span className="brand-mark">s</span>
          <span>Swayam Yatri</span>
        </Link>
        <Link className="quiet-link" href="/login">Sign in</Link>
      </header>

      <section className="welcome-hero">
        <div className="hero-copy">
          <span className="eyebrow"><span className="eyebrow-dot" /> YOUR CITY, CONNECTED</span>
          <h1>Everyday city<br />life, <em>made easier.</em></h1>
          <p>Find your bus, explore nearby places, and get to know the services around you — all in one simple place.</p>
          <div className="hero-actions">
            <Link className="button button-primary button-large" href="/dashboard">
              Explore routes <span aria-hidden="true">→</span>
            </Link>
          </div>
          <div className="guest-note"><span aria-hidden="true">✓</span> Schedules and bus information are public</div>
        </div>
        <div className="hero-art" aria-label="Illustration of connected city destinations">
          <div className="art-sun" />
          <div className="art-path art-path-one" />
          <div className="art-path art-path-two" />
          <div className="art-pin pin-one"><span>✦</span></div>
          <div className="art-pin pin-two"><span>⌂</span></div>
          <div className="art-pin pin-three"><span>↗</span></div>
          <div className="art-card art-card-top"><span className="art-card-icon">⌖</span><span><b>Nearby bus stop</b><small>Public transport</small></span></div>
          <div className="art-card art-card-bottom"><span className="live-dot" /><span><b>Your city, at a glance</b><small>Places · Routes · Services</small></span></div>
          <div className="art-hill hill-back" />
          <div className="art-hill hill-front" />
        </div>
      </section>

      <section className="welcome-highlights" aria-label="What you can do">
        {highlights.map((item) => (
          <article className="highlight-item" key={item.title}>
            <span className="highlight-icon">{item.icon}</span>
            <span><b>{item.title}</b><small>{item.detail}</small></span>
            <span className="highlight-arrow" aria-hidden="true">↗</span>
          </article>
        ))}
      </section>
      <footer className="welcome-footer"><span>MADE FOR EVERYDAY JOURNEYS</span><span>English · मराठी · हिन्दी</span></footer>
    </main>
  )
}
