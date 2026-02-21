import { logoutAction } from "@/actions/auth";
import { MainNav } from "@/components/common/main-nav";
import { requireUser } from "@/lib/auth";

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
        <div className="rail-brand">
          <p className="rail-kicker">Fashion Diary</p>
          <h2 className="app-rail-title">Wardrobe OS</h2>
        </div>
        <div className="rail-user">
          <div className="rail-avatar" aria-hidden>
            {initials}
          </div>
          <div className="rail-user-meta">
            <p className="rail-user-name">{displayName}</p>
            <p className="rail-user-email">{user.email ?? "-"}</p>
          </div>
        </div>

        <MainNav />
        <form action={logoutAction} style={{ marginTop: "1rem" }}>
          <button
            type="submit"
            className="ghost-button"
            style={{ width: "100%" }}
          >
            Logout
          </button>
        </form>
      </aside>
      <main className="app-main">{children}</main>
    </div>
  );
}
