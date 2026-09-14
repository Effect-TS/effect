import { assert, describe, it } from "@effect/vitest"
import { Effect, Exit, Latch, Layer, Option, Schema, Scope } from "effect"
import { TestClock } from "effect/testing"
import { type Entity, MessageStorage, Sharding } from "effect/unstable/cluster"
import { CurrentActivationScope } from "effect/unstable/cluster/internal/entityActivation"
import { DurableDeferred, Workflow } from "effect/unstable/workflow"
import { makeTestWorkflowEngine, pollUntil } from "./TestWorkflowEngine.ts"

const advanceUntil = (ready: () => boolean, message: string, step = 1, rounds = 2000) =>
  Effect.gen(function*() {
    for (let i = 0; i < rounds && !ready(); i++) yield* TestClock.adjust(step)
    assert(ready(), message)
  })

describe("ClusterWorkflowEngine completion before persistence", () => {
  for (const lifecycle of ["defect rebuild", "overlapping activations"] as const) {
    it.effect(`completes before deferred persistence across ${lifecycle}`, () =>
      Effect.gen(function*() {
        const saving = yield* Latch.make()
        const allowSave = yield* Latch.make()
        const rebuilt = yield* Latch.make()
        const allowRun = yield* Latch.make()
        const allowDefect = yield* Latch.make()
        const closing = yield* Latch.make()
        const allowClose = yield* Latch.make()
        const closed = yield* Latch.make()
        const allowRedelivery = yield* Latch.make()
        let persisted = false
        let builds = 0
        let firstBuildRuns = 0
        let deferredDeliveries = 0
        const activations: Array<Scope.Scope> = []
        const runActivations: Array<Scope.Scope> = []
        const gate = DurableDeferred.make("BehaviouralLifecycle/Gate", { success: Schema.String })
        const workflow = Workflow.make("BehaviouralLifecycle", {
          payload: {},
          success: Schema.String,
          idempotencyKey: () => "one"
        })
        const shardingLayer = Layer.effect(
          Sharding.Sharding,
          Effect.map(Sharding.Sharding, (sharding) => ({
            ...sharding,
            registerEntity: (entity, handlers, options) =>
              sharding.registerEntity(
                entity,
                Effect.gen(function*() {
                  if (entity.type !== `Workflow/${workflow._tag}`) return yield* handlers
                  const build = ++builds
                  const activationOption = yield* Effect.serviceOption(CurrentActivationScope)
                  assert(Option.isSome(activationOption), "the entity manager must provide its activation")
                  const activation = activationOption.value
                  activations.push(activation)
                  assert.notStrictEqual(activation, yield* Effect.scope, "handler and activation scopes must differ")
                  // Registered before the production handlers, this marks the end of activation cleanup.
                  if (build === 1) yield* Scope.addFinalizer(activation, closed.open)
                  const built = yield* handlers
                  if (build === 1 && lifecycle === "overlapping activations") {
                    // Pause the retiring activation before its production cleanup. Its replacement
                    // records the completion first, then the old activation finishes closing.
                    yield* Scope.addFinalizer(activation, closing.open.pipe(Effect.andThen(allowClose.await)))
                  }
                  if (build === 2) yield* rebuilt.open
                  const { deferred, run } = built as unknown as {
                    run: (request: Entity.Request<any>) => Effect.Effect<any, any, any>
                    deferred: (request: Entity.Request<any>) => Effect.Effect<any, any, any>
                  }
                  return {
                    ...built,
                    run: (request: Entity.Request<any>) =>
                      Effect.suspend(() => {
                        if (build === 1 && ++firstBuildRuns === 2 && lifecycle === "defect rebuild") {
                          // Defect outside Workflow.intoResult to rebuild the real RPC server.
                          return saving.await.pipe(
                            Effect.andThen(allowDefect.await),
                            Effect.andThen(Effect.die("injected entity defect"))
                          )
                        }
                        return build === 2 ? allowRun.await.pipe(Effect.andThen(run(request))) : run(request)
                      }),
                    deferred: (request: Entity.Request<any>) =>
                      Effect.suspend(() => {
                        // A replayed completion must not repair a cache loss before the assertion.
                        if (++deferredDeliveries > 1) {
                          return allowRedelivery.await.pipe(Effect.andThen(deferred(request)))
                        }
                        return deferred(request)
                      })
                  }
                }),
                options
              )
          }))
        ).pipe(Layer.provide(Sharding.layer))
        const storageLayer = Layer.effect(
          MessageStorage.MessageStorage,
          Effect.map(
            MessageStorage.MessageStorage,
            (storage) => ({
              ...storage,
              saveReply: (reply) =>
                reply.rpc._tag === "deferred"
                  ? saving.open.pipe(
                    Effect.andThen(allowSave.await),
                    Effect.interruptible,
                    Effect.andThen(storage.saveReply(reply)),
                    Effect.tap(() =>
                      Effect.sync(() => {
                        persisted = true
                      })
                    )
                  )
                  : storage.saveReply(reply)
            })
          )
        ).pipe(Layer.provide(MessageStorage.layerMemory))
        const context = yield* Layer.build(
          workflow.toLayer(() =>
            Effect.gen(function*() {
              // Check context in the workflow body, beyond the RPC handler's registration context.
              const activation = yield* Effect.serviceOption(CurrentActivationScope)
              assert(Option.isSome(activation), "the workflow body must inherit its activation")
              runActivations.push(activation.value)
              return yield* DurableDeferred.await(gate)
            })
          ).pipe(Layer.provideMerge(makeTestWorkflowEngine({ shardingLayer, storageLayer })))
        )
        yield* Effect.addFinalizer(() =>
          Effect.all([
            allowSave.open,
            allowRun.open,
            allowDefect.open,
            allowClose.open,
            allowRedelivery.open
          ], { discard: true })
        )
        yield* Effect.gen(function*() {
          const executionId = yield* workflow.execute({}, { discard: true })
          yield* pollUntil(workflow, executionId, "Suspended")
          if (lifecycle === "overlapping activations") {
            yield* advanceUntil(() => closing.isOpen(), "old activation must start closing", 5000, 12)
            assert.strictEqual(builds, 1)
          }
          yield* DurableDeferred.succeed(gate, {
            token: DurableDeferred.tokenFromExecutionId(gate, { workflow, executionId }),
            value: "signal"
          })
          yield* advanceUntil(() => saving.isOpen(), "deferred persistence must start")
          yield* allowDefect.open
          yield* advanceUntil(() => rebuilt.isOpen(), "replacement handlers must be built")
          assert.strictEqual(builds, 2)
          if (lifecycle === "defect rebuild") {
            assert.strictEqual(activations[0], activations[1], "rebuild must retain activation identity")
            assert.isFalse(closed.isOpen(), "a handler rebuild must not close its activation")
          } else {
            assert.notStrictEqual(activations[0], activations[1], "replacement must have its own activation")
            yield* allowClose.open
            yield* advanceUntil(() => closed.isOpen(), "old activation cleanup must finish")
          }
          yield* allowRun.open
          const result = yield* pollUntil(workflow, executionId, "Complete", { rounds: 2000 })
          assert.deepStrictEqual(result, new Workflow.Complete({ exit: Exit.succeed("signal") }))
          assert.isFalse(allowSave.isOpen(), "workflow must complete while persistence remains gated")
          assert.isFalse(persisted, "no deferred reply may be durable before workflow completion")
          assert.isFalse(allowRedelivery.isOpen(), "redelivery must not repair a lost completion")
          assert.strictEqual(runActivations[0], activations[0])
          assert.strictEqual(runActivations.at(-1), activations[1])
        }).pipe(Effect.provide(context))
      }), 30_000)
  }
})
