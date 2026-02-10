import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getMyEmployeeProfile, requireRole } from "@/lib/auth/roles";
import WeeklyTasksClient from "./tasks-weekly-client";

export default async function WeeklyTasksPage() {
  const me = await getMyEmployeeProfile();
  if (!requireRole(me, ["hr"])) {
    return <main style={{ padding: 24 }}>このページを表示する権限がありません。</main>;
  }

  const supabase = await createSupabaseServer();
  const employeeId = me?.id ?? "";

  const { data: tasks } = await supabase.from("tasks").select("id,name").order("name");

  const { data: logs } = employeeId
    ? await supabase
        .from("weekly_task_logs")
        .select("id,week_start,quantity,points,note,tasks:task_id(name)")
        .eq("employee_id", employeeId)
        .order("week_start", { ascending: false })
        .limit(30)
    : { data: [] };

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
            {(me?.name ?? "ゲスト")} さんの週次業務実績を入力・確認できます。
          </p>
        </header>

        <section style={{ marginTop: 14 }}>
          <Link href="/dashboard">← ダッシュボードへ戻る</Link>
        </section>

        <section style={{ marginTop: 14 }}>
          <WeeklyTasksClient employeeId={employeeId} tasks={(tasks as any[]) ?? []} initialLogs={(logs as any[]) ?? []} />
        </section>
      </section>
    </main>
  );
}