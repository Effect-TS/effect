import { assert, describe, it } from "@effect/vitest"
import { Deferred, Effect, Fiber, Layer, Ref, Schema, Sink, Stdio, Stream } from "effect"
import { HttpRouter } from "effect/unstable/http"
import { Rpc, RpcGroup, RpcSerialization, RpcServer } from "effect/unstable/rpc"
import { Socket, SocketServer } from "effect/unstable/socket"

const producedWithoutReadingFramedBody = Effect.fnUntraced(function*(
  streamBufferSize?: number | "unbounded"
) {
  let produced = 0
  const Rpcs = RpcGroup.make(Rpc.make("events", {
    payload: Schema.Struct({}),
    success: Schema.Number,
    stream: true
  }))
  const Handlers = Rpcs.toLayerHandler(
    "events",
    () => Stream.fromEffectRepeat(Effect.sync(() => ++produced)).pipe(Stream.take(10_000))
  )
  const Server = RpcServer.layerHttp({
    group: Rpcs,
    path: "/rpc",
    protocol: "http",
    ...(streamBufferSize === undefined ? {} : { streamBufferSize })
  }).pipe(
    Layer.provide(Handlers),
    Layer.provide(RpcSerialization.layerNdjson)
  )
  const { dispose, handler } = HttpRouter.toWebHandler(Server)
  yield* Effect.addFinalizer(() => Effect.promise(dispose))

  const response = yield* Effect.promise(() =>
    handler(
      new Request("http://test/rpc", {
        method: "POST",
        body: `{"_tag":"Request","id":1,"tag":"events","payload":{},"headers":[]}\n`
      })
    )
  )
  yield* Effect.addFinalizer(() => response.body === null ? Effect.void : Effect.promise(() => response.body!.cancel()))
  for (let i = 0; i < 100; i++) {
    yield* Effect.yieldNow
  }

  return produced
})

