import Gate from "@/components/Gate";
import MembersManager from "@/components/MembersManager";
import { getContext } from "@/lib/context";
import { planById } from "@/lib/plans";

export const metadata = { title: "회원 관리" };

export default async function MembersPage() {
  const { sb, sub } = await getContext();
  const { data } = await sb.from("members")
    .select("id,name,goal,profile,phone,total_sessions,left_sessions,caution,progress,consent_at")
    .eq("archived", false).order("created_at");
  const plan = planById(sub?.plan_id ?? "pro");
  return (
    <Gate>
      <MembersManager initial={data ?? []} limit={plan.limit} planName={plan.name} />
    </Gate>
  );
}
