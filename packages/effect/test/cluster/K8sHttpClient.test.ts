import { assert, describe, it } from "@effect/vitest"
import { Effect, Fiber, FileSystem, Layer, Schema } from "effect"
import * as K8sHttpClient from "effect/cluster/K8sHttpClient"
import { HttpClient, HttpClientResponse } from "effect/http"
import { TestClock } from "effect/testing"

const testLayer = (fs: FileSystem.FileSystem, client: HttpClient.HttpClient) =>
  K8sHttpClient.layer.pipe(Layer.provide(Layer.mergeAll(
    Layer.succeed(FileSystem.FileSystem, fs),
    Layer.succeed(HttpClient.HttpClient, client)
  )))

describe.concurrent("K8sHttpClient", () => {
  describe("layer", () => {
    it.effect("uses the rotated token on subsequent executions of the same request", () =>
      Effect.gen(function*() {
        let token = " token-1\n"
        const authorization: Array<string | undefined> = []
        const layer = testLayer(
          FileSystem.makeNoop({
            readFileString: () => Effect.sync(() => token)
          }),
          HttpClient.make((request) =>
            Effect.sync(() => {
              authorization.push(request.headers.authorization)
              return HttpClientResponse.fromWeb(request, new Response(null, { status: 200 }))
            })
          )
        )

        yield* Effect.gen(function*() {
          const client = yield* K8sHttpClient.K8sHttpClient
          const request = client.get("/v1/pods")
          yield* request
          token = " token-2\n"
          yield* request
          assert.deepStrictEqual(authorization, ["Bearer token-1", "Bearer token-2"])
        }).pipe(Effect.provide(layer))
      }))
    it.effect("uses the rotated token when retrying a transient failure", () =>
      Effect.gen(function*() {
        let token = "token-1"
        const authorization: Array<string | undefined> = []
        const layer = testLayer(
          FileSystem.makeNoop({ readFileString: () => Effect.sync(() => token) }),
          HttpClient.make((request) =>
            Effect.sync(() => {
              authorization.push(request.headers.authorization)
              const status = authorization.length === 1 ? 503 : 200
              token = "token-2"
              return HttpClientResponse.fromWeb(request, new Response(null, { status }))
            })
          )
        )

        yield* Effect.gen(function*() {
          const client = yield* K8sHttpClient.K8sHttpClient
          const fiber = yield* client.get("/v1/pods").pipe(Effect.forkChild)
          yield* TestClock.adjust("5 seconds")
          const response = yield* Fiber.join(fiber)
          assert.strictEqual(response.status, 200)
          assert.deepStrictEqual(authorization, ["Bearer token-1", "Bearer token-2"])
        }).pipe(Effect.provide(layer))
      }))

    it.effect("omits authentication when the token file is unavailable", () =>
      Effect.gen(function*() {
        const layer = testLayer(
          FileSystem.makeNoop({}),
          HttpClient.make((request) =>
            Effect.sync(() => {
              assert.isUndefined(request.headers.authorization)
              return HttpClientResponse.fromWeb(request, new Response(null, { status: 200 }))
            })
          )
        )

        yield* Effect.gen(function*() {
          const client = yield* K8sHttpClient.K8sHttpClient
          const response = yield* client.get("/v1/pods")
          assert.strictEqual(response.status, 200)
        }).pipe(Effect.provide(layer))
      }))

    it.effect("omits the old token when the token file becomes unavailable", () =>
      Effect.gen(function*() {
        let available = true
        const unavailable = FileSystem.makeNoop({})
        const authorization: Array<string | undefined> = []
        const layer = testLayer(
          FileSystem.makeNoop({
            readFileString: (path) =>
              Effect.suspend(() => available ? Effect.succeed("token-1") : unavailable.readFileString(path))
          }),
          HttpClient.make((request) =>
            Effect.sync(() => {
              authorization.push(request.headers.authorization)
              return HttpClientResponse.fromWeb(request, new Response(null, { status: 200 }))
            })
          )
        )

        yield* Effect.gen(function*() {
          const client = yield* K8sHttpClient.K8sHttpClient
          yield* client.get("/v1/pods")
          available = false
          yield* client.get("/v1/pods")
          assert.deepStrictEqual(authorization, ["Bearer token-1", undefined])
        }).pipe(Effect.provide(layer))
      }))
  })

  describe("Pod", () => {
    it.effect("decodes null condition lastTransitionTime values", () =>
      Effect.gen(function*() {
        const pod = yield* Schema.decodeUnknownEffect(K8sHttpClient.Pod)({
          status: {
            phase: "Running",
            podIP: "10.0.0.1",
            hostIP: "10.0.0.2",
            conditions: [
              {
                type: "Initialized",
                status: "True",
                lastTransitionTime: null
              },
              {
                type: "Ready",
                status: "False",
                lastTransitionTime: null
              }
            ]
          }
        })

        assert.strictEqual(pod.status.conditions[0].lastTransitionTime, null)
        assert.strictEqual(pod.isReady, false)
        assert.strictEqual(pod.isReadyOrInitializing, true)
      }))
  })
})
