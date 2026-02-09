import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getMyEmployeeProfile, requireRole } from "@/lib/auth/roles";
import TemplatesClient from "./templates-client";

export default async function TemplatesPage() {
  const me = await getMyEmployeeProfile();
  if (!requireRole(me, ["hr"])) redirect("/dashboard");

  const supabase = createSupabaseServer();

  const { data: orgs } = await supabase.from("org_units").select("id,name").order("name");
  const { data: positions } = await supabase.from("positions").select("id,name").order("name");

  const { data: templates } = await supabase
    .from("evaluation_templates")
    .select(`
      id,org_unit_id,position_id,version,is_active,created_at,
      org_units:org_unit_id(id,name),
      positions:position_id(id,name)
    `)
    .order("created_at", { ascending: false });

  return (
    <div style={{ padding: 24 }}>
      <h1>制度テンプレ管理</h1>
      <TemplatesClient orgs={orgs ?? []} positions={positions ?? []} templates={templates ?? []} />
    </div>
  );
}
