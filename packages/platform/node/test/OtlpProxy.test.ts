import { NodeHttpServer } from "@effect/platform-node"
import { assert, describe, it } from "@effect/vitest"
import { ByteSize, Effect, Layer, Stream } from "effect"
import {
  HttpBody,
  HttpClient,
  type HttpClientRequest,
  HttpClientResponse,
  HttpIncomingMessage,
  HttpRouter
} from "effect/http"
import { OtlpProxy } from "effect/observability"

describe("OtlpProxy on NodeHttpServer", () => {
  it.effect("applies an explicit maxBodySize above the ambient MaxBodySize to declared and chunked bodies", () =>
    Effect.gen(function*() {
      const forwarded: Array<HttpClientRequest.HttpClientRequest> = []
      const upstream = HttpClient.make((request) => {
        forwarded.push(request)
        return Effect.succeed(HttpClientResponse.fromWeb(request, new Response()))
      })
      yield* OtlpProxy.layer({ baseUrl: "http://upstream.example", maxBodySize: 8 }).pipe(
        Layer.provide(Layer.succeed(HttpClient.HttpClient, upstream)),
        (proxy) =>
          HttpRouter.serve(proxy, {
            disableLogger: true,
            middleware: Effect.provideService(HttpIncomingMessage.MaxBodySize, ByteSize.bytes(4))
          }),
        Layer.build
      )
      const client = yield* HttpClient.HttpClient
      const bytes = new Uint8Array([1, 2, 3, 4, 5, 6])

      const declared = yield* client.post("/v1/traces", {
        body: HttpBody.uint8Array(bytes, "application/x-protobuf")
      })
      const chunked = yield* client.post("/v1/traces", {
        body: HttpBody.stream(Stream.make(bytes), "application/x-protobuf")
      })

      assert.deepStrictEqual([declared.status, chunked.status], [200, 200])
      assert.strictEqual(forwarded.length, 2)
    }).pipe(Effect.provide(NodeHttpServer.layerTest)))
})
