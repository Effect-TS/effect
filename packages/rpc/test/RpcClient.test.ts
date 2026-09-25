import { Socket } from "@effect/platform"
import { Rpc, RpcClient, RpcGroup, RpcSerialization } from "@effect/rpc"
import { assert, describe, it } from "@effect/vitest"
import { Cause, Effect, Exit, Fiber, Layer, Option, Schema, Stream, TestClock } from "effect"

class StreamRpcs extends RpcGroup.make(
  Rpc.make("Subscribe", {
    success: Schema.Number,
    stream: true
  })
) {}

const silentSocket = Socket.Socket.of({
  [Socket.TypeId]: Socket.TypeId,
  run: () => Effect.never,
  runRaw: (_handler, options) => Effect.andThen(options?.onOpen ?? Effect.void, Effect.never),
  writer: Effect.succeed(() => Effect.void)
})

const ProtocolSilentSocket = RpcClient.layerProtocolSocket({ retryTransientErrors: true }).pipe(
  Layer.provide(Layer.succeed(Socket.Socket, silentSocket)),
  Layer.provide(RpcSerialization.layerNdjson)
)

describe("RpcClient", () => {
  describe("makeProtocolSocket", () => {
    it.effect("fails in-flight streams when a pong is missed on an open socket", () =>
      Effect.gen(function*() {
        const client = yield* RpcClient.make(StreamRpcs)
        const fiber = yield* client.Subscribe().pipe(Stream.runDrain, Effect.fork)

        yield* TestClock.adjust("30 seconds")

        const exit = yield* Fiber.poll(fiber)
        assert(Option.isSome(exit), "stream is still waiting after the missed pong")
        assert(Exit.isFailure(exit.value))
        const error = Cause.failureOption(exit.value.cause)
        assert(Option.isSome(error))
        assert.strictEqual(error.value.reason, "Protocol")
        assert(Socket.isSocketError(error.value.cause))
        assert.strictEqual(error.value.cause.reason, "Read")
      }).pipe(Effect.scoped, Effect.provide(ProtocolSilentSocket)))
  })
})
