import {
  ClusterError,
  ClusterSchema,
  Entity,
  EntityAddress,
  EntityId,
  EntityType,
  Envelope,
  MessageStorage,
  RunnerAddress,
  Runners,
  RunnerServer,
  Sharding,
  ShardingConfig,
  Snowflake
} from "@effect/cluster"
import { Headers } from "@effect/platform"
import { Rpc, RpcTest } from "@effect/rpc"
import { assert, describe, it } from "@effect/vitest"
import { Cause, Context, Effect, Exit, Fiber, Layer, Option, Schema, Scope, Stream, TestClock } from "effect"
import * as RunnerHealth from "../src/RunnerHealth.js"
import * as RunnerStorage from "../src/RunnerStorage.js"
import { MemoryLive } from "./fixtures/abandonment.js"

// Preserve graceful draining and local interruption; only remote volatile replies become retryable.
const DrainEntity = Entity.make("ShutdownDrain", [
  Rpc.make("Persisted", { success: Schema.String }).annotate(ClusterSchema.Persisted, true),
  Rpc.make("Volatile", { success: Schema.String }).annotate(ClusterSchema.Persisted, false),
  Rpc.make("VolatileStream", { success: Schema.String, stream: true }).annotate(ClusterSchema.Persisted, false)
])

const terminationTimeout = 1000

const setup = Effect.gen(function*() {
  const driver = yield* MessageStorage.MemoryDriver
  const entered = yield* Effect.makeLatch()
  const gate = yield* Effect.makeLatch()
  let interrupted = false
  const handler = () =>
    Effect.gen(function*() {
      yield* entered.open
      yield* gate.await.pipe(Effect.onInterrupt(() =>
        Effect.sync(() => {
          interrupted = true
        })
      ))
      return "done"
    })
  const scope = yield* Effect.acquireRelease(Scope.make(), (scope) => Scope.close(scope, Exit.void))
  const context = yield* Layer.build(
    RunnerServer.layerHandlers.pipe(
      Layer.provideMerge(
        DrainEntity.toLayer({
          Persisted: handler,
          Volatile: handler,
          VolatileStream: () => Stream.fromEffect(handler()).pipe(Stream.drain)
        })
      ),
      Layer.provideMerge(Sharding.layer),
      Layer.provideMerge(Snowflake.layerGenerator),
      Layer.provide(RunnerStorage.layerMemory),
      Layer.provide(RunnerHealth.layerNoop),
      Layer.provide(Runners.layerNoop),
      Layer.provide(ShardingConfig.layer({
        runnerAddress: Option.some(RunnerAddress.make("localhost", 1234)),
        shardsPerGroup: 1,
        entityTerminationTimeout: terminationTimeout,
        entityMessagePollInterval: 100,
        entityReplyPollInterval: 100,
        sendRetryInterval: 10
      }))
    )
  ).pipe(Scope.extend(scope))
  yield* TestClock.adjust(1)
  const client = (yield* DrainEntity.client.pipe(Effect.provide(context)))("one")
  const stop = Scope.close(scope, Exit.void)
  const clock = { interrupted: () => interrupted }
  return { driver, entered, gate, client, stop, clock, sharding: Context.get(context, Sharding.Sharding), context }
})

const replies = (driver: MessageStorage.MemoryDriver) =>
  driver.journal.flatMap((e) =>
    e._tag === "Request" ? driver.requests.get(e.requestId)!.replies.map((r) => r._tag) : []
  )

