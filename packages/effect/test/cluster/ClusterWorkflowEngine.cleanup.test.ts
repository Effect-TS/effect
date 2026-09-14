import { assert, describe, it } from "@effect/vitest"
import { Effect, Exit, Layer, Option, Schema } from "effect"
import { TestClock } from "effect/testing"
import {
  ClusterWorkflowEngine,
  Entity,
  MessageStorage,
  RunnerHealth,
  Runners,
  RunnerStorage,
  Sharding,
  ShardingConfig,
  Snowflake
} from "effect/unstable/cluster"
import { DurableDeferred, Workflow } from "effect/unstable/workflow"
import * as WorkflowEngine from "effect/unstable/workflow/WorkflowEngine"
import { vi } from "vitest"

const makeEngine = (workflowLayer: Layer.Layer<never, never, WorkflowEngine.WorkflowEngine>) =>
  Effect.gen(function*() {
    // Observe the real cache: workflow results alone cannot reveal retained exits.
    const spy = yield* Effect.acquireRelease(
      Effect.sync(() => vi.spyOn(WorkflowEngine, "makeDeferredState")),
      (spy) => Effect.sync(() => spy.mockRestore())
    )
    const deactivated = new Set<string>()
    const shardingLayer = Layer.effect(
      Sharding.Sharding,
      Effect.map(Sharding.Sharding, (sharding) => ({
        ...sharding,
        registerEntity: (entity, handlers, options) =>
          sharding.registerEntity(
            entity,
            Effect.gen(function*() {
              const address = yield* Entity.CurrentAddress
              // Registered before the real handlers, so this observes their completed cleanup.
              yield* Effect.addFinalizer(() => Effect.sync(() => deactivated.add(address.entityId)))
              return yield* handlers
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
        Layer.provide(MessageStorage.layerMemory),
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

const waitForDeactivation = (deactivated: Set<string>, executionId: string) =>
  Effect.gen(function*() {
    // Workflow entities idle out after 10 seconds; allow the shared reaper to close the activation.
    for (let i = 0; i < 12 && !deactivated.has(executionId); i++) {
      yield* TestClock.adjust(5000)
    }
    assert(deactivated.has(executionId), "the entity activation must finish closing")
  })

describe("ClusterWorkflowEngine deferred cleanup", { concurrent: false }, () => {
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
        assert.strictEqual(yield* workflow.execute({}), "done")
        const token = DurableDeferred.tokenFromExecutionId(gate, { workflow, executionId })
        yield* DurableDeferred.succeed(gate, { token, value: "late" })
        yield* waitForDeactivation(deactivated, executionId)

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
    }))

  it.effect("releases suspended execution completions on deactivation and replays durable replies", () =>
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
        yield* waitForDeactivation(deactivated, executionId)
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
    }))
})
