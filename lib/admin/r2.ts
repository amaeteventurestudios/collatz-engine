import "server-only";
import type { R2Config, R2Status } from "./types";

export function getR2Config(): R2Config {
  const bucket = process.env.CLOUDFLARE_R2_BUCKET ?? null;
  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID ?? null;
  const accessKey = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID ?? null;
  const secretKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY ?? null;
  const endpoint = process.env.CLOUDFLARE_R2_ENDPOINT ?? null;
  const publicBase = process.env.CLOUDFLARE_R2_PUBLIC_BASE_URL ?? null;

  const configured = !!(bucket && accountId && accessKey && secretKey);

  return {
    configured,
    bucketName: bucket,
    endpointConfigured: !!endpoint,
    publicBaseUrlConfigured: !!publicBase,
    archiveEnabled: process.env.COLLATZ_ARCHIVE_ENABLED === "true",
    archiveFormat: process.env.COLLATZ_ARCHIVE_FORMAT ?? "json",
    deleteAfterUpload: process.env.COLLATZ_ARCHIVE_DELETE_AFTER_UPLOAD === "true",
  };
}

export async function getR2Status(): Promise<R2Status> {
  const config = getR2Config();

  // Phase 1: report config state only — no live connection test
  return {
    config,
    connectionCheckedAt: null,
    lastManifest: null,
  };
}

export async function testR2Connection(): Promise<{
  ok: boolean;
  message: string;
}> {
  const config = getR2Config();
  if (!config.configured) {
    return { ok: false, message: "R2 credentials not configured" };
  }

  // Phase 2 will add actual S3-compatible client for bucket listing/metadata check.
  // Returning config-level confirmation for Phase 1.
  return {
    ok: true,
    message: `R2 configured: bucket=${config.bucketName ?? "unknown"}, endpoint=${config.endpointConfigured ? "set" : "not set"}`,
  };
}
