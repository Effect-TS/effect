import { assert, describe, it } from "@effect/vitest"
import { Duration, Effect, Schema } from "effect"
import { GraphQLClientError, TransportError } from "effect/graphql/GraphQLClientError"

describe("GraphQLClientError", () => {
  it.effect("round trips through its schema, encoding retryAfter as milliseconds", () =>
    Effect.gen(function*() {
      const error = new GraphQLClientError({
        operation: "Viewer",
        reason: new TransportError({ description: "503", status: 503, retryAfter: Duration.seconds(30) })
      })
      const encoded = yield* Schema.encodeEffect(GraphQLClientError)(error)
      assert.strictEqual((encoded.reason as { retryAfter?: number }).retryAfter, 30_000)
      const decoded = yield* Schema.decodeUnknownEffect(GraphQLClientError)(JSON.parse(JSON.stringify(encoded)))
      assert.deepStrictEqual(decoded.retryAfter, Duration.seconds(30))
    }))

  it("TransportError is retryable for 429, 5xx and non-fatal close codes", () => {
    const transport = (fields: { status?: number; closeCode?: number }) =>
      new TransportError({ description: "transport", ...fields }).isRetryable
    assert.isTrue(transport({ status: 429 }))
    assert.isTrue(transport({ status: 503 }))
    assert.isFalse(transport({ status: 400 }))
    assert.isTrue(transport({ closeCode: 1006 }))
    assert.isFalse(transport({ closeCode: 4401 }))
  })
})
