"use client";

import { CSSProperties, useEffect, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";
import { fetchDashboardPayload } from "./actions";

type Role = "employee" | "manager" | "hr";

const shellStyle: CSSProperties = {
  minHeight: "100vh",
  background: "linear-gradient(180deg, #f4f7fb 0%, #eef3ff 100%)",
  padding: "28px 20px 40px",
  color: "#13233a",
  fontFamily:
    'Inter, "Noto Sans JP", "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif',
};

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 14,
};

const cardStyle: CSSProperties = {
  background: "#fff",
  borderRadius: 14,
  border: "1px solid #d9e2f2",
  boxShadow: "0 8px 24px rgba(19, 35, 58, 0.06)",
  padding: 18,
};

export default function DashboardEntry() {
  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = supabaseBrowser();
      const { data } = await supabase.auth.getSession();

      const token = data.session?.access_token;
      if (!token) {
        location.href = "/login";
        return;
      }

      const res = await fetchDashboardPayload(token);
      if (res.error) setErr(res.error);
      else setPayload(res.data);

      setLoading(false);
    })();
  }, []);

  if (loading) return <div style={{ padding: 24 }}>Loading...</div>;
  if (err) return <div style={{ padding: 24, color: "#c31f2f" }}>{err}</div>;
  if (!payload) return <div style={{ padding: 24 }}>データがありません。</div>;

  const me = payload?.me as { name: string; role: Role } | undefined;
  const activeCycle = payload?.cycles?.[0];
  const cycleCount = payload?.cycles?.length ?? 0;

  const kpis = [
    { label: "アクティブ評価期", value: activeCycle?.name ?? "未設定" },
    {
      label: "締切日",
      value: activeCycle?.due_date ? String(activeCycle.due_date) : "未設定",
    },
    { label: "評価期数", value: `${cycleCount} 件` },
    { label: "ロール", value: me?.role ?? "-" },
  ];

  const quickLinks = getQuickLinksByRole(me?.role);

  const sideLinks = getNavItemsByRole(me?.role);
  const quickActions = getQuickActionsByRole(me?.role);

  return (
    <main style={shellStyle}>
      <section
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "250px minmax(0, 1fr)",
          gap: 16,
          alignItems: "start",
        }}
      >
        <aside style={{ ...cardStyle, position: "sticky", top: 16 }}>
          <h2 style={{ marginTop: 0, marginBottom: 10, fontSize: 17 }}>メニュー</h2>
          <nav style={{ display: "grid", gap: 8 }}>
            {sideLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  textDecoration: "none",
                  color: "#12325f",
                  border: "1px solid #d6e1f2",
                  borderRadius: 10,
                  padding: "9px 11px",
                  background: "#f8fbff",
                  fontWeight: 600,
                }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        <div>
          <header
            style={{
              ...cardStyle,
              background: "linear-gradient(110deg, #1e3a8a 0%, #2563eb 70%)",
              color: "#fff",
              marginBottom: 16,
            }}
          >
            <p style={{ margin: 0, opacity: 0.9, fontSize: 13 }}>HR Performance Hub</p>
            <h1 style={{ margin: "8px 0 6px", fontSize: 28 }}>人事評価ダッシュボード</h1>
            <p style={{ margin: 0, opacity: 0.95 }}>
              {me?.name ?? "-"} さん、お疲れさまです。評価サイクルと進捗を確認しましょう。
            </p>
          </header>

          <section style={gridStyle}>
            {kpis.map((kpi) => (
              <article key={kpi.label} style={cardStyle}>
                <p style={{ margin: 0, color: "#567", fontSize: 13 }}>{kpi.label}</p>
                <p style={{ margin: "8px 0 0", fontSize: 22, fontWeight: 700 }}>{kpi.value}</p>
              </article>
            ))}
          </section>

          <section style={{ ...cardStyle, marginTop: 16 }}>
            <h2 style={{ marginTop: 0, marginBottom: 12, fontSize: 18 }}>クイックアクション</h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {quickActions.map((item) => (
                <QuickLink key={item.href} href={item.href} label={item.label} />
              ))}
            </div>
          </section>

          <section style={{ ...cardStyle, marginTop: 16 }}>
            <h2 style={{ marginTop: 0, marginBottom: 12, fontSize: 18 }}>評価期のタイムライン</h2>
            <div style={{ display: "grid", gap: 8 }}>
              {(payload?.cycles ?? []).slice(0, 8).map((cycle: any) => (
                <div
                  key={cycle.id}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid #e2e8f5",
                    display: "flex",
                    justifyContent: "space-between",
                    background: "#fbfdff",
                  }}
                >
                  <div>
                    <b>{cycle.name}</b>
                    <span style={{ color: "#64748b", marginLeft: 8 }}>status: {cycle.status}</span>
                  </div>
                  <span style={{ color: "#334155" }}>締切: {cycle.due_date ?? "未設定"}</span>
                </div>
              ))}
              {!payload?.cycles?.length && <p style={{ margin: 0 }}>評価期がまだ作成されていません。</p>}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      style={{
        textDecoration: "none",
        padding: "10px 14px",
        borderRadius: 999,
        border: "1px solid #c9d6ed",
        background: "#f7faff",
        color: "#1d4ed8",
        fontWeight: 600,
      }}
    >
      {label}
    </Link>
  );
}

