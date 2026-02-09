"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { fetchDashboardPayload } from "./actions";

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
  if (err) return <div style={{ padding: 24, color: "red" }}>{err}</div>;

  return (
    <div style={{ padding: 24 }}>
      <h1>Dashboard（デバッグ表示）</h1>
      <pre style={{ background: "#f6f6f6", padding: 12 }}>
        {JSON.stringify(payload, null, 2)}
      </pre>
    </div>
  );
}
