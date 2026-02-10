import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getMyEmployeeProfile, requireRole } from "@/lib/auth/roles";
import WeeklyTasksClient from "./tasks-weekly-client";

export default async function WeeklyTasksPage() {
  const me = await getMyEmployeeProfile();
  if (!me) redirect("/login");
  if (!requireRole(me, ["employee"])) redirect("/dashboard");

  const supabase = createSupabaseServer();

  const { data: tasks } = await supabase.from("tasks").select("id,name").order("name");

  const { data: logs } = await supabase
    .from("weekly_task_logs")
    .select("id,week_start,quantity,points,note,tasks:task_id(name)")
    .eq("employee_id", me.id)
    .order("week_start", { ascending: false })
    .limit(30);

  return (
    <main style={{ minHeight: "100vh", background: "#f5f8ff", padding: 24 }}>
      <section style={{ maxWidth: 980, margin: "0 auto" }}>
        <header
          style={{
            background: "linear-gradient(110deg, #0f766e, #0ea5a2)",
            color: "#fff",
            borderRadius: 14,
            padding: 18,
          }}
        >
          <h1 style={{ margin: 0, fontSize: 26 }}>週次実績</h1>
          <p style={{ margin: "6px 0 0", opacity: 0.95 }}>
            {me.name} さんの週次業務実績を入力・確認できます。
          </p>
        </header>

        <section style={{ marginTop: 14 }}>
          <Link href="/dashboard">← ダッシュボードへ戻る</Link>
        </section>

        <section style={{ marginTop: 14 }}>
          <WeeklyTasksClient employeeId={me.id} tasks={(tasks as any[]) ?? []} initialLogs={(logs as any[]) ?? []} />
        </section>
      </section>
    </main>
  );
}