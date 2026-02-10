import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getMyEmployeeProfile } from "@/lib/auth/roles";
import SheetClient from "./sheet-client";

export default async function SheetPage({ params }: { params: { sheetId: string } }) {
  const me = await getMyEmployeeProfile();
  if (!me) redirect("/login");

  const supabase = await createSupabaseServer();

  // シート（RLSで見えないなら null になる）
  const { data: sheet, error } = await supabase
    .from("evaluation_sheets")
    .select(`
      id,status,submitted_at,finalized_at,
      employees:employee_id(id,name),
      evaluation_cycles:cycle_id(id,name,due_date)
    `)
    .eq("id", params.sheetId)
    .single();

  if (error || !sheet) redirect("/dashboard");

  // スコア一覧（項目+基準点も読む：UIで表示）
  const { data: scores } = await supabase
    .from("evaluation_scores")
    .select(`
      id,
      item_id,
      manager_score_point,manager_comment,
      final_score_point,final_comment,
      self_comment,
      evaluation_items:item_id(
        id,item_name,weight,unit,sort_order,
        evaluation_item_levels(score_point,criterion_value)
      )
    `)
    .eq("sheet_id", params.sheetId);

  // 履歴
  const { data: actions } = await supabase
    .from("workflow_actions")
    .select("id,action,note,created_at,actor_employee_id")
    .eq("sheet_id", params.sheetId)
    .order("created_at", { ascending: false });

  return (
    <div style={{ padding: 24 }}>
      <SheetClient me={me} sheet={sheet} scores={scores ?? []} actions={actions ?? []} />
    </div>
  );
}
