"use server";

import { createClient } from "@supabase/supabase-js";
import { getEffectiveRole } from "@/lib/auth/roles";

function createSupabaseServerWithToken(accessToken: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    }
  );
}

export async function fetchDashboardPayload(accessToken: string) {
  try {
    const supabase = createSupabaseServerWithToken(accessToken);

    const { data: auth, error: e0 } = await supabase.auth.getUser();
    if (e0 || !auth.user) return { error: "認証に失敗しました", data: null };

    const { data: me, error: e1 } = await supabase
      .from("employees")
      .select("id,name,role")
      .eq("user_id", auth.user.id)
      .single();

    if (e1) return { error: `employees取得エラー: ${e1.message}`, data: null };

    const normalizedRole = getEffectiveRole(me?.role);
    if (!normalizedRole) return { error: "ロール情報が不正です", data: null };

    const { data: cycles, error: e2 } = await supabase
      .from("evaluation_cycles")
      .select("id,name,due_date,status,start_date,end_date")
      .order("start_date", { ascending: false, nullsFirst: false });

    if (e2) return { error: `cycles取得エラー: ${e2.message}`, data: null };

    return { error: null, data: { me: { ...me, role: normalizedRole }, cycles } };
  } catch (e: any) {
    return { error: e?.message ?? "unknown error", data: null };
  }
}
