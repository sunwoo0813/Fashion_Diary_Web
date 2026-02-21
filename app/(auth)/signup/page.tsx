import Link from "next/link";
import { redirect } from "next/navigation";

import { signupAction } from "@/actions/auth";
import { getCurrentUser } from "@/lib/auth";

function readQueryValue(value: string | string[] | undefined): string {
  if (!value) return "";
  if (Array.isArray(value)) return value[0] || "";
  return value;
}

export default async function SignupPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const user = await getCurrentUser();
  if (user) {
    redirect("/dashboard");
  }

  const error = readQueryValue(searchParams?.error);

  return (
    <main className="page">
      <h1>Signup</h1>
      <p>Create a Supabase account.</p>

      {error ? (
        <p
          style={{
            marginTop: "1rem",
            padding: "0.75rem",
            border: "1px solid #f2c2b2",
            background: "#fff1ec",
            borderRadius: "10px",
            color: "#8e2d11",
          }}
        >
          {error}
        </p>
      ) : null}

      <form action={signupAction} style={{ marginTop: "1rem", maxWidth: "420px", display: "grid", gap: "0.75rem" }}>
        <label style={{ display: "grid", gap: "0.3rem" }}>
          <span>Email</span>
          <input
            type="email"
            name="email"
            required
            placeholder="name@example.com"
            style={{ padding: "0.65rem 0.7rem", border: "1px solid var(--line)", borderRadius: "10px" }}
          />
        </label>
        <label style={{ display: "grid", gap: "0.3rem" }}>
          <span>Password</span>
          <input
            type="password"
            name="password"
            required
            placeholder="Create a password"
            style={{ padding: "0.65rem 0.7rem", border: "1px solid var(--line)", borderRadius: "10px" }}
          />
        </label>
        <label style={{ display: "grid", gap: "0.3rem" }}>
          <span>Confirm Password</span>
          <input
            type="password"
            name="confirm_password"
            placeholder="Confirm password"
            style={{ padding: "0.65rem 0.7rem", border: "1px solid var(--line)", borderRadius: "10px" }}
          />
        </label>
        <button
          type="submit"
          style={{
            padding: "0.7rem 0.9rem",
            borderRadius: "10px",
            border: "1px solid #8a4f33",
            background: "var(--accent)",
            color: "white",
            cursor: "pointer",
          }}
        >
          Sign Up
        </button>
      </form>

      <p style={{ marginTop: "1rem", color: "var(--muted)" }}>
        Already registered? <Link href="/login">Log in</Link>
      </p>
    </main>
  );
}
