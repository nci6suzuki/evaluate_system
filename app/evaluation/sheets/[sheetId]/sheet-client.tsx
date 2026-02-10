"use client";

import { useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

type Me = { id: string; name: string; role: "employee" | "manager" | "hr" };
type Sheet = {
  id: string;
  status: "draft" | "submitted" | "manager_review" | "final_review" | "returned" | "finalized";
  employees?: { name?: string } | { name?: string }[];
  evaluation_cycles?: { name?: string } | { name?: string }[];
};

type ScoreRow = {
  id: string;
  item_id: string;
  manager_score_point?: number | null;
  manager_comment?: string | null;
  final_score_point?: number | null;
  final_comment?: string | null;
  self_comment?: string | null;
  evaluation_items?:
    | {
        item_name?: string;
        weight?: number;
        sort_order?: number;
        evaluation_item_levels?: { score_point: number; criterion_value: string }[] | { score_point: number; criterion_value: string }[];
      }
    | {
        item_name?: string;
        weight?: number;
        sort_order?: number;
        evaluation_item_levels?: { score_point: number; criterion_value: string }[] | { score_point: number; criterion_value: string }[];
      }[];
};

export default function SheetClient({
  me,
  sheet,
  scores,
  actions,
}: {
  me: Me;
  sheet: Sheet;
  scores: ScoreRow[];
  actions: any[];
}) {
  const supabase = useMemo(() => supabaseBrowser(), []);

  const sorted = useMemo(() => {
    return [...scores].sort(
      (a, b) => ((Array.isArray(a.evaluation_items) ? a.evaluation_items[0]?.sort_order : a.evaluation_items?.sort_order) ?? 0) - ((Array.isArray(b.evaluation_items) ? b.evaluation_items[0]?.sort_order : b.evaluation_items?.sort_order) ?? 0)
    );
  }, [scores]);

  const [selected, setSelected] = useState(sorted[0]?.id);
  const [managerScore, setManagerScore] = useState<string>("");
  const [managerComment, setManagerComment] = useState<string>("");
  const [finalScore, setFinalScore] = useState<string>("");
  const [finalComment, setFinalComment] = useState<string>("");
  const row = sorted.find((x) => x.id === selected);
  const item = Array.isArray(row?.evaluation_items) ? row?.evaluation_items[0] : row?.evaluation_items;
  const itemLevels = Array.isArray(item?.evaluation_item_levels) ? item?.evaluation_item_levels : [];

  const levels = itemLevels.reduce(
    (acc: Record<number, string>, lv) => {
      acc[lv.score_point] = lv.criterion_value;
      return acc;
    },
    {}
  );

  const selectedManagerPoint = managerScore ? Number(managerScore) : row?.manager_score_point ?? null;

  async function updateManager(scorePoint: number, comment: string) {
    await supabase.rpc("rpc_update_manager_score", {
      p_sheet_id: sheet.id,
      p_item_id: row?.item_id,
      p_score_point: scorePoint,
      p_comment: comment,
    });
    location.reload();
  }

  async function updateFinal(scorePoint: number, comment: string) {
    await supabase.rpc("rpc_update_final_score", {
      p_sheet_id: sheet.id,
      p_item_id: row?.item_id,
      p_score_point: scorePoint,
      p_comment: comment,
    });
    location.reload();
  }

  async function updateSelf(comment: string) {
    await supabase.rpc("rpc_update_self_comment", {
      p_sheet_id: sheet.id,
      p_item_id: row?.item_id,
      p_self_comment: comment,
    });
    location.reload();
  }

  async function submitSheet() {
    await supabase.rpc("rpc_submit_sheet", { p_sheet_id: sheet.id, p_note: null });
    location.reload();
  }
  async function approveManager() {
    await supabase.rpc("rpc_approve_manager", { p_sheet_id: sheet.id, p_note: null });
    location.reload();
  }
  async function returnManager(reason: string) {
    await supabase.rpc("rpc_return_manager", { p_sheet_id: sheet.id, p_reason: reason });
    location.reload();
  }
  async function finalize() {
    await supabase.rpc("rpc_finalize_sheet", { p_sheet_id: sheet.id, p_note: null });
    location.reload();
  }

  const canSubmit = me.role === "employee" && (sheet.status === "draft" || sheet.status === "returned");
  const canManagerApprove = me.role === "manager" && (sheet.status === "submitted" || sheet.status === "manager_review");
  const canManagerReturn = me.role === "manager" && (sheet.status === "submitted" || sheet.status === "manager_review");
  const canFinalize = me.role === "hr" && sheet.status === "final_review";

  return (
    <div>
      <h1>評価シート</h1>
      <div style={{ marginTop: 8 }}>
        <b>{Array.isArray(sheet.employees) ? sheet.employees[0]?.name : sheet.employees?.name}</b> / {Array.isArray(sheet.evaluation_cycles) ? sheet.evaluation_cycles[0]?.name : sheet.evaluation_cycles?.name} / status: {sheet.status}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 16, marginTop: 16 }}>
        <aside style={{ border: "1px solid #ddd" }}>
          {sorted.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setSelected(s.id);
                setManagerScore("");
                setManagerComment("");
                setFinalScore("");
                setFinalComment("");
              }}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: 12,
                borderBottom: "1px solid #eee",
                background: s.id === selected ? "#f5f5f5" : "white",
              }}
            >
              {(Array.isArray(s.evaluation_items) ? s.evaluation_items[0]?.item_name : s.evaluation_items?.item_name)}（{(Array.isArray(s.evaluation_items) ? s.evaluation_items[0]?.weight : s.evaluation_items?.weight)}）
            </button>
          ))}
        </aside>

        <main style={{ border: "1px solid #ddd", padding: 12 }}>
          <h3>{item?.item_name}</h3>

          <div style={{ marginTop: 8, fontSize: 14 }}>
            <div>
              <b>基準（選択点数に対応）</b>
              <div style={{ marginTop: 6, padding: 10, border: "1px dashed #aaa" }}>
                {selectedManagerPoint != null
                  ? levels[selectedManagerPoint] ?? "(基準未設定)"
                  : "点数を選択すると基準が表示されます"}
              </div>
            </div>
          </div>

          <hr style={{ margin: "16px 0" }} />

          <div>
            <b>自己コメント</b>
            <textarea
              defaultValue={row?.self_comment ?? ""}
              rows={3}
              style={{ width: "100%", marginTop: 6 }}
              onBlur={(e) => updateSelf(e.target.value)}
              disabled={sheet.status === "finalized"}
            />
          </div>

          <hr style={{ margin: "16px 0" }} />

          {me.role !== "employee" && (
            <div>
              <b>一次評価（上長）</b>
              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                <select
                  value={managerScore || String(row?.manager_score_point ?? "")}
                  onChange={(e) => setManagerScore(e.target.value)}
                >
                  <option value="">-</option>
                  {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                <input
                  value={managerComment || row?.manager_comment || ""}
                  onChange={(e) => setManagerComment(e.target.value)}
                  placeholder="コメント（必須）"
                  style={{ flex: 1 }}
                />
                <button
                  onClick={() => updateManager(Number(managerScore || row?.manager_score_point || 0), managerComment || row?.manager_comment || "")}
                  disabled={!canManagerApprove}
                >
                  保存
                </button>
              </div>
            </div>
          )}

          {me.role === "hr" && (
            <div style={{ marginTop: 16 }}>
              <b>最終評価（人事）</b>
              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                <select value={finalScore || String(row?.final_score_point ?? "")} onChange={(e) => setFinalScore(e.target.value)}>
                  <option value="">-</option>
                  {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                <input
                  value={finalComment || row?.final_comment || ""}
                  onChange={(e) => setFinalComment(e.target.value)}
                  placeholder="コメント（必須）"
                  style={{ flex: 1 }}
                />
                <button
                  onClick={() => updateFinal(Number(finalScore || row?.final_score_point || 0), finalComment || row?.final_comment || "")}
                  disabled={!canFinalize}
                >
                  保存
                </button>
              </div>
            </div>
          )}

          <hr style={{ margin: "16px 0" }} />

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {canSubmit && <button onClick={submitSheet}>提出（本人）</button>}
            {canManagerApprove && <button onClick={approveManager}>一次承認（上長）</button>}
            {canManagerReturn && (
              <button onClick={() => returnManager(prompt("差戻し理由（必須）") ?? "")}>差戻し（上長）</button>
            )}
            {canFinalize && <button onClick={finalize}>確定（人事）</button>}
          </div>

          <div style={{ marginTop: 16 }}>
            <b>操作履歴</b>
            <ul>
              {actions.map((a: any) => (
                <li key={a.id}>
                  {a.created_at} / {a.action} / {a.note ?? "-"}
                </li>
              ))}
            </ul>
          </div>
        </main>
      </div>
    </div>
  );
}
