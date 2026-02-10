"use client";

import { useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

type Task = { id: string; name: string; category: string | null; base_points: number | null };
type Log = {
  id: string;
  task_id: string;
  quantity: number;
  points: number;
  note: string | null;
  evidences: { id: string; kind: string; value: string }[] | null;
};

export default function TasksWeeklyClient({
  meId,
  weekStart,
  tasks,
  logs,
}: {
  meId: string;
  weekStart: string;
  tasks: Task[];
  logs: Log[];
}) {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [week, setWeek] = useState(weekStart);
  const [creating, setCreating] = useState(false);

  const [taskId, setTaskId] = useState(tasks[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [points, setPoints] = useState(0);
  const [note, setNote] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");

  async function moveWeek(dir: -1 | 1) {
    const base = new Date(`${week}T00:00:00`);
    base.setDate(base.getDate() + dir * 7);
    const nextWeek = base.toISOString().slice(0, 10);
    setWeek(nextWeek);
    location.href = `/my/tasks/weekly?week_start=${nextWeek}`;
  }

  async function createLog() {
    if (!taskId) return;
    setCreating(true);

    const { data: inserted, error } = await supabase
      .from("task_logs")
      .insert({
        employee_id: meId,
        task_id: taskId,
        week_start: week,
        quantity,
        points,
        note: note || null,
      })
      .select("id")
      .single();

    if (error) {
      alert(error.message);
      setCreating(false);
      return;
    }

    if (evidenceUrl.trim()) {
      await supabase.from("evidences").insert({
        owner_employee_id: meId,
        task_log_id: inserted.id,
        kind: "url",
        value: evidenceUrl.trim(),
      });
    }

    location.reload();
  }

  async function updateLog(logId: string, field: "quantity" | "points" | "note", value: string) {
    const patch: Record<string, string | number | null> = {};
    if (field === "quantity") patch.quantity = Number(value);
    if (field === "points") patch.points = Number(value);
    if (field === "note") patch.note = value || null;

    const { error } = await supabase.from("task_logs").update(patch).eq("id", logId);
    if (error) alert(error.message);
  }

  async function deleteLog(logId: string) {
    if (!confirm("この実績行を削除しますか？")) return;
    const { error } = await supabase.from("task_logs").delete().eq("id", logId);
    if (error) {
      alert(error.message);
      return;
    }
    location.reload();
  }

  const total = logs.reduce((acc, x) => acc + (Number(x.points) || 0), 0);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <button onClick={() => moveWeek(-1)}>← 前週</button>
        <b>{week}</b>
        <button onClick={() => moveWeek(1)}>翌週 →</button>
        <span style={{ marginLeft: "auto" }}>合計ポイント: {total}</span>
      </div>

      <div style={{ border: "1px solid #d8e1ef", borderRadius: 10, padding: 12 }}>
        <h3 style={{ marginTop: 0 }}>週次実績を追加</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 120px", gap: 8 }}>
          <select value={taskId} onChange={(e) => {
            const t = tasks.find((x) => x.id === e.target.value);
            setTaskId(e.target.value);
            setPoints(t?.base_points ?? 0);
          }}>
            {tasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} {t.category ? `(${t.category})` : ""}
              </option>
            ))}
          </select>
          <input type="number" min={0} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} placeholder="件数" />
          <input type="number" value={points} onChange={(e) => setPoints(Number(e.target.value))} placeholder="ポイント" />
        </div>
        <textarea
          rows={2}
          style={{ width: "100%", marginTop: 8 }}
          placeholder="メモ"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <input
          style={{ width: "100%", marginTop: 8 }}
          placeholder="証跡URL（任意）"
          value={evidenceUrl}
          onChange={(e) => setEvidenceUrl(e.target.value)}
        />
        <button onClick={createLog} disabled={creating || !taskId} style={{ marginTop: 10 }}>
          追加
        </button>
      </div>

      <h3 style={{ marginTop: 16 }}>実績一覧</h3>
      <div style={{ display: "grid", gap: 8 }}>
        {logs.map((l) => (
          <article key={l.id} style={{ border: "1px solid #d8e1ef", borderRadius: 10, padding: 10 }}>
            <div style={{ fontWeight: 700 }}>{tasks.find((t) => t.id === l.task_id)?.name ?? "-"}</div>
            <div style={{ display: "grid", gridTemplateColumns: "100px 100px 1fr auto", gap: 8, marginTop: 8 }}>
              <input
                type="number"
                defaultValue={l.quantity}
                onBlur={(e) => updateLog(l.id, "quantity", e.target.value)}
              />
              <input
                type="number"
                defaultValue={l.points}
                onBlur={(e) => updateLog(l.id, "points", e.target.value)}
              />
              <input defaultValue={l.note ?? ""} onBlur={(e) => updateLog(l.id, "note", e.target.value)} />
              <button onClick={() => deleteLog(l.id)}>削除</button>
            </div>
            {!!l.evidences?.length && (
              <ul style={{ marginTop: 8 }}>
                {l.evidences.map((ev) => (
                  <li key={ev.id}>
                    {ev.kind}: <a href={ev.value}>{ev.value}</a>
                  </li>
                ))}
              </ul>
            )}
          </article>
        ))}

        {!logs.length && <div>この週の実績はまだありません。</div>}
      </div>
    </div>
  );
}