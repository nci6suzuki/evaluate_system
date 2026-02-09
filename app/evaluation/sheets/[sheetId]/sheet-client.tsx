"use client";

import { useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

type Me = { id: string; name: string; role: "employee" | "manager" | "hr" };
type Sheet = any;

export default function SheetClient({
  me,
  sheet,
  scores,
  actions,
}: {
  me: Me;
  sheet: Sheet;
  scores: any[];
  actions: any[];
}) {
  const supabase = useMemo(() => supabaseBrowser(), []);

  const sorted = useMemo(() => {
    return [...scores].sort(
      (a, b) => (a.evaluation_items?.sort_order ?? 0) - (b.evaluation_items?.sort_order ?? 0)
    );
  }, [scores]);

  const [selected, setSelected] = useState(sorted[0]?.id);
  const row = sorted.find((x) => x.id === selected);

  const levels = (row?.evaluation_items?.evaluation_item_levels ?? []).reduce(
    (acc: any, lv: any) => {
      acc[lv.score_point] = lv.criterion_value;
      return acc;
    },
    {}
  );

  async function updateManager(scorePoint: number, comment: string) {
    await supabase.rpc("rpc_update_manager_score", {
      p_sheet_id: sheet.id,
      p_item_id: row.item_id,
      p_score_point: scorePoint,
      p_comment: comment,
    });
    location.reload();
  }

  async function updateFinal(scorePoint: number, comment: string) {
    await supabase.rpc("rpc_update_final_score", {
      p_sheet_id: sheet.id,
      p_item_id: row.item_id,
      p_score_point: scorePoint,
      p_comment: comment,
    });
    location.reload();
  }

  async function updateSelf(comment: string) {
    await supabase.rpc("rpc_update_self_comment", {
      p_sheet_id: sheet.id,
      p_item_id: row.item_id,
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

  return (
    <div>
      <h1>評価シート</h1>
      <div style={{ marginTop: 8 }}>
        <b>{sheet.employees?.name}</b> / {sheet.evaluation_cycles?.name} / status:{" "}
        {sheet.status}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 16, marginTop: 16 }}>
        <aside style={{ border: "1px solid #ddd" }}>
          {sorted.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelected(s.id)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: 12,
                borderBottom: "1px solid #eee",
                background: s.id === selected ? "#f5f5f5" : "white",
              }}
            >
              {s.evaluation_items?.item_name}（{s.evaluation_items?.weight}）
            </button>
          ))}
        </aside>

        <main style={{ border: "1px solid #ddd", padding: 12 }}>
          <h3>{row?.evaluation_items?.item_name}</h3>

          <div style={{ marginTop: 8, fontSize: 14 }}>
            <div>
              <b>基準（選択点数に対応）</b>
              <div style={{ marginTop: 6, padding: 10, border: "1px dashed #aaa" }}>
                例：点数を選ぶとここに criterion_value が表示されます
              </div>
            </div>
          </div>

          <hr style={{ margin: "16px 0" }} />

          {/* 自己コメント（本人のみ想定、ただしRLS+RPCが守る） */}
          <div>
            <b>自己コメント</b>
            <textarea
              defaultValue={row?.self_comment ?? ""}
              rows={3}
              style={{ width: "100%", marginTop: 6 }}
              onBlur={(e) => updateSelf(e.target.value)}
            />
          </div>

          <hr style={{ margin: "16px 0" }} />

          {me.role !== "employee" && (
            <div>
              <b>一次評価（上長）</b>
              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                <select
                  defaultValue={row?.manager_score_point ?? ""}
                  onChange={(e) => {
                    const sp = Number(e.target.value);
                    const text = levels[sp] ?? "(基準未設定)";
                    const box = document.getElementById("criteria-box");
                    if (box) box.textContent = text;
                  }}
                >
                  <option value="">-</option>
                  {[0,10,20,30,40,50,60,70,80,90,100].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                <input
                  id="mgr-comment"
                  defaultValue={row?.manager_comment ?? ""}
                  placeholder="コメント（必須）"
                  style={{ flex: 1 }}
                />
                <button
                  onClick={() => {
                    const sp = Number(
                      (document.querySelector("select") as HTMLSelectElement).value
                    );
                    const c = (document.getElementById("mgr-comment") as HTMLInputElement).value;
                    updateManager(sp, c);
                  }}
                >
                  保存
                </button>
              </div>
              <div id="criteria-box" style={{ marginTop: 8, padding: 10, border: "1px dashed #aaa" }}>
                {row?.manager_score_point != null
                  ? levels[row.manager_score_point] ?? "(基準未設定)"
                  : "点数を選択すると基準が表示されます"}
              </div>
            </div>
          )}

          {me.role === "hr" && (
            <div style={{ marginTop: 16 }}>
              <b>最終評価（人事）</b>
              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                <select defaultValue={row?.final_score_point ?? ""} id="final-score">
                  <option value="">-</option>
                  {[0,10,20,30,40,50,60,70,80,90,100].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                <input
                  id="final-comment"
                  defaultValue={row?.final_comment ?? ""}
                  placeholder="コメント（必須）"
                  style={{ flex: 1 }}
                />
                <button
                  onClick={() => {
                    const sp = Number(
                      (document.getElementById("final-score") as HTMLSelectElement).value
                    );
                    const c = (document.getElementById("final-comment") as HTMLInputElement).value;
                    updateFinal(sp, c);
                  }}
                >
                  保存
                </button>
              </div>
            </div>
          )}

          <hr style={{ margin: "16px 0" }} />

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={submitSheet}>提出（本人）</button>
            <button onClick={approveManager}>一次承認（上長）</button>
            <button onClick={() => returnManager(prompt("差戻し理由（必須）") ?? "")}>
              差戻し（上長）
            </button>
            <button onClick={finalize}>確定（人事）</button>
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
