"use client";

import { useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function CycleCreateForm() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [name, setName] = useState("2026上期");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [due, setDue] = useState("");

  async function create() {
    const { data, error } = await supabase.rpc("rpc_create_cycle_and_generate", {
      p_name: name,
      p_start_date: start || null,
      p_end_date: end || null,
      p_due_date: due || null,
    });

    if (error) {
      alert(error.message);
      return;
    }
    alert("期を作成し、評価シートを生成しました。cycle_id=" + data);
    location.reload();
  }

  return (
    <div style={{ marginTop: 12, border: "1px solid #ddd", padding: 12 }}>
      <h3>新規評価期を作成（シート自動生成）</h3>
      <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 8, maxWidth: 520 }}>
        <label>期名</label>
        <input value={name} onChange={(e) => setName(e.target.value)} />

        <label>開始日</label>
        <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />

        <label>終了日</label>
        <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />

        <label>締切日</label>
        <input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
      </div>

      <button onClick={create} style={{ marginTop: 12 }}>
        作成して生成
      </button>

      <div style={{ marginTop: 8, color: "#666" }}>
        ※社員の部署×役職に該当する active テンプレがない場合、その社員のスコア行が作れません。
        （次の段階で「テンプレ未設定社員の警告一覧」を追加します）
      </div>
    </div>
  );
}
