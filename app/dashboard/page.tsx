import { redirect } from "next/navigation";
import { getMyEmployeeProfile } from "@/lib/auth/roles";

export default async function DashboardPage() {
  const me = await getMyEmployeeProfile();
  if (!me) redirect("/login");

  if (me.role === "hr") redirect("/admin/evaluation/progress");
  if (me.role === "manager") redirect("/evaluation/inbox");
  redirect("/my/evaluation");
}
