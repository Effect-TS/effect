import { assert, describe, it } from "@effect/vitest"
import { Array, Context, Deferred, Effect, Exit, Fiber, Layer, Option, Ref, Schedule, Schema } from "effect"
import {
  ClusterSchema,
  Entity,
  EntityAddress,
  EntityId,
  EntityType,
  Envelope,
  Message,
  MessageStorage,
  RunnerAddress,
  RunnerHealth,
  Runners,
  RunnerStorage,
  Sharding,
  ShardingConfig,
  Snowflake
} from "effect/cluster"
import * as EntityManager from "effect/cluster/internal/entityManager"
import { EntityReaper } from "effect/cluster/internal/entityReaper"
import { Headers } from "effect/http"
import { Rpc } from "effect/rpc"
import { TestClock } from "effect/testing"
const TestCluster = Sharding.layer.pipe(
  Layer.provide(Runners.layerNoop),
  Layer.provideMerge(MessageStorage.layerMemory),
  Layer.provideMerge(ShardingConfig.layer({
    shardsPerGroup: 300,
    entityMailboxCapacity: 10,
    entityTerminationTimeout: 0,
    entityMessagePollInterval: 50,
    sendRetryInterval: 50
  })),
  Layer.provide(RunnerStorage.layerMemory),
  Layer.provide(RunnerHealth.layerNoop)
)

const Run = Rpc.make("run", {
  payload: { id: Schema.String },
  success: Schema.String
})

const DefectRecovery = Entity.make("DefectRecovery", [Run.annotate(ClusterSchema.Persisted, true)])

