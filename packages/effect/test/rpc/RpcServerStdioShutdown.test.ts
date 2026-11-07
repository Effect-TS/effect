import { assert, describe, it } from "@effect/vitest"
import { Deferred, Effect, Fiber, Sink, Stdio, Stream } from "effect"
import { RpcSerialization, RpcServer } from "effect/rpc"
import { TestClock } from "effect/testing"

const response = (id: number) => ({
  _tag: "Exit",
  requestId: id,
  exit: { _tag: "Success", value: id }
} as const)

const makeHarness = Effect.fnUntraced(function*(write: (chunk: string | Uint8Array) => Effect.Effect<void>) {
  const ready = yield* Deferred.make<RpcServer.Protocol["Service"]>()
  const closingStarted = yield* Deferred.make<void>()
  const stdinFinalized = yield* Deferred.make<void>()
  const stdoutFinalized = yield* Deferred.make<void>()
  const stdio = Stdio.layerTest({
    stdin: Stream.never.pipe(Stream.ensuring(Deferred.succeed(stdinFinalized, undefined))),
    stdout: () => Sink.forEach(write).pipe(Sink.ensuring(Deferred.succeed(stdoutFinalized, undefined)))
  })
  const server = yield* Effect.gen(function*() {
    const protocol = yield* RpcServer.makeProtocolStdio
    yield* Effect.addFinalizer(() => Deferred.succeed(closingStarted, undefined))
    yield* Deferred.succeed(ready, protocol)
    return yield* protocol.run(() => Effect.void)
  }).pipe(
    Effect.provide(stdio),
    Effect.provide(RpcSerialization.layerNdjson),
    Effect.scoped,
    Effect.forkScoped
  )
  return { protocol: yield* Deferred.await(ready), server, closingStarted, stdinFinalized, stdoutFinalized }
})

describe("RpcServer.makeProtocolStdio shutdown", () => {
  it.effect("drains buffered responses before closing stdout", () =>
    Effect.gen(function*() {
      const firstWriteStarted = yield* Deferred.make<void>()
      const releaseFirstWrite = yield* Deferred.make<void>()
      const written: Array<unknown> = []
      const harness = yield* makeHarness(Effect.fnUntraced(function*(chunk) {
        if (written.length === 0) {
          yield* Deferred.succeed(firstWriteStarted, undefined)
          yield* Deferred.await(releaseFirstWrite)
        }
        written.push(JSON.parse(typeof chunk === "string" ? chunk : new TextDecoder().decode(chunk)))
      }))
      yield* Effect.addFinalizer(() => Deferred.succeed(releaseFirstWrite, undefined))
      yield* harness.protocol.send(0, response(1))
      yield* Deferred.await(firstWriteStarted)
      yield* harness.protocol.send(0, response(2))

      const closing = yield* Fiber.interrupt(harness.server).pipe(Effect.forkChild)
      yield* Deferred.await(harness.closingStarted)
      // Let scope finalization reach the writer before making the healthy sink writable.
      yield* TestClock.adjust("1 milli")
      yield* Deferred.succeed(releaseFirstWrite, undefined)
      yield* Fiber.join(closing)

      assert.deepStrictEqual(written, [response(1), response(2)])
      assert.isTrue(yield* Deferred.isDone(harness.stdinFinalized))
      assert.isTrue(yield* Deferred.isDone(harness.stdoutFinalized))
    }))

  it.effect("bounds the drain of blocked stdout and finalizes both streams", () =>
    Effect.gen(function*() {
      const writeStarted = yield* Deferred.make<void>()
      const releaseWrite = yield* Deferred.make<void>()
      const harness = yield* makeHarness(() =>
        Deferred.succeed(writeStarted, undefined).pipe(
          Effect.andThen(Deferred.await(releaseWrite))
        )
      )
      yield* Effect.addFinalizer(() => Deferred.succeed(releaseWrite, undefined))
      yield* harness.protocol.send(0, response(1))
      yield* Deferred.await(writeStarted)
      yield* harness.protocol.send(0, response(2))

      const closing = yield* Fiber.interrupt(harness.server).pipe(Effect.forkChild)
      yield* Deferred.await(harness.closingStarted)
      yield* TestClock.adjust("999 millis")
      assert.isUndefined(closing.pollUnsafe())
      assert.isFalse(yield* Deferred.isDone(harness.stdoutFinalized))

      yield* TestClock.adjust("1 milli")
      yield* Fiber.join(closing)
      assert.isTrue(yield* Deferred.isDone(harness.stdinFinalized))
      assert.isTrue(yield* Deferred.isDone(harness.stdoutFinalized))
    }))
})
