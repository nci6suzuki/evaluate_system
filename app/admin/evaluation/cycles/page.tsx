import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getMyEmployeeProfile, requireRole } from "@/lib/auth/roles";
import CycleCreateForm from "./cycle-create-form";

export default async function CyclesPage() {
  const me = await getMyEmployeeProfile();
  if (!requireRole(me, ["hr"])) redirect("/dashboard");

  const supabase = createSupabaseServer();

  const { data: cycles } = await supabase
    .from("evaluation_cycles")
    .select("id,name,start_date,end_date,due_date,status,created_at")
    .order("created_at", { ascending: false });

  return (
    <div style={{ padding: 24 }}>
      <h1>評価期管理</h1>

      <CycleCreateForm />

      <h3 style={{ marginTop: 24 }}>期一覧</h3>
      <div style={{ border: "1px solid #ddd" }}>
        {(cycles ?? []).map((c) => (
          <div key={c.id} style={{ padding: 12, borderBottom: "1px solid #eee" }}>
            <b>{c.name}</b>（{c.status}）締切: {c.due_date ?? "-"}
          </div>
        ))}
      </div>
    </div>
  );
}
