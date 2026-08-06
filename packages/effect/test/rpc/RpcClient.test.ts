import { assert, describe, it } from "@effect/vitest"
import { Cause, Deferred, Effect, Fiber, Layer, Schedule, Schema, Stream } from "effect"
import { TestClock } from "effect/testing"
import * as HttpClient from "effect/unstable/http/HttpClient"
import * as HttpClientResponse from "effect/unstable/http/HttpClientResponse"
import { Rpc, RpcClient, RpcGroup, RpcMessage, RpcSchema, RpcSerialization } from "effect/unstable/rpc"
import { RpcClientError } from "effect/unstable/rpc/RpcClientError"
import * as Socket from "effect/unstable/socket/Socket"
import { vi } from "vitest"
import type * as RpcClientErrorModule from "../../src/unstable/rpc/RpcClientError.ts"

const TestGroup = RpcGroup.make(
  Rpc.make("Ping", { success: Schema.String }),
  Rpc.make("Events", { success: RpcSchema.Stream(Schema.String, Schema.Never) })
)

const makeHttpClient = (body: string): HttpClient.HttpClient =>
  HttpClient.make((request) =>
    Effect.succeed(
      HttpClientResponse.fromWeb(
        request,
        new Response(body, { status: 200 })
      )
    )
  )

const makeProtocolLayerWithClient = (
  serializationLayer: Layer.Layer<RpcSerialization.RpcSerialization>,
  client: HttpClient.HttpClient
) =>
  RpcClient.layerProtocolHttp({ url: "http://localhost/rpc" }).pipe(
    Layer.provideMerge(serializationLayer),
    Layer.provideMerge(Layer.succeed(HttpClient.HttpClient, client))
  )

const makeProtocolLayer = (
  serializationLayer: Layer.Layer<RpcSerialization.RpcSerialization>,
  body: string
) => makeProtocolLayerWithClient(serializationLayer, makeHttpClient(body))

const assertEmptyResponseFailsRequest = (
  serializationLayer: Layer.Layer<RpcSerialization.RpcSerialization>,
  body: string
) =>
  Effect.gen(function*() {
    const client = yield* RpcClient.make(TestGroup).pipe(
      Effect.provide(makeProtocolLayer(serializationLayer, body))
    )

    const cause = yield* client.Ping().pipe(
      Effect.timeout("1 second"),
      Effect.sandbox,
      Effect.flip
    )

    const error = Cause.squash(cause)
    assert.instanceOf(error, RpcClientError)
    assert.strictEqual(error.reason._tag, "RpcClientDefect")
    assert.strictEqual(error.reason.message, "Received empty HTTP response from RPC server")
  })

