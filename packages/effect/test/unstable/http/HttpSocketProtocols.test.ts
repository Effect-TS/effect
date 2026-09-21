import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as HttpServerRequest from "effect/unstable/http/HttpServerRequest"
import * as HttpSocketProtocols from "effect/unstable/http/HttpSocketProtocols"

const request = (headers: Record<string, string> = {}) =>
  HttpServerRequest.fromWeb(new Request("http://localhost/ws", { headers }))

describe("HttpSocketProtocols", () => {
  it.effect("reads protocols from the current request", () =>
    Effect.gen(function*() {
      const protocols = yield* HttpSocketProtocols.HttpSocketProtocols
      assert.deepStrictEqual(protocols, ["graphql-ws", "json"])
    }).pipe(
      Effect.provide(HttpSocketProtocols.layer),
      Effect.provideService(
        HttpServerRequest.HttpServerRequest,
        request({ [HttpSocketProtocols.HEADER_NAME]: "graphql-ws, json" })
      )
    ))

  it.effect("reads a lowercase header, as sent by browsers", () =>
    Effect.gen(function*() {
      const protocols = yield* HttpSocketProtocols.HttpSocketProtocols
      assert.deepStrictEqual(protocols, ["graphql-ws", "json"])
    }).pipe(
      Effect.provide(HttpSocketProtocols.layer),
      Effect.provideService(
        HttpServerRequest.HttpServerRequest,
        request({ "sec-websocket-protocol": "graphql-ws, json" })
      )
    ))

  it.effect("drops empty tokens from the header", () =>
    Effect.gen(function*() {
      const protocols = yield* HttpSocketProtocols.HttpSocketProtocols
      assert.deepStrictEqual(protocols, ["a", "b"])
    }).pipe(
      Effect.provide(HttpSocketProtocols.layer),
      Effect.provideService(
        HttpServerRequest.HttpServerRequest,
        request({ [HttpSocketProtocols.HEADER_NAME]: "a,,b" })
      )
    ))

  it.effect("resolves to undefined when the header is absent", () =>
    Effect.gen(function*() {
      const protocols = yield* HttpSocketProtocols.HttpSocketProtocols
      assert.strictEqual(protocols, undefined)
    }).pipe(
      Effect.provide(HttpSocketProtocols.layer),
      Effect.provideService(HttpServerRequest.HttpServerRequest, request())
    ))
})
