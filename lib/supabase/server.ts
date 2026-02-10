import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function createSupabaseServer() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // ✅ getAllが無い環境対策：getで必要なcookieだけ取る
        get(name: string) {
          return cookieStore.get(name)?.value;
        },

        // ✅ setAllが無い環境対策：setを1件ずつ実行
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Server Component から set できないケースがあるので握りつぶす
            // （middlewareやroute handlerで実施する構成ならここは問題になりません）
          }
        },

        // ✅ 互換のためのダミー（ライブラリが呼ぶ場合に備える）
        remove(name: string, options: any) {
          try {
            cookieStore.set({ name, value: "", ...options, maxAge: 0 });
          } catch {}
        },
      },
    }
  );
}
