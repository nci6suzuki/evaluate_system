"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function LoginPage() {
  const supabase = supabaseBrowser();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // すでにログイン済みなら/dashboardへ
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session?.access_token) location.href = "/dashboard";
    })();
  }, []);

  async function signIn() {
    setLoading(true);
    setMsg(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      setMsg(error.message);
      return;
    }
    location.href = "/dashboard";
  }

  async function sendMagicLink() {
    setLoading(true);
    setMsg(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/dashboard` },
    });
    setLoading(false);

    if (error) setMsg(error.message);
    else setMsg("メールを送信しました（リンクからログインできます）。");
  }

  return (
    <div style={{ padding: 24, maxWidth: 420 }}>
      <h1>ログイン</h1>

      <div style={{ display: "grid", gap: 8 }}>
        <label>メール</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} />

        <label>パスワード</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button onClick={signIn} disabled={loading || !email || !password}>
            パスワードでログイン
          </button>
          <button onClick={sendMagicLink} disabled={loading || !email}>
            メールリンクでログイン
          </button>
        </div>

        {msg && <div style={{ marginTop: 8, color: "red" }}>{msg}</div>}
        <div style={{ marginTop: 12, color: "#666", fontSize: 12 }}>
          ※ まずはSupabase Authにユーザーを作成してください（SupabaseのAuthentication画面）。
        </div>
      </div>
    </div>
  );
}
