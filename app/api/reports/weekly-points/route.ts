import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getMyEmployeeProfile, requireRole } from "@/lib/auth/roles";

export async function GET() {
  const me = await getMyEmployeeProfile();
  if (!requireRole(me, ["hr"])) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("task_logs")
    .select(`
      week_start,quantity,points,
      employees:employee_id(name,org_units:org_unit_id(name))
    `)
    .order("week_start", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const grouped = new Map<string, { week: string; employee: string; dept: string; quantity: number; points: number }>();

  for (const row of data ?? []) {
    const emp = Array.isArray(row.employees) ? row.employees[0] : row.employees;
    const deptRef = Array.isArray(emp?.org_units) ? emp.org_units[0] : emp?.org_units;
    const employee = emp?.name ?? "-";
    const dept = deptRef?.name ?? "-";
    const key = `${row.week_start}|${employee}`;
    const cur = grouped.get(key) ?? {
      week: row.week_start,
      employee,
      dept,
      quantity: 0,
      points: 0,
    };
    cur.quantity += Number(row.quantity ?? 0);
    cur.points += Number(row.points ?? 0);
    grouped.set(key, cur);
  }

  const lines = ["week_start,employee,department,total_quantity,total_points"];
  for (const r of grouped.values()) {
    lines.push(`${r.week},"${r.employee}","${r.dept}",${r.quantity},${r.points}`);
  }

  const csv = lines.join("\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="weekly_points.csv"`,
    },
  });
}