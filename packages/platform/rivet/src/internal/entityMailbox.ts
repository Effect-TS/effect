/**
 * SQLite mailbox primitives for a single entity actor, ported from the
 * Cloudflare mailbox onto Rivet's asynchronous SQL. Operations that read and
 * then write take the `tx` executor of one `EntityDatabase.transaction`.
 *
 * Scheduled delivery (`deliver_at`, `reply_to`) and stream chunk
 * acknowledgement are not ported; the columns stay so the schema matches.
 *
 * @internal
 */
import * as Effect from "effect/Effect"
import type { SqlExecutor } from "./entityStorage.ts"

/** @internal */
export const mailboxCapacity = 4096

/** @internal */
export const maximumEncodedSize = 2 * 1024 * 1024

/** @internal */
export class MailboxFullError extends Error {
  readonly _tag = "MailboxFull"
}

/** @internal */
export class EncodedMessageTooLargeError extends Error {
  readonly _tag = "EncodedMessageTooLarge"
}

/** @internal */
export type PersistResult = {
  readonly _tag: "Success"
} | {
  readonly _tag: "Duplicate"
  readonly originalId: string
  readonly processed: boolean
}

type ExistingMessageRow = {
  readonly request_id: string
  readonly processed: number
}

type CountRow = {
  readonly count: number
}

const textEncoder = new TextEncoder()

// A UTF-16 code unit encodes to at most 3 UTF-8 bytes, so most strings skip
// the byte-length copy.
const exceedsMaximumEncodedSize = (text: string): boolean =>
  text.length * 3 > maximumEncodedSize && textEncoder.encode(text).byteLength > maximumEncodedSize

/** @internal */
export const persistRequest = Effect.fnUntraced(function*(
  tx: SqlExecutor,
  requestId: string,
  envelopeText: string,
  primaryKey: string | null,
  discard: boolean
) {
  if (exceedsMaximumEncodedSize(envelopeText)) {
    return yield* Effect.fail(new EncodedMessageTooLargeError("Encoded entity request exceeds 2 MB"))
  }

  const existing = (yield* tx.execute<ExistingMessageRow>(
    `SELECT request_id, processed
     FROM cluster_messages
     WHERE request_id = ? OR (? IS NOT NULL AND message_id = ?)
     LIMIT 1`,
    requestId,
    primaryKey,
    primaryKey
  ))[0]
  if (existing !== undefined) {
    return {
      _tag: "Duplicate",
      originalId: existing.request_id,
      processed: Number(existing.processed) === 1
    } satisfies PersistResult as PersistResult
  }

  if ((yield* countUnprocessed(tx)) >= mailboxCapacity) {
    return yield* Effect.fail(new MailboxFullError("Entity mailbox has reached its 4096 request capacity"))
  }

  yield* tx.execute(
    `INSERT INTO cluster_messages
       (request_id, message_id, envelope, discard, processed, last_reply_id, deliver_at, reply_to)
     VALUES (?, ?, ?, ?, 0, NULL, NULL, NULL)`,
    requestId,
    primaryKey,
    envelopeText,
    discard ? 1 : 0
  )
  return { _tag: "Success" } satisfies PersistResult as PersistResult
})

/** @internal */
export const saveReply = Effect.fnUntraced(function*(tx: SqlExecutor, replyText: string) {
  if (exceedsMaximumEncodedSize(replyText)) {
    return yield* Effect.fail(new EncodedMessageTooLargeError("Encoded entity reply exceeds 2 MB"))
  }
  const reply = JSON.parse(replyText) as {
    readonly _tag?: unknown
    readonly requestId?: unknown
    readonly id?: unknown
  }
  if (reply._tag !== "WithExit" || typeof reply.requestId !== "string" || typeof reply.id !== "string") {
    return yield* Effect.die(new TypeError("Expected an encoded WithExit reply"))
  }
  yield* tx.execute(
    `INSERT OR IGNORE INTO cluster_replies
       (reply_id, request_id, reply, kind, sequence, acked)
     VALUES (?, ?, ?, 'WithExit', NULL, 0)`,
    reply.id,
    reply.requestId,
    replyText
  )
  yield* tx.execute(
    `UPDATE cluster_messages
     SET last_reply_id = ?, processed = 1
     WHERE request_id = ?`,
    reply.id,
    reply.requestId
  )
})

