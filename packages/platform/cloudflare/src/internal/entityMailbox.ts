/**
 * SQLite mailbox primitives for a single entity Durable Object.
 *
 * @internal
 */
import type { SqlStorage } from "@cloudflare/workers-types"

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
  readonly lastReceivedReply: string | undefined
  readonly processed: boolean
}

const textEncoder = new TextEncoder()

const encodedSize = (text: string): number => textEncoder.encode(text).byteLength

/** @internal */
export const persistRequest = (
  sql: SqlStorage,
  envelopeText: string,
  primaryKey: string | null,
  discard = false,
  deliverAt: number | null = null,
  replyTo: string | null = null
): PersistResult => {
  if (encodedSize(envelopeText) > maximumEncodedSize) {
    throw new EncodedMessageTooLargeError("Encoded entity request exceeds 2 MB")
  }
  const envelope = JSON.parse(envelopeText) as { readonly _tag?: unknown; readonly requestId?: unknown }
  if (envelope._tag !== "Request" || typeof envelope.requestId !== "string") {
    throw new TypeError("Expected an encoded Request envelope")
  }

  const existing = sql.exec(
    `SELECT m.request_id, m.processed, r.reply AS last_reply
     FROM cluster_messages m
     LEFT JOIN cluster_replies r ON r.reply_id = m.last_reply_id
     WHERE m.request_id = ? OR (? IS NOT NULL AND m.message_id = ?)
     LIMIT 1`,
    envelope.requestId,
    primaryKey,
    primaryKey
  ).toArray()[0]
  if (existing !== undefined) {
    if (replyTo !== null && Number(existing.processed) === 0) {
      sql.exec(
        "UPDATE cluster_messages SET reply_to = ? WHERE request_id = ?",
        replyTo,
        String(existing.request_id)
      )
    }
    return {
      _tag: "Duplicate",
      originalId: String(existing.request_id),
      lastReceivedReply: typeof existing.last_reply === "string" ? existing.last_reply : undefined,
      processed: Number(existing.processed) === 1
    }
  }

  const count = sql.exec(
    `SELECT COUNT(*) AS count
     FROM cluster_messages m
     WHERE m.processed = 0 OR EXISTS (
       SELECT 1 FROM cluster_replies r
       WHERE r.request_id = m.request_id AND r.kind = 'Chunk' AND r.acked = 0
     )`
  ).toArray()[0]?.count
  if (Number(count) >= mailboxCapacity) {
    throw new MailboxFullError("Entity mailbox has reached its 4096 request capacity")
  }

  sql.exec(
    `INSERT INTO cluster_messages
       (request_id, message_id, envelope, discard, processed, last_reply_id, deliver_at, reply_to)
     VALUES (?, ?, ?, ?, 0, NULL, ?, ?)`,
    envelope.requestId,
    primaryKey,
    envelopeText,
    discard ? 1 : 0,
    deliverAt,
    replyTo
  )
  return { _tag: "Success" }
}

/** @internal */
export const saveReply = (sql: SqlStorage, replyText: string): void => {
  if (encodedSize(replyText) > maximumEncodedSize) {
    throw new EncodedMessageTooLargeError("Encoded entity reply chunk exceeds 2 MB")
  }
  const reply = JSON.parse(replyText) as {
    readonly _tag?: unknown
    readonly requestId?: unknown
    readonly id?: unknown
    readonly sequence?: unknown
  }
  if (
    (reply._tag !== "Chunk" && reply._tag !== "WithExit") ||
    typeof reply.requestId !== "string" ||
    typeof reply.id !== "string"
  ) {
    throw new TypeError("Expected an encoded Chunk or WithExit reply")
  }
  sql.exec(
    `INSERT OR IGNORE INTO cluster_replies
       (reply_id, request_id, reply, kind, sequence, acked)
     VALUES (?, ?, ?, ?, ?, 0)`,
    reply.id,
    reply.requestId,
    replyText,
    reply._tag,
    reply._tag === "Chunk" ? reply.sequence : null
  )
  sql.exec(
    `UPDATE cluster_messages
     SET last_reply_id = ?, processed = CASE WHEN ? = 'WithExit' THEN 1 ELSE processed END
     WHERE request_id = ?`,
    reply.id,
    reply._tag,
    reply.requestId
  )
}

