import Link from "next/link";

const features = [
  {
    icon: "🔁",
    title: "Serverless",
    text: "Runs entirely on Vercel free tier. No server to manage.",
  },
  {
    icon: "🔒",
    title: "Secure",
    text: "SHA-256 hashed OTPs, attempt limiting, and 5 minute TTL expiry.",
  },
  {
    icon: "⚡",
    title: "Simple",
    text: "Two API endpoints. Drop-in for any app — React, Flutter, anything.",
  },
];

export default function LandingPage() {
  return (
    <main className="landingShell">
      <section className="landingHero fadeIn">
        <div className="heroTopRow">
          <div className="brandDot" aria-hidden="true" />
          <span className="heroBadge">Free & Open Source</span>
        </div>

        <h1>SMS OTP Service</h1>
        <p className="heroCopy">
          A lightweight self-hosted OTP microservice powered by Next.js, Upstash Redis and sms-gate.app
        </p>

        <div className="featureGrid">
          {features.map((feature) => (
            <article className="featureCard" key={feature.title}>
              <div className="featureIcon" aria-hidden="true">
                {feature.icon}
              </div>
              <h2>{feature.title}</h2>
              <p>{feature.text}</p>
            </article>
          ))}
        </div>

        <div className="ctaRow">
          <Link className="primaryCta" href="/demo">
            View Demo
          </Link>
          <a className="secondaryCta" href="https://github.com/Soah1312" target="_blank" rel="noreferrer">
            GitHub
          </a>
        </div>

        <footer className="heroFooter">Built by Soah · MIT License</footer>
      </section>
    </main>
  );
}
