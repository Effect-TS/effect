import type { ShardId } from "@effect/cluster"
import {
  ClusterSchema,
  Entity,
  MessageStorage,
  RunnerAddress,
  Runners,
  RunnerStorage,
  Sharding,
  ShardingConfig
} from "@effect/cluster"
import { Rpc } from "@effect/rpc"
import { assert, describe, it } from "@effect/vitest"
import { Clock, Deferred, Effect, Fiber, Layer, MutableRef, Option, Schema, Stream, TestClock } from "effect"
import * as RunnerHealth from "../src/RunnerHealth.js"

// An entity whose activation owns a background fiber (like a DurableEntity's
// periodic saver). After a defect, `onDefect` rebuilds the activation. If that
// rebuild runs with interruption disabled, the background fiber of the rebuilt
// activation is uninterruptible and the activation scope can never close, so
// the shutdown handoff cannot release the entity's shard.

const entityTerminationTimeout = 15_000

const DefectEntity = Entity.make("DefectEntity", [
  Rpc.make("Ping").annotate(ClusterSchema.Persisted, false),
  Rpc.make("Subscribe", { success: Schema.Number, stream: true }).annotate(ClusterSchema.Persisted, false)
])

const runnerAddress = RunnerAddress.make("localhost", 34601)

const makeState = () => ({
  layerBuilds: MutableRef.make(0),
  poisoned: MutableRef.make(false),
  events: MutableRef.make<
    Array<{ event: "release" | "releaseAll"; shardId: ShardId.ShardId | undefined; atMillis: number }>
  >(
    []
  )
})
type State = ReturnType<typeof makeState>

const makeEntityLive = (state: State) =>
  DefectEntity.toLayer(
    Effect.gen(function*() {
      MutableRef.update(state.layerBuilds, (n) => n + 1)
      yield* Effect.sleep(1000).pipe(Effect.forever, Effect.forkScoped)
      return {
        Ping: () => Effect.void,
        Subscribe: () =>
          Rpc.fork(
            Stream.suspend(() =>
              state.poisoned.current
                ? Stream.die(new Error("subscription poisoned"))
                : Stream.make(0).pipe(Stream.concat(Stream.never))
            )
          )
      }
    })
  )

const record = (state: State, event: "release" | "releaseAll", shardId?: ShardId.ShardId) =>
  Clock.currentTimeMillis.pipe(
    Effect.tap((atMillis) =>
      Effect.sync(() => MutableRef.update(state.events, (events) => [...events, { event, shardId, atMillis }]))
    )
  )

const makeRunnerStorage = (state: State) =>
  Layer.effect(
    RunnerStorage.RunnerStorage,
    Effect.map(RunnerStorage.makeMemory, (storage) => ({
      ...storage,
      release: (address: RunnerAddress.RunnerAddress, shardId: ShardId.ShardId) =>
        Effect.andThen(record(state, "release", shardId), storage.release(address, shardId)),
      releaseAll: (address: RunnerAddress.RunnerAddress) =>
        Effect.andThen(record(state, "releaseAll"), storage.releaseAll(address))
    }))
  )

const shardingLayer = (state: State) =>
  makeEntityLive(state).pipe(
    Layer.provideMerge(Sharding.layer),
    Layer.provide(makeRunnerStorage(state)),
    Layer.provide(RunnerHealth.layerNoop),
    Layer.provide(Runners.layerNoop),
    Layer.provideMerge(MessageStorage.layerMemory),
    Layer.provide(ShardingConfig.layer({
      runnerAddress: Option.some(runnerAddress),
      shardsPerGroup: 1,
      entityMailboxCapacity: 100,
      entityTerminationTimeout,
      entityMessagePollInterval: 5000,
      sendRetryInterval: 100
    }))
  )

// Runs `body` inside a sharding runtime forked as a daemon, so a shutdown
// that never finishes cannot hang the test's own scope.
const withRuntime = <A, E>(state: State, body: Effect.Effect<A, E, Sharding.Sharding>) =>
  Effect.gen(function*() {
    const done = yield* Deferred.make<A, E>()
    const runtime = yield* body.pipe(
      Effect.exit,
      Effect.tap((exit) => Deferred.done(done, exit)),
      Effect.andThen(Effect.never),
      Effect.provide(shardingLayer(state)),
      Effect.forkDaemon
    )
    const result = yield* Deferred.await(done)
    return { runtime, result }
  })

