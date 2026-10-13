import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { supabaseServer } from "./supabase/server";
import type { Subscription } from "./subscription";

export type Trainer = { id: string; name: string; gym_name: string; phone: string; email: string | null };

/** 요청 1회당 한 번만 조회 */
export const getContext = cache(async () => {
  const sb = await supabaseServer();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) redirect("/login");
  const [{ data: trainer }, { data: sub }] = await Promise.all([
    sb.from("trainers").select("id,name,gym_name,phone,email").eq("id", auth.user.id).single(),
    sb.from("subscriptions").select("*").eq("trainer_id", auth.user.id).single(),
  ]);
  return { sb, user: auth.user, trainer: trainer as Trainer | null, sub: sub as Subscription | null };
});
