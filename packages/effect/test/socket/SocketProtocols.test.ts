import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import * as SocketProtocols from "effect/socket/SocketProtocols"

describe("SocketProtocols", () => {
  it.effect("decodes a header into trimmed protocols, dropping empty tokens", () =>
    Effect.gen(function*() {
      const decode = Schema.decodeEffect(SocketProtocols.Schema)
      assert.deepStrictEqual(yield* decode("graphql-ws, json ,,  , binary,"), ["graphql-ws", "json", "binary"])
      assert.deepStrictEqual(yield* decode(""), [])
    }))

  it.effect("encodes protocols into a header value", () =>
    Effect.gen(function*() {
      const result = yield* Schema.encodeEffect(SocketProtocols.Schema)(["graphql-ws", "json"])
      assert.strictEqual(result, "graphql-ws,json")
    }))
})
