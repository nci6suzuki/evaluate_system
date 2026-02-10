import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getMyEmployeeProfile, requireRole } from "@/lib/auth/roles";

export default async function AdminProgressPage() {
  const me = await getMyEmployeeProfile();
  if (!requireRole(me, ["hr"])) redirect("/dashboard");

  const supabase = await createSupabaseServer();

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

  const counts = {
    draft: (sheets ?? []).filter((s: any) => s.status === "draft").length,
    submitted: (sheets ?? []).filter((s: any) => s.status === "submitted").length,
    final: (sheets ?? []).filter((s: any) => s.status === "final_review").length,
    done: (sheets ?? []).filter((s: any) => s.status === "finalized").length,
  };

  return (
    <main style={{ padding: 24, minHeight: "100vh", background: "#f4f7fb" }}>
      <section style={{ maxWidth: 1100, margin: "0 auto" }}>
        <header
          style={{
            borderRadius: 14,
            padding: 18,
            color: "#fff",
            background: "linear-gradient(110deg, #7c3aed, #4f46e5)",
          }}
        >
          <h1 style={{ margin: 0, fontSize: 26 }}>評価進捗（人事）</h1>
          <p style={{ margin: "6px 0 0", opacity: 0.95 }}>
            進行中の評価サイクルを横断で確認し、滞留案件を先回りで解消します。
          </p>
        </header>

        <section
          style={{
            marginTop: 14,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 10,
          }}
        >
          <KpiCard label="未提出" value={counts.draft} />
          <KpiCard label="一次待ち" value={counts.submitted} />
          <KpiCard label="最終待ち" value={counts.final} />
          <KpiCard label="確定" value={counts.done} />
        </section>

        <section style={{ marginTop: 18 }}>
          <h3 style={{ marginBottom: 8 }}>評価期一覧</h3>
          <div style={{ display: "grid", gap: 8 }}>
            {cycles?.map((c) => (
              <div
                key={c.id}
                style={{
                  background: "#fff",
                  borderRadius: 10,
                  border: "1px solid #d8e1ef",
                  padding: "10px 12px",
                }}
              >
                <b>{c.name}</b>（締切: {c.due_date ?? "-"} / {c.status}）
              </div>
            ))}
          </div>
        </section>

        <section style={{ marginTop: 18 }}>
          <h3 style={{ marginBottom: 8 }}>一覧（先頭の期）</h3>
          <a href="/api/reports/weekly-points" style={{ display: "inline-block", marginBottom: 10 }}>
            週次ポイントCSVをダウンロード
          </a>
          <div style={{ border: "1px solid #d8e1ef", borderRadius: 12, overflow: "hidden" }}>
            {(sheets ?? []).slice(0, 30).map((s: any) => (
              <div
                key={s.id}
                style={{
                  padding: 12,
                  borderBottom: "1px solid #eef2f7",
                  background: "#fff",
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <div>
                  <b>{s.employees?.name}</b> / {s.status} / submitted: {s.submitted_at ? "Y" : "-"}
                  {" / "}finalized: {s.finalized_at ? "Y" : "-"}
                </div>
                <a href={`/evaluation/sheets/${s.id}`}>詳細</a>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

function KpiCard({ label, value }: { label: string; value: number }) {
  return (
    <article
      style={{
        background: "#fff",
        border: "1px solid #d8e1ef",
        borderRadius: 12,
        padding: 14,
      }}
    >
      <div style={{ color: "#5b6474", fontSize: 13 }}>{label}</div>
      <div style={{ marginTop: 6, fontSize: 24, fontWeight: 700 }}>{value}</div>
    </article>
  );
}
