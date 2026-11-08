import { z } from "zod";

const schema = z.object({
  APP_URL: z.url().refine((v) => {
    const u = new URL(v);
    return u.origin === v && (u.protocol === "https:" || (u.protocol === "http:" && ["localhost", "127.0.0.1"].includes(u.hostname)));
  }),
  ADMIN_EMAIL: z.email().transform((v) => v.toLowerCase()),
  BETTER_AUTH_SECRET: z.string().min(32),
  SETUP_SECRET: z.string().min(32),
  EMAIL_FROM: z.email().optional(),
});

export type Settings = z.infer<typeof schema>;
export function readSettings(env: Record<string, unknown>): Settings {
  const result = schema.safeParse(env);
  if (!result.success) {
    // 僅回報缺少的欄位，絕不帶入密鑰值。
    throw new Error(`Configuration required: ${result.error.issues.map((i) => i.path.join(".")).join(", ")}`);
  }
  return result.data;
}