/** @internal */
export interface StoredMessage {
  readonly envelope: string
  readonly lastSentChunk: string | undefined
  readonly discard: boolean
  readonly deliverAt?: number | undefined
  readonly replyTo?: string | undefined
}

const rowToMessage = (row: Record<string, unknown>): StoredMessage => {
  const message: StoredMessage = {
    envelope: String(row.envelope),
    lastSentChunk: typeof row.last_reply === "string" ? row.last_reply : undefined,
    discard: Number(row.discard) === 1,
    ...(typeof row.deliver_at === "number" ? { deliverAt: row.deliver_at } : undefined),
    ...(typeof row.reply_to === "string" ? { replyTo: row.reply_to } : undefined)
  }
  return message
}

/** @internal */
export const loadUnprocessed = (sql: SqlStorage, now = Date.now()): Array<StoredMessage> =>
  sql.exec(
    `SELECT m.envelope, m.discard, m.deliver_at, m.reply_to, r.reply AS last_reply
     FROM cluster_messages m
     LEFT JOIN cluster_replies r ON r.reply_id = m.last_reply_id
     WHERE m.processed = 0 AND (m.deliver_at IS NULL OR m.deliver_at <= ?)
     ORDER BY m.rowid ASC`,
    now
  ).toArray().map(rowToMessage)

/** @internal */
export const loadDue = (sql: SqlStorage, now = Date.now()): Array<StoredMessage> =>
  sql.exec(
    `SELECT m.envelope, m.discard, m.deliver_at, m.reply_to, r.reply AS last_reply
     FROM cluster_messages m
     LEFT JOIN cluster_replies r ON r.reply_id = m.last_reply_id
     WHERE m.processed = 0 AND m.deliver_at IS NOT NULL AND m.deliver_at <= ?
     ORDER BY m.rowid ASC`,
    now
  ).toArray().map(rowToMessage)

/** @internal */
export const loadMessage = (sql: SqlStorage, requestId: string): StoredMessage | undefined => {
  const row = sql.exec(
    `SELECT m.envelope, m.discard, m.deliver_at, m.reply_to, r.reply AS last_reply
     FROM cluster_messages m
     LEFT JOIN cluster_replies r ON r.reply_id = m.last_reply_id
     WHERE m.request_id = ?
     LIMIT 1`,
    requestId
  ).toArray()[0]
  return row === undefined ? undefined : rowToMessage(row)
}

/** @internal */
export const loadNextReply = (sql: SqlStorage, requestId: string): string | undefined => {
  const row = sql.exec(
    `SELECT reply
     FROM cluster_replies
     WHERE request_id = ? AND kind = 'Chunk' AND acked = 0
     ORDER BY sequence ASC
     LIMIT 1`,
    requestId
  ).toArray()[0] ?? sql.exec(
    `SELECT reply
     FROM cluster_replies
     WHERE request_id = ? AND kind = 'WithExit'
     LIMIT 1`,
    requestId
  ).toArray()[0]
  return typeof row?.reply === "string" ? row.reply : undefined
}

/** @internal */
export const completeTell = (sql: SqlStorage, requestId: string): void => {
  sql.exec(
    `UPDATE cluster_messages
     SET processed = 1, last_reply_id = NULL
     WHERE request_id = ?`,
    requestId
  )
}

/** @internal */
export const ackChunk = (sql: SqlStorage, requestId: string, replyId: string): void => {
  sql.exec(
    `UPDATE cluster_replies
     SET acked = 1
     WHERE request_id = ? AND reply_id = ? AND kind = 'Chunk'`,
    requestId,
    replyId
  )
}

/** @internal */
export const clearReplies = (sql: SqlStorage, requestId: string): void => {
  sql.exec("DELETE FROM cluster_replies WHERE request_id = ?", requestId)
  sql.exec(
    `UPDATE cluster_messages
     SET processed = 0, last_reply_id = NULL
     WHERE request_id = ?`,
    requestId
  )
}
