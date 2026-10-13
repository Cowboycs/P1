import Gate from "@/components/Gate";
import Recorder from "@/components/Recorder";
import { getContext } from "@/lib/context";

export const metadata = { title: "수업 기록" };

export default async function RecordPage() {
  const { sb, trainer } = await getContext();
  const [{ data: members }, { data: exercises }, { data: tags }] = await Promise.all([
    sb.from("members").select("id,name,goal,profile,phone,left_sessions,total_sessions,caution").eq("archived", false).order("created_at"),
    sb.from("exercises").select("id,category,name,weight,reps,sets,timed,sort").order("category").order("sort"),
    sb.from("condition_tags").select("id,label,sort").order("sort"),
  ]);
  return (
    <Gate>
      <Recorder
        trainerName={trainer?.name || "담당"}
        initialMembers={members ?? []}
        initialExercises={exercises ?? []}
        initialTags={tags ?? []}
      />
    </Gate>
  );
}