describe("shutdown drain", () => {
  for (const kind of ["Persisted", "Volatile"] as const) {
    it.effect(`${kind}: a handler that completes before the termination timeout is drained and replied`, () =>
      Effect.gen(function*() {
        const { client, clock, driver, entered, gate, stop } = yield* setup
        const request = yield* client[kind]().pipe(Effect.fork)
        yield* TestClock.adjust(1)
        yield* entered.await
        const stopping = yield* Effect.fork(stop)
        yield* TestClock.adjust(terminationTimeout - 1)
        assert.isFalse(clock.interrupted(), "shutdown must keep draining until the termination timeout")
        assert(Option.isNone(yield* Fiber.poll(stopping)), "shutdown must wait for the in-flight handler")
        yield* gate.open
        yield* TestClock.adjust(1)
        assert.deepStrictEqual(yield* Fiber.join(request), "done")
        yield* Fiber.join(stopping)
        if (kind === "Persisted") assert.deepStrictEqual(replies(driver), ["WithExit"])
      }).pipe(Effect.scoped, Effect.provide(MemoryLive)))
  }

  // Local volatile callers keep the inherited contract pinned by the shard lock failover tests:
  // losing the owner interrupts them.
  it.effect("Volatile (local caller): a handler forced past the termination timeout interrupts the caller", () =>
    Effect.gen(function*() {
      const { client, clock, entered, stop } = yield* setup
      const request = yield* client.Volatile().pipe(Effect.fork)
      yield* TestClock.adjust(1)
      yield* entered.await
      const stopping = yield* Effect.fork(stop)
      yield* TestClock.adjust(terminationTimeout - 1)
      assert.isFalse(clock.interrupted())
      yield* TestClock.adjust(1)
      for (let i = 0; i < 10; i++) yield* TestClock.adjust(10)
      assert.isTrue(clock.interrupted(), "the handler must be forced after the termination timeout")
      yield* Fiber.join(stopping)
      const exit = yield* Fiber.await(request)
      assert(Exit.isFailure(exit) && Cause.isInterruptedOnly(exit.cause))
    }).pipe(Effect.scoped, Effect.provide(MemoryLive)))

  for (const stream of [false, true]) {
    for (const forced of [false, true]) {
      const title = forced
        ? "forced past the timeout yields a routing failure, not a terminal interrupt"
        : "drained before the timeout is replied"
      it.effect(`Volatile (remote ${stream ? "stream" : "unary"} caller): ${title}`, () =>
        Effect.gen(function*() {
          const { clock, context, entered, gate, sharding, stop } = yield* setup
          const snowflake = yield* Snowflake.Generator.pipe(Effect.provide(context))
          const request = Envelope.makeRequest<any>({
            requestId: snowflake.unsafeNext(),
            tag: stream ? "VolatileStream" : "Volatile",
            payload: undefined,
            headers: Headers.empty,
            address: EntityAddress.make({
              entityId: EntityId.make("one"),
              entityType: EntityType.EntityType.make(DrainEntity.type),
              shardId: sharding.getShardId(EntityId.make("one"), "default")
            })
          })
          const client = yield* RpcTest.makeClient(Runners.Rpcs).pipe(Effect.provide(context))
          const response = stream
            ? client.Stream({ request, persisted: false }).pipe(Stream.runHead, Effect.map(Option.getOrThrow))
            : client.Effect({ request, persisted: false })
          const call = yield* response.pipe(Effect.exit, Effect.fork)
          yield* TestClock.adjust(1)
          yield* entered.await
          const stopping = yield* Effect.fork(stop)
          yield* TestClock.adjust(terminationTimeout - 1)
          assert.isFalse(clock.interrupted(), "shutdown must keep draining until the termination timeout")
          if (!forced) {
            yield* gate.open
            yield* TestClock.adjust(1)
            const exit = yield* Fiber.join(call)
            assert(Exit.isSuccess(exit), "a drained handler must reply normally")
            assert(exit.value._tag === "WithExit" && exit.value.exit._tag === "Success")
          } else {
            yield* TestClock.adjust(1)
            for (let i = 0; i < 10; i++) yield* TestClock.adjust(10)
            assert.isTrue(clock.interrupted(), "the handler must be forced after the termination timeout")
            const exit = yield* Fiber.join(call)
            assert(Exit.isFailure(exit), "the remote caller must not receive a terminal reply")
            assert.isFalse(
              Cause.isInterruptedOnly(exit.cause),
              "the transient interrupt must not become the caller's exit"
            )
            assert.instanceOf(Cause.squash(exit.cause), ClusterError.EntityNotAssignedToRunner)
          }
          yield* Fiber.join(stopping)
        }).pipe(Effect.scoped, Effect.provide(MemoryLive)))
    }
  }

  it.effect("Persisted: a handler forced past the termination timeout persists no terminal reply", () =>
    Effect.gen(function*() {
      const { client, clock, driver, entered, stop } = yield* setup
      const request = yield* client.Persisted().pipe(Effect.fork)
      yield* TestClock.adjust(1)
      yield* entered.await
      const stopping = yield* Effect.fork(stop)
      yield* TestClock.adjust(terminationTimeout - 1)
      assert.isFalse(clock.interrupted())
      yield* TestClock.adjust(1)
      for (let i = 0; i < 10; i++) yield* TestClock.adjust(10)
      assert.isTrue(clock.interrupted(), "the handler must be forced after the termination timeout")
      yield* Fiber.join(stopping)
      const exit = yield* Fiber.await(request)
      assert(
        Exit.isFailure(exit) && Cause.isInterruptedOnly(exit.cause),
        "the persisted caller is abandoned for replay"
      )
      assert.deepStrictEqual(replies(driver), [], "no terminal reply may be persisted for a forced handler")
      assert.strictEqual(driver.journal.filter((e) => e._tag === "Request").length, 1)
    }).pipe(Effect.scoped, Effect.provide(MemoryLive)))
})
