import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getMyEmployeeProfile, requireRole } from "@/lib/auth/roles";

type ScoreLite = {
  sheet_id: string;
  manager_score_point: number | null;
  final_score_point: number | null;
  evaluation_items?: { weight?: number | null } | { weight?: number | null }[];
};

function toItem(ref: any) {
  return Array.isArray(ref) ? ref[0] : ref;
}

function computeTotalsBySheet(scores: ScoreLite[]) {
  const map = new Map<string, { total: number | null; missingCount: number; weightedSum: number; weightSum: number }>();

  for (const row of scores) {
    const item = toItem(row.evaluation_items);
    const weight = Number(item?.weight ?? 0);
    const score = row.final_score_point ?? row.manager_score_point;

    const cur = map.get(row.sheet_id) ?? { total: null, missingCount: 0, weightedSum: 0, weightSum: 0 };

    if (row.manager_score_point == null) cur.missingCount += 1;
    if (score != null) {
      cur.weightedSum += score * weight;
      cur.weightSum += weight;
      cur.total = cur.weightSum > 0 ? Math.round((cur.weightedSum / cur.weightSum) * 10) / 10 : null;
    }

    map.set(row.sheet_id, cur);
  }

  return map;
}

export default async function ReviewDashboardPage({
  searchParams,
}: {
  searchParams: {
    cycle?: string;
    status?: string;
    onlyMissing?: string;
    lowEvidence?: string;
  };
}) {
  const me = await getMyEmployeeProfile();
  if (!me) redirect("/login");
  if (!requireRole(me, ["manager", "hr"])) {
    return <main style={{ padding: 24 }}>このページを表示する権限がありません。</main>;
  }

  const supabase = await createSupabaseServer();
  const now = new Date();
  const todayISO = now.toISOString().slice(0, 10);
  const in3Days = new Date(now);
  in3Days.setDate(in3Days.getDate() + 3);
  const in3DaysISO = in3Days.toISOString().slice(0, 10);
  const monthStartISO = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);

  const { data: cycles } = await supabase.from("evaluation_cycles").select("id,name,due_date").order("due_date", { ascending: false });
  const selectedCycle = searchParams.cycle ?? cycles?.[0]?.id;

  let query = supabase
    .from("evaluation_sheets")
    .select(`
      id,status,employee_id,cycle_id,submitted_at,updated_at,created_at,
      employees:employee_id(id,name),
      evaluation_cycles:cycle_id(id,name,due_date)
    `)
    .order("created_at", { ascending: false });

  if (selectedCycle) query = query.eq("cycle_id", selectedCycle);
  if (searchParams.status) query = query.eq("status", searchParams.status);

  const { data: sheets } = await query;
  const sheetIds = (sheets ?? []).map((s: any) => s.id);
  const employeeIds = [...new Set((sheets ?? []).map((s: any) => s.employee_id).filter(Boolean))] as string[];

  const { data: scores } = sheetIds.length
    ? await supabase
        .from("evaluation_scores")
        .select("sheet_id,manager_score_point,final_score_point,evaluation_items:item_id(weight)")
        .in("sheet_id", sheetIds)
    : { data: [] as any[] };

  const totalsBySheet = computeTotalsBySheet((scores ?? []) as ScoreLite[]);

  const { data: monthlyLogs } = employeeIds.length
    ? await supabase.from("weekly_task_logs").select("employee_id,points,week_start").in("employee_id", employeeIds).gte("week_start", monthStartISO)
    : { data: [] as any[] };

  const monthlyPointsByEmployee = new Map<string, number>();
  for (const log of monthlyLogs ?? []) {
    monthlyPointsByEmployee.set(log.employee_id, (monthlyPointsByEmployee.get(log.employee_id) ?? 0) + Number(log.points ?? 0));
  }

  const rows = (sheets ?? []).map((sheet: any) => {
    const totals = totalsBySheet.get(sheet.id) ?? { total: null, missingCount: 0, weightedSum: 0, weightSum: 0 };
    return {
      ...sheet,
      totalScore: totals.total,
      missingCount: totals.missingCount,
      monthlyPoints: monthlyPointsByEmployee.get(sheet.employee_id) ?? 0,
    };
  });

  const filteredRows = rows
    .filter((r) => (searchParams.onlyMissing === "1" ? r.missingCount > 0 : true))
    .filter((r) => (searchParams.lowEvidence === "1" ? r.monthlyPoints < 30 : true))
    .sort((a, b) => {
      if (a.status === "returned" && b.status !== "returned") return -1;
      if (a.status !== "returned" && b.status === "returned") return 1;
      if ((a.missingCount ?? 0) !== (b.missingCount ?? 0)) return (b.missingCount ?? 0) - (a.missingCount ?? 0);
      const aDue = toItem(a.evaluation_cycles)?.due_date ?? "9999-12-31";
      const bDue = toItem(b.evaluation_cycles)?.due_date ?? "9999-12-31";
      return aDue.localeCompare(bDue);
    });

  const kpi = {
    submitted: rows.filter((r) => r.status === "submitted").length,
    returned: rows.filter((r) => r.status === "returned").length,
    finalReview: rows.filter((r) => r.status === "final_review").length,
    dueSoonNotSubmitted: rows.filter((r) => {
      const due = toItem(r.evaluation_cycles)?.due_date;
      return Boolean(due && due >= todayISO && due <= in3DaysISO && r.status === "draft");
    }).length,
    totalMissing: rows.reduce((acc, cur) => acc + Number(cur.missingCount ?? 0), 0),
  };

  return (
    <main style={{ minHeight: "100vh", background: "#f4f7fb", padding: 24 }}>
      <section style={{ maxWidth: 1200, margin: "0 auto" }}>
        <header style={{ background: "linear-gradient(110deg, #0f766e, #0ea5a2)", color: "#fff", borderRadius: 14, padding: 18 }}>
          <h1 style={{ margin: 0, fontSize: 28 }}>確認者ダッシュボード</h1>
          <p style={{ margin: "8px 0 0", opacity: 0.95 }}>一覧で詰まりポイントを可視化し、優先順位高くレビューできます。</p>
        </header>

        <form style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 8, background: "#fff", border: "1px solid #dbe4f3", borderRadius: 12, padding: 12 }}>
          <label>
            期
            <select name="cycle" defaultValue={selectedCycle ?? ""} style={{ width: "100%", marginTop: 4 }}>
              {(cycles ?? []).map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
          <label>
            ステータス
            <select name="status" defaultValue={searchParams.status ?? ""} style={{ width: "100%", marginTop: 4 }}>
              <option value="">すべて</option>
              {["draft", "submitted", "returned", "manager_review", "final_review", "finalized"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 22 }}>
            <input type="checkbox" name="onlyMissing" value="1" defaultChecked={searchParams.onlyMissing === "1"} />
            未入力がある人のみ
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 22 }}>
            <input type="checkbox" name="lowEvidence" value="1" defaultChecked={searchParams.lowEvidence === "1"} />
            週次ポイント少（30未満）のみ
          </label>
          <button type="submit" style={{ height: 36, marginTop: 20 }}>絞り込む</button>
        </form>

        <section style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>
          {[
            ["承認待ち", kpi.submitted],
            ["差戻し", kpi.returned],
            ["最終待ち", kpi.finalReview],
            ["締切3日以内 未提出", kpi.dueSoonNotSubmitted],
            ["未入力項目合計", kpi.totalMissing],
          ].map(([label, value]) => (
            <article key={label as string} style={{ background: "#fff", borderRadius: 12, border: "1px solid #dbe4f3", padding: 12 }}>
              <div style={{ color: "#475569", fontSize: 13 }}>{label}</div>
              <div style={{ fontSize: 26, fontWeight: 800, marginTop: 4 }}>{String(value)}</div>
            </article>
          ))}
        </section>

        <section style={{ marginTop: 14, background: "#fff", border: "1px solid #dbe4f3", borderRadius: 12, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 980 }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {[
                  "社員名",
                  "ステータス",
                  "締切日",
                  "総合点（暫定）",
                  "未入力項目数",
                  "前期平均との差",
                  "週次ポイント月累計",
                  "最終更新",
                ].map((h) => (
                  <th key={h} style={{ textAlign: "left", borderBottom: "1px solid #dbe4f3", padding: "10px 12px", fontSize: 13 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr key={row.id}>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #edf2f7" }}>
                    <Link href={`/evaluation/review/${row.employee_id}?cycle=${row.cycle_id}`}>{toItem(row.employees)?.name ?? "-"}</Link>
                  </td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #edf2f7" }}>{row.status}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #edf2f7" }}>{toItem(row.evaluation_cycles)?.due_date ?? "-"}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #edf2f7" }}>{row.totalScore ?? "-"}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #edf2f7" }}>{row.missingCount}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #edf2f7" }}>-</td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #edf2f7" }}>{row.monthlyPoints}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #edf2f7" }}>{row.updated_at ?? row.created_at ?? "-"}</td>
                </tr>
              ))}
              {!filteredRows.length && (
                <tr>
                  <td colSpan={8} style={{ padding: 16, color: "#64748b" }}>表示できる評価シートはありません。</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </section>
    </main>
  );
}