import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import * as SocketProtocols from "effect/unstable/socket/SocketProtocols"

describe("SocketProtocols", () => {
  describe("Schema", () => {
    it.effect("decodes a comma-separated header into trimmed protocols", () =>
      Effect.gen(function*() {
        const result = yield* Schema.decodeEffect(SocketProtocols.Schema)("graphql-ws, json ,binary")
        assert.deepStrictEqual(result, ["graphql-ws", "json", "binary"])
      }))

    it.effect("drops empty tokens", () =>
      Effect.gen(function*() {
        const result = yield* Schema.decodeEffect(SocketProtocols.Schema)("a,,b, ,c,")
        assert.deepStrictEqual(result, ["a", "b", "c"])
      }))

    it.effect("decodes an empty header into an empty array", () =>
      Effect.gen(function*() {
        const result = yield* Schema.decodeEffect(SocketProtocols.Schema)("")
        assert.deepStrictEqual(result, [])
      }))

    it.effect("encodes protocols back into a header value", () =>
      Effect.gen(function*() {
        const result = yield* Schema.encodeEffect(SocketProtocols.Schema)(["graphql-ws", "json"])
        assert.strictEqual(result, "graphql-ws,json")
      }))
  })
})
