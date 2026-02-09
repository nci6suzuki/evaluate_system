import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getMyEmployeeProfile, requireRole } from "@/lib/auth/roles";

export default async function AdminProgressPage() {
  const me = await getMyEmployeeProfile();
  if (!requireRole(me, ["hr"])) redirect("/dashboard");

  const supabase = createSupabaseServer();

  // 期一覧
  const { data: cycles } = await supabase
    .from("evaluation_cycles")
    .select("id,name,due_date,status")
    .order("created_at", { ascending: false });

  const cycleId = cycles?.[0]?.id;

  // 進捗（まずはシンプルに一覧取得 → クライアント側で集計してもOK）
  const { data: sheets } = cycleId
    ? await supabase
        .from("evaluation_sheets")
        .select(`
          id,status,submitted_at,finalized_at,
          employees:employee_id(id,name,org_unit_id,position_id,manager_employee_id),
          evaluation_cycles:cycle_id(id,name,due_date)
        `)
        .eq("cycle_id", cycleId)
    : { data: [] as any[] };

  return (
    <div style={{ padding: 24 }}>
      <h1>評価進捗（人事）</h1>

      <section style={{ marginTop: 16 }}>
        <h3>評価期</h3>
        <ul>
          {cycles?.map((c) => (
            <li key={c.id}>
              {c.name}（締切: {c.due_date ?? "-"} / {c.status}）
            </li>
          ))}
        </ul>
      </section>

      <section style={{ marginTop: 24 }}>
        <h3>一覧（先頭の期）</h3>
        <div style={{ border: "1px solid #ddd", padding: 12 }}>
          {(sheets ?? []).slice(0, 30).map((s: any) => (
            <div key={s.id} style={{ padding: 8, borderBottom: "1px solid #eee" }}>
              <b>{s.employees?.name}</b> / status: {s.status} / submitted:{" "}
              {s.submitted_at ? "Y" : "-"} / finalized: {s.finalized_at ? "Y" : "-"}
              {"  "}
              <a href={`/evaluation/sheets/${s.id}`}>詳細</a>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
