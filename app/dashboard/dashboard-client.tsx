"use client";

import Link from "next/link";

type Role = "employee" | "manager" | "hr" | "admin";

export default function DashboardClient(props: any) {
  const { me, activeCycle } = props as {
    me: { role: Role; name: string };
    activeCycle?: { name?: string; due_date?: string };
  };

  return (
    <div>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div>
          <h1 style={{ margin: 0 }}>ダッシュボード</h1>
          <div style={{ color: "#666", marginTop: 4 }}>
            {me.name} / role: <b>{me.role}</b> / 期:{" "}
            <b>{activeCycle?.name ?? "未作成"}</b>
            {activeCycle?.due_date ? `（締切: ${activeCycle.due_date}）` : ""}
          </div>
        </div>

        <nav style={{ display: "flex", gap: 12 }}>
          {me.role === "employee" && (
            <>
              <Link href="/my/evaluation">自分の評価</Link>
              <Link href="/my/tasks/weekly">週次実績</Link>
            </>
          )}
          {me.role === "manager" && (
            <>
              <Link href="/evaluation/inbox">受信箱</Link>
            </>
          )}
          {(me.role === "hr" || me.role === "admin") && (
            <>
              <Link href="/admin/evaluation/progress">進捗</Link>
              <Link href="/admin/evaluation/templates">テンプレ</Link>
              <Link href="/admin/evaluation/cycles">期管理</Link>
            </>
          )}
        </nav>
      </header>

      <hr style={{ margin: "16px 0" }} />

      {me.role === "employee" && <EmployeeDash {...props} />}
      {me.role === "manager" && <ManagerDash {...props} />}
      {(me.role === "hr" || me.role === "admin") && <HrDash {...props} />}
    </div>
  );
}

