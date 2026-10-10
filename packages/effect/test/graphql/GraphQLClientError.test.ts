import { assert, describe, it } from "@effect/vitest"
import { Duration, Effect, Schema } from "effect"
import {
  DecodeError,
  EncodeError,
  GraphQLClientError,
  PaginationError,
  ResponseError,
  TransportError
} from "effect/graphql/GraphQLClientError"

const roundTrip = (error: GraphQLClientError) =>
  Effect.gen(function*() {
    const encoded = yield* Schema.encodeEffect(GraphQLClientError)(error)
    return yield* Schema.decodeUnknownEffect(GraphQLClientError)(JSON.parse(JSON.stringify(encoded)))
  })

describe("GraphQLClientError", () => {
  describe("Schema round trip", () => {
    it.effect("ResponseError keeps errors, raw data and extensions", () =>
      Effect.gen(function*() {
        const decoded = yield* roundTrip(
          new GraphQLClientError({
            operation: "RepoIssues",
            reason: new ResponseError({
              errors: [{ message: "Not found", path: ["repository"], extensions: { type: "NOT_FOUND" } }],
              data: { repository: null },
              extensions: { cost: 1 }
            })
          })
        )
        assert.strictEqual(decoded.operation, "RepoIssues")
        assert.strictEqual(decoded.reason._tag, "ResponseError")
        if (decoded.reason._tag !== "ResponseError") return
        assert.deepStrictEqual(decoded.reason.errors, [{
          message: "Not found",
          path: ["repository"],
          extensions: { type: "NOT_FOUND" }
        }])
        assert.deepStrictEqual(decoded.reason.data, { repository: null })
        assert.deepStrictEqual(decoded.reason.extensions, { cost: 1 })
      }))

    it.effect("TransportError encodes retryAfter as milliseconds and cause as a defect", () =>
      Effect.gen(function*() {
        const original = new Error("socket hang up")
        const error = new GraphQLClientError({
          operation: "Viewer",
          reason: new TransportError({
            description: "503 Service Unavailable",
            status: 503,
            retryAfter: Duration.seconds(30),
            closeCode: 1006,
            cause: original
          })
        })
        const encoded = yield* Schema.encodeEffect(GraphQLClientError)(error)
        assert.strictEqual((encoded.reason as any).retryAfter, 30_000)

        const decoded = yield* roundTrip(error)
        assert.strictEqual(decoded.reason._tag, "TransportError")
        if (decoded.reason._tag !== "TransportError") return
        assert.strictEqual(decoded.reason.status, 503)
        assert.strictEqual(decoded.reason.closeCode, 1006)
        assert.deepStrictEqual(decoded.reason.retryAfter, Duration.seconds(30))
        assert.strictEqual((error.reason as TransportError).cause, original)
      }))

    it.effect("EncodeError, DecodeError and PaginationError round trip", () =>
      Effect.gen(function*() {
        const encode = yield* roundTrip(
          new GraphQLClientError({ operation: "A", reason: new EncodeError({ description: "bad input" }) })
        )
        assert.deepStrictEqual([encode.reason._tag, (encode.reason as EncodeError).description], [
          "EncodeError",
          "bad input"
        ])

        const decode = yield* roundTrip(
          new GraphQLClientError({ operation: "A", reason: new DecodeError({ description: "bad output" }) })
        )
        assert.deepStrictEqual([decode.reason._tag, (decode.reason as DecodeError).description], [
          "DecodeError",
          "bad output"
        ])

        const paging = yield* roundTrip(
          new GraphQLClientError({
            operation: "A",
            reason: new PaginationError({ description: "cursor did not advance", cursor: "c1" })
          })
        )
        assert.deepStrictEqual(
          [paging.reason._tag, (paging.reason as PaginationError).cursor],
          ["PaginationError", "c1"]
        )

        const firstPage = yield* roundTrip(
          new GraphQLClientError({
            operation: "A",
            reason: new PaginationError({ description: "connection missing", cursor: null })
          })
        )
        assert.strictEqual((firstPage.reason as PaginationError).cursor, null)
      }))
  })

  describe("isRetryable", () => {
    const transport = (fields: Partial<ConstructorParameters<typeof TransportError>[0]>) =>
      new TransportError({ description: "transport", ...fields })

    it("is true for a network failure with no status", () => {
      assert.isTrue(transport({}).isRetryable)
    })

    it("is true for 429 and 5xx, false for other statuses", () => {
      assert.isTrue(transport({ status: 429 }).isRetryable)
      assert.isTrue(transport({ status: 500 }).isRetryable)
      assert.isTrue(transport({ status: 503 }).isRetryable)
      assert.isFalse(transport({ status: 400 }).isRetryable)
      assert.isFalse(transport({ status: 401 }).isRetryable)
      assert.isFalse(transport({ status: 404 }).isRetryable)
    })

    it("is false for every fatal graphql-ws close code", () => {
      for (const closeCode of [4400, 4401, 4403, 4406, 4409, 4429]) {
        assert.isFalse(transport({ closeCode }).isRetryable, `close code ${closeCode}`)
      }
    })

    it("is true for retryable close codes", () => {
      for (const closeCode of [1001, 1006, 4500]) {
        assert.isTrue(transport({ closeCode }).isRetryable, `close code ${closeCode}`)
      }
    })

    it("is false for the four non-transport reasons", () => {
      assert.isFalse(new ResponseError({ errors: [{ message: "nope" }] }).isRetryable)
      assert.isFalse(new EncodeError({ description: "nope" }).isRetryable)
      assert.isFalse(new DecodeError({ description: "nope" }).isRetryable)
      assert.isFalse(new PaginationError({ description: "nope", cursor: null }).isRetryable)
    })

    it("the wrapper delegates isRetryable and retryAfter to its reason", () => {
      const retryable = new GraphQLClientError({
        operation: "Viewer",
        reason: transport({ status: 503, retryAfter: Duration.seconds(2) })
      })
      assert.isTrue(retryable.isRetryable)
      assert.deepStrictEqual(retryable.retryAfter, Duration.seconds(2))

      const fatal = new GraphQLClientError({
        operation: "Viewer",
        reason: new ResponseError({ errors: [{ message: "nope" }] })
      })
      assert.isFalse(fatal.isRetryable)
      assert.isUndefined(fatal.retryAfter)
    })
  })

  it("the wrapper exposes its reason as cause and names the operation in its message", () => {
    const reason = new DecodeError({ description: "Expected string, got number" })
    const error = new GraphQLClientError({ operation: "Viewer", reason })
    assert.strictEqual(error.cause, reason)
    assert.include(error.message, "Viewer")
    assert.include(error.message, "Expected string, got number")
  })
})