function getNavItemsByRole(role?: Role) {
  switch (role) {
    case "employee":
      return [
        { href: "/dashboard", label: "ダッシュボード" },
        { href: "/my/evaluation", label: "自分の評価" },
        { href: "/my/tasks/weekly", label: "週次実績" },
      ];
    case "manager":
      return [
        { href: "/dashboard", label: "ダッシュボード" },
        { href: "/evaluation/inbox", label: "受信箱" },
      ];
    case "hr":
      return [
        { href: "/dashboard", label: "ダッシュボード" },
        { href: "/evaluation/inbox", label: "受信箱" },
        { href: "/admin/evaluation/progress", label: "評価進捗" },
        { href: "/admin/evaluation/templates", label: "テンプレート管理" },
        { href: "/admin/evaluation/cycles", label: "評価期設定" },
      ];
    default:
      return [{ href: "/dashboard", label: "ダッシュボード" }];
  }
}

function getQuickActionsByRole(role?: Role) {
  switch (role) {
    case "employee":
      return [
        { href: "/my/evaluation", label: "自分の評価へ" },
        { href: "/my/tasks/weekly", label: "週次実績を入力" },
      ];
    case "manager":
      return [{ href: "/evaluation/inbox", label: "承認待ち一覧" }];
    case "hr":
      return [
        { href: "/evaluation/inbox", label: "承認待ち一覧" },
        { href: "/admin/evaluation/progress", label: "評価進捗" },
        { href: "/admin/evaluation/templates", label: "テンプレート管理" },
        { href: "/admin/evaluation/cycles", label: "評価期設定" },
      ];
    default:
      return [{ href: "/dashboard", label: "ダッシュボード" }];
  }
}

function getQuickLinksByRole(role: Role | undefined) {
  const commonLinks = [
    { href: "/my/evaluation", label: "自分の評価" },
    { href: "/my/tasks/weekly", label: "週次実績入力" },
  ];

  if (role === "manager") {
    return [...commonLinks, { href: "/evaluation/inbox", label: "承認待ち一覧" }];
  }

  if (role === "hr") {
    return [
      ...commonLinks,
      { href: "/evaluation/inbox", label: "承認待ち一覧" },
      { href: "/admin/evaluation/progress", label: "評価進捗" },
      { href: "/admin/evaluation/templates", label: "テンプレート管理" },
      { href: "/admin/evaluation/cycles", label: "評価期設定" },
    ];
  }

  return commonLinks;
}
