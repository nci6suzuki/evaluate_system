"use client";

import { useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function ReviewDetailClient({
  sheetId,
  status,
  canManager,
  canFinalize,
  actions,
}: {
  sheetId: string;
  status: string;
  canManager: boolean;
  canFinalize: boolean;
  actions: any[];
}) {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [reasonType, setReasonType] = useState("点数根拠不足");
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  async function approveManager() {
    setSaving(true);
    await supabase.rpc("rpc_approve_manager", { p_sheet_id: sheetId, p_note: null });
    setSaving(false);
    location.reload();
  }

  async function finalizeSheet() {
    setSaving(true);
    await supabase.rpc("rpc_finalize_sheet", { p_sheet_id: sheetId, p_note: null });
    setSaving(false);
    location.reload();
  }

  async function returnManager() {
    const reason = `${reasonType}${comment ? `: ${comment}` : ""}`;
    if (!reason.trim()) return;
    setSaving(true);
    await supabase.rpc("rpc_return_manager", { p_sheet_id: sheetId, p_reason: reason });
    setSaving(false);
    location.reload();
  }

  return (
    <section style={{ marginTop: 14, display: "grid", gap: 12 }}>
      <article style={{ background: "#fff", border: "1px solid #dbe4f3", borderRadius: 12, padding: 12 }}>
        <h3 style={{ marginTop: 0 }}>差戻し入力</h3>
        <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 8 }}>
          <label>
            差戻し理由
            <select value={reasonType} onChange={(e) => setReasonType(e.target.value)} style={{ width: "100%", marginTop: 4 }}>
              {["点数根拠不足", "未入力項目あり", "コメント不足", "週次実績と整合しない", "その他"].map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </label>
          <label>
            追加コメント
            <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="詳細コメント（任意）" style={{ width: "100%", marginTop: 4 }} />
          </label>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          {canManager && (
            <>
              <button onClick={returnManager} disabled={saving || (status !== "submitted" && status !== "manager_review")}>差戻し</button>
              <button onClick={approveManager} disabled={saving || (status !== "submitted" && status !== "manager_review")}>一次承認</button>
            </>
          )}
          {canFinalize && (
            <button onClick={finalizeSheet} disabled={saving || status !== "final_review"}>最終確定</button>
          )}
        </div>
      </article>

      <article style={{ background: "#fff", border: "1px solid #dbe4f3", borderRadius: 12, padding: 12 }}>
        <h3 style={{ marginTop: 0 }}>承認/差戻し履歴</h3>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {actions.map((a) => (
            <li key={a.id} style={{ marginBottom: 4 }}>
              {a.created_at} / {a.action} / {a.note ?? "-"}
            </li>
          ))}
          {!actions.length && <li>履歴はありません。</li>}
        </ul>
      </article>
    </section>
  );
}