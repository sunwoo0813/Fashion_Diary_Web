import { MarketingLanding } from "@/components/landing/marketing-landing";
import { getCurrentUser } from "@/lib/auth";

export default async function LandingPage() {
  const user = await getCurrentUser();
  const diaryHref = user ? "/diary" : "/login";

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
