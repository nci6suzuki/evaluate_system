import { redirect } from "next/navigation";
import { getMyEmployeeProfile, requireRole } from "@/lib/auth/roles";

export default async function ImportPage() {
  const me = await getMyEmployeeProfile();
  if (!requireRole(me, ["hr"])) redirect("/dashboard");

  return (
    <div style={{ padding: 24 }}>
      <h1>テンプレCSVインポート</h1>
      <p>
        CSVをアップロードすると、stg_eval_template_rows に投入後、
        import_eval_templates_from_staging() を実行して本テーブルへ反映します。
      </p>

      <form action="/api/templates/import" method="post" encType="multipart/form-data">
        <input type="file" name="file" accept=".csv" required />
        <button type="submit" style={{ marginLeft: 8 }}>
          アップロードして反映
        </button>
      </form>

      <hr style={{ margin: "16px 0" }} />

      <h3>CSV列（必須）</h3>
      <pre style={{ background: "#f7f7f7", padding: 12 }}>
department,position,role_name,period,state_desc,weight,unit,s0,s10,s20,s30,s40,s50,s60,s70,s80,s90,s100
      </pre>
    </div>
  );
}
