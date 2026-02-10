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

function isPermissionBypassEnabled() {
  const raw = process.env.AUTH_BYPASS?.trim().toLowerCase();
  if (raw === "true") return true;
  if (raw === "false") return false;

  // 開発中はデフォルトで権限バイパスON（本番はOFF）
  return process.env.NODE_ENV !== "production";
}

function getBypassRole(): AppRole {
  const normalized = normalizeRole(process.env.AUTH_BYPASS_ROLE);
  return normalized ?? "admin";
}

export function getEffectiveRole(role: unknown): AppRole | null {
  if (isPermissionBypassEnabled()) {
    return getBypassRole();
  }

  return normalizeRole(role);
}

export function normalizeRole(role: unknown): AppRole | null {
  if (typeof role !== "string") return null;
  const normalized = role.trim().toLowerCase();
  return ROLE_ALIASES[normalized] ?? null;
}

export async function getMyEmployeeProfile() {
  const supabase = await createSupabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  if (isPermissionBypassEnabled()) {
    const bypassRole = getBypassRole();
    const { data } = await supabase
      .from("employees")
      .select("id,name,org_unit_id,position_id")
      .eq("user_id", auth.user.id)
      .maybeSingle();

    return {
      id: data?.id ?? auth.user.id,
      name: data?.name ?? auth.user.email ?? "Permission Bypass User",
      role: bypassRole,
      org_unit_id: data?.org_unit_id ?? null,
      position_id: data?.position_id ?? null,
    } as {
      id: string;
      name: string;
      role: AppRole;
      org_unit_id: string | null;
      position_id: string | null;
    };
  }

  const { data, error } = await supabase
    .from("employees")
    .select("id,name,role,org_unit_id,position_id")
    .eq("user_id", auth.user.id)
    .single();

  if (error) return null;
  const normalizedRole = getEffectiveRole((data as any)?.role);
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
  if (isPermissionBypassEnabled()) return true;
  const normalizedRole = getEffectiveRole(me.role);
  if (!normalizedRole) return false;
  if (normalizedRole === "admin") return true;
  return roles.includes(normalizedRole);
}
