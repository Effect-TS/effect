import { assert, describe, it } from "@effect/vitest"
import { Effect, Exit, Latch, Layer, Option, Schema, Scope } from "effect"
import { TestClock } from "effect/testing"
import { Entity, MessageStorage, Sharding } from "effect/unstable/cluster"
import { CurrentActivationScope } from "effect/unstable/cluster/internal/entityActivation"
import { RpcMiddleware } from "effect/unstable/rpc"
import { Activity, DurableDeferred, Workflow, WorkflowEngine } from "effect/unstable/workflow"
import { makeTestWorkflowEngine, pollUntil } from "./TestWorkflowEngine.ts"

class ForeignActivation extends RpcMiddleware.Service<ForeignActivation>()("Test/ForeignActivation") {}

const advanceUntil = (ready: () => boolean) =>
  Effect.gen(function*() {
    for (let i = 0; i < 2000 && !ready(); i++) yield* TestClock.adjust(1)
    assert(ready(), "the controlled storage event must occur")
  })

describe("ClusterWorkflowEngine activation context", () => {
  for (const target of ["workflow", "activity"] as const) {
    it.effect(`uses the receiving activation in ${target} execution despite middleware context`, () =>
      Effect.gen(function*() {
        const foreign = yield* Scope.make()
        let actual: Scope.Scope | undefined
        const calls: Array<string> = []
        const workflow = Workflow.make("MiddlewareActivation", {
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
                // The fixture supplies this middleware below; request and response schemas stay the same.
                Entity.fromRpcGroup(
                  entity.type,
                  entity.protocol.middleware(ForeignActivation)
                ) as unknown as typeof entity,
                Effect.gen(function*() {
                  const activation = yield* Effect.serviceOption(CurrentActivationScope)
                  assert(Option.isSome(activation))
                  if (entity.type === `Workflow/${workflow._tag}`) actual = activation.value
                  return yield* handlers
                }),
                options
              ).pipe(Effect.provideService(ForeignActivation, (effect, { rpc }) =>
                Effect.suspend(() => {
                  calls.push(rpc._tag)
                  return Effect.provideService(effect, CurrentActivationScope, foreign)
                })))
          }))
        ).pipe(Layer.provide(Sharding.layer))
        const read = Effect.gen(function*() {
          const activation = yield* Effect.serviceOption(CurrentActivationScope)
          return Option.isSome(activation) && activation.value === actual
            ? "receiving activation"
            : "foreign activation"
        })
        const context = yield* Layer.build(
          workflow.toLayer(() =>
            target === "workflow" ?
              read :
              Activity.make({ name: "read", success: Schema.String, execute: read }).pipe(
                // Activity dispatch captures caller context as well as receiving RPC middleware context.
                Effect.provideService(CurrentActivationScope, foreign)
              )
          ).pipe(Layer.provideMerge(makeTestWorkflowEngine({ shardingLayer })))
        )
        yield* Effect.gen(function*() {
          const id = yield* workflow.execute({}, { discard: true })
          const result = yield* pollUntil(workflow, id, "Complete")
          assert.deepStrictEqual(result, new Workflow.Complete({ exit: Exit.succeed("receiving activation") }))
          assert(calls.includes(target === "workflow" ? "run" : "activity"), "real RPC middleware must execute")
          assert.notStrictEqual(actual, foreign)
        }).pipe(Effect.provide(context))
      }))
  }

  for (const mismatch of ["workflow", "execution"] as const) {
    it.effect(`does not read another ${mismatch}'s cached completion`, () =>
      Effect.gen(function*() {
        const saving = yield* Latch.make()
        const allowSave = yield* Latch.make()
        let persisted = false
        let activation: Scope.Scope | undefined
        const gate = DurableDeferred.make("SharedName", { success: Schema.String })
        const workflow = Workflow.make("CacheSource", {
          payload: {},
          success: Schema.String,
          idempotencyKey: () => "one"
        })
        const other = Workflow.make("OtherWorkflow", {
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
                  const current = yield* Effect.serviceOption(CurrentActivationScope)
                  assert(Option.isSome(current))
                  if (entity.type === `Workflow/${workflow._tag}`) activation = current.value
                  return yield* handlers
                }),
                options
              )
          }))
        ).pipe(Layer.provide(Sharding.layer))
        const storageLayer = Layer.effect(
          MessageStorage.MessageStorage,
          Effect.map(MessageStorage.MessageStorage, (storage) => ({
            ...storage,
            saveReply: (reply) =>
              reply.rpc._tag === "deferred" ?
                saving.open.pipe(
                  Effect.andThen(allowSave.await),
                  Effect.interruptible,
                  Effect.andThen(storage.saveReply(reply)),
                  Effect.tap(() =>
                    Effect.sync(() => {
                      persisted = true
                    })
                  )
                ) :
                storage.saveReply(reply)
          }))
        ).pipe(Layer.provide(MessageStorage.layerMemory))
        const context = yield* Layer.build(
          workflow.toLayer(() => Effect.succeed("done")).pipe(
            Layer.provideMerge(makeTestWorkflowEngine({ shardingLayer, storageLayer }))
          )
        )
        yield* Effect.addFinalizer(() => allowSave.open)
        yield* Effect.gen(function*() {
          const id = yield* workflow.execute({}, { discard: true })
          yield* pollUntil(workflow, id, "Complete")
          yield* DurableDeferred.succeed(gate, {
            token: DurableDeferred.tokenFromExecutionId(gate, { workflow, executionId: id }),
            value: "source"
          })
          yield* advanceUntil(() => saving.isOpen())
          assert(activation !== undefined)
          const engine = yield* WorkflowEngine.WorkflowEngine
          const source = WorkflowEngine.WorkflowInstance.initial(workflow, id)
          const different = WorkflowEngine.WorkflowInstance.initial(
            mismatch === "workflow" ? other : workflow,
            mismatch === "execution" ? `${id}-other` : id
          )
          const read = (instance: WorkflowEngine.WorkflowInstance["Service"], scope: Scope.Scope) =>
            engine.deferredResult(gate).pipe(
              Effect.provideService(WorkflowEngine.WorkflowInstance, instance),
              Effect.provideService(CurrentActivationScope, scope)
            )
          // The same deferred name is cached, but not yet available through storage.
          assert.deepStrictEqual(yield* read(source, activation), Option.some(Exit.succeed("source")))
          assert.isFalse(persisted)
          assert.deepStrictEqual(yield* read(different, activation), Option.none())
          const unknown = yield* Scope.make()
          assert.deepStrictEqual(yield* read(source, unknown), Option.none())
          yield* allowSave.open
          yield* advanceUntil(() => persisted)
          // Missing cache context must still recover the authoritative persisted result.
          assert.deepStrictEqual(yield* read(source, unknown), Option.some(Exit.succeed("source")))
          assert.deepStrictEqual(
            yield* engine.deferredResult(gate).pipe(
              Effect.provideService(WorkflowEngine.WorkflowInstance, source)
            ),
            Option.some(Exit.succeed("source"))
          )
        }).pipe(Effect.provide(context))
      }))
  }
})
