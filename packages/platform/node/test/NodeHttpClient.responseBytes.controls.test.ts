import { NodeHttpServer } from "@effect/platform-node"
import * as NodeClient from "@effect/platform-node/NodeHttpClient"
import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import * as Layer from "effect/Layer"
import {
  HttpClient,
  type HttpClientError,
  HttpIncomingMessage,
  HttpServer,
  HttpServerResponse
} from "effect/unstable/http"
import * as Http from "node:http"

const fixtures = [
  { name: "PNG signature", bytes: new Uint8Array([0x89, 0x50, 0x4e, 0x47]) },
  { name: "UTF-8 BOM", bytes: new Uint8Array([0xef, 0xbb, 0xbf, 0x61]) },
  { name: "UTF-8", bytes: new TextEncoder().encode("\u00e9ab") }
]

for (
  const { layer, name } of [
    { name: "node:http", layer: NodeClient.layerNodeHttp },
    { name: "undici", layer: NodeClient.layerUndici }
  ]
) {
  const layerTest = HttpServer.layerTestClient.pipe(
    Layer.provide(layer),
    Layer.provideMerge(NodeHttpServer.layer(Http.createServer, { host: "127.0.0.1", port: 0 }))
  )

  describe(`NodeHttpClient response byte controls - ${name}`, () => {
    for (const first of ["text", "arrayBuffer"] as const) {
      it.effect.each(fixtures)(`${first} consumed first preserves $name`, ({ bytes }) =>
        Effect.gen(function*() {
          yield* HttpServer.serveEffect(Effect.succeed(HttpServerResponse.uint8Array(bytes)))
          const response = yield* HttpClient.get("/")
          // Keep the existing order-dependent node:http BOM decoding contract.
          const expected = name === "node:http" && first === "text"
            ? Buffer.from(bytes).toString("utf8")
            : new TextDecoder().decode(bytes)
          yield* response[first]
          assert.strictEqual(yield* response.text, expected)
          assert.strictEqual(yield* response.text, expected)
          const buffer = yield* response.arrayBuffer
          assert.deepStrictEqual(new Uint8Array(buffer), bytes)
          assert.deepStrictEqual(new Uint8Array(yield* response.arrayBuffer), bytes)
        }).pipe(Effect.provide(layerTest)))

      if (name === "node:http") {
        it.effect(`${first} respects MaxBodySize at execution and caches the decode error`, () =>
          Effect.gen(function*() {
            yield* HttpServer.serveEffect(Effect.succeed(HttpServerResponse.text("\u00e9ab")))
            const response = yield* HttpClient.get("/")
            const body: Effect.Effect<unknown, HttpClientError.HttpClientError> = response[first]
            const error = yield* body.pipe(
              Effect.provideService(HttpIncomingMessage.MaxBodySize, FileSystem.Size(3)),
              Effect.flip
            )
            assert.strictEqual(error._tag, "HttpClientError")
            assert(error.reason._tag === "DecodeError")
            assert.strictEqual(error.reason.request, response.request)
            assert.strictEqual(error.reason.response.status, response.status)
            assert.strictEqual(error.reason.response.request, response.request)
            assert(error.reason.cause instanceof Error)
            assert.strictEqual(error.reason.cause.message, "maxBytes exceeded")
            assert.strictEqual(yield* response.text.pipe(Effect.flip), error)
            assert.strictEqual(yield* response.arrayBuffer.pipe(Effect.flip), error)
          }).pipe(Effect.provide(layerTest)))

        it.effect(`${first} accepts a body exactly at MaxBodySize`, () =>
          Effect.gen(function*() {
            yield* HttpServer.serveEffect(Effect.succeed(HttpServerResponse.text("\u00e9ab")))
            const response = yield* HttpClient.get("/")
            const body: Effect.Effect<unknown, HttpClientError.HttpClientError> = response[first]
            yield* body.pipe(
              Effect.provideService(HttpIncomingMessage.MaxBodySize, FileSystem.Size(4))
            )
            assert.strictEqual(yield* response.text, "\u00e9ab")
            assert.deepStrictEqual(new Uint8Array(yield* response.arrayBuffer), new TextEncoder().encode("\u00e9ab"))
          }).pipe(Effect.provide(layerTest)))
      }
    }
  })
}
