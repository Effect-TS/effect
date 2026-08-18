/**
 * Storage glue for the durable queue Durable Object. The constructor must stay
 * cheap: open SQLite, ensure the queue table, and re-arm the single alarm from
 * the earliest pending lease expiry.
 *
 * Completed rows are retained (not deleted) so custom-id deduplication
 * survives completion, matching the SQL-backed store. A failed item moves to
 * the back of the queue, so a poisoned item cannot hot-loop the head while
 * still being retried ahead of items offered after its failure.
 *
 * @internal
 */
import type { SqlStorage } from "@cloudflare/workers-types"

const ddl = [
  `CREATE TABLE IF NOT EXISTS queue_items (
    id TEXT PRIMARY KEY,
    element TEXT NOT NULL,
    position INTEGER NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    completed INTEGER NOT NULL DEFAULT 0,
    lease_until INTEGER,
    last_failure TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS queue_items_take_idx
    ON queue_items (completed, position)`,
  `CREATE INDEX IF NOT EXISTS queue_items_lease_idx
    ON queue_items (lease_until)`
]

/** @internal */
export const ensureQueueStorage = (sql: SqlStorage): void => {
  for (const statement of ddl) {
    sql.exec(statement)
  }
}

/** @internal */
export interface QueueItem {
  readonly id: string
  readonly element: string
  readonly attempts: number
}

/** @internal */
export const offerItem = (sql: SqlStorage, id: string, element: string): void => {
  sql.exec(
    `INSERT OR IGNORE INTO queue_items (id, element, position)
     VALUES (?, ?, (SELECT IFNULL(MAX(position), 0) + 1 FROM queue_items))`,
    id,
    element
  )
}

/** @internal */
export const leaseNextItem = (
  sql: SqlStorage,
  now: number,
  leaseUntil: number,
  maxAttempts: number
): QueueItem | undefined => {
  const row = sql.exec(
    `SELECT id, element, attempts FROM queue_items
     WHERE completed = 0 AND attempts < ? AND (lease_until IS NULL OR lease_until <= ?)
     ORDER BY position ASC LIMIT 1`,
    maxAttempts,
    now
  ).toArray()[0]
  if (row === undefined) return undefined
  sql.exec("UPDATE queue_items SET lease_until = ? WHERE id = ?", leaseUntil, row.id)
  return { id: String(row.id), element: String(row.element), attempts: Number(row.attempts) }
}

/** @internal */
export const completeItem = (sql: SqlStorage, id: string): void => {
  sql.exec("UPDATE queue_items SET completed = 1, lease_until = NULL WHERE id = ?", id)
}

/** @internal */
export const failItem = (sql: SqlStorage, id: string, lastFailure: string): void => {
  sql.exec(
    `UPDATE queue_items
     SET attempts = attempts + 1, lease_until = NULL, last_failure = ?,
         position = (SELECT IFNULL(MAX(position), 0) + 1 FROM queue_items)
     WHERE id = ?`,
    lastFailure,
    id
  )
}

/** @internal */
export const releaseItem = (sql: SqlStorage, id: string): void => {
  sql.exec("UPDATE queue_items SET lease_until = NULL WHERE id = ?", id)
}

/** @internal */
export const extendLease = (sql: SqlStorage, id: string, leaseUntil: number): void => {
  sql.exec("UPDATE queue_items SET lease_until = ? WHERE id = ? AND lease_until IS NOT NULL", leaseUntil, id)
}

/** @internal */
export const expireLeases = (sql: SqlStorage, now: number): void => {
  sql.exec("UPDATE queue_items SET lease_until = NULL WHERE lease_until IS NOT NULL AND lease_until <= ?", now)
}

/** @internal */
export const earliestLeaseExpiry = (sql: SqlStorage): number | undefined => {
  const row = sql.exec(
    "SELECT min(lease_until) AS lease_until FROM queue_items WHERE lease_until IS NOT NULL"
  ).toArray()[0]
  const leaseUntil = row?.lease_until
  return typeof leaseUntil === "number" ? leaseUntil : undefined
}
