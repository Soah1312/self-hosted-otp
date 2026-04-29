"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

function ServerlessIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}

function SecureIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function SimpleIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function GithubIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
    </svg>
  );
}

const features = [
  {
    icon: <ServerlessIcon />,
    title: "Serverless",
    text: "Runs entirely on Vercel free tier. No server to manage.",
    accent: "sage",
  },
  {
    icon: <SecureIcon />,
    title: "Secure",
    text: "SHA-256 hashed OTPs, attempt limiting, and 5 minute TTL expiry.",
    accent: "lavender",
  },
  {
    icon: <SimpleIcon />,
    title: "Simple",
    text: "Two API endpoints. Drop-in for any app — React, Flutter, anything.",
    accent: "coral",
  },
];

export default function LandingPage() {
  const sectionsRef = useRef<HTMLElement[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("lpRevealed");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    sectionsRef.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  function addRef(el: HTMLElement | null) {
    if (el && !sectionsRef.current.includes(el)) {
      sectionsRef.current.push(el);
    }
  }

  return (
    <>
      {/* ── Grain overlay ── */}
      <div className="lpGrain" aria-hidden="true" />

      {/* ── Floating nav ── */}
      <nav className="lpNav">
        <div className="lpNavInner">
          <div className="lpNavLeft">
            <span className="lpNavLogo" aria-hidden="true">
              <span className="lpNavLogoDot" />
            </span>
            <span className="lpNavBrand">SMS-Verify</span>
          </div>
          <div className="lpNavRight">
            <Link href="/demo" className="lpNavDemoLink">View Demo</Link>
            <Link href="/register" className="lpNavDemoLink">Get API Key →</Link>
            <a
              className="lpNavDemoPill"
              href="https://github.com/Soah1312/self-hosted-otp"
              target="_blank"
              rel="noreferrer"
            >
              GitHub
            </a>
          </div>
        </div>
      </nav>

      <main className="lpShell">
        {/* ── Hero ── */}
        <section className="lpHero lpReveal" ref={addRef}>
          {/* Background blobs */}
          <div className="lpBlobA" aria-hidden="true" />
          <div className="lpBlobB" aria-hidden="true" />

          <h1 className="lpHeadline">
            Verify your users,
            <br />
            <span className="lpCursive">instantly</span>
          </h1>

          <p className="lpSubtext">
            A lightweight self-hosted OTP microservice powered by Next.js, Upstash Redis and sms-gate.app
          </p>

          <div className="lpCtaRow">
            <Link className="lpCtaPrimary" href="/register">
              Get API Key
            </Link>
            <Link className="lpCtaSecondary" href="/demo">
              View Demo
            </Link>
          </div>
        </section>

        {/* ── Feature Cards ── */}
        <section className="lpFeatures lpReveal" ref={addRef}>
          <div className="lpFeaturesTrack">
            {features.map((feature) => (
              <article className="lpCard" key={feature.title}>
                <div
                  className={`lpCardIcon lpCardIcon--${feature.accent}`}
                  aria-hidden="true"
                >
                  {feature.icon}
                </div>
                <h2 className="lpCardTitle">{feature.title}</h2>
                <p className="lpCardText">{feature.text}</p>
              </article>
            ))}
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="lpFooter lpReveal" ref={addRef}>
          <span className="lpFooterText">Built by Soah</span>
          <a
            className="lpFooterGh"
            href="https://github.com/Soah1312/self-hosted-otp"
            target="_blank"
            rel="noreferrer"
            style={{ gap: '8px' }}
          >
            <GithubIcon />
            Star this Repo
          </a>
        </footer>
      </main>
    </>
  );
}