describe("entity defect recovery", () => {
  it.effect(
    "restarts again when a replayed request defects synchronously",
    Effect.fnUntraced(function*() {
      const attempts = yield* Ref.make(0)
      const generations = yield* Ref.make(0)
      const entityLayer = DefectRecovery.toLayer(Effect.gen(function*() {
        yield* Ref.update(generations, (n) => n + 1)
        return DefectRecovery.of({
          run: Effect.fnUntraced(function*({ payload }) {
            const attempt = yield* Ref.updateAndGet(attempts, (n) => n + 1)
            if (attempt <= 3) return yield* Effect.die("repeated defect")
            return payload.id
          })
        })
      }))

      yield* Effect
        .gen(function*() {
          const client = (yield* DefectRecovery.client)("repeated")
          const work = yield* client.run({ id: "request" }).pipe(
            Effect.forkChild
          )
          yield* TestClock.adjust("30 seconds")
          assert.strictEqual(yield* Ref.get(attempts), 4)
          assert.strictEqual(yield* Ref.get(generations), 4)
          assert.strictEqual(yield* Fiber.join(work), "request")
        })
        .pipe(
          Effect.provide(entityLayer.pipe(Layer.provideMerge(TestCluster))),
          Effect.scoped
        )
    })
  )

  it.effect(
    "coalesces concurrent defects from the same handlers",
    Effect.fnUntraced(function*() {
      const fail = yield* Deferred.make<void>()
      const bothStarted = yield* Deferred.make<void>()
      const started = yield* Ref.make(0)
      const generations = yield* Ref.make(0)
      const entityLayer = DefectRecovery.toLayer(
        Effect.gen(function*() {
          const generation = yield* Ref.updateAndGet(generations, (n) => n + 1)
          return DefectRecovery.of({
            run: Effect.fnUntraced(function*({ payload }) {
              if (generation === 1) {
                if ((yield* Ref.updateAndGet(started, (n) => n + 1)) === 2) {
                  yield* Deferred.succeed(bothStarted, undefined)
                }
                yield* Deferred.await(fail)
                return yield* Effect.die("concurrent defect")
              }
              return payload.id
            })
          })
        }),
        { concurrency: "unbounded" }
      )

      yield* Effect
        .gen(function*() {
          const client = (yield* DefectRecovery.client)("concurrent")
          const first = yield* client.run({ id: "first" }).pipe(
            Effect.forkChild
          )
          const second = yield* client.run({ id: "second" }).pipe(
            Effect.forkChild
          )
          yield* Deferred.await(bothStarted)
          yield* Deferred.succeed(fail, undefined)
          yield* TestClock.adjust("30 seconds")
          assert.strictEqual(yield* Fiber.join(first), "first")
          assert.strictEqual(yield* Fiber.join(second), "second")
          assert.strictEqual(yield* Ref.get(generations), 2)
        })
        .pipe(
          Effect.provide(entityLayer.pipe(Layer.provideMerge(TestCluster))),
          Effect.scoped
        )
    })
  )

  for (const persisted of [false, true]) {
    it.effect(`replays unfinished requests before arrivals during acquisition (persisted=${persisted})`, () =>
      Effect.gen(function*() {
        const entity = Entity.make("DefectRecoveryArrivals", [Run.annotate(ClusterSchema.Persisted, persisted)])
        const fail = yield* Deferred.make<void>()
        const bothStarted = yield* Deferred.make<void>()
        const acquiring = yield* Deferred.make<void>()
        const acquired = yield* Deferred.make<void>()
        const started = yield* Ref.make(0)
        const generations = yield* Ref.make(0)
        const calls = yield* Ref.make<Array<readonly [number, string]>>([])
        const completed = yield* Ref.make<Array<string>>([])
        const thirdRequestId = yield* Deferred.make<Snowflake.Snowflake>()
        const thirdExecutions = yield* Ref.make<
          Array<{
            readonly requestId: Snowflake.Snowflake
            readonly successReplyAlreadyStored: boolean
          }>
        >([])
        const entityLayer = entity.toLayer(
          Effect.gen(function*() {
            const driver = yield* MessageStorage.MemoryDriver
            const generation = yield* Ref.updateAndGet(generations, (n) => n + 1)
            if (generation === 2) {
              yield* Deferred.succeed(acquiring, undefined)
              yield* Deferred.await(acquired)
            }
            return entity.of({
              run: Effect.fnUntraced(function*({ payload, requestId }) {
                if (payload.id === "third") {
                  const replies = yield* driver.encoded.repliesFor([String(requestId)]).pipe(Effect.orDie)
                  yield* Ref.update(thirdExecutions, (executions) => [...executions, {
                    requestId,
                    successReplyAlreadyStored: Array.some(
                      replies,
                      (reply) =>
                        reply._tag === "WithExit" && reply.exit._tag === "Success" && reply.exit.value === "third"
                    )
                  }])
                  yield* Deferred.succeed(thirdRequestId, requestId)
                }
                yield* Ref.update(calls, (calls) => [...calls, [generation, payload.id] as const])
                if (generation === 1) {
                  if ((yield* Ref.updateAndGet(started, (n) => n + 1)) === 2) {
                    yield* Deferred.succeed(bothStarted, undefined)
                  }
                  yield* Deferred.await(fail)
                  return yield* Effect.die("initial defect")
                }
                if (generation === 2 && payload.id === "first") {
                  return yield* Effect.die("replay defect")
                }
                yield* Ref.update(completed, (ids) => [...ids, payload.id])
                return payload.id
              })
            })
          }),
          { concurrency: "unbounded" }
        )
        yield* Effect.gen(function*() {
          const client = (yield* entity.client)(`arrivals-${persisted}`)
          const first = yield* client.run({ id: "first" }).pipe(Effect.forkChild)
          const second = yield* client.run({ id: "second" }).pipe(Effect.forkChild)
          yield* Deferred.await(bothStarted)
          yield* Deferred.succeed(fail, undefined)
          yield* TestClock.adjust("10 seconds")
          yield* Deferred.await(acquiring)
          const third = yield* client.run({ id: "third" }).pipe(Effect.forkChild)
          yield* TestClock.adjust(1)
          yield* Deferred.succeed(acquired, undefined)
          yield* TestClock.adjust("30 seconds")
          assert.deepStrictEqual(
            Array.findFirst(yield* Ref.get(calls), ([generation]) => generation === 2),
            Option.some([2, "first"] as const)
          )
          assert.strictEqual(yield* Fiber.join(first), "first")
          assert.strictEqual(yield* Fiber.join(second), "second")
          assert.strictEqual(yield* Fiber.join(third), "third")
          const requestId = yield* Deferred.await(thirdRequestId)
          // Inspect the encoded store at handler entry, not just successful body completion.
          assert.deepStrictEqual(yield* Ref.get(thirdExecutions), [{ requestId, successReplyAlreadyStored: false }])
          const driver = yield* MessageStorage.MemoryDriver
          const replies = yield* driver.encoded.repliesFor([String(requestId)]).pipe(Effect.orDie)
          assert.strictEqual(
            Array.some(
              replies,
              (reply) => reply._tag === "WithExit" && reply.exit._tag === "Success" && reply.exit.value === "third"
            ),
            persisted
          )
          assert.sameMembers(yield* Ref.get(completed), ["first", "second", "third"])
          assert.strictEqual(yield* Ref.get(generations), 3)
        }).pipe(Effect.provide(entityLayer.pipe(Layer.provideMerge(TestCluster))), Effect.scoped)
      }))
  }

  it.effect("finishes shutdown when replacement acquisition completes", () =>
    Effect.gen(function*() {
      const acquiring = yield* Deferred.make<void>()
      const acquired = yield* Deferred.make<void>()
      const generations = yield* Ref.make(0)
      const attempts = yield* Ref.make(0)
      const run = Rpc.make("run")
      const entity = Entity.make("ShutdownDefectRecovery", [run])
      const sharding = yield* Sharding.Sharding
      const manager = yield* EntityManager.make(
        entity,
        Effect.gen(function*() {
          const generation = yield* Ref.updateAndGet(generations, (n) => n + 1)
          if (generation === 2) {
            yield* Deferred.succeed(acquiring, undefined)
            yield* Deferred.await(acquired)
          }
          return entity.of({
            run: () => Ref.update(attempts, (n) => n + 1).pipe(Effect.andThen(Effect.die("restart")))
          })
        }),
        {
          sharding,
          storage: MessageStorage.noop,
          runnerAddress: RunnerAddress.make("localhost", 1234),
          residency: { admitUnsafe: () => true, releaseUnsafe: () => {} },
          maxIdleTime: Infinity,
          defectRetryPolicy: Schedule.spaced(1)
        }
      )
      const entityId = EntityId.make("shutdown")
      const shardId = sharding.getShardId(entityId, "default")
      const address = EntityAddress.make({ shardId, entityType: EntityType.make(entity.type), entityId })
      yield* TestClock.adjust(1)
      yield* manager.sendLocal(
        new Message.IncomingRequestLocal<typeof run>({
          envelope: Envelope.makeRequest<typeof run>({
            requestId: (yield* Snowflake.Generator).nextUnsafe(),
            address,
            tag: "run",
            payload: undefined,
            headers: Headers.empty
          }),
          lastSentReply: Option.none(),
          annotations: Context.empty(),
          respond: () => Effect.void
        })
      )
      yield* TestClock.adjust(10)
      yield* Deferred.await(acquiring)
      const shutdown = yield* manager.interruptShard(shardId).pipe(Effect.forkChild)
      yield* TestClock.adjust(1)
      assert.strictEqual(yield* manager.activeEntityCount, 0)
      yield* Deferred.succeed(acquired, undefined)
      yield* TestClock.adjust(1)
      const completed = shutdown.pollUnsafe()
      // Let a broken implementation's termination timeout finish before asserting.
      yield* TestClock.adjust(1000)
      assert.deepStrictEqual(completed, Exit.void)
      assert.strictEqual(yield* Ref.get(attempts), 1, "shutdown must not replay application requests")
    }).pipe(
      Effect.provide(EntityReaper.layer),
      Effect.provide(ShardingConfig.layer({ entityTerminationTimeout: 1000 })),
      Effect.provide(TestCluster),
      Effect.provide(Snowflake.layerGenerator)
    ))
})
