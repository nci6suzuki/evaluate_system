import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getMyEmployeeProfile, requireRole } from "@/lib/auth/roles";

export default async function MyEvaluationPage() {
  const me = await getMyEmployeeProfile();
  if (!requireRole(me, ["hr"])) {
    return <main style={{ padding: 24 }}>このページを表示する権限がありません。</main>;
  }

  const supabase = await createSupabaseServer();

  const { data: sheets } = await supabase
    .from("evaluation_sheets")
    .select(`
      id,status,submitted_at,finalized_at,created_at,
      evaluation_cycles:cycle_id(id,name,due_date,status)
    `)
    .eq("employee_id", me.id)
    .order("created_at", { ascending: false });

  return (
    <main style={{ minHeight: "100vh", background: "#f5f8ff", padding: 24 }}>
      <section style={{ maxWidth: 980, margin: "0 auto" }}>
        <header
          style={{
            background: "linear-gradient(110deg, #1d4ed8, #2563eb)",
            color: "#fff",
            borderRadius: 14,
            padding: 18,
          }}
        >
          <h1 style={{ margin: 0, fontSize: 26 }}>自分の評価</h1>
          <p style={{ margin: "6px 0 0", opacity: 0.95 }}>
            {me.name} さんの評価シート一覧です。最新の状態を確認して、必要なら詳細画面からコメント更新・提出を行ってください。
          </p>
        </header>

        <section style={{ marginTop: 14 }}>
          <Link href="/dashboard">← ダッシュボードへ戻る</Link>
        </section>

        <section style={{ marginTop: 14, display: "grid", gap: 10 }}>
          {(sheets ?? []).map((sheet: any) => (
            <article
              key={sheet.id}
              style={{
                background: "#fff",
                borderRadius: 12,
                border: "1px solid #dbe4f3",
                padding: 14,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <div>
                  <b style={{ fontSize: 16 }}>{sheet.evaluation_cycles?.name ?? "評価期未設定"}</b>
                  <div style={{ marginTop: 4, color: "#475569" }}>
                    締切: {sheet.evaluation_cycles?.due_date ?? "-"}
                    {" / "}
                    status: <b>{sheet.status}</b>
                  </div>
                  <div style={{ marginTop: 4, color: "#64748b", fontSize: 13 }}>
                    提出: {sheet.submitted_at ? "済み" : "未"} / 確定: {sheet.finalized_at ? "済み" : "未"}
                  </div>
                </div>
                <Link href={`/evaluation/sheets/${sheet.id}`}>詳細を見る →</Link>
              </div>
            </article>
          ))}

          {!sheets?.length && (
            <div style={{ background: "#fff", border: "1px solid #dbe4f3", borderRadius: 12, padding: 16 }}>
              まだ評価シートが作成されていません。
            </div>
          )}
        </section>
      </section>
    </main>
  );
}