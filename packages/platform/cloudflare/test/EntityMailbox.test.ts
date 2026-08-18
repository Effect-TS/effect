import type { SqlStorage } from "@cloudflare/workers-types"
import {
  ackChunk,
  clearReplies,
  completeTell,
  EncodedMessageTooLargeError,
  loadDue,
  loadNextReply,
  loadUnprocessed,
  MailboxFullError,
  maximumEncodedSize,
  persistRequest,
  saveReply
} from "@effect/platform-cloudflare/internal/entityMailbox"
import { assert, describe, it } from "@effect/vitest"

interface MessageRow {
  readonly request_id: string
  readonly message_id: string | null
  readonly envelope: string
  readonly discard: number
  processed: number
  last_reply_id: string | null
  deliver_at?: number | null
  reply_to?: string | null
}

class FakeSql {
  readonly messages = new Map<string, MessageRow>()
  readonly replies = new Map<string, string>()
  readonly acked = new Set<string>()

  exec(query: string, ...bindings: Array<unknown>) {
    if (query.includes("COUNT(*) AS count")) {
      return this.rows([{
        count: Array.from(this.messages.values()).filter((row) => row.processed === 0).length
      }])
    }
    if (query.includes("COUNT(DISTINCT")) {
      return this.rows([{
        count: Array.from(this.messages.values()).filter((row) =>
          row.processed === 1 && Array.from(this.replies.entries()).some(([id, text]) => {
            const reply = JSON.parse(text)
            return reply.requestId === row.request_id && reply._tag === "Chunk" && !this.acked.has(id)
          })
        ).length
      }])
    }
    if (query.includes("INSERT INTO cluster_messages")) {
      const [requestId, messageId, envelope, discard, deliverAt, replyTo] = bindings as [
        string,
        string | null,
        string,
        number,
        number | null,
        string | null
      ]
      this.messages.set(requestId, {
        request_id: requestId,
        message_id: messageId,
        envelope,
        discard,
        processed: 0,
        last_reply_id: null,
        deliver_at: deliverAt,
        reply_to: replyTo
      })
      return this.rows([])
    }
    if (query.includes("INTO cluster_replies")) {
      const [replyId, requestId, reply] = bindings as [string, string, string]
      this.replies.set(replyId, reply)
      const row = this.messages.get(requestId)
      if (row !== undefined) {
        row.last_reply_id = replyId
        if (JSON.parse(reply)._tag === "WithExit") row.processed = 1
      }
      return this.rows([])
    }
    if (query.includes("SET processed = 1") && query.includes("last_reply_id = NULL")) {
      const row = this.messages.get(String(bindings[0]))
      if (row !== undefined) {
        row.processed = 1
        row.last_reply_id = null
      }
      return this.rows([])
    }
    if (query.includes("UPDATE cluster_messages") && query.includes("last_reply_id")) {
      return this.rows([])
    }
    if (query.includes("SET reply_to = ?")) {
      const row = this.messages.get(String(bindings[1]))
      if (row !== undefined) row.reply_to = String(bindings[0])
      return this.rows([])
    }
    if (query.includes("WHERE m.processed = 0")) {
      const now = Number(bindings[0])
      const dueOnly = query.includes("m.deliver_at IS NOT NULL")
      return this.rows(
        Array.from(this.messages.values())
          .filter((row) =>
            row.processed === 0 &&
            (!dueOnly || row.deliver_at !== null && row.deliver_at !== undefined) &&
            (row.deliver_at === null || row.deliver_at === undefined || row.deliver_at <= now)
          )
          .map((row) => ({
            request_id: row.request_id,
            envelope: row.envelope,
            last_reply: row.last_reply_id === null ? null : this.replies.get(row.last_reply_id),
            discard: row.discard,
            deliver_at: row.deliver_at,
            reply_to: row.reply_to
          }))
      )
    }
    if (query.includes("UPDATE cluster_replies") && query.includes("acked = 1")) {
      this.acked.add(String(bindings[1]))
      return this.rows([])
    }
    if (query.includes("FROM cluster_replies") && query.includes("kind = 'Chunk'")) {
      const request = String(bindings[0])
      const reply = Array.from(this.replies.entries())
        .map(([id, text]) => ({ id, value: JSON.parse(text) }))
        .filter(({ id, value }) => value.requestId === request && value._tag === "Chunk" && !this.acked.has(id))
        .sort((left, right) => left.value.sequence - right.value.sequence)[0]
      return this.rows(reply === undefined ? [] : [{ reply: this.replies.get(reply.id), kind: "Chunk" }])
    }
    if (query.includes("FROM cluster_replies") && query.includes("kind = 'WithExit'")) {
      const request = String(bindings[0])
      const reply = Array.from(this.replies.values()).find((text) => {
        const value = JSON.parse(text)
        return value.requestId === request && value._tag === "WithExit"
      })
      return this.rows(reply === undefined ? [] : [{ reply, kind: "WithExit" }])
    }
    if (query.includes("DELETE FROM cluster_replies")) {
      const request = String(bindings[0])
      for (const [replyId, reply] of this.replies) {
        if (JSON.parse(reply).requestId === request) this.replies.delete(replyId)
      }
      return this.rows([])
    }
    if (query.includes("SET processed = 0") && query.includes("last_reply_id = NULL")) {
      const row = this.messages.get(String(bindings[0]))
      if (row !== undefined) {
        row.processed = 0
        row.last_reply_id = null
      }
      return this.rows([])
    }
    if (query.includes("FROM cluster_messages") && query.includes("request_id = ?")) {
      const requestId = String(bindings[0])
      const primaryKey = bindings[1]
      const row = this.messages.get(requestId) ?? Array.from(this.messages.values()).find(
        (row) => primaryKey !== null && row.message_id === primaryKey
      )
      return this.rows(
        row === undefined ? [] : [{
          ...row,
          last_reply: row.last_reply_id === null ? null : this.replies.get(row.last_reply_id)
        }]
      )
    }
    throw new Error(`Unexpected SQL: ${query}`)
  }

