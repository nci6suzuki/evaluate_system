import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getMyEmployeeProfile, requireRole } from "@/lib/auth/roles";
import ReviewDetailClient from "./review-detail-client";

function toItem(ref: any) {
  return Array.isArray(ref) ? ref[0] : ref;
}

function miniLinePath(values: number[]) {
  if (!values.length) return "";
  const max = Math.max(...values, 1);
  return values
    .map((v, i) => {
      const x = (i / Math.max(values.length - 1, 1)) * 280;
      const y = 70 - (v / max) * 70;
      return `${i === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");
}

export default async function EmployeeReviewDetailPage({
  params,
  searchParams,
}: {
  params: { employee_id: string };
  searchParams: { cycle?: string };
}) {
  const me = await getMyEmployeeProfile();
  if (!me) redirect("/login");
  if (!requireRole(me, ["manager", "hr"])) {
    return <main style={{ padding: 24 }}>このページを表示する権限がありません。</main>;
  }

  const supabase = await createSupabaseServer();

  const { data: employee } = await supabase
    .from("employees")
    .select("id,name,org_units:org_unit_id(name),positions:position_id(name)")
    .eq("id", params.employee_id)
    .single();

  let sheetQuery = supabase
    .from("evaluation_sheets")
    .select("id,status,cycle_id,submitted_at,updated_at,created_at,evaluation_cycles:cycle_id(id,name,due_date,start_date)")
    .eq("employee_id", params.employee_id)
    .order("created_at", { ascending: false })
    .limit(1);

  if (searchParams.cycle) sheetQuery = sheetQuery.eq("cycle_id", searchParams.cycle);
  const { data: sheet } = await sheetQuery.maybeSingle();

  if (!sheet) {
    return (
      <main style={{ padding: 24 }}>
        <Link href="/evaluation/review">← 一覧へ戻る</Link>
        <p>対象の評価シートが見つかりませんでした。</p>
      </main>
    );
  }

  const { data: scores } = await supabase
    .from("evaluation_scores")
    .select(`
      id,item_id,self_comment,manager_comment,final_comment,manager_score_point,final_score_point,
      evaluation_items:item_id(id,item_name,weight,sort_order)
    `)
    .eq("sheet_id", sheet.id)
    .order("item_id", { ascending: true });

  const cycle = toItem(sheet.evaluation_cycles);
  const cycleStart = cycle?.start_date;
  const cycleDue = cycle?.due_date;
  let logsQuery = supabase
    .from("weekly_task_logs")
    .select("id,week_start,points,quantity,note,tasks:task_id(name,category)")
    .eq("employee_id", params.employee_id)
    .order("week_start", { ascending: true })
    .limit(30);

  if (cycleStart) logsQuery = logsQuery.gte("week_start", cycleStart);
  if (cycleDue) logsQuery = logsQuery.lte("week_start", cycleDue);

  const { data: logs } = await logsQuery;

  const { data: actions } = await supabase
    .from("workflow_actions")
    .select("id,action,note,created_at")
    .eq("sheet_id", sheet.id)
    .order("created_at", { ascending: false });

  const total = (scores ?? []).reduce(
    (acc: { sum: number; w: number; missing: number }, row: any) => {
      const item = toItem(row.evaluation_items);
      const w = Number(item?.weight ?? 0);
      const point = row.final_score_point ?? row.manager_score_point;
      if (row.manager_score_point == null) acc.missing += 1;
      if (point != null) {
        acc.sum += point * w;
        acc.w += w;
      }
      return acc;
    },
    { sum: 0, w: 0, missing: 0 }
  );

  const totalScore = total.w > 0 ? Math.round((total.sum / total.w) * 10) / 10 : null;
  const weeklyPoints = (logs ?? []).map((l: any) => Number(l.points ?? 0));
  const weeklyTotal = weeklyPoints.reduce((a, b) => a + b, 0);
  const pointThreshold = 30;

  const categoryMap = new Map<string, number>();
  for (const log of logs ?? []) {
    const task = toItem(log.tasks);
    const category = task?.category ?? "未分類";
    categoryMap.set(category, (categoryMap.get(category) ?? 0) + Number(log.points ?? 0));
  }

  const itemRows = (scores ?? [])
    .map((row: any) => {
      const item = toItem(row.evaluation_items);
      const point = row.final_score_point ?? row.manager_score_point;
      const weight = Number(item?.weight ?? 0);
      return {
        id: row.id,
        name: item?.item_name ?? "項目",
        point,
        weight,
        weighted: point != null ? Math.round(point * weight * 10) / 10 : null,
        selfComment: row.self_comment,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const maxPoint = Math.max(...itemRows.map((i) => Number(i.point ?? 0)), 100);

  return (
    <main style={{ minHeight: "100vh", background: "#f4f7fb", padding: 24 }}>
      <section style={{ maxWidth: 1180, margin: "0 auto" }}>
        <section style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start", background: "#fff", border: "1px solid #dbe4f3", borderRadius: 12, padding: 14 }}>
          <div>
            <Link href="/evaluation/review">← 一覧へ戻る</Link>
            <h1 style={{ margin: "10px 0 4px" }}>{employee?.name ?? "社員"} のレビュー詳細</h1>
            <div style={{ color: "#475569" }}>
              部署: {toItem(employee?.org_units)?.name ?? "-"} / 役職: {toItem(employee?.positions)?.name ?? "-"}
            </div>
            <div style={{ color: "#475569", marginTop: 4 }}>
              期: {cycle?.name ?? "-"} / status: <b>{sheet.status}</b> / 提出日: {sheet.submitted_at ?? "-"} / 最終更新: {sheet.updated_at ?? sheet.created_at ?? "-"}
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {total.missing > 0 && <span style={{ padding: "4px 8px", borderRadius: 999, background: "#ffedd5", color: "#c2410c", fontSize: 12 }}>未入力項目あり</span>}
            {weeklyTotal < pointThreshold && <span style={{ padding: "4px 8px", borderRadius: 999, background: "#fef3c7", color: "#92400e", fontSize: 12 }}>根拠不足（週次ポイント低）</span>}
            {Math.max(...itemRows.map((x) => Number(x.point ?? 0)), 0) - Math.min(...itemRows.map((x) => Number(x.point ?? 100)), 100) >= 40 && (
              <span style={{ padding: "4px 8px", borderRadius: 999, background: "#fee2e2", color: "#b91c1c", fontSize: 12 }}>項目ばらつき大</span>
            )}
          </div>
        </section>

        <section style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 12 }}>
          <article style={{ background: "#fff", border: "1px solid #dbe4f3", borderRadius: 12, padding: 12 }}>
            <h3 style={{ marginTop: 0 }}>スコアサマリー</h3>
            <div style={{ fontSize: 28, fontWeight: 800 }}>総合点: {totalScore ?? "-"}</div>
            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}>
              <thead>
                <tr>
                  {[
                    "項目",
                    "点数",
                    "重み",
                    "加重点",
                  ].map((h) => (
                    <th key={h} style={{ textAlign: "left", fontSize: 13, borderBottom: "1px solid #dbe4f3", padding: "6px 4px" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {itemRows.map((item) => (
                  <tr key={item.id}>
                    <td style={{ borderBottom: "1px solid #edf2f7", padding: "6px 4px" }}>{item.name}</td>
                    <td style={{ borderBottom: "1px solid #edf2f7", padding: "6px 4px" }}>{item.point ?? "-"}</td>
                    <td style={{ borderBottom: "1px solid #edf2f7", padding: "6px 4px" }}>{item.weight}</td>
                    <td style={{ borderBottom: "1px solid #edf2f7", padding: "6px 4px" }}>{item.weighted ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </article>

          <article style={{ background: "#fff", border: "1px solid #dbe4f3", borderRadius: 12, padding: 12 }}>
            <h3 style={{ marginTop: 0 }}>グラフA: 項目別スコア（棒）</h3>
            <div style={{ display: "grid", gap: 6 }}>
              {itemRows.map((item) => (
                <div key={item.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <span>{item.name}</span>
                    <b>{item.point ?? "-"}</b>
                  </div>
                  <div style={{ height: 10, borderRadius: 999, background: "#e2e8f0", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${Math.max(0, Math.min(100, (Number(item.point ?? 0) / maxPoint) * 100))}%`, background: "#2563eb" }} />
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <article style={{ background: "#fff", border: "1px solid #dbe4f3", borderRadius: 12, padding: 12 }}>
            <h3 style={{ marginTop: 0 }}>グラフB: 週次ポイント推移（折れ線）</h3>
            <svg width="300" height="80" viewBox="0 0 300 80" role="img" aria-label="weekly trend">
              <path d="M10 70 H290" stroke="#cbd5e1" fill="none" />
              <path d={miniLinePath(weeklyPoints)} transform="translate(10,0)" stroke="#0f766e" strokeWidth="2" fill="none" />
            </svg>
            <div style={{ color: "#475569", fontSize: 13 }}>合計ポイント: {weeklyTotal}</div>
          </article>

          <article style={{ background: "#fff", border: "1px solid #dbe4f3", borderRadius: 12, padding: 12 }}>
            <h3 style={{ marginTop: 0 }}>グラフC: 根拠カテゴリ内訳</h3>
            <div style={{ display: "grid", gap: 4 }}>
              {[...categoryMap.entries()].map(([category, points]) => (
                <div key={category} style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                  <span>{category}</span>
                  <b>{points}</b>
                </div>
              ))}
              {!categoryMap.size && <div style={{ color: "#64748b" }}>カテゴリデータがありません。</div>}
            </div>
          </article>
        </section>

        <section style={{ marginTop: 12, background: "#fff", border: "1px solid #dbe4f3", borderRadius: 12, padding: 12 }}>
          <h3 style={{ marginTop: 0 }}>根拠（Evidence）</h3>
          <div style={{ display: "grid", gap: 8 }}>
            {(logs ?? []).map((log: any) => (
              <article key={log.id} style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 10 }}>
                <div><b>{log.week_start}</b> / {toItem(log.tasks)?.name ?? "タスク不明"}</div>
                <div style={{ color: "#475569", marginTop: 2 }}>points: {log.points ?? "-"} / quantity: {log.quantity ?? "-"}</div>
                {log.note && <div style={{ marginTop: 4, fontSize: 13, color: "#64748b" }}>メモ: {log.note}</div>}
              </article>
            ))}
            {!logs?.length && <div style={{ color: "#64748b" }}>週次実績が見つかりません。</div>}
          </div>
        </section>

        <ReviewDetailClient
          sheetId={sheet.id}
          status={sheet.status}
          canManager={requireRole(me, ["manager"])}
          canFinalize={requireRole(me, ["hr"])}
          actions={actions ?? []}
        />
      </section>
    </main>
  );
}