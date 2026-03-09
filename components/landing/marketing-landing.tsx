"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  ArrowRightIcon,
  DashboardIcon,
  DiaryIcon,
  StatsIcon,
  WardrobeIcon,
} from "@/components/common/icons";

type MarketingLandingProps = {
  isAuthenticated: boolean;
  loginHref: string;
  signupHref: string;
  dashboardHref: string;
  diaryHref: string;
};

const NAV_ITEMS = [
  { label: "Preview", href: "#preview" },
  { label: "Flow", href: "#capabilities" },
  { label: "Start", href: "#top" },
];

const CAPABILITY_ITEMS = [
  {
    icon: WardrobeIcon,
    title: "Closet Archive",
    copy: "Search your wardrobe by item, category, size, and wear count.",
  },
  {
    icon: DiaryIcon,
    title: "Diary by Date",
    copy: "Keep daily looks linked to notes, photos, and tagged wardrobe pieces.",
  },
  {
    icon: StatsIcon,
    title: "Wear Analytics",
    copy: "See what you actually wear, revisit patterns, and refine your rotation.",
  },
  {
    icon: DashboardIcon,
    title: "Daily Overview",
    copy: "A clear summary of weather, recent looks, and wardrobe activity.",
  },
];

const FEATURE_ITEMS = [
  {
    title: "Remember the full look",
    copy:
      "Photos, weather, and tagged pieces stay together so each outfit keeps its context.",
  },
  {
    title: "Spot repeat pieces faster",
    copy:
      "Wear history makes staples and gaps easier to notice without digging through old entries.",
  },
];

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="m6 6 12 12" />
      <path d="m18 6-12 12" />
    </svg>
  );
}

function ChevronRightSmallIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

