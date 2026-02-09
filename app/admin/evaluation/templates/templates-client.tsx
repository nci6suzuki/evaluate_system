"use client";

import { useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

type Org = { id: string; name: string };
type Pos = { id: string; name: string };

export default function TemplatesClient({
  orgs,
  positions,
  templates,
}: {
  orgs: Org[];
  positions: Pos[];
  templates: any[];
}) {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(templates[0]?.id ?? null);

  const selected = templates.find((t) => t.id === selectedTemplateId);

  async function createNewVersion() {
    if (!selected) return;
    // HRのみ操作：新しいversionを作成（同じorg/posでversion+1）
    const nextVersion = (selected.version ?? 1) + 1;

    // 1) 新テンプレ作成
    const { data: newT, error: e1 } = await supabase
      .from("evaluation_templates")
      .insert({
        org_unit_id: selected.org_unit_id,
        position_id: selected.position_id,
        version: nextVersion,
        is_active: true,
      })
      .select("id")
      .single();

    if (e1) {
      alert(e1.message);
      return;
    }

    // 2) 旧テンプレをinactiveに（任意運用）
    await supabase.from("evaluation_templates").update({ is_active: false }).eq("id", selected.id);

    // 3) items/levelsをコピー（最小のため、ここではガイド表示。実運用はRPC推奨）
    alert("新versionを作成しました。項目・基準点のコピーは次の段階でRPC化します。");
    location.reload();
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 16, marginTop: 16 }}>
      <aside style={{ border: "1px solid #ddd" }}>
        <div style={{ padding: 12, borderBottom: "1px solid #eee" }}>
          <b>テンプレ一覧</b>
        </div>
        {templates.map((t: any) => (
          <button
            key={t.id}
            onClick={() => setSelectedTemplateId(t.id)}
            style={{
              display: "block",
              width: "100%",
              textAlign: "left",
              padding: 12,
              borderBottom: "1px solid #eee",
              background: t.id === selectedTemplateId ? "#f5f5f5" : "white",
            }}
          >
            {t.org_units?.name} / {t.positions?.name} / v{t.version} {t.is_active ? "（active）" : ""}
          </button>
        ))}
      </aside>

      <main style={{ border: "1px solid #ddd", padding: 12 }}>
        <h3>テンプレ詳細</h3>
        {selected ? (
          <div>
            <div style={{ marginTop: 8 }}>
              <b>{selected.org_units?.name}</b> / <b>{selected.positions?.name}</b> / v{selected.version}
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              <button onClick={createNewVersion}>新規version作成</button>

              {/* CSVアップロード（staging投入→import関数実行） */}
              <a href="/admin/evaluation/templates/import">CSVインポートへ</a>
            </div>

            <div style={{ marginTop: 16, color: "#666" }}>
              ※項目・基準点の編集UIは次工程で追加します（現時点ではインポートでの反映が最短）。
              <br />
              すぐ運用したい場合は「CSVインポート」→「テンプレ投入」→「期作成」を優先してください。
            </div>
          </div>
        ) : (
          <div>テンプレを選択してください</div>
        )}
      </main>
    </div>
  );
}
