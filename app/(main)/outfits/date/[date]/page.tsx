import { redirect } from "next/navigation";

export default function OutfitsByDateRedirectPage({
  params,
}: {
  params: { date: string };
}) {
  redirect(`/diary/${params.date}`);
}