export function MarketingLanding({
  isAuthenticated,
  loginHref,
  signupHref,
  dashboardHref,
  diaryHref,
}: MarketingLandingProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setIsScrolled(window.scrollY > 28);
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const headerPrimaryHref = isAuthenticated ? dashboardHref : signupHref;
  const headerPrimaryLabel = isAuthenticated ? "Dashboard" : "Sign Up";
  const headerSecondaryHref = isAuthenticated ? diaryHref : loginHref;
  const headerSecondaryLabel = isAuthenticated ? "Open Diary" : "Log In";
  const heroPrimaryHref = isAuthenticated ? dashboardHref : signupHref;
  const heroPrimaryLabel = isAuthenticated ? "Go to Dashboard" : "Start Logging";
  const heroSecondaryHref = isAuthenticated ? diaryHref : "#preview";
  const heroSecondaryLabel = isAuthenticated ? "Open Diary" : "Explore Preview";

  return (
    <div className="marketing-page">
      <div className="marketing-ambient" aria-hidden>
        <span className="marketing-beam marketing-beam-left" />
        <span className="marketing-beam marketing-beam-right" />
        <span className="marketing-grid-glow" />
      </div>

      <header
        className={`marketing-header${isScrolled ? " is-scrolled" : ""}${menuOpen ? " is-open" : ""}`}
      >
        <div className="marketing-nav-shell">
          <div className="marketing-nav-bar">
            <Link href="/" aria-label="LAYERED home" className="marketing-brand">
              <span className="marketing-brand-mark">LY</span>
              <span className="marketing-brand-copy">
                <strong>LAYERED</strong>
                <small>Daily Styling Log</small>
              </span>
            </Link>

            <nav className="marketing-nav-links" aria-label="Primary">
              {NAV_ITEMS.map((item) => (
                <Link key={item.label} href={item.href} className="marketing-nav-link">
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="marketing-nav-actions">
              <Link href={headerSecondaryHref} className="ghost-button">
                {headerSecondaryLabel}
              </Link>
              <Link href={headerPrimaryHref} className="solid-button">
                {headerPrimaryLabel}
              </Link>
            </div>

            <button
              type="button"
              className="marketing-menu-toggle"
              aria-expanded={menuOpen}
              aria-controls="marketing-mobile-nav"
              aria-label={menuOpen ? "Close navigation" : "Open navigation"}
              onClick={() => setMenuOpen((current) => !current)}
            >
              {menuOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>

          <div id="marketing-mobile-nav" className="marketing-mobile-panel">
            <nav className="marketing-mobile-links" aria-label="Mobile">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="marketing-mobile-link"
                  onClick={() => setMenuOpen(false)}
                >
                  <span>{item.label}</span>
                  <ChevronRightSmallIcon />
                </Link>
              ))}
            </nav>
            <div className="marketing-mobile-actions">
              <Link href={headerSecondaryHref} className="ghost-button" onClick={() => setMenuOpen(false)}>
                {headerSecondaryLabel}
              </Link>
              <Link href={headerPrimaryHref} className="solid-button" onClick={() => setMenuOpen(false)}>
                {headerPrimaryLabel}
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="marketing-main">
        <section id="top" className="marketing-hero">
          <div className="marketing-copy">
            <Link href="#features" className="marketing-announcement">
              <span className="marketing-announcement-label">Personal wardrobe archive</span>
              <span className="marketing-announcement-divider" />
              <span className="marketing-announcement-text">Keep outfits, weather, and pieces in one place</span>
              <span className="marketing-announcement-icon">
                <ArrowRightIcon size={14} />
              </span>
            </Link>

            <h1>Keep a clear record of what you wore.</h1>
            <p>
              Log daily outfits, connect the pieces you wore, and save the weather beside each
              look. It stays simple enough for daily use and useful enough to revisit later.
            </p>

            <div className="marketing-hero-actions">
              <Link href={heroPrimaryHref} className="solid-button marketing-hero-primary">
                {heroPrimaryLabel}
              </Link>
              <Link href={heroSecondaryHref} className="ghost-button marketing-hero-secondary">
                {heroSecondaryLabel}
              </Link>
            </div>

            <ul className="marketing-proof-list" aria-label="Core strengths">
              <li>Outfits saved by date</li>
              <li>Tagged wardrobe pieces</li>
              <li>Weather kept with each look</li>
            </ul>
          </div>

          <div id="preview" className="marketing-showcase">
            <article className="marketing-floating-card marketing-floating-card-top">
              <span className="marketing-floating-kicker">Daily Note</span>
              <strong>Mar 07 | City layers, light rain</strong>
              <p>Photo, weather, and item tags stored in one diary entry.</p>
            </article>

            <div className="marketing-device">
              <div className="marketing-device-topbar">
                <div className="marketing-device-dots" aria-hidden>
                  <span />
                  <span />
                  <span />
                </div>
                <div className="marketing-device-pills">
                  <span>Diary view</span>
                  <span>Closet linked</span>
                </div>
              </div>

              <div className="marketing-device-body">
                <section className="marketing-preview-primary">
                  <div className="marketing-preview-heading">
                    <p>March 07 Diary</p>
                    <strong>One outfit entry with the photo, weather, and tagged pieces together</strong>
                  </div>

                  <div className="marketing-outfit-stage">
                    <div className="marketing-stage-halo" aria-hidden />
                    <div className="marketing-shot-frame">
                      <div className="marketing-shot-photo" aria-hidden />
                      <div className="marketing-shot-meta">
                        <span>16C</span>
                        <span>Light rain</span>
                        <span>Seoul</span>
                      </div>
                    </div>

                    <div className="marketing-look-summary">
                      <p className="marketing-look-label">Tagged pieces</p>
                      <div className="marketing-look-tags">
                        <span>Black coat</span>
                        <span>Ivory knit</span>
                        <span>Wide denim</span>
                        <span>Leather loafer</span>
                      </div>
                      <div className="marketing-look-note">
                        Easy commute look. Warm enough indoors, light layer for drizzle.
                      </div>
                    </div>
                  </div>

                  <div className="marketing-stat-row">
                    <article>
                      <strong>73</strong>
                      <span>Looks archived</span>
                    </article>
                    <article>
                      <strong>12</strong>
                      <span>Core staples tracked</span>
                    </article>
                  </div>
                </section>

                <aside className="marketing-preview-column">
                  <article className="marketing-preview-card">
                    <p className="marketing-preview-kicker">Closet Balance</p>
                    <ul className="marketing-progress-list">
                      <li>
                        <span>Outerwear</span>
                        <div>
                          <em style={{ width: "68%" }} />
                        </div>
                      </li>
                      <li>
                        <span>Knitwear</span>
                        <div>
                          <em style={{ width: "84%" }} />
                        </div>
                      </li>
                      <li>
                        <span>Bottoms</span>
                        <div>
                          <em style={{ width: "72%" }} />
                        </div>
                      </li>
                    </ul>
                  </article>

                  <article className="marketing-preview-card">
                    <p className="marketing-preview-kicker">Recent Entries</p>
                    <div className="marketing-preview-entry">
                      <span>Mar 04</span>
                      <strong>Rain-ready layers saved with tagged loafers</strong>
                    </div>
                    <div className="marketing-preview-entry">
                      <span>Mar 02</span>
                      <strong>Office knit logged with temperature notes</strong>
                    </div>
                  </article>
                </aside>
              </div>
            </div>
          </div>
        </section>

        <section id="capabilities" className="marketing-capability-section">
          <div className="marketing-section-heading">
            <p>Flow</p>
            <h2>A simple loop for logging, linking, and revisiting outfits.</h2>
            <span>Start with the outfit, connect the pieces, and return later with the context still attached.</span>
          </div>

          <div className="marketing-capability-grid">
            {CAPABILITY_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.title} className="marketing-capability-card">
                  <div className="marketing-capability-icon">
                    <Icon size={18} />
                  </div>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.copy}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section id="features" className="marketing-editorial-section" aria-label="Feature highlights">
          <article className="marketing-editorial-lead">
            <p className="marketing-feature-label">Why it helps</p>
            <h2>A lighter way to keep your wardrobe and outfit history connected.</h2>
            <p className="marketing-editorial-copy">
              Instead of treating your closet and diary as separate tools, this keeps them close
              enough to feel like one record.
            </p>
            <div className="marketing-editorial-panel">
              <div className="marketing-editorial-photo" aria-hidden />
              <div className="marketing-editorial-text">
                <span>One record</span>
                <strong>Photos, notes, weather, and tagged items stay together.</strong>
              </div>
            </div>
          </article>

          <div className="marketing-feature-grid">
            {FEATURE_ITEMS.map((item) => (
              <article key={item.title} className="marketing-feature-card">
                <p className="marketing-feature-label">Feature</p>
                <h3>{item.title}</h3>
                <p>{item.copy}</p>
                <Link href={heroPrimaryHref} className="marketing-feature-link">
                  <span>{isAuthenticated ? "Open workspace" : "Start your archive"}</span>
                  <ChevronRightSmallIcon />
                </Link>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
