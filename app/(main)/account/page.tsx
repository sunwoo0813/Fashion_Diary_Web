import { DarkModeToggle } from "@/components/common/dark-mode-toggle";
import { LogoutImageButton } from "@/components/common/logout-image-button";
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
  const displayName = (email || "사용자").split("@")[0];
  const initials = (displayName.slice(0, 1) || "유").toUpperCase();
  const error = readParam(searchParams?.error).trim();
  const message = readParam(searchParams?.message).trim();

  return (
    <section className="account-page">
      <h1>계정</h1>
      <p className="account-subtitle">프로필과 보안 설정을 관리하세요.</p>

      {error ? <p className="form-error">{error}</p> : null}
      {!error && message ? <p className="account-success">{message}</p> : null}

      <div className="account-grid">
        <article className="account-card profile">
          <div className="account-avatar">{initials}</div>
          <div>
            <p className="account-label">로그인 계정</p>
            <p className="account-value">{email || "-"}</p>
          </div>
        </article>

        <article className="account-card">
          <h2>프로필</h2>
          <div className="account-row">
            <span>이메일</span>
            <strong>{email || "-"}</strong>
          </div>
          <div className="account-row">
            <span>표시 이름</span>
            <strong>{displayName}</strong>
          </div>
        </article>

        <article className="account-card danger">
          <h2>계정 삭제</h2>
          <p>
            아이템 데이터, 사진, 일정 계정이 모두 영구 삭제됩니다. 확인을 위해 <strong>DELETE</strong>를 입력하세요.
          </p>
          <form action="/api/account/delete" method="post" className="account-danger-form">
            <label>
              확인 문구
              <input name="confirm" placeholder="DELETE" required />
            </label>
            <button type="submit" className="danger-button">
              계정 삭제
            </button>
          </form>
        </article>
      </div>

      <div className="account-logout">
        <div className="account-theme-toggle">
          <DarkModeToggle />
        </div>
        <div className="account-logout-button">
          <LogoutImageButton />
        </div>
      </div>
    </section>
  );
}
