import { createSupabaseServer } from "@/lib/supabase/server";

export type AppRole = "employee" | "manager" | "hr" | "admin";

const ROLE_ALIASES: Record<string, AppRole> = {
  employee: "employee",
  manager: "manager",
  hr: "hr",
  human_resources: "hr",
  admin: "admin",
  administrator: "admin",
};

export function normalizeRole(role: unknown): AppRole | null {
  if (typeof role !== "string") return null;
  const normalized = role.trim().toLowerCase();
  return ROLE_ALIASES[normalized] ?? null;
}

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
  const normalizedRole = normalizeRole((data as any)?.role);
  if (!normalizedRole) return null;

  return {
    id: data.id,
    name: data.name,
    role: normalizedRole,
    org_unit_id: data.org_unit_id,
    position_id: data.position_id,
  } as {
    id: string;
    name: string;
    role: AppRole;
    org_unit_id: string | null;
    position_id: string | null;
  };
}

export function requireRole(me: { role: AppRole } | null, roles: AppRole[]) {
  if (!me) return false;
  const normalizedRole = normalizeRole(me.role);
  if (!normalizedRole) return false;
  if (normalizedRole === "admin") return true;
  return roles.includes(normalizedRole);
}
