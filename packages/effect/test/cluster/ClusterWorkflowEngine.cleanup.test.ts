import { assert, describe, it } from "@effect/vitest"
import { Effect, Exit, Fiber, Latch, Layer, Option, Schema, type Scope } from "effect"
import { TestClock } from "effect/testing"
import { Entity, EntityAddress, Sharding } from "effect/unstable/cluster"
import { ResourceMap } from "effect/unstable/cluster/internal/resourceMap"
import { DurableDeferred, Workflow } from "effect/unstable/workflow"
import * as WorkflowEngine from "effect/unstable/workflow/WorkflowEngine"
import { vi } from "vitest"
import { makeTestWorkflowEngine, pollUntil } from "./TestWorkflowEngine.ts"

const entityKey = (entityType: string, entityId: string) => JSON.stringify([entityType, entityId])

const spyScoped = <S extends { mockRestore(): void }>(make: () => S) =>
  Effect.acquireRelease(Effect.sync(make), (spy) => Effect.sync(() => spy.mockRestore()))

type RunHandler = (request: Entity.Request<any>) => Effect.Effect<any, any, any>

const makeEngine = (workflowLayer: Layer.Layer<never, never, WorkflowEngine.WorkflowEngine>, hooks?: {
  readonly onBuild?: (address: EntityAddress.EntityAddress) => Effect.Effect<void, never, Scope.Scope>
  readonly wrapDeferred?: (effect: ReturnType<RunHandler>) => ReturnType<RunHandler>
}) =>
  Effect.gen(function*() {
    const deactivated = new Set<string>()
    const remove = ResourceMap.prototype.remove
    // Observe completion of the whole activation teardown, not just its restartable handlers.
    yield* spyScoped(() =>
      vi.spyOn(ResourceMap.prototype, "remove").mockImplementation(
        function(this: ResourceMap<unknown, unknown, unknown>, key) {
          return remove.call(this, key).pipe(Effect.tap(() =>
            Effect.sync(() => {
              if (key instanceof EntityAddress.EntityAddress) {
                deactivated.add(entityKey(key.entityType, key.entityId))
              }
            })
          ))
        }
      )
    )
    const shardingLayer = Layer.effect(
      Sharding.Sharding,
      Effect.map(Sharding.Sharding, (sharding) => ({
        ...sharding,
        registerEntity: (entity, handlers, options) =>
          sharding.registerEntity(
            entity,
            Effect.gen(function*() {
              const address = yield* Entity.CurrentAddress
              const built = yield* handlers
              if (hooks?.onBuild) yield* hooks.onBuild(address)
              if (!address.entityType.startsWith("Workflow/")) return built
              const { deferred } = built as unknown as { deferred: RunHandler }
              return {
                ...built,
                ...(hooks?.wrapDeferred && {
                  deferred: (request: Entity.Request<any>) => hooks.wrapDeferred!(deferred(request))
                })
              }
            }),
            options
          )
      }))
    ).pipe(Layer.provide(Sharding.layer))
    const context = yield* Layer.build(workflowLayer.pipe(
      Layer.provideMerge(makeTestWorkflowEngine({
        shardingLayer
      }))
    ))
    return { context, deactivated }
  })

const advanceUntil = (
  ready: () => boolean,
  step = 1,
  rounds = 2000,
  message = "the controlled lifecycle event must occur"
) =>
  Effect.gen(function*() {
    for (let i = 0; i < rounds && !ready(); i++) yield* TestClock.adjust(step)
    assert(ready(), message)
  })

// Workflow entities idle out after 10 seconds; allow the shared reaper to close the activation.
const waitForDeactivation = (deactivated: Set<string>, workflow: Workflow.Any, executionId: string) =>
  advanceUntil(
    () => deactivated.has(entityKey(`Workflow/${workflow._tag}`, executionId)),
    5000,
    12,
    "the workflow entity activation must finish closing"
  )

