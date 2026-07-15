// Supabase-backed CRUD for saved/shared schedules. Client-side only — the
// `/s/[token]` public share page reads `schedules` directly via
// lib/supabase/server instead of going through here (RSC, no browser client).
import { createClient } from "@/lib/supabase/client";
import type { ScheduleCombination } from "@/types";
import type { Json } from "@/types/database";

export interface ScheduleRow {
  id: string;
  user_id: string;
  name: string | null;
  combination_data: ScheduleCombination;
  share_token: string;
  is_public: boolean;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

async function requireUserId(): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Not authenticated");
  return data.user.id;
}

export async function saveSchedule(params: {
  name: string;
  combination: ScheduleCombination;
  isFavorite?: boolean;
}): Promise<ScheduleRow> {
  const supabase = createClient();
  const user_id = await requireUserId();
  const { data, error } = await supabase
    .from("schedules")
    .insert({
      user_id,
      name: params.name,
      combination_data: params.combination as unknown as Json,
      is_favorite: params.isFavorite ?? false,
    })
    .select()
    .single();
  if (error) throw error;
  return data as unknown as ScheduleRow;
}

export async function listMySchedules(): Promise<ScheduleRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("schedules")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as ScheduleRow[];
}

export async function deleteSchedule(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("schedules").delete().eq("id", id);
  if (error) throw error;
}

export async function setFavorite(id: string, isFavorite: boolean): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("schedules")
    .update({ is_favorite: isFavorite })
    .eq("id", id);
  if (error) throw error;
}

// ponytail: not in the original spec, but the favorites list has a rename UI
// wired to it — added so "edit name" doesn't silently drop on refresh. Notes
// have no backing column (schema has none), so they stay UI-only.
export async function renameSchedule(id: string, name: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("schedules").update({ name }).eq("id", id);
  if (error) throw error;
}

export async function shareSchedule(id: string): Promise<{ url: string; shareToken: string }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("schedules")
    .update({ is_public: true })
    .eq("id", id)
    .select("share_token")
    .single();
  if (error) throw error;
  // share_token has a DB default and is never null in practice
  const token = data.share_token as string;
  return { url: `/s/${token}`, shareToken: token };
}

export async function unshareSchedule(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("schedules")
    .update({ is_public: false })
    .eq("id", id);
  if (error) throw error;
}
