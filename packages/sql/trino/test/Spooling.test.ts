import { retrying } from "@effect/sql-trino/internal/http"
import * as Json from "@effect/sql-trino/internal/json"
import type { Segment } from "@effect/sql-trino/internal/protocol"
import * as Spooling from "@effect/sql-trino/internal/spooling"
import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Base64 from "effect/encoding/Base64"
import * as HttpClient from "effect/http/HttpClient"
import * as HttpClientError from "effect/http/HttpClientError"
import * as HttpClientResponse from "effect/http/HttpClientResponse"
import * as Result from "effect/Result"
import * as Schedule from "effect/Schedule"
import * as Stream from "effect/Stream"

const encoder = new TextEncoder()

const n = (value: number) => new Json.JsonNumber(String(value))

const inline = (bytes: Uint8Array, metadata: Segment["metadata"]): Segment => ({
  type: "inline",
  data: Base64.encode(bytes),
  uri: undefined,
  ackUri: undefined,
  headers: new Map(),
  metadata
})

const spooled = (name: string, metadata: Segment["metadata"]): Segment => ({
  type: "spooled",
  data: undefined,
  uri: `https://storage.test/${name}`,
  ackUri: `https://coordinator.test/v1/spooled/ack/${name}`,
  headers: new Map([["x-amz-server-side-encryption-customer-key", ["a2V5"]]]),
  metadata
})

/** "[[1],[1],[1],[1]]" as an LZ4 block: 5 literals, an 8-byte overlapping match, 4 literals. */
const lz4Rows = new Uint8Array([0x54, ...encoder.encode("[[1],"), 0x04, 0x00, 0x40, ...encoder.encode("[1]]")])

interface Reply {
  readonly status: number
  readonly body: Uint8Array | string
  readonly headers?: Record<string, string>
}

/** A connection reset: the request fails in transport. */
const reset = "reset" as const

/**
 * Serves `objects` by URL. A list is served in order, one reply per request,
 * its last reply repeating.
 */
const stubHttp = (objects: Record<string, Reply | typeof reset | ReadonlyArray<Reply | typeof reset>>) => {
  const requests: Array<{ readonly url: string; readonly headers: Record<string, string> }> = []
  const served = new Map<string, number>()
  const http = HttpClient.make((request) => {
    requests.push({ url: request.url, headers: { ...request.headers } })
    const entry = objects[request.url] ?? { status: 404, body: "missing" }
    const replies = Array.isArray(entry) ? entry : [entry]
    const index = served.get(request.url) ?? 0
    served.set(request.url, index + 1)
    const reply = replies[Math.min(index, replies.length - 1)]
    if (reply === reset) {
      return Effect.fail(
        new HttpClientError.HttpClientError({
          reason: new HttpClientError.TransportError({ request, cause: new Error("connection reset") })
        })
      )
    }
    return Effect.succeed(
      HttpClientResponse.fromWeb(
        request,
        new Response(reply.body as BodyInit, { status: reply.status, headers: reply.headers })
      )
    )
  })
  return { http, requests }
}

const collect = (
  http: HttpClient.HttpClient,
  encoding: string,
  segments: ReadonlyArray<Segment>,
  retry: Schedule.Schedule<unknown, unknown> = Schedule.recurs(3)
) => Stream.runCollect(Spooling.resolve({ http: retrying(http, retry, false), encoding, segments }))

const rowValues = (rows: ReadonlyArray<ReadonlyArray<Json.JsonValue>>) =>
  rows.map((row) => row.map((value) => value instanceof Json.JsonNumber ? value.source : value))

