"use client";

import { useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

type TaskOption = { id: string; name: string };
type WeeklyLog = {
  id: string;
  week_start: string;
  quantity: number | null;
  points: number | null;
  note: string | null;
  tasks?: { name?: string } | null;
};

export default function WeeklyTasksClient({
  employeeId,
  tasks,
  initialLogs,
}: {
  employeeId: string;
  tasks: TaskOption[];
  initialLogs: WeeklyLog[];
}) {
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [weekStart, setWeekStart] = useState(getCurrentWeekStart());
  const [taskId, setTaskId] = useState(tasks[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addLog() {
    setError(null);
    if (!taskId || !weekStart) {
      setError("タスクと週開始日を選択してください。");
      return;
    }

    setSaving(true);
    const { error: insertErr } = await supabase.from("weekly_task_logs").insert({
      employee_id: employeeId,
      week_start: weekStart,
      task_id: taskId,
      quantity,
      note,
    });
    setSaving(false);

    if (insertErr) {
      setError(insertErr.message);
      return;
    }

    location.reload();
  }

  return (
    <>
      <section
        style={{
          background: "#fff",
          border: "1px solid #dbe4f3",
          borderRadius: 12,
          padding: 14,
        }}
      >
        <h2 style={{ marginTop: 0, fontSize: 18 }}>週次実績を入力</h2>
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
          <label>
            週開始日
            <input
              type="date"
              value={weekStart}
              onChange={(e) => setWeekStart(e.target.value)}
              style={{ width: "100%", marginTop: 4 }}
            />
          </label>

          <label>
            タスク
            <select value={taskId} onChange={(e) => setTaskId(e.target.value)} style={{ width: "100%", marginTop: 4 }}>
              {tasks.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            数量
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value || 1))}
              style={{ width: "100%", marginTop: 4 }}
            />
          </label>
        </div>

        <label style={{ display: "block", marginTop: 10 }}>
          メモ
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} style={{ width: "100%", marginTop: 4 }} />
        </label>

        {error && <p style={{ color: "#b91c1c", marginBottom: 0 }}>{error}</p>}

        <button onClick={addLog} disabled={saving} style={{ marginTop: 10 }}>
          {saving ? "保存中..." : "保存"}
        </button>
      </section>

      <section style={{ marginTop: 14 }}>
        <h2 style={{ marginBottom: 8, fontSize: 18 }}>最近の入力</h2>
        <div style={{ display: "grid", gap: 8 }}>
          {initialLogs.map((log) => (
            <article
              key={log.id}
              style={{
                background: "#fff",
                border: "1px solid #dbe4f3",
                borderRadius: 10,
                padding: "10px 12px",
              }}
            >
              <div>
                <b>{log.week_start}</b> / {log.tasks?.name ?? "タスク不明"}
              </div>
              <div style={{ marginTop: 3, color: "#475569" }}>
                qty: {log.quantity ?? 1} / points: {log.points ?? "-"}
              </div>
              {log.note && <div style={{ marginTop: 4, color: "#64748b", fontSize: 13 }}>メモ: {log.note}</div>}
            </article>
          ))}
          {!initialLogs.length && (
            <div style={{ background: "#fff", border: "1px solid #dbe4f3", borderRadius: 10, padding: 12 }}>
              まだ週次実績が入力されていません。
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function getCurrentWeekStart() {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return monday.toISOString().slice(0, 10);
}