import { assert, describe, it } from "@effect/vitest"
import { Effect, Exit, Fiber, Latch, Layer, Option, Schema, type Scope } from "effect"
import { TestClock } from "effect/testing"
import {
  ClusterWorkflowEngine,
  Entity,
  EntityAddress,
  MessageStorage,
  RunnerHealth,
  Runners,
  RunnerStorage,
  Sharding,
  ShardingConfig,
  Snowflake
} from "effect/unstable/cluster"
import { ResourceMap } from "effect/unstable/cluster/internal/resourceMap"
import { DurableDeferred, Workflow } from "effect/unstable/workflow"
import * as WorkflowEngine from "effect/unstable/workflow/WorkflowEngine"
import { vi } from "vitest"

const entityKey = (entityType: string, entityId: string) => JSON.stringify([entityType, entityId])

type RunHandler = (request: Entity.Request<any>) => Effect.Effect<any, any, any>

const makeEngine = (workflowLayer: Layer.Layer<never, never, WorkflowEngine.WorkflowEngine>, hooks?: {
  readonly onBuild?: (address: EntityAddress.EntityAddress, build: number) => Effect.Effect<void, never, Scope.Scope>
  readonly wrapRun?: (effect: ReturnType<RunHandler>, build: number) => ReturnType<RunHandler>
  readonly wrapDeferred?: (effect: ReturnType<RunHandler>) => ReturnType<RunHandler>
  readonly storage?: (storage: MessageStorage.MessageStorage["Service"]) => MessageStorage.MessageStorage["Service"]
}) =>
  Effect.gen(function*() {
    // Observe the real cache: workflow results alone cannot reveal retained exits.
    const spy = yield* Effect.acquireRelease(
      Effect.sync(() => vi.spyOn(WorkflowEngine, "makeDeferredState")),
      (spy) => Effect.sync(() => spy.mockRestore())
    )
    const deactivated = new Set<string>()
    const remove = ResourceMap.prototype.remove
    // Observe completion of the whole activation teardown, not just its restartable handlers.
    yield* Effect.acquireRelease(
      Effect.sync(() =>
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
      ),
      (spy) => Effect.sync(() => spy.mockRestore())
    )
    const builds = new Map<string, number>()
    const shardingLayer = Layer.effect(
      Sharding.Sharding,
      Effect.map(Sharding.Sharding, (sharding) => ({
        ...sharding,
        registerEntity: (entity, handlers, options) =>
          sharding.registerEntity(
            entity,
            Effect.gen(function*() {
              const address = yield* Entity.CurrentAddress
              const key = entityKey(address.entityType, address.entityId)
              const build = (builds.get(key) ?? 0) + 1
              builds.set(key, build)
              const built = yield* handlers
              if (hooks?.onBuild) yield* hooks.onBuild(address, build)
              if (!address.entityType.startsWith("Workflow/")) return built
              const { deferred, run } = built as unknown as { run: RunHandler; deferred: RunHandler }
              return {
                ...built,
                ...(hooks?.wrapRun && {
                  run: (request: Entity.Request<any>) => hooks.wrapRun!(run(request), build)
                }),
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
      Layer.provideMerge(ClusterWorkflowEngine.layer.pipe(
        Layer.provideMerge(shardingLayer),
        Layer.provide(Runners.layerNoop),
        Layer.provide(RunnerStorage.layerMemory),
        Layer.provide(RunnerHealth.layerNoop),
        Layer.provide(Snowflake.layerGenerator),
        Layer.provide(
          Layer.effect(
            MessageStorage.MessageStorage,
            Effect.map(MessageStorage.MessageStorage, (storage) => hooks?.storage ? hooks.storage(storage) : storage)
          ).pipe(Layer.provide(MessageStorage.layerMemory))
        ),
        Layer.provide(ShardingConfig.layer({
          shardsPerGroup: 300,
          availableShardGroups: ["default", "workflow"],
          assignedShardGroups: ["default", "workflow"],
          entityTerminationTimeout: 0,
          entityMessagePollInterval: 5000,
          sendRetryInterval: 100
        }))
      ))
    ))
    assert.strictEqual(spy.mock.results.length, 1)
    const result = spy.mock.results[0]
    assert.strictEqual(result.type, "return")
    const state: WorkflowEngine.DeferredState = result.value
    return { context, state, deactivated }
  })

const waitForDeactivation = (deactivated: Set<string>, workflow: Workflow.Any, executionId: string) =>
  Effect.gen(function*() {
    const key = entityKey(`Workflow/${workflow._tag}`, executionId)
    // Workflow entities idle out after 10 seconds; allow the shared reaper to close the activation.
    for (let i = 0; i < 12 && !deactivated.has(key); i++) {
      yield* TestClock.adjust(5000)
    }
    assert(deactivated.has(key), "the workflow entity activation must finish closing")
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

describe("ClusterWorkflowEngine deferred cleanup", { concurrent: false }, () => {
  it.effect(
    "interrupts a gated deferred during activation cleanup without retaining its result",
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
        yield* Effect.acquireRelease(
          Effect.sync(() =>
            vi.spyOn(ResourceMap.prototype, "get").mockImplementation(
              function(this: ResourceMap<unknown, unknown, unknown>, key) {
                if (key instanceof EntityAddress.EntityAddress && key.entityType === `Workflow/${workflow._tag}`) {
                  deactivate = this.remove(key)
                }
                return get.call(this, key)
              }
            )
          ),
          (spy) => Effect.sync(() => spy.mockRestore())
        )
        const { context, deactivated, state } = yield* makeEngine(workflow.toLayer(() => Effect.succeed("done")), {
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
        let cleared = false
        let recordings = 0
        const deferredDone = state.deferredDone
        yield* Effect.acquireRelease(
          Effect.sync(() =>
            vi.spyOn(state, "deferredDone").mockImplementation((...args) =>
              Effect.suspend(() => {
                recordings++
                return deferredDone(...args)
              })
            )
          ),
          (spy) => Effect.sync(() => spy.mockRestore())
        )
        const clear = state.clear
        yield* Effect.acquireRelease(
          Effect.sync(() =>
            vi.spyOn(state, "clear").mockImplementation((id) =>
              clear(id).pipe(Effect.tap(() =>
                Effect.sync(() => {
                  cleared = true
                })
              ))
            )
          ),
          (spy) => Effect.sync(() => spy.mockRestore())
        )
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
          assert.isTrue(cleared, "activation ownership must end before releasing the handler gate")
          assert.isUndefined(state.pendingResult(executionId, gate.name))
          yield* allowRecord.open
          yield* advanceUntil(() => settled.isOpen(), 1, 2000, "deferred handler must settle")
          yield* allowClose.open
          yield* advanceUntil(() => removal.pollUnsafe() !== undefined, 1, 2000, "entity removal must finish")
          yield* Fiber.join(removal)
          assert(deactivated.has(entityKey(`Workflow/${workflow._tag}`, executionId)))
          assert(handlerExit !== undefined && Exit.hasInterrupts(handlerExit))
          assert.strictEqual(recordings, 0, "shutdown interrupts the handler before deferredDone executes")
          assert.strictEqual(builds, 1, "a replacement activation must not hide stale retention")
          assert.deepStrictEqual(
            yield* workflow.poll(executionId),
            Option.some(new Workflow.Complete({ exit: Exit.succeed("done") }))
          )
          assert.isUndefined(
            state.pendingResult(executionId, gate.name),
            "an in-flight deferred must not repopulate the cache after its owner's cleanup"
          )
        }).pipe(Effect.provide(context))
      }),
    30_000
  )

  it.effect("releases a late completion when the completed workflow entity deactivates", () =>
    Effect.gen(function*() {
      const gate = DurableDeferred.make("LateCompletion/Gate", { success: Schema.String })
      const workflow = Workflow.make("LateCompletion", {
        payload: {},
        success: Schema.String,
        idempotencyKey: () => "one"
      })
      let runs = 0
      const { context, deactivated, state } = yield* makeEngine(workflow.toLayer(() =>
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
        assert.isUndefined(
          state.pendingResult(executionId, gate.name),
          "a late completion must not remain cached after its entity deactivates"
        )
      }).pipe(Effect.provide(context))
    }), 30_000)

  it.effect(
    "releases suspended execution completions on deactivation and replays durable replies",
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
        const { context, deactivated, state } = yield* makeEngine(workflow.toLayer(() =>
          Effect.gen(function*() {
            runs++
            const a = yield* DurableDeferred.await(first)
            const b = yield* DurableDeferred.await(second)
            return `${a}:${b}`
          })
        ))
        yield* Effect.gen(function*() {
          const sharding = yield* Sharding.Sharding
          const executionId = yield* workflow.execute({}, { discard: true })
          const complete = (gate: typeof first, value: string) =>
            DurableDeferred.succeed(gate, {
              token: DurableDeferred.tokenFromExecutionId(gate, { workflow, executionId }),
              value
            })
          let result = yield* workflow.poll(executionId)
          for (let i = 0; i < 200 && !(Option.isSome(result) && result.value._tag === "Suspended"); i++) {
            yield* TestClock.adjust(1)
            yield* sharding.pollStorage
            result = yield* workflow.poll(executionId)
          }
          assert(Option.isSome(result) && result.value._tag === "Suspended")
          yield* complete(first, "first")
          result = yield* workflow.poll(executionId)
          for (let i = 0; i < 200; i++) {
            if (runs >= 2 && Option.isSome(result) && result.value._tag === "Suspended") break
            yield* TestClock.adjust(1)
            yield* sharding.pollStorage
            result = yield* workflow.poll(executionId)
          }
          assert(runs >= 2 && Option.isSome(result) && result.value._tag === "Suspended")
          yield* waitForDeactivation(deactivated, workflow, executionId)
          const retainedAfterDeactivation = state.pendingResult(executionId, first.name)

          // The engine stays alive. A new activation must recover the first value from storage.
          yield* complete(second, "second")
          result = yield* workflow.poll(executionId)
          for (let i = 0; i < 200 && !(Option.isSome(result) && result.value._tag === "Complete"); i++) {
            yield* TestClock.adjust(1)
            yield* sharding.pollStorage
            result = yield* workflow.poll(executionId)
          }
          assert.deepStrictEqual(result, Option.some(new Workflow.Complete({ exit: Exit.succeed("first:second") })))
          assert.isUndefined(state.pendingResult(executionId, first.name), "terminal runs must clear pending exits")
          assert.isUndefined(
            retainedAfterDeactivation,
            "a suspended execution must not retain pending exits after its entity deactivates"
          )
        }).pipe(Effect.provide(context))
      }),
    30_000
  )

  for (const lifecycle of ["defect rebuild", "overlapping activations"] as const) {
    it.effect(`retains an unpersisted completion across ${lifecycle}`, () =>
      Effect.gen(function*() {
        const saving = yield* Latch.make()
        const allowSave = yield* Latch.make()
        const rebuilt = yield* Latch.make()
        const allowBuild = yield* Latch.make()
        const allowRun = yield* Latch.make()
        const allowDefect = yield* Latch.make()
        const closing = yield* Latch.make()
        const allowClose = yield* Latch.make()
        let persisted = false
        let firstBuildRuns = 0
        const gate = DurableDeferred.make("Lifecycle/Gate", { success: Schema.String })
        const workflow = Workflow.make("Lifecycle", {
          payload: {},
          success: Schema.String,
          idempotencyKey: () => "one"
        })
        const { context, deactivated, state } = yield* makeEngine(
          workflow.toLayer(() => DurableDeferred.await(gate)),
          {
            storage: (storage) => ({
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
            }),
            onBuild: (address, build) =>
              Effect.gen(function*() {
                if (address.entityType !== `Workflow/${workflow._tag}`) return
                if (build === 1 && lifecycle === "overlapping activations") {
                  // Hold old-handler teardown open so a replacement can overlap it.
                  // Activation cleanup now runs before this handler-scope finalizer.
                  yield* Effect.addFinalizer(() => closing.open.pipe(Effect.andThen(allowClose.await)))
                }
                if (build === 2) {
                  yield* rebuilt.open
                  // Defect replay must not re-deliver the deferred and conceal the lost entry.
                  if (lifecycle === "defect rebuild") yield* allowBuild.await
                }
              }),
            wrapRun: (effect, build) =>
              Effect.suspend(() => {
                if (build === 1 && ++firstBuildRuns === 2 && lifecycle === "defect rebuild") {
                  // Defect outside Workflow.intoResult, so the real entity manager rebuilds the server.
                  return saving.await.pipe(
                    Effect.andThen(allowDefect.await),
                    Effect.andThen(Effect.die("injected entity defect"))
                  )
                }
                return build === 2 ? allowRun.await.pipe(Effect.andThen(effect)) : effect
              })
          }
        )
        // Release every gate before layer teardown, including when an assertion fails.
        yield* Effect.addFinalizer(() =>
          Effect.all([allowSave.open, allowBuild.open, allowRun.open, allowDefect.open, allowClose.open], {
            discard: true
          })
        )
        yield* Effect.gen(function*() {
          const sharding = yield* Sharding.Sharding
          const executionId = yield* workflow.execute({}, { discard: true })
          let result = yield* workflow.poll(executionId)
          for (let i = 0; i < 200 && !(Option.isSome(result) && result.value._tag === "Suspended"); i++) {
            yield* TestClock.adjust(1)
            yield* sharding.pollStorage
            result = yield* workflow.poll(executionId)
          }
          assert(Option.isSome(result) && result.value._tag === "Suspended")
          if (lifecycle === "overlapping activations") {
            yield* advanceUntil(() => closing.isOpen(), 5000, 12)
            assert.isFalse(rebuilt.isOpen(), "the old activation must start closing first")
          }
          yield* DurableDeferred.succeed(gate, {
            token: DurableDeferred.tokenFromExecutionId(gate, { workflow, executionId }),
            value: "signal"
          })
          yield* advanceUntil(() => saving.isOpen())
          assert.deepStrictEqual(state.pendingResult(executionId, gate.name), Exit.succeed("signal"))
          yield* allowDefect.open
          yield* advanceUntil(() => rebuilt.isOpen())
          assert.isFalse(persisted, "the completion must still be unavailable in storage")
          if (lifecycle === "defect rebuild") {
            assert.isFalse(deactivated.has(entityKey(`Workflow/${workflow._tag}`, executionId)))
          }
          if (lifecycle === "overlapping activations") {
            assert.deepStrictEqual(state.pendingResult(executionId, gate.name), Exit.succeed("signal"))
            yield* allowClose.open
            yield* advanceUntil(() => deactivated.has(entityKey(`Workflow/${workflow._tag}`, executionId)))
          }
          const retained = state.pendingResult(executionId, gate.name)
          assert.isFalse(persisted)

          // Persistence eventually recovers either case; inspect retention before releasing it.
          yield* allowSave.open
          yield* allowBuild.open
          yield* allowRun.open
          result = yield* workflow.poll(executionId)
          for (let i = 0; i < 2000 && !(Option.isSome(result) && result.value._tag === "Complete"); i++) {
            yield* TestClock.adjust(1)
            yield* sharding.pollStorage
            result = yield* workflow.poll(executionId)
          }
          assert.deepStrictEqual(result, Option.some(new Workflow.Complete({ exit: Exit.succeed("signal") })))
          assert.deepStrictEqual(retained, Exit.succeed("signal"), `pending completion must survive ${lifecycle}`)
        }).pipe(Effect.provide(context))
      }), 30_000)
  }
})
