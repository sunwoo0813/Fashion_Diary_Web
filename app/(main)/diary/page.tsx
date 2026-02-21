import { redirect } from "next/navigation";

export default function DiaryRootPage() {
  const today = new Date();
  const iso = today.toISOString().slice(0, 10);
  redirect(`/diary/${iso}`);
}
