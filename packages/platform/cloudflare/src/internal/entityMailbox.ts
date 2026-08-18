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
  readonly processed: boolean
}

const textEncoder = new TextEncoder()

// A UTF-16 code unit encodes to at most 3 UTF-8 bytes, so most strings skip
// the byte-length copy.
const exceedsMaximumEncodedSize = (text: string): boolean =>
  text.length * 3 > maximumEncodedSize && textEncoder.encode(text).byteLength > maximumEncodedSize

/** @internal */
export const persistRequest = (
  sql: SqlStorage,
  envelopeText: string,
  primaryKey: string | null,
  discard = false,
  deliverAt: number | null = null,
  replyTo: string | null = null
): PersistResult => {
  if (exceedsMaximumEncodedSize(envelopeText)) {
    throw new EncodedMessageTooLargeError("Encoded entity request exceeds 2 MB")
  }
  const envelope = JSON.parse(envelopeText) as { readonly _tag?: unknown; readonly requestId?: unknown }
  if (envelope._tag !== "Request" || typeof envelope.requestId !== "string") {
    throw new TypeError("Expected an encoded Request envelope")
  }

  const existing = sql.exec(
    `SELECT m.request_id, m.discard, m.processed, m.reply_to
     FROM cluster_messages m
     WHERE m.request_id = ? OR (? IS NOT NULL AND m.message_id = ?)
     LIMIT 1`,
    envelope.requestId,
    primaryKey,
    primaryKey
  ).toArray()[0]
  if (existing !== undefined) {
    if (replyTo !== null && Number(existing.discard) === 0 && Number(existing.processed) === 0) {
      const replyTos = decodeReplyTargets(existing.reply_to)
      if (!replyTos.includes(replyTo)) replyTos.push(replyTo)
      sql.exec(
        "UPDATE cluster_messages SET reply_to = ? WHERE request_id = ?",
        JSON.stringify(replyTos),
        String(existing.request_id)
      )
    }
    return {
      _tag: "Duplicate",
      originalId: String(existing.request_id),
      processed: Number(existing.processed) === 1
    }
  }

  // A request counts against capacity until it is processed and, for streams,
  // until its chunks are acknowledged. Two indexed counts instead of one
  // `OR EXISTS` scan over the ever-growing dedup history.
  const pending = Number(
    sql.exec("SELECT COUNT(*) AS count FROM cluster_messages WHERE processed = 0").toArray()[0]?.count
  )
  const unacked = pending >= mailboxCapacity ? 0 : Number(
    sql.exec(
      `SELECT COUNT(DISTINCT r.request_id) AS count
       FROM cluster_replies r
       JOIN cluster_messages m ON m.request_id = r.request_id
       WHERE r.kind = 'Chunk' AND r.acked = 0 AND m.processed = 1`
    ).toArray()[0]?.count
  )
  if (pending + unacked >= mailboxCapacity) {
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
    replyTo === null ? null : JSON.stringify([replyTo])
  )
  return { _tag: "Success" }
}

/** @internal */
export const saveReply = (sql: SqlStorage, replyText: string): void => {
  if (exceedsMaximumEncodedSize(replyText)) {
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
  readonly requestId: string
  readonly envelope: string
  readonly lastSentChunk: string | undefined
  readonly discard: boolean
  readonly deliverAt?: number | undefined
  readonly replyTos?: ReadonlyArray<string> | undefined
}

const decodeReplyTargets = (value: unknown): Array<string> => {
  if (typeof value !== "string") return []
  try {
    const decoded = JSON.parse(value)
    if (Array.isArray(decoded) && decoded.every((item) => typeof item === "string")) return decoded
  } catch {
    // Malformed rows deliver nowhere instead of poisoning the replay.
  }
  return []
}

const rowToMessage = (row: Record<string, unknown>): StoredMessage => {
  const replyTos = decodeReplyTargets(row.reply_to)
  const message: StoredMessage = {
    requestId: String(row.request_id),
    envelope: String(row.envelope),
    lastSentChunk: typeof row.last_reply === "string" ? row.last_reply : undefined,
    discard: Number(row.discard) === 1,
    ...(typeof row.deliver_at === "number" ? { deliverAt: row.deliver_at } : undefined),
    ...(replyTos.length === 0 ? undefined : { replyTos })
  }
  return message
}

/** @internal */
export const loadUnprocessed = (sql: SqlStorage, now = Date.now()): Array<StoredMessage> =>
  sql.exec(
    `SELECT m.request_id, m.envelope, m.discard, m.deliver_at, m.reply_to, r.reply AS last_reply
     FROM cluster_messages m
     LEFT JOIN cluster_replies r ON r.reply_id = m.last_reply_id
     WHERE m.processed = 0 AND (m.deliver_at IS NULL OR m.deliver_at <= ?)
     ORDER BY m.rowid ASC`,
    now
  ).toArray().map(rowToMessage)

/** @internal */
export const loadDue = (sql: SqlStorage, now = Date.now()): Array<StoredMessage> =>
  sql.exec(
    `SELECT m.request_id, m.envelope, m.discard, m.deliver_at, m.reply_to, r.reply AS last_reply
     FROM cluster_messages m
     LEFT JOIN cluster_replies r ON r.reply_id = m.last_reply_id
     WHERE m.processed = 0 AND m.deliver_at IS NOT NULL AND m.deliver_at <= ?
     ORDER BY m.rowid ASC`,
    now
  ).toArray().map(rowToMessage)

/** @internal */
export const loadMessage = (sql: SqlStorage, requestId: string): StoredMessage | undefined => {
  const row = sql.exec(
    `SELECT m.request_id, m.envelope, m.discard, m.deliver_at, m.reply_to, r.reply AS last_reply
     FROM cluster_messages m
     LEFT JOIN cluster_replies r ON r.reply_id = m.last_reply_id
     WHERE m.request_id = ?
     LIMIT 1`,
    requestId
  ).toArray()[0]
  return row === undefined ? undefined : rowToMessage(row)
}

/** @internal */
export interface NextReply {
  readonly reply: string
  readonly kind: "Chunk" | "WithExit"
}

/** @internal */
export const loadNextReply = (sql: SqlStorage, requestId: string): NextReply | undefined => {
  const row = sql.exec(
    `SELECT reply, kind
     FROM cluster_replies
     WHERE request_id = ? AND kind = 'Chunk' AND acked = 0
     ORDER BY sequence ASC
     LIMIT 1`,
    requestId
  ).toArray()[0] ?? sql.exec(
    `SELECT reply, kind
     FROM cluster_replies
     WHERE request_id = ? AND kind = 'WithExit'
     LIMIT 1`,
    requestId
  ).toArray()[0]
  return typeof row?.reply === "string" ? { reply: row.reply, kind: row.kind as NextReply["kind"] } : undefined
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
