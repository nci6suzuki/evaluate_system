import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function parseCSV(text: string) {
  // 超簡易CSV（カンマ区切り、ダブルクォート最低限対応）
  const lines = text.split(/\r?\n/).filter(Boolean);
  const header = splitCSVLine(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const cols = splitCSVLine(line);
    const obj: any = {};
    header.forEach((h, i) => (obj[h] = cols[i] ?? null));
    return obj;
  });
  return rows;
}

function splitCSVLine(line: string) {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"' && line[i - 1] !== "\\") inQ = !inQ;
    else if (ch === "," && !inQ) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.replace(/^"|"$/g, "").trim());
}

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "file required" }, { status: 400 });

  const csvText = await file.text();
  const rows = parseCSV(csvText);

  // service role（サーバーのみ）
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1) stgをクリア（運用により：追記方式でもOK）
  await supabase.from("stg_eval_template_rows").delete().neq("id", 0);

  // 2) insert（weightなど型変換）
  const payload = rows.map((r: any) => ({
    department: r.department,
    position: r.position,
    role_name: r.role_name,
    period: r.period ?? null,
    state_desc: r.state_desc ?? null,
    weight: r.weight ? Number(r.weight) : 0,
    unit: r.unit ?? null,
    s0: r.s0 ?? null, s10: r.s10 ?? null, s20: r.s20 ?? null, s30: r.s30 ?? null,
    s40: r.s40 ?? null, s50: r.s50 ?? null, s60: r.s60 ?? null, s70: r.s70 ?? null,
    s80: r.s80 ?? null, s90: r.s90 ?? null, s100: r.s100 ?? null,
  }));

  const { error: e1 } = await supabase.from("stg_eval_template_rows").insert(payload);
  if (e1) return NextResponse.json({ error: e1.message }, { status: 500 });

  // 3) import関数実行
  const { error: e2 } = await supabase.rpc("import_eval_templates_from_staging");
  if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });

  return NextResponse.redirect(new URL("/admin/evaluation/templates", req.url));
}
