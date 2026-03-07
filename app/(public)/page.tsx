import { MarketingLanding } from "@/components/landing/marketing-landing";
import { getCurrentUser } from "@/lib/auth";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default async function LandingPage() {
  const user = await getCurrentUser();
  const diaryHref = user ? `/diary/${todayIso()}` : "/login";

  return (
    <MarketingLanding
      isAuthenticated={Boolean(user)}
      loginHref="/login"
      signupHref="/signup"
      dashboardHref="/dashboard"
      diaryHref={diaryHref}
    />
  );
}
