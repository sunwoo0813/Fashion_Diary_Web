import Link from "next/link";
import { redirect } from "next/navigation";

import { loginAction, signupAction } from "@/actions/auth";
import { getCurrentUser } from "@/lib/auth";

function readQueryValue(value: string | string[] | undefined): string {
  if (!value) return "";
  if (Array.isArray(value)) return value[0] || "";
  return value;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const user = await getCurrentUser();
  if (user) {
    redirect("/dashboard");
  }

  const error = readQueryValue(searchParams?.error);
  const message = readQueryValue(searchParams?.message);
  const mode = readQueryValue(searchParams?.mode) === "signup" ? "signup" : "login";
  const isSignup = mode === "signup";

  return (
    <main className="auth-page login-page">
      <section className="auth-card auth-card-login">
        {error ? <p className="auth-notice is-error">{error}</p> : null}
        {!error && message ? <p className="auth-notice is-success">{message}</p> : null}

        <h1 className="auth-brand-title">FASHION DIARY</h1>

        {isSignup ? (
          <form action={signupAction} className="auth-form">
            <label className="auth-field">
              <input type="email" name="email" required placeholder=" " />
              <span className="auth-field-label">Email</span>
              <span className="auth-field-status" aria-hidden="true">
                <svg viewBox="0 0 16 16" fill="none">
                  <path d="M3.5 8.5 6.5 11.5 12.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </label>
            <label className="auth-field">
              <input type="password" name="password" required minLength={8} placeholder=" " />
              <span className="auth-field-label">Password</span>
              <span className="auth-field-status" aria-hidden="true">
                <svg viewBox="0 0 16 16" fill="none">
                  <path d="M3.5 8.5 6.5 11.5 12.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </label>
            <label className="auth-field">
              <input type="text" name="nickname" placeholder=" " />
              <span className="auth-field-label">Name (Nickname)</span>
              <span className="auth-field-status" aria-hidden="true">
                <svg viewBox="0 0 16 16" fill="none">
                  <path d="M3.5 8.5 6.5 11.5 12.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </label>
            <label className="auth-field">
              <input type="password" name="confirm_password" minLength={8} placeholder=" " />
              <span className="auth-field-label">Confirm Password</span>
              <span className="auth-field-status" aria-hidden="true">
                <svg viewBox="0 0 16 16" fill="none">
                  <path d="M3.5 8.5 6.5 11.5 12.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </label>
            <button type="submit" className="solid-button auth-submit">
              Sign Up
            </button>
          </form>
        ) : (
          <form action={loginAction} className="auth-form">
            <label className="auth-field">
              <input type="email" name="email" required placeholder=" " />
              <span className="auth-field-label">Email</span>
              <span className="auth-field-status" aria-hidden="true">
                <svg viewBox="0 0 16 16" fill="none">
                  <path d="M3.5 8.5 6.5 11.5 12.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </label>
            <label className="auth-field">
              <input type="password" name="password" required placeholder=" " />
              <span className="auth-field-label">Password</span>
              <span className="auth-field-status" aria-hidden="true">
                <svg viewBox="0 0 16 16" fill="none">
                  <path d="M3.5 8.5 6.5 11.5 12.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </label>
            <button type="submit" className="solid-button auth-submit">
              Log In
            </button>
          </form>
        )}

        <nav className={`auth-mode-toggle${isSignup ? " is-signup" : ""}`} aria-label="Authentication mode">
          <Link href="/login" className={`auth-mode-pill${isSignup ? "" : " is-active"}`}>
            Login
          </Link>
          <Link href="/login?mode=signup" className={`auth-mode-pill${isSignup ? " is-active" : ""}`}>
            Sign Up
          </Link>
        </nav>
      </section>
    </main>
  );
}
