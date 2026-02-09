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
    <main style={{ padding: 24, background: "#f4f7fb", minHeight: "100vh" }}>
      <section style={{ maxWidth: 1040, margin: "0 auto" }}>
        <header
          style={{
            padding: 18,
            borderRadius: 14,
            color: "#fff",
            background: "linear-gradient(110deg, #0f766e, #0ea5a2)",
          }}
        >
          <h1 style={{ margin: 0, fontSize: 26 }}>受信箱（承認待ち）</h1>
          <p style={{ margin: "6px 0 0", opacity: 0.95 }}>
            提出済み・差戻し案件を優先順で確認し、迅速にフィードバックを返しましょう。
          </p>
        </header>

        <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
          {(sheets ?? []).map((s: any) => (
            <article
              key={s.id}
              style={{
                padding: 14,
                borderRadius: 12,
                background: "#fff",
                border: "1px solid #d8e1ef",
                boxShadow: "0 5px 16px rgba(15, 23, 42, 0.06)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <div>
                  <b style={{ fontSize: 16 }}>{s.employees?.name}</b>
                  <div style={{ color: "#4b5563", marginTop: 3 }}>
                    {s.evaluation_cycles?.name} / 締切: {s.evaluation_cycles?.due_date ?? "-"}
                  </div>
                </div>
                <span
                  style={{
                    alignSelf: "start",
                    background: "#e8f2ff",
                    color: "#1d4ed8",
                    borderRadius: 999,
                    padding: "4px 10px",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {s.status}
                </span>
              </div>
              <a href={`/evaluation/sheets/${s.id}`} style={{ display: "inline-block", marginTop: 10 }}>
                評価する →
              </a>
            </article>
          ))}

          {!sheets?.length && (
            <div style={{ padding: 16, borderRadius: 12, background: "#fff", border: "1px solid #d8e1ef" }}>
              現在、承認待ちの評価シートはありません。
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
