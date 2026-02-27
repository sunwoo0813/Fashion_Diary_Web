import { logoutAction } from "@/actions/auth";
import { requireUser } from "@/lib/auth";

function readParam(value: string | string[] | undefined): string {
  if (!value) return "";
  if (Array.isArray(value)) return value[0] || "";
  return value;
}

type AccountPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const user = await requireUser();
  const email = user.email ?? "";
  const displayName = (email || "User").split("@")[0];
  const initials = (displayName.slice(0, 1) || "U").toUpperCase();
  const error = readParam(searchParams?.error).trim();
  const message = readParam(searchParams?.message).trim();

  return (
    <section className="account-page">
      <h1>Account</h1>
      <p className="account-subtitle">Manage profile and security preferences.</p>

      {error ? <p className="form-error">{error}</p> : null}
      {!error && message ? <p className="account-success">{message}</p> : null}

      <div className="account-grid">
        <article className="account-card profile">
          <div className="account-avatar">{initials}</div>
          <div>
            <p className="account-label">Signed in as</p>
            <p className="account-value">{email || "-"}</p>
          </div>
        </article>

        <article className="account-card">
          <h2>Profile</h2>
          <div className="account-row">
            <span>Email</span>
            <strong>{email || "-"}</strong>
          </div>
          <div className="account-row">
            <span>Display name</span>
            <strong>{displayName}</strong>
          </div>
        </article>

        <article className="account-card danger">
          <h2>Delete Account</h2>
          <p>
            This permanently deletes your items, outfits, photos, and auth account. Type{" "}
            <strong>DELETE</strong> to confirm.
          </p>
          <form action="/api/account/delete" method="post" className="account-danger-form">
            <label>
              Confirm text
              <input name="confirm" placeholder="DELETE" required />
            </label>
            <button type="submit" className="danger-button">
              Delete Account
            </button>
          </form>
        </article>
      </div>

      <div className="account-logout">
        <form action={logoutAction}>
          <button type="submit" className="ghost-button">
            Logout
          </button>
        </form>
      </div>
    </section>
  );
}