describe("RpcClient", () => {
  it("preserves RpcClientError failures from a reloaded module copy", async () => {
    vi.resetModules()
    const ForeignRpcClientError = await vi.importActual<typeof RpcClientErrorModule>(
      "../../src/unstable/rpc/RpcClientError.ts"
    )
    const rpcClientError = new ForeignRpcClientError.RpcClientError({
      reason: new ForeignRpcClientError.RpcClientDefect({ message: "boom", cause: undefined })
    })
    assert.isFalse(rpcClientError instanceof RpcClientError)

    const httpClient = HttpClient.make((request) => {
      const response = HttpClientResponse.fromWeb(request, new Response("", { status: 200 }))
      Object.defineProperty(response, "stream", { value: Stream.fail(rpcClientError) })
      return Effect.succeed(response)
    })
    const error = await Effect.gen(function*() {
      const client = yield* RpcClient.make(TestGroup).pipe(
        Effect.provide(makeProtocolLayerWithClient(RpcSerialization.layerNdjson, httpClient))
      )
      return yield* client.Ping().pipe(Effect.flip)
    }).pipe(Effect.scoped, Effect.runPromise)

    assert.strictEqual(error, rpcClientError)
  })

  it.effect("fails request on empty HTTP response for unframed serialization", () =>
    assertEmptyResponseFailsRequest(RpcSerialization.layerJson, "[]"))

  it.effect("fails request on empty HTTP response for framed serialization", () =>
    assertEmptyResponseFailsRequest(RpcSerialization.layerNdjson, ""))

  it.effect("defects request when framed HTTP response closes before request completes", () =>
    Effect.gen(function*() {
      const client = yield* RpcClient.make(TestGroup, {
        generateRequestId: () => RpcMessage.RequestId("0")
      }).pipe(
        Effect.provide(makeProtocolLayer(
          RpcSerialization.layerNdjson,
          JSON.stringify({ _tag: "Chunk", requestId: "0", values: ["event"] }) + "\n"
        ))
      )

      const cause = yield* client.Events().pipe(
        Stream.runDrain,
        Effect.timeout("1 second"),
        Effect.sandbox,
        Effect.flip
      )

      const error = Cause.squash(cause)
      assert.instanceOf(error, RpcClientError)
      assert.strictEqual(error.reason._tag, "RpcClientDefect")
      assert.strictEqual(error.reason.message, "HTTP response ended before RPC request completed")
    }))

  it.effect("reports transient socket open errors without failing in-flight streams", () =>
    Effect.gen(function*() {
      const requestSent = yield* Deferred.make<void>()
      const threeErrors = yield* Deferred.make<void>()
      const errors: Array<RpcClientError> = []
      const socketError = new Socket.SocketError({
        reason: new Socket.SocketOpenError({
          kind: "Unknown",
          cause: new Error("connection refused")
        })
      })
      const socket = Socket.make({
        runRaw: () => Deferred.await(requestSent).pipe(Effect.andThen(Effect.fail(socketError))),
        writer: Effect.succeed(() => Deferred.succeed(requestSent, void 0))
      })
      const protocol = yield* RpcClient.makeProtocolSocket({
        retryTransientErrors: true,
        retryPolicy: Schedule.spaced("1 millis"),
        onTransientError: (error) =>
          Effect.suspend(() => {
            errors.push(error)
            return errors.length === 3 ? Deferred.succeed(threeErrors, void 0) : Effect.void
          })
      }).pipe(
        Effect.provideService(Socket.Socket, socket),
        Effect.provide(RpcSerialization.layerNdjson)
      )
      const client = yield* RpcClient.make(TestGroup).pipe(
        Effect.provideService(RpcClient.Protocol, protocol)
      )
      const streamFiber = yield* client.Events().pipe(Stream.runDrain, Effect.forkChild)

      yield* TestClock.adjust("2 millis")
      yield* Deferred.await(threeErrors).pipe(Effect.timeout("1 second"))

      assert.lengthOf(errors, 3)
      for (const error of errors) {
        assert.strictEqual(error.reason._tag, "SocketOpenError")
      }
      assert.isUndefined(streamFiber.pollUnsafe())
    }))

  it.effect("fails in-flight streams when transient retries are exhausted", () =>
    Effect.gen(function*() {
      const requestSent = yield* Deferred.make<void>()
      const socketError = new Socket.SocketError({
        reason: new Socket.SocketOpenError({
          kind: "Unknown",
          cause: new Error("connection refused")
        })
      })
      const socket = Socket.make({
        runRaw: () => Deferred.await(requestSent).pipe(Effect.andThen(Effect.fail(socketError))),
        writer: Effect.succeed(() => Deferred.succeed(requestSent, void 0))
      })
      const protocol = yield* RpcClient.makeProtocolSocket({
        retryTransientErrors: true,
        retryPolicy: Schedule.recurs(2)
      }).pipe(
        Effect.provideService(Socket.Socket, socket),
        Effect.provide(RpcSerialization.layerNdjson)
      )
      const client = yield* RpcClient.make(TestGroup).pipe(
        Effect.provideService(RpcClient.Protocol, protocol)
      )
      const streamFiber = yield* client.Events().pipe(
        Stream.runDrain,
        Effect.timeout("1 second"),
        Effect.flip,
        Effect.forkChild
      )

      yield* TestClock.adjust("1 second")
      const error = yield* Fiber.join(streamFiber)

      assert.instanceOf(error, RpcClientError)
      assert.strictEqual(error.reason._tag, "SocketOpenError")
    }))

  it.effect("continues retrying when the transient error hook defects", () =>
    Effect.gen(function*() {
      const requestSent = yield* Deferred.make<void>()
      let attempts = 0
      const socketError = new Socket.SocketError({
        reason: new Socket.SocketOpenError({
          kind: "Unknown",
          cause: new Error("connection refused")
        })
      })
      const socket = Socket.make({
        runRaw: () =>
          Deferred.await(requestSent).pipe(
            Effect.tap(() => Effect.sync(() => attempts++)),
            Effect.andThen(Effect.fail(socketError))
          ),
        writer: Effect.succeed(() => Deferred.succeed(requestSent, void 0))
      })
      const protocol = yield* RpcClient.makeProtocolSocket({
        retryTransientErrors: true,
        retryPolicy: Schedule.recurs(2),
        onTransientError: () => Effect.die("hook defect")
      }).pipe(
        Effect.provideService(Socket.Socket, socket),
        Effect.provide(RpcSerialization.layerNdjson)
      )
      const client = yield* RpcClient.make(TestGroup).pipe(
        Effect.provideService(RpcClient.Protocol, protocol)
      )
      const streamFiber = yield* client.Events().pipe(
        Stream.runDrain,
        Effect.timeout("1 second"),
        Effect.flip,
        Effect.forkChild
      )

      yield* TestClock.adjust("1 second")
      const error = yield* Fiber.join(streamFiber)

      assert.strictEqual(attempts, 3)
      assert.instanceOf(error, RpcClientError)
      assert.strictEqual(error.reason._tag, "SocketOpenError")
    }))
})
