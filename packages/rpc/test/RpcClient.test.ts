import { Rpc, RpcClient, RpcGroup } from "@effect/rpc"
import { assert, describe, it } from "@effect/vitest"
import { Cause, Deferred, Effect, Exit, Fiber, HashSet, Option, Schema, Stream, TestClock } from "effect"

describe("RPC stream write interruption", () => {
  for (const consumer of ["mailbox", "stream"] as const) {
    it.effect(`interrupting the write fiber releases the ${consumer} consumer with its cause`, () =>
      Effect.gen(function*() {
        const writing = yield* Deferred.make<Fiber.RuntimeFiber<void, never>>()
        const { client } = yield* RpcClient.makeNoSerialization(
          RpcGroup.make(Rpc.make("Values", { success: Schema.String, stream: true })),
          {
            onFromClient: ({ message }) =>
              message._tag === "Request"
                ? Effect.withFiberRuntime<void>((fiber) =>
                  Deferred.succeed(writing, fiber).pipe(Effect.andThen(Effect.never))
                )
                : Effect.void
          }
        )
        const reader = yield* (consumer === "mailbox"
          ? client.Values(undefined, { asMailbox: true }).pipe(Effect.flatMap((mailbox) => mailbox.take), Effect.asVoid)
          : Stream.runDrain(client.Values())).pipe(Effect.fork)
        const writer = yield* Deferred.await(writing)
        yield* TestClock.adjust(1)
        assert(Option.isNone(yield* Fiber.poll(reader)), "the consumer must be waiting before the write is interrupted")
        const interruptor = yield* Effect.fiberId
        const writeExit = yield* Fiber.interruptAs(writer, interruptor)
        assert(Exit.isFailure(writeExit) && Cause.isInterruptedOnly(writeExit.cause))
        assert(HashSet.has(Cause.interruptors(writeExit.cause), interruptor))

        yield* TestClock.adjust(1)
        const readExit = yield* Fiber.poll(reader)
        assert(Option.isSome(readExit), "the consumer must fail after write interruption rather than remain parked")
        assert(Exit.isFailure(readExit.value) && Cause.isInterruptedOnly(readExit.value.cause))
        assert(HashSet.has(Cause.interruptors(readExit.value.cause), interruptor))
      }).pipe(Effect.scoped))
  }
})
