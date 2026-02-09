import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getMyEmployeeProfile, requireRole } from "@/lib/auth/roles";

export default async function InboxPage() {
  const me = await getMyEmployeeProfile();
  if (!requireRole(me, ["manager", "hr"])) redirect("/dashboard");

  const supabase = createSupabaseServer();

  // RLSにより「配下のシートのみ」返る前提（hrは全件）
  const { data: sheets } = await supabase
    .from("evaluation_sheets")
    .select(`
      id,status,submitted_at,
      employees:employee_id(id,name),
      evaluation_cycles:cycle_id(id,name,due_date)
    `)
    .in("status", ["submitted", "manager_review", "returned", "final_review"])
    .order("submitted_at", { ascending: false });

  return (
    <div style={{ padding: 24 }}>
      <h1>受信箱（承認待ち）</h1>
      <div style={{ marginTop: 12, border: "1px solid #ddd" }}>
        {(sheets ?? []).map((s: any) => (
          <div key={s.id} style={{ padding: 12, borderBottom: "1px solid #eee" }}>
            <div>
              <b>{s.employees?.name}</b> / {s.evaluation_cycles?.name} / status:{" "}
              {s.status}
            </div>
            <a href={`/evaluation/sheets/${s.id}`}>評価する</a>
          </div>
        ))}
      </div>
    </div>
  );
}
