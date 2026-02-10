import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getMyEmployeeProfile } from "@/lib/auth/roles";
import TasksWeeklyClient from "./tasks-weekly-client";

function monday(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

export default async function WeeklyTasksPage({
  searchParams,
}: {
  searchParams: { week_start?: string };
}) {
  const me = await getMyEmployeeProfile();
  if (!me) redirect("/login");

  const weekStart = searchParams.week_start ?? monday(new Date());
  const supabase = await createSupabaseServer();

  const { data: tasks } = await supabase
    .from("tasks")
    .select("id,name,category,base_points")
    .eq("is_active", true)
    .order("importance", { ascending: false, nullsFirst: false })
    .order("name");

  const { data: logs } = await supabase
    .from("task_logs")
    .select(`
      id,task_id,quantity,points,note,
      evidences(id,kind,value)
    `)
    .eq("employee_id", me.id)
    .eq("week_start", weekStart)
    .order("created_at", { ascending: false });

  return (
    <main style={{ padding: 24, maxWidth: 1040, margin: "0 auto" }}>
      <h1>週次業務実績</h1>
      <p style={{ color: "#556" }}>
        週ごとの業務実績（件数・ポイント・メモ）を登録します。証跡URLも紐付け可能です。
      </p>

      <TasksWeeklyClient meId={me.id} weekStart={weekStart} tasks={tasks ?? []} logs={logs ?? []} />
    </main>
  );
}