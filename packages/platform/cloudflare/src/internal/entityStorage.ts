/**
 * Storage glue for the entity Durable Object constructor. The constructor must
 * stay cheap: open SQLite, ensure the mailbox tables, and re-arm the single
 * alarm. No user handlers are built here.
 *
 * @internal
 */
import type { DurableObjectStorage, SqlStorage } from "@cloudflare/workers-types"
import * as Effect from "effect/Effect"
import * as Result from "effect/Result"

/** @internal */
export type EntityAlarm = Pick<DurableObjectStorage, "getAlarm" | "setAlarm">

/**
 * Runs a synchronous storage effect inside `transactionSync`. A defect throws
 * out of the callback and rolls the transaction back; a typed failure happens
 * before any write in the mailbox operations, so it is carried out as a plain
 * failure.
 *
 * @internal
 */
export const withTransaction = <A, E>(
  storage: Pick<DurableObjectStorage, "transactionSync">,
  effect: Effect.Effect<A, E>
): Effect.Effect<A, E> =>
  Effect.suspend(() => {
    const result = storage.transactionSync(() => Effect.runSync(Effect.result(effect)))
    return Result.isSuccess(result) ? Effect.succeed(result.success) : Effect.fail(result.failure)
  })

const ddl = [
  `CREATE TABLE IF NOT EXISTS cluster_messages (
    request_id TEXT PRIMARY KEY,
    message_id TEXT UNIQUE,
    envelope TEXT NOT NULL,
    discard INTEGER NOT NULL DEFAULT 0,
    processed INTEGER NOT NULL DEFAULT 0,
    last_reply_id TEXT,
    deliver_at INTEGER,
    reply_to TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS cluster_replies (
    reply_id TEXT PRIMARY KEY,
    request_id TEXT NOT NULL,
    reply TEXT NOT NULL,
    kind TEXT NOT NULL,
    sequence INTEGER,
    acked INTEGER NOT NULL DEFAULT 0,
    UNIQUE (request_id, sequence)
  )`,
  `CREATE INDEX IF NOT EXISTS cluster_messages_deliver_at_idx
    ON cluster_messages (processed, deliver_at)`,
  `CREATE INDEX IF NOT EXISTS cluster_replies_unacked_idx
    ON cluster_replies (request_id) WHERE kind = 'Chunk' AND acked = 0`
]

/** @internal */
export const ensureEntityStorage = (sql: SqlStorage): void => {
  for (const statement of ddl) {
    sql.exec(statement)
  }
}

/** @internal */
export const earliestDeliverAt = (sql: SqlStorage): number | undefined => {
  const rows = sql.exec(
    "SELECT min(deliver_at) AS deliver_at FROM cluster_messages WHERE processed = 0 AND deliver_at IS NOT NULL"
  ).toArray()
  const deliverAt = rows[0]?.deliver_at
  return typeof deliverAt === "number" ? deliverAt : undefined
}

/** @internal */
export const armAlarm = (alarm: EntityAlarm, deliverAt: number): Effect.Effect<void> =>
  Effect.promise(() => alarm.getAlarm()).pipe(
    Effect.flatMap((current) =>
      current === null || current > deliverAt
        ? Effect.promise(() => alarm.setAlarm(deliverAt))
        : Effect.void
    )
  )
