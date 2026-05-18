import * as HttpClient from "@effect/platform/HttpClient"
import * as HttpClientError from "@effect/platform/HttpClientError"
import * as HttpLayerRouter from "@effect/platform/HttpLayerRouter"
import { RpcSerialization } from "@effect/rpc"
import { describe, expect, it } from "@effect/vitest"
import { Effect, Layer, Ref } from "effect"
import * as HttpRunner from "../src/HttpRunner.js"
import { MessageStorage, RunnerAddress, RunnerHealth, Runners, RunnerStorage, ShardingConfig } from "../src/index.js"

describe("HttpRunner", () => {
  describe("layerClientProtocolHttp", () => {
    const makeUrlCapturingClient = (urlRef: Ref.Ref<Array<string>>) =>
      HttpClient.make((request, url) =>
        Ref.update(urlRef, (urls) => [...urls, url.toString()]).pipe(
          Effect.flatMap(() =>
            Effect.fail(
              new HttpClientError.RequestError({
                request,
                reason: "Transport",
                cause: new Error("Mock - URL captured")
              })
            )
          )
        )
      )

    const testRequest = {
      _tag: "Request" as const,
      id: "1",
      tag: "test",
      payload: {},
      headers: [] as ReadonlyArray<[string, string]>
    }

    it.scoped("path '/' produces http://host:port/", () =>
      Effect.gen(function*() {
        const urlRef = yield* Ref.make<Array<string>>([])

        const layer = HttpRunner.layerClientProtocolHttp({ path: "/" }).pipe(
          Layer.provide(Layer.succeed(HttpClient.HttpClient, makeUrlCapturingClient(urlRef))),
          Layer.provide(RpcSerialization.layerNdjson)
        )

        const makeProtocol = yield* Effect.provide(Runners.RpcClientProtocol, layer)
        const protocol = yield* makeProtocol(RunnerAddress.make("localhost", 3000))

        yield* protocol.send(testRequest).pipe(Effect.ignore)

        const urls = yield* Ref.get(urlRef)
        expect(urls[0]).toBe("http://localhost:3000/")
      }))

    it.scoped("path '' produces http://host:port/", () =>
      Effect.gen(function*() {
        const urlRef = yield* Ref.make<Array<string>>([])

        const layer = HttpRunner.layerClientProtocolHttp({ path: "" }).pipe(
          Layer.provide(Layer.succeed(HttpClient.HttpClient, makeUrlCapturingClient(urlRef))),
          Layer.provide(RpcSerialization.layerNdjson)
        )

        const makeProtocol = yield* Effect.provide(Runners.RpcClientProtocol, layer)
        const protocol = yield* makeProtocol(RunnerAddress.make("localhost", 3000))

        yield* protocol.send(testRequest).pipe(Effect.ignore)

        const urls = yield* Ref.get(urlRef)
        expect(urls[0]).toBe("http://localhost:3000/")
      }))

    it.scoped("path '/rpc' produces http://host:port/rpc", () =>
      Effect.gen(function*() {
        const urlRef = yield* Ref.make<Array<string>>([])

        const layer = HttpRunner.layerClientProtocolHttp({ path: "/rpc" }).pipe(
          Layer.provide(Layer.succeed(HttpClient.HttpClient, makeUrlCapturingClient(urlRef))),
          Layer.provide(RpcSerialization.layerNdjson)
        )

        const makeProtocol = yield* Effect.provide(Runners.RpcClientProtocol, layer)
        const protocol = yield* makeProtocol(RunnerAddress.make("localhost", 3000))

        yield* protocol.send(testRequest).pipe(Effect.ignore)

        const urls = yield* Ref.get(urlRef)
        expect(urls[0]).toBe("http://localhost:3000/rpc")
      }))

    it.scoped("path 'rpc' produces http://host:port/rpc", () =>
      Effect.gen(function*() {
        const urlRef = yield* Ref.make<Array<string>>([])

        const layer = HttpRunner.layerClientProtocolHttp({ path: "rpc" }).pipe(
          Layer.provide(Layer.succeed(HttpClient.HttpClient, makeUrlCapturingClient(urlRef))),
          Layer.provide(RpcSerialization.layerNdjson)
        )

        const makeProtocol = yield* Effect.provide(Runners.RpcClientProtocol, layer)
        const protocol = yield* makeProtocol(RunnerAddress.make("localhost", 3000))

        yield* protocol.send(testRequest).pipe(Effect.ignore)

        const urls = yield* Ref.get(urlRef)
        expect(urls[0]).toBe("http://localhost:3000/rpc")
      }))
  })

  describe("layerHttpOptions", () => {
    const deps = Layer.mergeAll(
      RunnerStorage.layerMemory,
      RunnerHealth.layerNoop,
      MessageStorage.layerNoop,
      ShardingConfig.layerDefaults,
      RpcSerialization.layerNdjson,
      Layer.succeed(Runners.RpcClientProtocol, () => Effect.die("mock"))
    )

    it.scoped("registers route on HttpLayerRouter so POST / is not 404", () =>
      Effect.gen(function*() {
        const { dispose, handler } = HttpLayerRouter.toWebHandler(
          HttpRunner.layerHttpOptions({ path: "/" }).pipe(Layer.provide(deps))
        )
        yield* Effect.addFinalizer(() => Effect.promise(() => dispose()))

        const response = yield* Effect.promise(() =>
          handler(
            new Request("http://localhost/", {
              method: "POST",
              headers: { "content-type": "application/octet-stream" },
              body: new Uint8Array([])
            })
          )
        )
        expect(response.status).not.toBe(404)
      }))
  })
})
