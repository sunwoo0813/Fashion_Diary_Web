import { AppRail } from "@/components/common/app-rail";
import { requireUser } from "@/lib/auth";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();

  return (
    <div className="app-shell">
      <AppRail />
      <main className="app-main">{children}</main>
    </div>
  );
}
