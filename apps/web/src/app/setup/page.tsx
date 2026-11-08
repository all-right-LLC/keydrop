import { PoweredBy } from "@/components/site/powered-by";
import { BrandWordmark } from "@/components/site/brand-logo";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { runtime } from "@/lib/server/env";
import { AuthForm } from "@/components/auth/auth-form";
export const dynamic = "force-dynamic";
export default async function Setup() {
  const { env } = await runtime();
  if (await env.DB.prepare("SELECT id FROM installation WHERE id = 1").first()) redirect("/sign-in");
  const t = await getTranslations();
  return <main className="auth-shell"><Link className="wordmark" href="/"><BrandWordmark label={t("common.brand")}/></Link><section className="auth-card"><h1>{t("setup.title")}</h1><p className="intro">{t("setup.description")}</p><AuthForm setup /></section><PoweredBy/></main>;
}
