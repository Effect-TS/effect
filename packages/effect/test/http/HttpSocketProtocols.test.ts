import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as HttpServerRequest from "effect/http/HttpServerRequest"
import * as HttpSocketProtocols from "effect/http/HttpSocketProtocols"

const protocolsFor = (headers: Record<string, string>) =>
  Effect.service(HttpSocketProtocols.HttpSocketProtocols).pipe(
    Effect.provide(HttpSocketProtocols.layer),
    Effect.provideService(
      HttpServerRequest.HttpServerRequest,
      HttpServerRequest.fromWeb(new Request("http://localhost/ws", { headers }))
    )
  )

describe("HttpSocketProtocols", () => {
  it.effect("reads protocols from the request header", () =>
    Effect.gen(function*() {
      assert.deepStrictEqual(yield* protocolsFor({ "sec-websocket-protocol": "graphql-ws, json" }), [
        "graphql-ws",
        "json"
      ])
    }))

  it.effect("resolves to undefined when the header is absent", () =>
    Effect.gen(function*() {
      assert.strictEqual(yield* protocolsFor({}), undefined)
    }))
})
