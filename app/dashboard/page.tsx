import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getMyEmployeeProfile } from "@/lib/auth/roles";
import DashboardClient from "./dashboard-client";

export default async function DashboardPage() {
  const me = await getMyEmployeeProfile();
  if (!me) redirect("/login");

  const supabase = createSupabaseServer();

  // 期（最新をデフォルト）
  const { data: cycles } = await supabase
    .from("evaluation_cycles")
    .select("id,name,due_date,status,created_at")
    .order("created_at", { ascending: false });

  const activeCycle = cycles?.[0] ?? null;

  // 共通：自分のシート（employeeは自分のみ返る / manager, hrは範囲が広いので使い方注意）
  // → roleごとに必要クエリを分ける
  let payload: any = { cycles, activeCycle, me };

  if (me.role === "employee") {
    // 自分の評価（今期+過去）
    const { data: mySheets } = await supabase
      .from("evaluation_sheets")
      .select(`
        id,status,submitted_at,finalized_at,
        evaluation_cycles:cycle_id(id,name,due_date)
      `)
      .order("created_at", { ascending: false })
      .limit(10);

    // 今週の業務実績（直近）
    const { data: myTaskLogs } = await supabase
      .from("task_logs")
      .select(`
        id,week_start,quantity,points,note,
        tasks:task_id(id,name,category)
      `)
      .order("week_start", { ascending: false })
      .limit(12);

    payload = { ...payload, mySheets, myTaskLogs };
  }

  if (me.role === "manager") {
    // 承認待ち（RLSで配下だけ返る）
    const { data: inbox } = await supabase
      .from("evaluation_sheets")
      .select(`
        id,status,submitted_at,
        employees:employee_id(id,name),
        evaluation_cycles:cycle_id(id,name,due_date)
      `)
      .in("status", ["submitted", "manager_review", "returned", "final_review"])
      .order("submitted_at", { ascending: false })
      .limit(20);

    payload = { ...payload, inbox };
  }

  if (me.role === "hr") {
    // 今期の進捗（RLSで全件）
    const { data: sheets } = activeCycle
      ? await supabase
          .from("evaluation_sheets")
          .select(`
            id,status,submitted_at,finalized_at,
            employees:employee_id(id,name,org_unit_id,position_id,manager_employee_id),
            evaluation_cycles:cycle_id(id,name,due_date)
          `)
          .eq("cycle_id", activeCycle.id)
          .order("created_at", { ascending: false })
          .limit(200)
      : { data: [] as any[] };

    payload = { ...payload, sheets };
  }

  return (
    <div style={{ padding: 24 }}>
      <DashboardClient {...payload} />
    </div>
  );
}