  private rows(rows: Array<Record<string, unknown>>) {
    return { toArray: () => rows }
  }

  get sql(): SqlStorage {
    return this as unknown as SqlStorage
  }
}

const requestId = "0198bd72-6a80-72f1-8d87-5e9b5cf1e000"
const envelope = JSON.stringify({
  _tag: "Request",
  requestId,
  address: {
    shardId: { group: "default", id: 1 },
    entityType: "Counter",
    entityId: "one"
  },
  tag: "Increment",
  payload: { amount: 1 },
  headers: {}
})

const withRequestId = (id: string) => JSON.stringify({ ...JSON.parse(envelope), requestId: id })

describe("EntityMailbox", () => {
  it("persists a durable request before its handler can run", () => {
    const sql = new FakeSql()
    const result = persistRequest(sql.sql, envelope, null)

    assert.deepStrictEqual(result, { _tag: "Success" })
    assert.strictEqual(sql.messages.get(requestId)?.envelope, envelope)
    assert.strictEqual(sql.messages.get(requestId)?.processed, 0)
  })

  it("persists future delivery metadata and only loads the row when due", () => {
    const sql = new FakeSql()
    persistRequest(sql.sql, envelope, "scheduled", false, 2_000, "7:Callercaller")

    assert.strictEqual(sql.messages.get(requestId)?.deliver_at, 2_000)
    assert.strictEqual(sql.messages.get(requestId)?.reply_to, JSON.stringify(["7:Callercaller"]))
    assert.deepStrictEqual(loadUnprocessed(sql.sql, 1_999), [])
    assert.deepStrictEqual(loadDue(sql.sql, 2_000), [{
      requestId,
      envelope,
      lastSentChunk: undefined,
      discard: false,
      deliverAt: 2_000,
      replyTos: ["7:Callercaller"]
    }])
  })

  it("preserves every reply target when a scheduled request is deduplicated", () => {
    const sql = new FakeSql()
    const primaryKey = "Counter/one/Increment/scheduled"
    persistRequest(sql.sql, envelope, primaryKey, false, 2_000, "7:Callerfirst")
    persistRequest(
      sql.sql,
      withRequestId("0198bd72-6a81-72f1-8d87-5e9b5cf1e001"),
      primaryKey,
      false,
      null,
      "7:Callersecond"
    )

    assert.deepStrictEqual(loadDue(sql.sql, 2_000), [{
      requestId,
      envelope,
      lastSentChunk: undefined,
      discard: false,
      deliverAt: 2_000,
      replyTos: ["7:Callerfirst", "7:Callersecond"]
    }])
  })

  it("maps a primary-key duplicate to the original request and last reply", () => {
    const sql = new FakeSql()
    const primaryKey = "Counter/one/Increment/operation-1"
    persistRequest(sql.sql, envelope, primaryKey)
    const reply = JSON.stringify({
      _tag: "WithExit",
      requestId,
      id: "reply-1",
      exit: { _tag: "Success", value: 1 }
    })
    saveReply(sql.sql, reply)

    assert.deepStrictEqual(
      persistRequest(sql.sql, withRequestId("0198bd72-6a81-72f1-8d87-5e9b5cf1e001"), primaryKey),
      { _tag: "Duplicate", originalId: requestId, processed: true }
    )
  })

  it("replays an unprocessed row with its last sent chunk after a crash", () => {
    const sql = new FakeSql()
    persistRequest(sql.sql, envelope, null)
    const chunk = JSON.stringify({
      _tag: "Chunk",
      requestId,
      id: "chunk-1",
      sequence: 0,
      values: [1]
    })
    saveReply(sql.sql, chunk)

    assert.deepStrictEqual(loadUnprocessed(sql.sql), [{ requestId, envelope, lastSentChunk: chunk, discard: false }])
  })

  it("marks a persisted tell complete without storing a user-visible reply", () => {
    const sql = new FakeSql()
    persistRequest(sql.sql, envelope, null)
    completeTell(sql.sql, requestId)

    assert.strictEqual(sql.messages.get(requestId)?.processed, 1)
    assert.strictEqual(sql.replies.size, 0)
    assert.deepStrictEqual(loadUnprocessed(sql.sql), [])
  })

  it("acknowledges stream chunks and clearReplies resumes the request", () => {
    const sql = new FakeSql()
    persistRequest(sql.sql, envelope, null)
    const chunk = JSON.stringify({
      _tag: "Chunk",
      requestId,
      id: "chunk-1",
      sequence: 0,
      values: [1]
    })
    saveReply(sql.sql, chunk)
    ackChunk(sql.sql, requestId, "chunk-1")
    assert.isTrue(sql.acked.has("chunk-1"))

    clearReplies(sql.sql, requestId)
    assert.deepStrictEqual(loadUnprocessed(sql.sql), [{
      requestId,
      envelope,
      lastSentChunk: undefined,
      discard: false
    }])
    assert.strictEqual(sql.replies.size, 0)
  })

  it("rejects the 4097th unprocessed request", () => {
    const sql = new FakeSql()
    for (let index = 0; index < 4096; index++) {
      sql.messages.set(String(index), {
        request_id: String(index),
        message_id: null,
        envelope,
        discard: 0,
        processed: 0,
        last_reply_id: null
      })
    }
    assert.throws(() => persistRequest(sql.sql, envelope, null), MailboxFullError)
  })

  it("counts a completed stream with an unacknowledged chunk against capacity", () => {
    const sql = new FakeSql()
    for (let index = 0; index < 4095; index++) {
      sql.messages.set(String(index), {
        request_id: String(index),
        message_id: null,
        envelope,
        discard: 0,
        processed: 0,
        last_reply_id: null
      })
    }
    persistRequest(sql.sql, envelope, null)
    saveReply(sql.sql, JSON.stringify({ _tag: "Chunk", requestId, id: "chunk", sequence: 0, values: [1] }))
    saveReply(
      sql.sql,
      JSON.stringify({
        _tag: "WithExit",
        requestId,
        id: "terminal",
        exit: { _tag: "Success", value: null }
      })
    )

    assert.throws(
      () => persistRequest(sql.sql, withRequestId("0198bd72-6a83-72f1-8d87-5e9b5cf1e003"), null),
      MailboxFullError
    )
  })

  it("rejects encoded requests and chunks over 2 MB", () => {
    const sql = new FakeSql()
    const largeRequest = JSON.stringify({ ...JSON.parse(envelope), payload: "x".repeat(maximumEncodedSize) })
    assert.throws(() => persistRequest(sql.sql, largeRequest, null), EncodedMessageTooLargeError)

    const largeChunk = JSON.stringify({
      _tag: "Chunk",
      requestId,
      id: "chunk-large",
      sequence: 0,
      values: ["x".repeat(maximumEncodedSize)]
    })
    assert.throws(() => saveReply(sql.sql, largeChunk), EncodedMessageTooLargeError)
  })

  it("releases persisted stream replies one chunk per acknowledgement", () => {
    const sql = new FakeSql()
    persistRequest(sql.sql, envelope, null)
    const chunk0 = JSON.stringify({ _tag: "Chunk", requestId, id: "chunk-0", sequence: 0, values: [0] })
    const chunk1 = JSON.stringify({ _tag: "Chunk", requestId, id: "chunk-1", sequence: 1, values: [1] })
    const terminal = JSON.stringify({
      _tag: "WithExit",
      requestId,
      id: "terminal",
      exit: { _tag: "Success", value: null }
    })
    saveReply(sql.sql, chunk0)
    saveReply(sql.sql, chunk1)
    saveReply(sql.sql, terminal)

    assert.deepStrictEqual(loadNextReply(sql.sql, requestId), { reply: chunk0, kind: "Chunk" })
    ackChunk(sql.sql, requestId, "chunk-0")
    assert.deepStrictEqual(loadNextReply(sql.sql, requestId), { reply: chunk1, kind: "Chunk" })
    ackChunk(sql.sql, requestId, "chunk-1")
    assert.deepStrictEqual(loadNextReply(sql.sql, requestId), { reply: terminal, kind: "WithExit" })
  })

  it("retains tell discard mode for crash replay", () => {
    const sql = new FakeSql()
    persistRequest(sql.sql, envelope, null, true)

    assert.deepStrictEqual(loadUnprocessed(sql.sql), [{ requestId, envelope, lastSentChunk: undefined, discard: true }])
  })
})
