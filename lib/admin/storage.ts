import "server-only";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = ReturnType<typeof import("@supabase/supabase-js").createClient<any>>;
import { createClient } from "@supabase/supabase-js";
import type { TableSizeRow, StorageMonitor, StorageStatus } from "./types";

const SUPABASE_FREE_TIER_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB

const TRACKED_TABLES = [
  "collatz_results",
  "collatz_activity_logs",
  "collatz_range_summaries",
  "collatz_record_events",
  "collatz_archive_manifests",
  "collatz_engine_state",
  "collatz_engine_runtime_config",
  "collatz_integrity_runs",
] as const;

// Conservative bytes-per-row estimate for each table (used when pg_statio unavailable)
const BYTES_PER_ROW: Record<string, number> = {
  collatz_results: 64,
  collatz_activity_logs: 512,
  collatz_range_summaries: 256,
  collatz_record_events: 256,
  collatz_archive_manifests: 512,
  collatz_engine_state: 256,
  collatz_engine_runtime_config: 256,
  collatz_integrity_runs: 512,
};

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function getAnonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export function storageStatus(bytes: number): StorageStatus {
  if (bytes >= 1.9 * 1024 ** 3) return "pause";
  if (bytes >= 1.8 * 1024 ** 3) return "critical";
  if (bytes >= 1.5 * 1024 ** 3) return "warning";
  if (bytes >= 1.2 * 1024 ** 3) return "watch";
  return "safe";
}

async function getRowCounts(client: AnySupabaseClient): Promise<Map<string, number | null>> {
  const counts = new Map<string, number | null>();
  await Promise.all(
    TRACKED_TABLES.map(async (table) => {
      try {
        const { count, error } = await client
          .from(table)
          .select("*", { count: "exact", head: true });
        counts.set(table, error ? null : (count ?? 0));
      } catch {
        counts.set(table, null);
      }
    }),
  );
  return counts;
}

async function tryPgStatio(client: AnySupabaseClient): Promise<Map<string, number> | null> {
  try {
    const { data, error } = await client.rpc("admin_table_sizes");
    if (error || !data) return null;
    const map = new Map<string, number>();
    for (const row of data as Array<{ table_name: string; total_bytes: number }>) {
      map.set(row.table_name, row.total_bytes);
    }
    return map;
  } catch {
    return null;
  }
}

export async function getStorageMonitor(): Promise<StorageMonitor> {
  const client = getServiceClient() ?? getAnonClient();
  const fetchedAt = new Date().toISOString();

  if (!client) {
    return {
      estimatedUsedBytes: 0,
      limitBytes: SUPABASE_FREE_TIER_BYTES,
      percentUsed: 0,
      status: "safe",
      tableRows: TRACKED_TABLES.map((t) => ({
        tableName: t,
        estimatedRows: null,
        estimatedBytes: null,
        percentOfTracked: null,
        status: "unknown",
        exists: false,
      })),
      fetchedAt,
    };
  }

  const [rowCounts, pgStatio] = await Promise.all([
    getRowCounts(client),
    tryPgStatio(client),
  ]);

  const tableRows: TableSizeRow[] = TRACKED_TABLES.map((table) => {
    const rows = rowCounts.get(table) ?? null;
    const exists = rows !== null;
    const pgBytes = pgStatio?.get(table) ?? null;
    const estimatedBytes =
      pgBytes ?? (rows != null ? rows * (BYTES_PER_ROW[table] ?? 128) : null);

    return {
      tableName: table,
      estimatedRows: rows,
      estimatedBytes,
      percentOfTracked: null, // filled below
      status: exists ? (rows === 0 ? "ok" : rows > 1_000_000 ? "large" : "ok") : "not_found",
      exists,
    };
  });

  const totalTrackedBytes = tableRows.reduce(
    (sum, r) => sum + (r.estimatedBytes ?? 0),
    0,
  );

  for (const row of tableRows) {
    row.percentOfTracked =
      totalTrackedBytes > 0 && row.estimatedBytes != null
        ? Math.round((row.estimatedBytes / totalTrackedBytes) * 100)
        : null;
  }

  const estimatedUsedBytes = totalTrackedBytes;
  const percentUsed = Math.min(
    100,
    Math.round((estimatedUsedBytes / SUPABASE_FREE_TIER_BYTES) * 100 * 10) / 10,
  );

  return {
    estimatedUsedBytes,
    limitBytes: SUPABASE_FREE_TIER_BYTES,
    percentUsed,
    status: storageStatus(estimatedUsedBytes),
    tableRows,
    fetchedAt,
  };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(2)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(3)} GB`;
}