function Card({ title, children }: any) {
  return (
    <div style={{ border: "1px solid #ddd", padding: 12, borderRadius: 8 }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  );
}

function EmployeeDash({ mySheets, myTaskLogs }: any) {
  const latest = mySheets?.[0];

  const todo: string[] = [];
  if (latest?.status === "returned") todo.push("差戻し：理由を確認して自己コメントを追記 → 再提出");
  if (!myTaskLogs?.length) todo.push("週次業務実績：今週分が未入力なら入力");
  if (!todo.length) todo.push("特に緊急タスクはありません（週次実績の入力だけ忘れずに）");

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 16 }}>
      <div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          <Card title="評価ステータス">
            <div>{latest?.status ?? "-"}</div>
          </Card>
          <Card title="今週ポイント（直近）">
            <div>{sumPointsForLatestWeek(myTaskLogs)}</div>
          </Card>
          <Card title="月内累計（直近）">
            <div>{sumPointsForMonth(myTaskLogs)}</div>
          </Card>
        </div>

        <div style={{ marginTop: 12 }}>
          <Card title="今日やること（ToDo）">
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {todo.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
            <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
              <Link href="/my/evaluation">評価へ</Link>
              <Link href="/my/tasks/weekly">週次実績へ</Link>
            </div>
          </Card>
        </div>

        <div style={{ marginTop: 12 }}>
          <Card title="自分の評価（最近）">
            {(mySheets ?? []).map((s: any) => (
              <div key={s.id} style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                <b>{s.evaluation_cycles?.name}</b> / status: {s.status}{" "}
                <Link href={`/evaluation/sheets/${s.id}`}>詳細</Link>
              </div>
            ))}
          </Card>
        </div>
      </div>

      <div>
        <Card title="週次ポイント（直近の入力）">
          {(myTaskLogs ?? []).map((l: any) => (
            <div key={l.id} style={{ padding: 8, borderBottom: "1px solid #eee" }}>
              <div>
                {l.week_start} / {l.tasks?.name}
              </div>
              <div style={{ color: "#666" }}>
                qty: {l.quantity ?? 1} / pt: {l.points ?? "-"}
              </div>
            </div>
          ))}
          <div style={{ marginTop: 8 }}>
            <Link href="/my/tasks/weekly">入力する</Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

function ManagerDash({ inbox }: any) {
  const kpi = {
    submitted: (inbox ?? []).filter((x: any) => x.status === "submitted").length,
    returned: (inbox ?? []).filter((x: any) => x.status === "returned").length,
    final_review: (inbox ?? []).filter((x: any) => x.status === "final_review").length,
  };

  const top5 = (inbox ?? []).slice(0, 5);

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        <Card title="承認待ち（submitted）">{kpi.submitted}</Card>
        <Card title="差戻し中（returned）">{kpi.returned}</Card>
        <Card title="最終待ち（final_review）">{kpi.final_review}</Card>
      </div>

      <div style={{ marginTop: 12 }}>
        <Card title="今日やること（優先5件）">
          {(top5 ?? []).map((s: any) => (
            <div key={s.id} style={{ padding: 8, borderBottom: "1px solid #eee" }}>
              <b>{s.employees?.name}</b> / {s.evaluation_cycles?.name} / {s.status}{" "}
              <Link href={`/evaluation/sheets/${s.id}`}>詳細</Link>
            </div>
          ))}
          <div style={{ marginTop: 8 }}>
            <Link href="/evaluation/inbox">受信箱を開く</Link>
          </div>
        </Card>
      </div>

      <div style={{ marginTop: 12 }}>
        <Card title="配下の評価進捗（一覧）">
          {(inbox ?? []).map((s: any) => (
            <div key={s.id} style={{ padding: 8, borderBottom: "1px solid #eee" }}>
              <b>{s.employees?.name}</b> / {s.status} / 締切: {s.evaluation_cycles?.due_date ?? "-"}{" "}
              <Link href={`/evaluation/sheets/${s.id}`}>評価する</Link>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

function HrDash({ sheets }: any) {
  const kpi = {
    draft: (sheets ?? []).filter((x: any) => x.status === "draft").length,
    submitted: (sheets ?? []).filter((x: any) => x.status === "submitted").length,
    final_review: (sheets ?? []).filter((x: any) => x.status === "final_review").length,
    finalized: (sheets ?? []).filter((x: any) => x.status === "finalized").length,
    returned: (sheets ?? []).filter((x: any) => x.status === "returned").length,
  };

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
        <Card title="未提出（draft）">{kpi.draft}</Card>
        <Card title="一次待ち（submitted）">{kpi.submitted}</Card>
        <Card title="最終待ち（final_review）">{kpi.final_review}</Card>
        <Card title="確定（finalized）">{kpi.finalized}</Card>
        <Card title="差戻し（returned）">{kpi.returned}</Card>
      </div>

      <div style={{ marginTop: 12 }}>
        <Card title="進捗一覧（今期・上位200）">
          {(sheets ?? []).slice(0, 50).map((s: any) => (
            <div key={s.id} style={{ padding: 8, borderBottom: "1px solid #eee" }}>
              <b>{s.employees?.name}</b> / status: {s.status}{" "}
              <Link href={`/evaluation/sheets/${s.id}`}>詳細</Link>
            </div>
          ))}
          <div style={{ marginTop: 8 }}>
            <Link href="/admin/evaluation/progress">進捗ページへ</Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ---- 集計の簡易ヘルパー（見た目用） ----
function sumPointsForLatestWeek(logs: any[]) {
  if (!logs?.length) return 0;
  const latestWeek = logs[0].week_start;
  return logs
    .filter((l) => l.week_start === latestWeek)
    .reduce((acc, l) => acc + Number(l.points ?? 0), 0);
}
function sumPointsForMonth(logs: any[]) {
  if (!logs?.length) return 0;
  const month = String(logs[0].week_start).slice(0, 7);
  return logs
    .filter((l) => String(l.week_start).slice(0, 7) === month)
    .reduce((acc, l) => acc + Number(l.points ?? 0), 0);
}
