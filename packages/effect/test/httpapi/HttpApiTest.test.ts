import { assert, it } from "@effect/vitest"
import { Cause, Deferred, Effect, FileSystem, Layer, Path, Schema, Stream } from "effect"
import { Etag, HttpClient, HttpClientRequest, HttpClientResponse, HttpPlatform, HttpServerResponse } from "effect/http"
import {
  HttpApi,
  HttpApiBuilder,
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiMiddleware,
  HttpApiSchema,
  HttpApiTest
} from "effect/http-api"

const TestServices = Layer.mergeAll(Path.layer, Etag.layerWeak, HttpPlatform.layer).pipe(
  Layer.provideMerge(FileSystem.layerNoop({}))
)

it.layer(TestServices)("HttpApiTest streaming", (it) => {
  it.effect("passes each payload element through before the source produces the next", () =>
    Effect.gen(function*() {
      const first = yield* Deferred.make<void>()
      const second = yield* Deferred.make<void>()
      const api = HttpApi.make("Api").add(
        HttpApiGroup.make("test").add(
          HttpApiEndpoint.post("upload", "/upload", {
            payload: HttpApiSchema.StreamNdjson({ schema: Schema.Number }),
            success: Schema.Array(Schema.Number)
          })
        )
      )
      const seen: Array<number> = []
      const groups = HttpApiBuilder.group(api, "test", (handlers) =>
        handlers.handle("upload", ({ payload }) =>
          payload.pipe(
            Stream.tap((n) =>
              Effect.gen(function*() {
                seen.push(n)
                yield* Deferred.succeed(n === 1 ? first : second, undefined)
              })
            ),
            Stream.runCollect
          )))
      const client = yield* HttpApiTest.groups(api, ["test"]).pipe(Effect.provide(groups))
      const source = Stream.make(1).pipe(
        Stream.concat(Stream.fromEffect(Deferred.await(first).pipe(Effect.as(2)))),
        Stream.concat(Stream.fromEffect(Deferred.await(second).pipe(Effect.as(3))))
      )
      const response = yield* client.test.upload({ payload: source })
      assert.deepStrictEqual(seen, [1, 2, 3])
      assert.deepStrictEqual(response, [1, 2, 3])
    }))

  for (const streaming of [false, true]) {
    it.effect(`returns the original source error ${streaming ? "inside the response body" : "before the response"}`, () =>
      Effect.gen(function*() {
        const failure = { _tag: "UploadFailed", message: "source failed" } as const
        const api = HttpApi.make("Api").add(
          HttpApiGroup.make("test").add(
            HttpApiEndpoint.post("upload", "/upload", {
              payload: HttpApiSchema.StreamUint8Array(),
              success: HttpApiSchema.StreamUint8Array()
            })
          )
        )
        const groups = HttpApiBuilder.group(api, "test", (handlers) =>
          handlers.handle("upload", ({ payload }) => {
            // A separate producer fiber must still abort the request handler.
            const buffered = Stream.buffer(payload, { capacity: 1 })
            return streaming
              ? Effect.succeed(buffered)
              : Stream.runDrain(buffered).pipe(Effect.as(Stream.empty))
          }))
        const client = yield* HttpApiTest.groups(api, ["test"]).pipe(Effect.provide(groups))
        const exit = yield* client.test.upload({
          payload: Stream.make(new Uint8Array([1])).pipe(Stream.concat(Stream.fail(failure)))
        }).pipe(Effect.flatMap(Stream.runDrain), Effect.exit)
        assert.strictEqual(exit._tag, "Failure")
        if (exit._tag === "Failure") {
          assert.strictEqual(Cause.squash(exit.cause), failure)
          assert.isTrue(Cause.hasFails(exit.cause))
          assert.isFalse(Cause.hasDies(exit.cause))
          assert.isFalse(Cause.hasInterrupts(exit.cause))
        }
      }))
  }

  it.effect("keeps handler resources alive after the call until the response stream finishes", () =>
    Effect.gen(function*() {
      let closed = false
      const api = HttpApi.make("Api").add(
        HttpApiGroup.make("test").add(
          HttpApiEndpoint.get("download", "/download", { success: HttpApiSchema.StreamUint8Array() })
        )
      )
      const groups = HttpApiBuilder.group(
        api,
        "test",
        (handlers) =>
          handlers.handle("download", () =>
            Effect.gen(function*() {
              yield* Effect.addFinalizer(() =>
                Effect.sync(() => {
                  closed = true
                })
              )
              return Stream.fromEffect(Effect.sync(() => {
                assert.isFalse(closed)
                return new Uint8Array([1, 2, 3])
              }))
            }))
      )
      const client = yield* HttpApiTest.groups(api, ["test"]).pipe(Effect.provide(groups))
      const response = yield* client.test.download()
      assert.isFalse(closed)
      const chunks = yield* Stream.runCollect(response)
      assert.deepStrictEqual(chunks, [new Uint8Array([1, 2, 3])])
      assert.isTrue(closed)
    }))

  it.effect("closes an unread response when the owning test scope closes", () =>
    Effect.gen(function*() {
      let closed = false
      const api = HttpApi.make("Api").add(
        HttpApiGroup.make("test").add(
          HttpApiEndpoint.get("download", "/download", { success: HttpApiSchema.StreamUint8Array() })
        )
      )
      const groups = HttpApiBuilder.group(api, "test", (handlers) =>
        handlers.handle("download", () =>
          Effect.gen(function*() {
            yield* Effect.addFinalizer(() =>
              Effect.sync(() => {
                closed = true
              })
            )
            return Stream.never
          })))
      // Close a nested owner explicitly so cleanup is observable within this test.
      yield* Effect.scoped(Effect.gen(function*() {
        const client = yield* HttpApiTest.groups(api, ["test"]).pipe(Effect.provide(groups))
        const response = yield* client.test.download()
        assert.isTrue(Stream.isStream(response))
        assert.isFalse(closed)
      }))
      assert.isTrue(closed)
    }))

  it.effect("replays a stream payload on retry even when the transport receives the same request", () =>
    Effect.gen(function*() {
      class Retry extends HttpApiMiddleware.Service<Retry>()("StreamingRetry", {}) {}
      const api = HttpApi.make("Api").add(
        HttpApiGroup.make("test").add(
          HttpApiEndpoint.post("upload", "/upload", {
            payload: HttpApiSchema.StreamNdjson({ schema: Schema.Number }),
            success: Schema.Array(Schema.Number)
          }).middleware(Retry)
        )
      )
      const received: Array<ReadonlyArray<number>> = []
      const groups = HttpApiBuilder.group(
        api,
        "test",
        (handlers) =>
          handlers.handle("upload", ({ payload }) =>
            Stream.runCollect(payload).pipe(
              Effect.tap((items) =>
                Effect.sync(() => {
                  received.push(items)
                })
              )
            ))
      )
      const middleware = Layer.succeed(Retry)((effect) =>
        effect.pipe(
          Effect.map((response) => HttpServerResponse.setStatus(response, received.length === 1 ? 503 : 200))
        )
      )
      const requests: Array<HttpClientRequest.HttpClientRequest> = []
      const client = yield* HttpApiTest.groups(api, ["test"], { baseUrl: "" }).pipe(
        Effect.provide(groups),
        Effect.provide(middleware),
        Effect.provide(HttpApiMiddleware.layerClient(Retry, ({ next, request }) => {
          const resolved = HttpClientRequest.setUrl(request, "http://localhost:3000/upload")
          return Effect.suspend(() => {
            requests.push(resolved)
            return next(resolved).pipe(Effect.flatMap(HttpClientResponse.filterStatusOk))
          }).pipe(Effect.retry({ times: 1 }))
        }))
      )
      const response = yield* client.test.upload({
        payload: Stream.make(1, 2)
      }).pipe(Effect.provideService(HttpClient.TracerDisabledWhen, () => true))
      assert.deepStrictEqual(response, [1, 2])
      assert.deepStrictEqual(received, [[1, 2], [1, 2]])
      assert.strictEqual(requests.length, 2)
      assert.strictEqual(requests[0], requests[1])
    }))
})
