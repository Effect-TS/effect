import { ClusterSchema, Entity } from "@effect/cluster"
import { Rpc } from "@effect/rpc"
import { assert, describe, it } from "@effect/vitest"
import { Cause, Clock, Effect, Exit, Fiber, Layer, Schema } from "effect"
import { type Backend, make } from "./harness.js"

const RegistrationEntity = Entity.make("ClusterIntegrationRegistration", [
  Rpc.make("Runner", { success: Schema.String }).annotate(ClusterSchema.Persisted, true)
])
const RegistrationEntityLayer = RegistrationEntity.toLayer(Effect.gen(function*() {
  const runner = yield* Entity.CurrentRunnerAddress
  return { Runner: () => Effect.succeed(`${runner.host}:${runner.port}`) }
}))

describe("cluster entity integration", () => {
  for (const backend of ["pg", "mysql"] satisfies ReadonlyArray<Backend>) {
    it.scopedLive(`${backend}: interrupts an unroutable reply during runner shutdown without hanging teardown`, () =>
      Effect.gen(function*() {
        const finalizerEntered = yield* Effect.makeLatch()
        const sendReply = yield* Effect.makeLatch()
        let requestExit: Exit.Exit<void, unknown> | undefined
        const Receiver = Entity.make("ClusterIntegrationShutdownReplyReceiver", [
          Rpc.make("Ping").annotate(ClusterSchema.Persisted, true)
        ])
        const Sender = Entity.make("ClusterIntegrationShutdownReplySender", [
          Rpc.make("Arm").annotate(ClusterSchema.Persisted, false)
        ])
        const entities = Layer.merge(
          Receiver.toLayer({ Ping: () => Effect.void }),
          Sender.toLayer(Effect.gen(function*() {
            const receiver = yield* Receiver.client
            yield* Effect.addFinalizer(() =>
              Effect.uninterruptible(Effect.gen(function*() {
                yield* finalizerEntered.open
                yield* sendReply.await
                requestExit = yield* receiver("unroutable").Ping().pipe(Effect.exit)
              }))
            )
            return { Arm: () => Effect.void }
          }))
        )
        const cluster = yield* make({ backend, entities })
        const [runner] = yield* cluster.start(1, { assignedShardGroups: ["default"] })
        yield* Effect.addFinalizer(() => sendReply.open)
        yield* cluster.waitForStableAssignments()
        const sender = yield* cluster.getClient(Sender)
        yield* sender("sender").Arm()
        const stopping = yield* cluster.stop(runner).pipe(Effect.forkScoped)
        yield* cluster.waitUntil("The shutdown reply finalizer did not start", Effect.as(finalizerEntered.await, true))
        yield* sendReply.open
        yield* Fiber.join(stopping)
        assert.isDefined(requestExit)
        assert(Exit.isFailure(requestExit!))
        assert(Cause.isInterruptedOnly(requestExit!.cause))
      }))
    for (const persisted of [false, true]) {
      for (const preemptiveShutdown of [false, true]) {
        it.scopedLive(`${backend}: sends an outgoing discard from a shutdown finalizer without deadlocking (persisted=${persisted}, preemptive=${preemptiveShutdown})`, () =>
          Effect.gen(function*() {
            const finalizerEntered = yield* Effect.makeLatch(), sendDiscard = yield* Effect.makeLatch()
            let discardExit: Exit.Exit<void, unknown> | undefined
            const Receiver = Entity.make("ClusterIntegrationShutdownDiscardReceiver", [
              Rpc.make("Ping").annotate(ClusterSchema.Persisted, persisted)
            ])
            const Sender = Entity.make("ClusterIntegrationShutdownDiscardSender", [
              Rpc.make("Arm").annotate(ClusterSchema.Persisted, false)
            ])
            const entities = Layer.merge(
              Receiver.toLayer({ Ping: () => Effect.void }),
              Sender.toLayer(Effect.gen(function*() {
                const receiver = yield* Receiver.client
                yield* Effect.addFinalizer(() =>
                  Effect.uninterruptible(Effect.gen(function*() {
                    yield* finalizerEntered.open
                    yield* sendDiscard.await
                    discardExit = yield* receiver("unroutable").Ping(void 0, { discard: true }).pipe(Effect.exit)
                  }))
                )
                return { Arm: () => Effect.void }
              }))
            )
            const cluster = yield* make({ backend, config: { preemptiveShutdown }, entities })
            const [runner] = yield* cluster.start(1, { assignedShardGroups: ["default"] })
            yield* Effect.addFinalizer(() => sendDiscard.open)
            yield* cluster.waitForStableAssignments()
            const sender = yield* cluster.getClient(Sender)
            yield* sender("sender").Arm()
            const stopping = yield* cluster.stop(runner).pipe(Effect.forkScoped)
            yield* cluster.waitUntil(
              "The shutdown discard finalizer did not start",
              Effect.as(finalizerEntered.await, true)
            )
            yield* sendDiscard.open
            yield* Fiber.join(stopping)
            assert.isDefined(discardExit)
            assert(Exit.isSuccess(discardExit!))
          }))
      }
    }
    it.scopedLive(`${backend}: holds persisted messages until a slow entity layer registers`, () =>
      Effect.gen(function*() {
        const registrationGate = yield* Effect.makeLatch()
        const delayedEntities = RegistrationEntityLayer.pipe(Layer.provide(Layer.effectDiscard(registrationGate.await)))
        const cluster = yield* make({
          backend,
          config: {
            entityMessagePollInterval: 100,
            entityRegistrationTimeout: 1_000,
            sendRetryInterval: 100,
            shardsPerGroup: 4
          },
          entities: RegistrationEntityLayer
        })
        yield* cluster.start(1, { assignedShardGroups: [] })
        const starting = yield* cluster.start(1, { entities: delayedEntities }).pipe(Effect.forkScoped)
        const client = yield* cluster.getClient(RegistrationEntity)
        const request = yield* client(`${backend}-slow-registration`).Runner().pipe(Effect.forkScoped)
        yield* cluster.waitUntil(
          "The slow-registration request was not persisted",
          Effect.map(cluster.unprocessedMessageCount, (count) => count === 1)
        )
        const deadline = (yield* Clock.currentTimeMillis) + 1_500
        yield* cluster.waitUntil(
          "The slow-registration hold window did not elapse",
          Effect.map(Clock.currentTimeMillis, (now) => now >= deadline),
          "2 seconds"
        )
        assert.deepStrictEqual(yield* cluster.messageCounts(), { failed: 0, replied: 0, unprocessed: 1 })
        yield* registrationGate.open
        const [runner] = yield* Fiber.join(starting)
        yield* cluster.waitUntil(
          "The entity was not assigned to the new runner",
          Effect.map(
            cluster.ownerOfEntity(RegistrationEntity, `${backend}-slow-registration`),
            (owner) => owner === runner
          )
        )
        assert.strictEqual(yield* Fiber.join(request), `${runner.address.host}:${runner.address.port}`)
        assert.deepStrictEqual(yield* cluster.messageCounts(), { failed: 0, replied: 1, unprocessed: 0 })
      }))
    it.scopedLive(`${backend}: defects a durable request whose owner never registers the entity`, () =>
      Effect.gen(function*() {
        const cluster = yield* make({
          backend,
          config: {
            entityMessagePollInterval: 100,
            entityRegistrationTimeout: 500,
            sendRetryInterval: 100,
            shardsPerGroup: 4
          },
          entities: RegistrationEntityLayer
        })
        yield* cluster.start(1, { assignedShardGroups: [] })
        const [runner] = yield* cluster.start(1, { entities: Layer.empty })
        const entityId = `${backend}-missing-registration`
        yield* cluster.waitUntil(
          "The entity was not assigned",
          Effect.map(cluster.ownerOfEntity(RegistrationEntity, entityId), (owner) => owner === runner)
        )
        const client = yield* cluster.getClient(RegistrationEntity)
        const request = yield* client(entityId).Runner().pipe(Effect.forkScoped)
        yield* cluster.waitUntil(
          "The missing entity registration did not produce a stored defect",
          Effect.map(cluster.failedMessageCount, (count) => count === 1)
        )
        const exit = yield* Fiber.await(request)
        assert.isTrue(Exit.isFailure(exit))
        if (Exit.isFailure(exit)) {
          assert.include(Cause.pretty(exit.cause), `Entity type '${RegistrationEntity.type}' not registered`)
        }
        assert.deepStrictEqual(yield* cluster.messageCounts(), { failed: 1, replied: 0, unprocessed: 0 })
      }))
  }
})
