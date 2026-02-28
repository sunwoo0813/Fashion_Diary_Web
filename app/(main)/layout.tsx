import { MainNav } from "@/components/common/main-nav";
import { DarkModeToggle } from "@/components/common/dark-mode-toggle";
import { LogoutImageButton } from "@/components/common/logout-image-button";
import { requireUser } from "@/lib/auth";
import Link from "next/link";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const displayName = (user.email || "User").split("@")[0];
  const initials = (displayName.slice(0, 2) || "U").toUpperCase();

  return (
    <div className="app-shell">
      <aside className="app-rail">
        <div className="brand-lockup" aria-label="Fashion Diary logo">
          <div className="brand-logo" aria-hidden>
            FD
          </div>
          <div className="brand-text">
            <p className="brand-kicker">Fashion Diary</p>
            <h2 className="brand-title">Wardrobe OS</h2>
          </div>
        </div>
        <MainNav />

        <div className="topbar-right">
          <Link href="/account" className="topbar-profile-link" aria-label="Open profile">
            <div className="rail-user">
              <div className="rail-avatar" aria-hidden>
                {initials}
              </div>
              <div className="rail-user-meta">
                <p className="rail-user-name">{displayName}</p>
                <p className="rail-user-email">{user.email ?? "-"}</p>
              </div>
            </div>
          </Link>
          <DarkModeToggle />
        </div>
        <LogoutImageButton />
      </aside>
      <main className="app-main">{children}</main>
    </div>
  );
}
