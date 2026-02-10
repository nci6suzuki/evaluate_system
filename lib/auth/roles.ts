import { createSupabaseServer } from "@/lib/supabase/server";

export type AppRole = "employee" | "manager" | "hr";

export async function getMyEmployeeProfile() {
  const supabase = await createSupabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const { data, error } = await supabase
    .from("employees")
    .select("id,name,role,org_unit_id,position_id")
    .eq("user_id", auth.user.id)
    .single();

  if (error) return null;
  return data as {
    id: string;
    name: string;
    role: AppRole;
    org_unit_id: string | null;
    position_id: string | null;
  };
}

export function requireRole(me: { role: AppRole } | null, roles: AppRole[]) {
  if (!me) return false;
  return roles.includes(me.role);
}