// Shuts the runtime down (the #8946 shutdown handoff), stepping the TestClock
// for up to 60s. Returns when the shard was released relative to the
// shutdown start, and whether shutdown finished at all.
const shutdown = (state: State, runtime: Fiber.RuntimeFiber<unknown, unknown>) =>
  Effect.gen(function*() {
    const startedAt = yield* Clock.currentTimeMillis
    const interrupting = yield* Effect.forkDaemon(Fiber.interrupt(runtime))
    for (let i = 0; i < 600 && interrupting.unsafePoll() === null; i++) {
      yield* TestClock.adjust(100)
    }
    const shardRelease = state.events.current.find((e) => e.event === "release")
    return {
      shutdownCompleted: interrupting.unsafePoll() !== null,
      shardReleaseMs: shardRelease === undefined ? undefined : shardRelease.atMillis - startedAt,
      events: state.events.current.map((e) => `${e.event}@${e.atMillis - startedAt}`)
    }
  })

const poisonedSubscribe = (state: State, client: ReturnType<Effect.Effect.Success<typeof DefectEntity.client>>) =>
  Effect.gen(function*() {
    MutableRef.set(state.poisoned, true)
    yield* client.Subscribe().pipe(Stream.runDrain, Effect.catchAllCause(() => Effect.void), Effect.fork)
    yield* TestClock.adjust(1)
    MutableRef.set(state.poisoned, false)
    // default defect retry delay is 500ms
    yield* TestClock.adjust(500)
    yield* TestClock.adjust(1)
  })

describe("Sharding defect rebuild / shutdown handoff", () => {
  it.effect("control: without a defect, the shutdown handoff releases the shard promptly", () =>
    Effect.gen(function*() {
      const state = makeState()
      const { runtime } = yield* withRuntime(
        state,
        Effect.gen(function*() {
          yield* TestClock.adjust(1)
          const client = (yield* DefectEntity.client)("1")
          yield* client.Ping()
          assert.strictEqual(state.layerBuilds.current, 1)
        })
      )
      const result = yield* shutdown(state, runtime)
      assert.isTrue(result.shutdownCompleted, `shutdown did not complete: ${result.events.join(", ")}`)
      assert.isDefined(result.shardReleaseMs, `shard was never released: ${result.events.join(", ")}`)
      assert.isBelow(result.shardReleaseMs!, 1000, result.events.join(", "))
    }))

  it.effect("regression: after one defect rebuild, the shutdown handoff releases the shard promptly", () =>
    Effect.gen(function*() {
      const state = makeState()
      const { runtime } = yield* withRuntime(
        state,
        Effect.gen(function*() {
          yield* TestClock.adjust(1)
          const client = (yield* DefectEntity.client)("1")
          yield* poisonedSubscribe(state, client)
          assert.strictEqual(state.layerBuilds.current, 2, "rebuild did not complete")
          yield* client.Ping()
        })
      )
      const result = yield* shutdown(state, runtime)
      assert.isDefined(result.shardReleaseMs, `shard was never released: ${result.events.join(", ")}`)
      assert.isBelow(result.shardReleaseMs!, 1000, result.events.join(", "))
      assert.isTrue(result.shutdownCompleted, `shutdown did not complete: ${result.events.join(", ")}`)
    }))

  it.effect("regression: a second defect after a rebuild completes its rebuild and the handoff stays prompt", () =>
    Effect.gen(function*() {
      const state = makeState()
      const { result: body, runtime } = yield* withRuntime(
        state,
        Effect.gen(function*() {
          yield* TestClock.adjust(1)
          const client = (yield* DefectEntity.client)("1")
          yield* poisonedSubscribe(state, client)
          assert.strictEqual(state.layerBuilds.current, 2, "first rebuild did not complete")
          // second defect: rebuild #2 must close rebuild #1's scope first
          yield* poisonedSubscribe(state, client)
          yield* TestClock.adjust(1000)
          const ping = yield* Effect.fork(client.Ping())
          yield* TestClock.adjust(1000)
          return { layerBuilds: state.layerBuilds.current, pingExit: ping.unsafePoll() }
        })
      )
      const result = yield* shutdown(state, runtime)
      assert.strictEqual(body.layerBuilds, 3, "second defect rebuild did not complete")
      assert.isNotNull(body.pingExit, "request after the second defect never completed (writeRef stuck Acquiring)")
      assert.isDefined(result.shardReleaseMs, `shard was never released: ${result.events.join(", ")}`)
      assert.isBelow(result.shardReleaseMs!, 1000, result.events.join(", "))
      assert.isTrue(result.shutdownCompleted, `shutdown did not complete: ${result.events.join(", ")}`)
    }))
})
