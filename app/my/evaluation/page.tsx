import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getMyEmployeeProfile } from "@/lib/auth/roles";

export default async function MyEvaluationPage() {
  const me = await getMyEmployeeProfile();
  if (!me) redirect("/login");

  const supabase = await createSupabaseServer();

  const { data: sheets } = await supabase
    .from("evaluation_sheets")
    .select(`
      id,status,submitted_at,finalized_at,
      evaluation_cycles:cycle_id(id,name,due_date,status)
    `)
    .eq("employee_id", me.id)
    .order("created_at", { ascending: false });

  return (
    <main style={{ padding: 24, maxWidth: 980, margin: "0 auto" }}>
      <h1>自分の評価一覧</h1>
      <p style={{ color: "#556" }}>
        提出状況・差戻し状況を確認し、必要に応じてシートを更新してください。
      </p>

      <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
        {(sheets ?? []).map((s: any) => (
          <article
            key={s.id}
            style={{
              border: "1px solid #d8e1ef",
              borderRadius: 12,
              padding: 14,
              background: "#fff",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <div>
                <b>{s.evaluation_cycles?.name}</b>
                <div style={{ fontSize: 13, color: "#475569", marginTop: 4 }}>
                  締切: {s.evaluation_cycles?.due_date ?? "-"} / status: {s.status}
                </div>
              </div>
              <a href={`/evaluation/sheets/${s.id}`}>シートを開く</a>
            </div>
          </article>
        ))}

        {!sheets?.length && (
          <div style={{ border: "1px solid #d8e1ef", borderRadius: 12, padding: 14 }}>
            評価シートはまだ作成されていません。
          </div>
        )}
      </div>
    </main>
  );
}