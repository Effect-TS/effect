import { assert, describe, it } from "@effect/vitest"
import { Deferred, Effect, Equal, Exit, Fiber, Layer, Schema, Scope } from "effect"
import {
  ClusterSchema,
  Entity,
  type EntityAddress,
  MessageStorage,
  RunnerHealth,
  Runners,
  RunnerStorage,
  Sharding,
  ShardingConfig
} from "effect/unstable/cluster"
import { Rpc } from "effect/unstable/rpc"

const Runtime = Sharding.layer.pipe(
  Layer.provide(Runners.layerNoop),
  Layer.provide([RunnerStorage.layerMemory, RunnerHealth.layerNoop]),
  Layer.provideMerge(MessageStorage.layerMemory),
  Layer.provide(ShardingConfig.layer({
    shardsPerGroup: 1,
    preemptiveShutdown: false,
    entityMaxIdleTime: Infinity,
    entityTerminationTimeout: 0,
    refreshAssignmentsInterval: 1000,
    entityMessagePollInterval: 5000,
    sendRetryInterval: 10
  }))
)

// Deadlines are harness-failure guards, never scheduling oracles.
const gate = <A>(deferred: Deferred.Deferred<A>) =>
  Deferred.await(deferred).pipe(Effect.timeout("5 seconds"), Effect.orDie)

const observe = (label: string, colliding: boolean, closeBeforeCancel: boolean) =>
  Effect.gen(function*() {
    const sharding = yield* Sharding.Sharding
    const driver = yield* MessageStorage.MemoryDriver
    const outerScope = yield* Effect.scope
    const aScope = yield* Scope.fork(outerScope)
    const aFinalizerStarted = yield* Deferred.make<void>()
    const releaseAFinalizer = yield* Deferred.make<void>()
    const releaseReceiver = yield* Deferred.make<void>()
    const receiverStarted = yield* Deferred.make<string>()
    const aAddress = yield* Deferred.make<EntityAddress.EntityAddress>()
    const bAddress = yield* Deferred.make<EntityAddress.EntityAddress>()
    const aType = `R4Orders-${label}${colliding ? ":" : "-"}Shard`
    const bType = `R4Orders-${label}`
    const A = Entity.make(aType, [Rpc.make("Ping")])
    const B = Entity.make(bType, [
      Rpc.make("Start"),
      Rpc.make("Cancel", { success: Schema.Number })
    ])
    const Receiver = Entity.make(`R4Receiver-${label}`, [
      Rpc.make("Work", { success: Schema.Number }).annotate(ClusterSchema.Persisted, true)
    ])

    // Release blockers before the surrounding runtime scope closes, on success or failure.
    return yield* Effect.gen(function*() {
      yield* Layer.build(Receiver.toLayer({
        Work: ({ requestId }) =>
          Effect.gen(function*() {
            yield* Deferred.succeed(receiverStarted, String(requestId))
            yield* gate(releaseReceiver)
            return 7
          })
      }))
      yield* Layer.build(A.toLayer(Effect.gen(function*() {
        yield* Deferred.succeed(aAddress, yield* Entity.CurrentAddress)
        yield* Effect.acquireRelease(Effect.void, () =>
          Deferred.succeed(aFinalizerStarted, undefined).pipe(
            Effect.andThen(gate(releaseAFinalizer))
          ))
        return { Ping: () => Effect.void }
      }))).pipe(Scope.provide(aScope))
      yield* Layer.build(B.toLayer(
        Effect.gen(function*() {
          yield* Deferred.succeed(bAddress, yield* Entity.CurrentAddress)
          const scope = yield* Effect.scope
          const receiver = (yield* Receiver.client)("receiver")
          let child: Fiber.Fiber<unknown, unknown> | undefined
          return {
            Start: () =>
              Effect.gen(function*() {
                child = yield* receiver.Work().pipe(Effect.forkIn(scope))
              }),
            Cancel: () =>
              Effect.suspend(() =>
                child
                  ? Fiber.interrupt(child).pipe(Effect.as(42))
                  : Effect.die("HARNESS: Cancel before Start")
              )
          }
        }),
        { concurrency: "unbounded" }
      ))

      yield* (yield* A.client)("123").Ping()
      const b = (yield* B.client)("Shard:123")
      yield* b.Start()
      const requestId = yield* gate(receiverStarted)
      const addressA = yield* gate(aAddress)
      const addressB = yield* gate(bAddress)
      assert.isFalse(Equal.equals(addressA, addressB), "distinct valid entity addresses")
      const oldKey = (address: EntityAddress.EntityAddress) =>
        `${address.entityType}:${address.entityId}:${address.shardId.toString()}`
      assert.strictEqual(oldKey(addressA) === oldKey(addressB), colliding)

      const closingA = yield* Scope.close(aScope, Exit.void).pipe(Effect.forkIn(outerScope))
      yield* gate(aFinalizerStarted)
      if (closeBeforeCancel) {
        yield* Deferred.succeed(releaseAFinalizer, undefined)
        yield* Fiber.join(closingA)
      }
      assert.isFalse(yield* sharding.isShutdown, "only A registration is closing")
      assert.strictEqual(yield* b.Cancel(), 42, "live B completed explicit cancellation")
      assert.isFalse(yield* sharding.isShutdown, "runner remains live after Cancel")
      const requests = driver.journal.filter((envelope) =>
        envelope._tag === "Request" && envelope.requestId === requestId
      )
      const interrupts = driver.journal.filter((envelope) =>
        envelope._tag === "Interrupt" && envelope.requestId === requestId
      )
      const result = {
        assertionId: label,
        requestId,
        addressA,
        addressB,
        requests: requests.length,
        interrupts: interrupts.length,
        journal: driver.journal.slice()
      }
      yield* Deferred.succeed(releaseAFinalizer, undefined)
      yield* Deferred.succeed(releaseReceiver, undefined)
      yield* Fiber.join(closingA)
      return result
    }).pipe(Effect.ensuring(Effect.gen(function*() {
      yield* Deferred.succeed(releaseAFinalizer, undefined)
      yield* Deferred.succeed(releaseReceiver, undefined)
      yield* Scope.close(aScope, Exit.void)
    })))
  }).pipe(Effect.provide(Runtime), Effect.timeout("15 seconds"))

describe.sequential("R4 entity teardown identity", () => {
  for (
    const [label, colliding, closeBeforeCancel] of [
      ["TEARDOWN-COLLIDING-LIVE", true, false],
      ["TEARDOWN-NONCOLLIDING-LIVE", false, false],
      ["TEARDOWN-COLLIDING-CLOSED", true, true]
    ] as const
  ) {
    it.live(label, () =>
      Effect.gen(function*() {
        const result = yield* observe(label, colliding, closeBeforeCancel)
        assert.strictEqual(result.requests, 1, "one exact Receiver request")
        assert.strictEqual(result.interrupts, 1, "live B cancellation must persist one exact Interrupt")
      }), { timeout: 20000 })
  }
})
