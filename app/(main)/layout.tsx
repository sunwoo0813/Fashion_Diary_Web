import { AppRail } from "@/components/common/app-rail";
import { requireUser } from "@/lib/auth";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const displayName = (user.email || "사용자").split("@")[0];
  const initials = (displayName.slice(0, 2) || "사").toUpperCase();

  return (
    <div className="app-shell">
      <AppRail displayName={displayName} email={user.email ?? "-"} initials={initials} />
      <main className="app-main">{children}</main>
    </div>
  );
}