describe("ClusterWorkflowEngine deferred cleanup", { concurrent: false }, () => {
  it.effect(
    "interrupts a gated deferred when its activation closes",
    () =>
      Effect.gen(function*() {
        const entered = yield* Latch.make()
        const allowRecord = yield* Latch.make()
        const settled = yield* Latch.make()
        const closing = yield* Latch.make()
        const allowClose = yield* Latch.make()
        let handlerExit: Exit.Exit<unknown, unknown> | undefined
        let builds = 0
        const workflow = Workflow.make("RecordAfterCleanup", {
          payload: {},
          success: Schema.String,
          idempotencyKey: () => "one"
        })
        const gate = DurableDeferred.make("RecordAfterCleanup/Gate", { success: Schema.String })
        let deactivate: Effect.Effect<void> | undefined
        const get = ResourceMap.prototype.get
        // Use the real entity removal path while its deferred handler is in flight.
        yield* spyScoped(() =>
          vi.spyOn(ResourceMap.prototype, "get").mockImplementation(
            function(this: ResourceMap<unknown, unknown, unknown>, key) {
              if (key instanceof EntityAddress.EntityAddress && key.entityType === `Workflow/${workflow._tag}`) {
                deactivate = this.remove(key)
              }
              return get.call(this, key)
            }
          )
        )
        const { context, deactivated } = yield* makeEngine(workflow.toLayer(() => Effect.succeed("done")), {
          onBuild: (address) =>
            Effect.gen(function*() {
              if (address.entityType !== `Workflow/${workflow._tag}`) return
              builds++
              yield* Effect.addFinalizer(() => closing.open.pipe(Effect.andThen(allowClose.await)))
            }),
          wrapDeferred: (effect) =>
            entered.open.pipe(
              Effect.andThen(allowRecord.await),
              Effect.andThen(effect),
              Effect.onExit((exit) => {
                handlerExit = exit
                return settled.open
              })
            )
        })
        yield* Effect.addFinalizer(() => allowRecord.open.pipe(Effect.andThen(allowClose.open)))
        yield* Effect.gen(function*() {
          const executionId = yield* workflow.executionId({})
          const execution = yield* workflow.execute({}).pipe(Effect.forkChild)
          yield* advanceUntil(() => execution.pollUnsafe() !== undefined)
          assert.strictEqual(yield* Fiber.join(execution), "done")
          yield* DurableDeferred.succeed(gate, {
            token: DurableDeferred.tokenFromExecutionId(gate, { workflow, executionId }),
            value: "late"
          })
          yield* advanceUntil(() => entered.isOpen(), 1, 2000, "deferred handler must enter")
          assert(deactivate !== undefined)
          const removal = yield* deactivate.pipe(Effect.forkChild)
          yield* advanceUntil(() => closing.isOpen(), 1, 2000, "handler scope must start closing")
          yield* allowRecord.open
          yield* advanceUntil(() => settled.isOpen(), 1, 2000, "deferred handler must settle")
          yield* allowClose.open
          yield* advanceUntil(() => removal.pollUnsafe() !== undefined, 1, 2000, "entity removal must finish")
          yield* Fiber.join(removal)
          assert(deactivated.has(entityKey(`Workflow/${workflow._tag}`, executionId)))
          assert(handlerExit !== undefined && Exit.hasInterrupts(handlerExit))
          assert.strictEqual(builds, 1, "the control must exercise only the retiring activation")
          assert.deepStrictEqual(
            yield* workflow.poll(executionId),
            Option.some(new Workflow.Complete({ exit: Exit.succeed("done") }))
          )
        }).pipe(Effect.provide(context))
      }),
    30_000
  )

  it.effect(
    "does not rerun a completed workflow after a late completion and deactivation",
    () =>
      Effect.gen(function*() {
        const gate = DurableDeferred.make("LateCompletion/Gate", { success: Schema.String })
        const workflow = Workflow.make("LateCompletion", {
          payload: {},
          success: Schema.String,
          idempotencyKey: () => "one"
        })
        let runs = 0
        const { context, deactivated } = yield* makeEngine(workflow.toLayer(() =>
          Effect.sync(() => {
            runs++
            return "done"
          })
        ))
        yield* Effect.gen(function*() {
          const executionId = yield* workflow.executionId({})
          // Bun can reach the workflow's polling sleep before its first reply is available.
          const execution = yield* workflow.execute({}).pipe(Effect.forkChild)
          yield* advanceUntil(() => execution.pollUnsafe() !== undefined)
          assert.strictEqual(yield* Fiber.join(execution), "done")
          const token = DurableDeferred.tokenFromExecutionId(gate, { workflow, executionId })
          yield* DurableDeferred.succeed(gate, { token, value: "late" })
          yield* waitForDeactivation(deactivated, workflow, executionId)

          assert.deepStrictEqual(
            yield* workflow.poll(executionId),
            Option.some(new Workflow.Complete({ exit: Exit.succeed("done") }))
          )
          assert.strictEqual(runs, 1, "a late completion must not re-run a completed workflow")
          const engine = yield* WorkflowEngine.WorkflowEngine
          assert.deepStrictEqual(
            yield* engine.deferredResult(gate).pipe(Effect.provideService(
              WorkflowEngine.WorkflowInstance,
              WorkflowEngine.WorkflowInstance.initial(workflow, executionId)
            )),
            Option.some(Exit.succeed("late")),
            "the late completion must remain durably readable after deactivation"
          )
        }).pipe(Effect.provide(context))
      }),
    30_000
  )

  it.effect(
    "replays durable replies after a suspended execution deactivates",
    () =>
      Effect.gen(function*() {
        const first = DurableDeferred.make("SuspendedCleanup/First", { success: Schema.String })
        const second = DurableDeferred.make("SuspendedCleanup/Second", { success: Schema.String })
        const workflow = Workflow.make("SuspendedCleanup", {
          payload: {},
          success: Schema.String,
          idempotencyKey: () => "one"
        })
        let runs = 0
        const { context, deactivated } = yield* makeEngine(workflow.toLayer(() =>
          Effect.gen(function*() {
            runs++
            const a = yield* DurableDeferred.await(first)
            const b = yield* DurableDeferred.await(second)
            return `${a}:${b}`
          })
        ))
        yield* Effect.gen(function*() {
          const executionId = yield* workflow.execute({}, { discard: true })
          const complete = (gate: typeof first, value: string) =>
            DurableDeferred.succeed(gate, {
              token: DurableDeferred.tokenFromExecutionId(gate, { workflow, executionId }),
              value
            })
          yield* pollUntil(workflow, executionId, "Suspended")
          yield* complete(first, "first")
          yield* pollUntil(workflow, executionId, "Suspended", { ready: () => runs >= 2 })
          yield* waitForDeactivation(deactivated, workflow, executionId)

          // The engine stays alive. A new activation must recover the first value from storage.
          yield* complete(second, "second")
          const result = yield* pollUntil(workflow, executionId, "Complete")
          assert.deepStrictEqual(result, new Workflow.Complete({ exit: Exit.succeed("first:second") }))
        }).pipe(Effect.provide(context))
      }),
    30_000
  )
})
