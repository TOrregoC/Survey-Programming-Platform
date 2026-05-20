import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(5000),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(16),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_TTL: z.string().default("7d"),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  REDIS_URL: z.string().url().optional(),
  WEBHOOK_SIGNING_SECRET: z.string().min(16).default("dev-webhook-secret-change-me"),
  WEBHOOK_MAX_RETRIES: z.coerce.number().int().nonnegative().default(5),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;
export function getEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("Invalid environment variables:", parsed.error.flatten());
    process.exit(1);
  }
  cached = parsed.data;
  return cached;
}
