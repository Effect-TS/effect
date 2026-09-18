import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import * as HttpServerRequest from "effect/unstable/http/HttpServerRequest"
import * as SocketProtocols from "effect/unstable/socket/SocketProtocols"

const request = (headers: Record<string, string> = {}) =>
  HttpServerRequest.fromWeb(new Request("http://localhost/ws", { headers }))

describe("SocketProtocols", () => {
  describe("Schema", () => {
    it.effect("decodes a comma-separated header into trimmed protocols", () =>
      Effect.gen(function*() {
        const result = yield* Schema.decodeEffect(SocketProtocols.Schema)("graphql-ws, json ,binary")
        assert.deepStrictEqual(result, ["graphql-ws", "json", "binary"])
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

  describe("service", () => {
    it.effect("reads protocols from the current request", () =>
      Effect.gen(function*() {
        const protocols = yield* SocketProtocols.SocketProtocols
        assert.deepStrictEqual(protocols, ["graphql-ws", "json"])
      }).pipe(
        Effect.provide(SocketProtocols.SocketProtocols.layer),
        Effect.provideService(
          HttpServerRequest.HttpServerRequest,
          request({ [SocketProtocols.SOCKET_PROTOCOLS_KEY]: "graphql-ws, json" })
        )
      ))

    it.effect("resolves to undefined when the header is absent", () =>
      Effect.gen(function*() {
        const protocols = yield* SocketProtocols.SocketProtocols
        assert.strictEqual(protocols, undefined)
      }).pipe(
        Effect.provide(SocketProtocols.SocketProtocols.layer),
        Effect.provideService(HttpServerRequest.HttpServerRequest, request())
      ))
  })
})