describe("RpcServer", () => {
  it.effect("should backpressure STDIO sends when the output buffer is full", () =>
    Effect.gen(function*() {
      const protocolReady = yield* Deferred.make<RpcServer.Protocol["Service"]>()
      const firstWriteStarted = yield* Deferred.make<void>()
      const releaseFirstWrite = yield* Deferred.make<void>()
      const thirdSendCompleted = yield* Deferred.make<void>()
      const writes = yield* Ref.make(0)
      const stdio = Stdio.layerTest({
        stdin: Stream.never,
        stdout: () =>
          Sink.forEach(() =>
            Ref.getAndUpdate(writes, (count) => count + 1).pipe(
              Effect.flatMap((index) =>
                index === 0
                  ? Deferred.succeed(firstWriteStarted, undefined).pipe(
                    Effect.andThen(Deferred.await(releaseFirstWrite))
                  )
                  : Effect.void
              )
            )
          )
      })
      yield* Effect.gen(function*() {
        const protocol = yield* RpcServer.makeProtocolStdio
        yield* Deferred.succeed(protocolReady, protocol)
        return yield* protocol.run(() => Effect.void)
      }).pipe(
        Effect.provide(stdio),
        Effect.provide(RpcSerialization.layerJsonRpc()),
        Effect.forkScoped
      )
      const protocol = yield* Deferred.await(protocolReady)

      const first = yield* protocol.send(0, { _tag: "Pong" }).pipe(Effect.forkScoped)
      yield* Deferred.await(firstWriteStarted)
      const second = yield* protocol.send(0, { _tag: "Pong" }).pipe(Effect.forkScoped)
      const third = yield* protocol.send(0, { _tag: "Pong" }).pipe(
        Effect.andThen(Deferred.succeed(thirdSendCompleted, undefined)),
        Effect.forkScoped
      )
      yield* Effect.yieldNow
      assert.strictEqual(yield* Ref.get(writes), 1)
      assert.isFalse(yield* Deferred.isDone(thirdSendCompleted))

      yield* Deferred.succeed(releaseFirstWrite, undefined)
      yield* Fiber.join(first)
      yield* Fiber.join(second)
      yield* Fiber.join(third)
      assert.strictEqual(yield* Ref.get(writes), 3)
    }))

  it.effect("applies backpressure to framed HTTP responses by default", () =>
    Effect.gen(function*() {
      const produced = yield* producedWithoutReadingFramedBody()

      assert.isAbove(produced, 0)
      assert.isBelow(produced, 10_000)
    }))

  it.effect("uses the configured framed HTTP response buffer size", () =>
    Effect.gen(function*() {
      const produced = yield* producedWithoutReadingFramedBody(1)

      assert.isAbove(produced, 0)
      assert.isBelow(produced, 16)
    }))

  it.effect("allows unbounded framed HTTP response buffering", () =>
    Effect.gen(function*() {
      const produced = yield* producedWithoutReadingFramedBody("unbounded")

      assert.strictEqual(produced, 10_000)
    }))

  it.effect("keeps non-framed HTTP responses unbounded", () =>
    Effect.gen(function*() {
      let produced = 0
      const Rpcs = RpcGroup.make(Rpc.make("events", {
        payload: Schema.Struct({}),
        success: Schema.Number,
        stream: true
      }))
      const Handlers = Rpcs.toLayerHandler(
        "events",
        () => Stream.fromEffectRepeat(Effect.sync(() => ++produced)).pipe(Stream.take(100))
      )
      const Server = RpcServer.layerHttp({
        group: Rpcs,
        path: "/rpc",
        protocol: "http",
        streamBufferSize: 1
      }).pipe(
        Layer.provide(Handlers),
        Layer.provide(RpcSerialization.layerJson)
      )
      const { dispose, handler } = HttpRouter.toWebHandler(Server)
      yield* Effect.addFinalizer(() => Effect.promise(dispose))

      yield* Effect.promise(() =>
        handler(
          new Request("http://test/rpc", {
            method: "POST",
            body: `{"_tag":"Request","id":1,"tag":"events","payload":{},"headers":[]}`
          })
        )
      )

      assert.strictEqual(produced, 100)
    }))

  it.effect("closes a socket when the serialization buffer limit is exceeded", () =>
    Effect.gen(function*() {
      const handledChunks: Array<string> = []
      const writes: Array<Uint8Array | string | Socket.CloseEvent> = []
      const completed = yield* Deferred.make<void>()
      let closed = false

      const write = (chunk: Uint8Array | string | Socket.CloseEvent) =>
        Effect.sync(() => {
          writes.push(chunk)
          if (Socket.isCloseEvent(chunk)) {
            closed = true
          }
        })
      const socket = Socket.make({
        reader: Effect.sync(() => {
          const chunks = ["12", "34", "5", "{\"_tag\":\"Ping\"}\n"]
          let index = 0
          return {
            pull: Effect.suspend(() => {
              if (closed || index >= chunks.length) {
                return Deferred.succeed(completed, void 0).pipe(
                  Effect.andThen(Effect.fail(
                    new Socket.SocketError({
                      reason: new Socket.SocketCloseError({ code: 1000 })
                    })
                  ))
                )
              }
              const chunk = chunks[index++]
              handledChunks.push(chunk)
              return Effect.succeed([chunk] as const)
            }),
            upgrade: () =>
              Effect.fail(
                new Socket.SocketError({
                  reason: new Socket.SocketUpgradeError({})
                })
              )
          }
        }),
        writer: Effect.succeed({
          write,
          writeAll: (chunks) => Effect.forEach(chunks, write, { discard: true })
        })
      })
      const socketServer = SocketServer.SocketServer.of({
        address: {
          _tag: "TcpAddress",
          hostname: "localhost",
          port: 0
        },
        run: (handler) => handler(socket).pipe(Effect.orDie, Effect.andThen(Effect.never))
      })

      const protocol = yield* RpcServer.makeProtocolSocketServer.pipe(
        Effect.provide(Layer.succeed(SocketServer.SocketServer, socketServer)),
        Effect.provide(Layer.succeed(
          RpcSerialization.RpcSerialization,
          RpcSerialization.makeNdjson({ maxBufferSize: 4 })
        ))
      )
      yield* Effect.forkScoped(protocol.run(() => Effect.void))
      yield* Deferred.await(completed)

      assert.deepStrictEqual(handledChunks, ["12", "34", "5"])
      assert.strictEqual(writes.length, 1)
      const closeEvent = writes[0]
      assert(Socket.isCloseEvent(closeEvent))
      assert.strictEqual(closeEvent.code, 1009)
    }))
})
