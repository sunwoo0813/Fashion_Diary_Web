import Link from "next/link";

import { requireUser } from "@/lib/auth";

const quickActions = [
  {
    href: "/outfits/new",
    title: "Record Today's Outfit",
    text: "Create a new entry with photos and weather details.",
  },
  {
    href: "/wardrobe/new",
    title: "Add a Closet Item",
    text: "Save a piece and categorize it for future outfit tagging.",
  },
  {
    href: "/stats",
    title: "Check Insights",
    text: "Review monthly logs, wear patterns, and weather distribution.",
  },
];

const workflow = [
  {
    step: "1",
    title: "Log Daily Outfit",
    text: "Create one date entry and attach one or more photos.",
  },
  {
    step: "2",
    title: "Tag Closet Items",
    text: "Connect worn items to each photo for better wear analytics.",
  },
  {
    step: "3",
    title: "Review Trends",
    text: "Use stats to decide what to repeat, rotate, or retire.",
  },
];

export default async function DashboardPage() {
  const user = await requireUser();
  const displayName = (user.email || "User").split("@")[0];

  return (
    <section className="dashboard-page">
      <header className="dashboard-hero">
        <p className="dashboard-kicker">Dashboard</p>
        <h1>{displayName}, your style system is ready.</h1>
        <p>
          Use this hub to jump into diary logging, closet management, and weekly pattern review.
        </p>
      </header>

      <div className="dashboard-grid">
        {quickActions.map((card) => (
          <article key={card.href} className="dash-card">
            <h2>{card.title}</h2>
            <p>{card.text}</p>
            <Link href={card.href} className="ghost-button">
              Open
            </Link>
          </article>
        ))}
      </div>

      <section className="dashboard-workflow" aria-label="Recommended workflow">
        <h2>Recommended Daily Loop</h2>
        <div className="workflow-grid">
          {workflow.map((item) => (
            <article key={item.step} className="workflow-card">
              <span>{item.step}</span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="dashboard-quick-links" aria-label="Quick navigation">
        <Link href="/diary" className="quick-link">
          Go to Diary
        </Link>
        <Link href="/wardrobe" className="quick-link">
          Open Wardrobe
        </Link>
        <Link href="/account" className="quick-link">
          Account Settings
        </Link>
      </section>
    </section>
  );
}