describe("Spooling", () => {
  it("advertises only encodings this runtime decodes", () => {
    assert.includeMembers([...Spooling.supportedEncodings], ["json+lz4", "json"])
    assert.strictEqual(Spooling.supportedEncodings.at(-1), "json")
  })

  it("decompresses LZ4 blocks with overlapping matches", () => {
    const out = Spooling.decompressLz4(lz4Rows, 17)
    assert.strictEqual(new TextDecoder().decode(Result.getOrThrow(out)), "[[1],[1],[1],[1]]")
    assert.isTrue(Result.isFailure(Spooling.decompressLz4(lz4Rows, 16)))
    assert.isTrue(Result.isFailure(Spooling.decompressLz4(new Uint8Array([0x10, 0x41, 0x09, 0x00]), 6)))
  })

  it.effect("decodes inline segments, compressed only when uncompressedSize is present", () =>
    Effect.gen(function*() {
      const { http, requests } = stubHttp({})
      const rows = yield* collect(http, "json+lz4", [
        inline(encoder.encode("[[9007199254740993, \"a\"]]"), { rowOffset: n(0), rowsCount: n(1), segmentSize: n(25) }),
        inline(lz4Rows, { rowOffset: n(1), rowsCount: n(4), segmentSize: n(13), uncompressedSize: n(17) })
      ])
      assert.deepStrictEqual(rowValues(rows), [["9007199254740993", "a"], ["1"], ["1"], ["1"], ["1"]])
      assert.strictEqual(requests.length, 0)
    }))

  it.effect("fetches spooled segments with their headers, in order, and acknowledges each", () =>
    Effect.gen(function*() {
      const { http, requests } = stubHttp({
        "https://storage.test/one": { status: 200, body: "[[1]]" },
        "https://storage.test/two": { status: 200, body: lz4Rows },
        "https://coordinator.test/v1/spooled/ack/one": { status: 200, body: "" },
        "https://coordinator.test/v1/spooled/ack/two": { status: 500, body: "ack failed" }
      })
      const rows = yield* collect(http, "json+lz4", [
        spooled("one", { rowsCount: n(1), segmentSize: n(5) }),
        spooled("two", { rowsCount: n(4), segmentSize: n(13), uncompressedSize: n(17) })
      ])
      assert.deepStrictEqual(rowValues(rows), [["1"], ["1"], ["1"], ["1"], ["1"]])
      const urls = requests.map((request) => request.url)
      assert.includeMembers(urls, [
        "https://storage.test/one",
        "https://storage.test/two",
        "https://coordinator.test/v1/spooled/ack/one",
        "https://coordinator.test/v1/spooled/ack/two"
      ])
      for (const request of requests) {
        assert.strictEqual(request.headers["x-amz-server-side-encryption-customer-key"], "a2V5")
        // Trino's own headers belong to the coordinator, not to storage.
        assert.deepStrictEqual(Object.keys(request.headers).filter((name) => name.startsWith("x-trino-")), [])
      }
    }))

  it.effect("fails on a storage error, a size mismatch or a row count mismatch", () =>
    Effect.gen(function*() {
      const { http } = stubHttp({
        "https://storage.test/gone": { status: 403, body: "expired" },
        "https://storage.test/short": { status: 200, body: "[[1]]" }
      })
      const status = yield* Effect.flip(collect(http, "json", [spooled("gone", { segmentSize: n(5) })]))
      assert.strictEqual(status._tag, "HttpStatusFailure")
      const size = yield* Effect.flip(collect(http, "json", [spooled("short", { segmentSize: n(6) })]))
      assert.strictEqual(size._tag, "DecodeFailure")
      const count = yield* Effect.flip(collect(http, "json", [spooled("short", { rowsCount: n(2) })]))
      assert.strictEqual(count._tag, "DecodeFailure")
    }))

  it.effect("refuses encodings it cannot decode", () =>
    Effect.gen(function*() {
      const { http } = stubHttp({})
      const unknown = yield* Effect.flip(collect(http, "arrow", []))
      assert.strictEqual(unknown._tag, "Unsupported")
      const missingCodec = yield* Effect.flip(
        collect(http, "json+brotli", [inline(new Uint8Array([1]), { uncompressedSize: n(4) })])
      )
      assert.strictEqual(missingCodec._tag, "Unsupported")
    }))

  // Real time: core waits at least a millisecond on any Retry-After, even 0.
  it.live("retries transient download and acknowledgement failures, then reads every row once", () =>
    Effect.gen(function*() {
      const { http, requests } = stubHttp({
        "https://storage.test/one": [reset, { status: 503, body: "slow down" }, { status: 200, body: "[[1],[2]]" }],
        "https://storage.test/two": [{ status: 429, body: "busy", headers: { "retry-after": "0" } }, {
          status: 200,
          body: "[[3]]"
        }],
        "https://coordinator.test/v1/spooled/ack/one": [{ status: 502, body: "gateway" }, { status: 200, body: "" }],
        "https://coordinator.test/v1/spooled/ack/two": { status: 200, body: "" }
      })
      const rows = yield* collect(http, "json", [
        spooled("one", { rowsCount: n(2), segmentSize: n(9) }),
        spooled("two", { rowsCount: n(1), segmentSize: n(5) })
      ])
      assert.deepStrictEqual(rowValues(rows), [["1"], ["2"], ["3"]])
      const count = (url: string) => requests.filter((request) => request.url === url).length
      assert.strictEqual(count("https://storage.test/one"), 3)
      assert.strictEqual(count("https://storage.test/two"), 2)
      assert.strictEqual(count("https://coordinator.test/v1/spooled/ack/one"), 2)
      assert.strictEqual(count("https://coordinator.test/v1/spooled/ack/two"), 1)
    }))

  it.effect("gives up after the schedule, and never retries a definite answer", () =>
    Effect.gen(function*() {
      const { http, requests } = stubHttp({
        "https://storage.test/down": { status: 503, body: "down" },
        "https://storage.test/gone": { status: 404, body: "expired" }
      })
      const down = yield* Effect.flip(collect(http, "json", [spooled("down", {})], Schedule.recurs(2)))
      assert.strictEqual(down._tag, "HttpStatusFailure")
      assert.strictEqual(requests.filter((request) => request.url === "https://storage.test/down").length, 3)
      const gone = yield* Effect.flip(collect(http, "json", [spooled("gone", {})]))
      assert.strictEqual(gone._tag, "HttpStatusFailure")
      assert.strictEqual(requests.filter((request) => request.url === "https://storage.test/gone").length, 1)
    }))

  it.effect("a failed acknowledgement does not fail the query", () =>
    Effect.gen(function*() {
      const { http } = stubHttp({
        "https://storage.test/one": { status: 200, body: "[[1]]" },
        "https://coordinator.test/v1/spooled/ack/one": reset
      })
      const rows = yield* collect(http, "json", [spooled("one", {})])
      assert.deepStrictEqual(rowValues(rows), [["1"]])
    }))
})
