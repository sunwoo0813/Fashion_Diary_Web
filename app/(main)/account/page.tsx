import { PreferredRegionForm } from "@/components/account/preferred-region-form";
import { ConfirmSubmitButton } from "@/components/common/confirm-submit-button";
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
  const error = readParam(searchParams?.error).trim();
  const message = readParam(searchParams?.message).trim();

  return (
    <section className="account-page">
      <h1>설정</h1>

      {error ? <p className="form-error">{error}</p> : null}
      {!error && message ? <p className="account-success">{message}</p> : null}

      <div className="account-sections">
        <div className="account-section">
          <h2 className="account-section-title">계정</h2>
          <div className="account-row">
            <span>이메일</span>
            <strong>{email || "-"}</strong>
          </div>
          <div className="account-row">
            <span>표시 이름</span>
            <strong>{displayName}</strong>
          </div>
        </div>

        <div className="account-section">
          <PreferredRegionForm />
        </div>

        <div className="account-section">
          <h2 className="account-section-title">로그아웃</h2>
          <p className="account-section-desc">현재 세션을 종료하고 로그인 화면으로 돌아갑니다.</p>
          <LogoutImageButton />
        </div>

        <div className="account-section is-danger">
          <h2 className="account-section-title">계정 삭제</h2>
          <p className="account-section-desc">
            옷장 아이템, 코디 사진, 기록 데이터, 계정 정보가 모두 영구 삭제됩니다. 확인을 위해{" "}
            <strong>DELETE</strong>를 입력해 주세요.
          </p>
          <form id="account-delete-form" action="/api/account/delete" method="post" className="account-danger-form">
            <label>
              확인 문구
              <input name="confirm" placeholder="DELETE" required />
            </label>
            <ConfirmSubmitButton
              formId="account-delete-form"
              className="danger-button"
              kicker="계정 삭제 확인"
              title="계정을 삭제할까요?"
              message="삭제 후에는 옷장, 코디, 계정 정보를 복구할 수 없습니다."
              confirmLabel="계정 삭제"
            >
              계정 삭제
            </ConfirmSubmitButton>
          </form>
        </div>
      </div>
    </section>
  );
}
