import Gate from "@/components/Gate";
import LibraryManager from "@/components/LibraryManager";
import { getContext } from "@/lib/context";

export const metadata = { title: "종목·컨디션 관리" };

export default async function LibraryPage() {
  const { sb } = await getContext();
  const [{ data: ex }, { data: tags }] = await Promise.all([
    sb.from("exercises").select("id,category,name,weight,reps,sets,timed,sort").order("category").order("sort"),
    sb.from("condition_tags").select("id,label,sort").order("sort"),
  ]);
  return <Gate><LibraryManager initialEx={ex ?? []} initialTags={tags ?? []} /></Gate>;
}