/** @internal */
export interface StoredMessage {
  readonly requestId: string
  readonly envelope: string
  readonly discard: boolean
}

type StoredMessageRow = {
  readonly request_id: string
  readonly envelope: string
  readonly discard: number
}

const rowToMessage = (row: StoredMessageRow): StoredMessage => ({
  requestId: row.request_id,
  envelope: row.envelope,
  discard: Number(row.discard) === 1
})

/** @internal */
export const loadUnprocessed = (sql: SqlExecutor): Effect.Effect<Array<StoredMessage>> =>
  Effect.map(
    sql.execute<StoredMessageRow>(
      `SELECT request_id, envelope, discard
       FROM cluster_messages
       WHERE processed = 0
       ORDER BY rowid ASC`
    ),
    (rows) => rows.map(rowToMessage)
  )

/** @internal */
export const loadUnprocessedIds = (sql: SqlExecutor): Effect.Effect<Array<string>> =>
  Effect.map(
    sql.execute<{ readonly request_id: string }>("SELECT request_id FROM cluster_messages WHERE processed = 0"),
    (rows) => rows.map((row) => row.request_id)
  )

/** @internal */
export const loadMessage = (sql: SqlExecutor, requestId: string): Effect.Effect<StoredMessage | undefined> =>
  Effect.map(
    sql.execute<StoredMessageRow>(
      `SELECT request_id, envelope, discard
       FROM cluster_messages
       WHERE request_id = ?
       LIMIT 1`,
      requestId
    ),
    (rows) => rows[0] === undefined ? undefined : rowToMessage(rows[0])
  )

/** @internal */
export const isProcessed = (sql: SqlExecutor, requestId: string): Effect.Effect<boolean> =>
  Effect.map(
    sql.execute<{ readonly processed: number }>(
      "SELECT processed FROM cluster_messages WHERE request_id = ? LIMIT 1",
      requestId
    ),
    (rows) => rows.length > 0 && Number(rows[0].processed) === 1
  )

/** @internal */
export const loadReply = (sql: SqlExecutor, requestId: string): Effect.Effect<string | undefined> =>
  Effect.map(
    sql.execute<{ readonly reply: string }>(
      `SELECT reply
       FROM cluster_replies
       WHERE request_id = ? AND kind = 'WithExit'
       LIMIT 1`,
      requestId
    ),
    (rows) => rows[0]?.reply
  )

/** @internal */
export const completeTell = (tx: SqlExecutor, requestId: string): Effect.Effect<void> =>
  Effect.asVoid(tx.execute(
    `UPDATE cluster_messages
     SET processed = 1, last_reply_id = NULL
     WHERE request_id = ?`,
    requestId
  ))

/** @internal */
export const clearReplies = (tx: SqlExecutor, requestId: string): Effect.Effect<void> =>
  Effect.andThen(
    tx.execute("DELETE FROM cluster_replies WHERE request_id = ?", requestId),
    tx.execute(
      `UPDATE cluster_messages
       SET processed = 0, last_reply_id = NULL
       WHERE request_id = ?`,
      requestId
    )
  ).pipe(Effect.asVoid)

/** @internal */
export const countUnprocessed = (sql: SqlExecutor): Effect.Effect<number> =>
  Effect.map(
    sql.execute<CountRow>("SELECT COUNT(*) AS count FROM cluster_messages WHERE processed = 0"),
    (rows) => Number(rows[0]?.count ?? 0)
  )
