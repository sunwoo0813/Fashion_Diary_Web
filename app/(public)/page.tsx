import Link from "next/link";

import { getCurrentUser } from "@/lib/auth";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default async function LandingPage() {
  const user = await getCurrentUser();
  const ctaHref = user ? "/dashboard" : "/login";
  const ctaLabel = user ? "Open Dashboard" : "Log In";
  const diaryHref = user ? `/diary/${todayIso()}` : "/login";

  return (
    <main className="landing-page">
      <header className="landing-topbar">
        <p className="landing-brand">LAYERED</p>
        <div className="landing-top-actions">
          <Link href="https://size-picker.vercel.app/" className="ghost-button landing-size-picker-button">
            Size Picker
          </Link>
          <Link href={ctaHref} className="ghost-button">
            {ctaLabel}
          </Link>
          {!user ? (
            <Link href="/signup" className="solid-button">
              Sign Up
            </Link>
          ) : null}
        </div>
      </header>

      <section className="landing-hero">
        <p className="landing-kicker">Daily Styling Log</p>
        <h1>Track outfits, closet pieces, and weather in one place.</h1>
        <p>
          Keep your real wardrobe history. Save looks by date, attach photos, and learn what you
          actually wear most.
        </p>
        <div className="landing-hero-actions">
          <Link href={ctaHref} className="solid-button">
            {user ? "Go to Dashboard" : "Start Logging"}
          </Link>
          <Link href={diaryHref} className="ghost-button">
            {user ? "Open Diary" : "See Demo Flow"}
          </Link>
        </div>
      </section>

      <section className="landing-grid" aria-label="Feature highlights">
        <article className="landing-card">
          <h2>Diary by Date</h2>
          <p>Navigate day by day and store weather context with each outfit entry.</p>
        </article>
        <article className="landing-card">
          <h2>Closet Search</h2>
          <p>Filter items by category, track usage, and surface frequently worn pieces.</p>
        </article>
        <article className="landing-card">
          <h2>Stats View</h2>
          <p>Review monthly outfit history, temperature bands, and category balance.</p>
        </article>
      </section>
    </main>
  );
}
