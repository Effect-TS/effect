/**
 * Storage glue for the entity Durable Object constructor. The constructor must
 * stay cheap: open SQLite, ensure the mailbox tables, and re-arm the single
 * alarm. No user handlers are built here.
 *
 * @internal
 */

/** @internal */
export interface EntitySql {
  exec(query: string, ...bindings: Array<unknown>): {
    toArray(): Array<Record<string, unknown>>
  }
}

/** @internal */
export interface EntityAlarm {
  getAlarm(): Promise<number | null>
  setAlarm(scheduledTime: number): Promise<unknown>
}

const ddl = [
  `CREATE TABLE IF NOT EXISTS cluster_messages (
    request_id TEXT PRIMARY KEY,
    message_id TEXT UNIQUE,
    tag TEXT NOT NULL,
    payload TEXT,
    headers TEXT,
    trace_id TEXT,
    span_id TEXT,
    sampled INTEGER,
    processed INTEGER NOT NULL DEFAULT 0,
    last_reply_id TEXT,
    deliver_at INTEGER
  )`,
  `CREATE TABLE IF NOT EXISTS cluster_replies (
    reply_id TEXT PRIMARY KEY,
    request_id TEXT NOT NULL,
    kind INTEGER NOT NULL,
    payload TEXT NOT NULL,
    sequence INTEGER,
    acked INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE INDEX IF NOT EXISTS cluster_messages_deliver_at_idx
    ON cluster_messages (processed, deliver_at)`,
  `CREATE INDEX IF NOT EXISTS cluster_replies_request_id_idx
    ON cluster_replies (request_id)`
]

/** @internal */
export const ensureEntityStorage = (sql: EntitySql): void => {
  for (const statement of ddl) {
    sql.exec(statement)
  }
}

/** @internal */
export const rearmAlarm = async (alarm: EntityAlarm, sql: EntitySql): Promise<void> => {
  const rows = sql.exec(
    "SELECT min(deliver_at) AS deliver_at FROM cluster_messages WHERE processed = 0 AND deliver_at IS NOT NULL"
  ).toArray()
  const deliverAt = rows[0]?.deliver_at
  if (typeof deliverAt !== "number") return
  const current = await alarm.getAlarm()
  if (current === null || current > deliverAt) {
    await alarm.setAlarm(deliverAt)
  }
}
