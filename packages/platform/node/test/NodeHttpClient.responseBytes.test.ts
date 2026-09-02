import { NodeHttpServer } from "@effect/platform-node"
import * as NodeClient from "@effect/platform-node/NodeHttpClient"
import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { HttpClient, HttpServer, HttpServerResponse } from "effect/unstable/http"
import * as Http from "node:http"

const fixtures = [
  { name: "PNG signature", bytes: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) },
  { name: "UTF-8 BOM", bytes: new Uint8Array([0xef, 0xbb, 0xbf, 0x61]) },
  { name: "ASCII", bytes: new TextEncoder().encode("hello\r\n") }
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

  describe(`NodeHttpClient response bytes - ${name}`, () => {
    it.effect.each(fixtures)("fresh arrayBuffer preserves $name", ({ bytes }) =>
      Effect.gen(function*() {
        yield* HttpServer.serveEffect(Effect.succeed(HttpServerResponse.uint8Array(bytes)))
        const response = yield* HttpClient.get("/")
        assert.strictEqual(response.status, 200)
        assert.deepStrictEqual(new Uint8Array(yield* response.arrayBuffer), bytes)
      }).pipe(Effect.provide(layerTest)))

    it.effect.each(fixtures)("accessing text does not change $name bytes", ({ bytes }) =>
      Effect.gen(function*() {
        yield* HttpServer.serveEffect(Effect.succeed(HttpServerResponse.uint8Array(bytes)))
        const response = yield* HttpClient.get("/")
        assert.strictEqual(response.status, 200)
        // Construct the text effect without running it or consuming the response.
        void response.text
        assert.deepStrictEqual(new Uint8Array(yield* response.arrayBuffer), bytes)
      }).pipe(Effect.provide(layerTest)))
  })
}
