import {
  ClusterWorkflowEngine,
  MessageStorage,
  RunnerHealth,
  Runners,
  RunnerStorage,
  Sharding,
  ShardingConfig
} from "@effect/cluster"
import { assert, describe, it } from "@effect/vitest"
import { Activity, Workflow } from "@effect/workflow"
import { Context, Effect, ExecutionStrategy, Exit, Layer, Schema, Scope, TestClock } from "effect"
import { abandonmentCause, MemoryLive } from "./fixtures/abandonment.js"
import { runFixture } from "./fixtures/run-fixture.js"

const EngineLive = ClusterWorkflowEngine.layer.pipe(
  Layer.provideMerge(Sharding.layer),
  Layer.provide(RunnerStorage.layerMemory),
  Layer.provide(RunnerHealth.layerNoop),
  Layer.provide(Runners.layerNoop),
  Layer.provide(ShardingConfig.layer({
    shardsPerGroup: 1,
    entityTerminationTimeout: 0,
    entityMessagePollInterval: 100,
    entityReplyPollInterval: 100,
    refreshAssignmentsInterval: 100,
    sendRetryInterval: 10
  }))
)

describe("workflow abandonment follow-up", () => {
  for (const suspendOnFailure of [false, true]) {
    it.effect(`replays under a new owner without compensation (SuspendOnFailure=${suspendOnFailure})`, () =>
      Effect.gen(function*() {
        const cause = yield* abandonmentCause
        const driver = yield* MessageStorage.MemoryDriver
        const events: Array<string> = []
        let attempts = 0
        let ownerBStarted = false
        let activityRuns = 0
        const workflow = Workflow.make({
          name: `AbandonmentReplay/${suspendOnFailure}`,
          payload: { id: Schema.String },
          success: Schema.String,
          idempotencyKey: ({ id }) => id
        }).annotate(Workflow.SuspendOnFailure, suspendOnFailure)
        const layer = workflow.toLayer(() =>
          Effect.gen(function*() {
            attempts++
            if (attempts > 1 && !ownerBStarted) return yield* Effect.never
            yield* Effect.succeed("undo").pipe(
              workflow.withCompensation(() => Effect.sync(() => events.push("compensate")))
            )
            yield* Workflow.addFinalizer(() => Effect.sync(() => events.push("durable-finalizer")))
            yield* Effect.acquireRelease(
              Effect.sync(() => events.push("acquire")),
              () => Effect.sync(() => events.push("release"))
            ).pipe(Workflow.provideScope)
            const value = yield* Activity.make({
              name: "BeforeHandoff",
              success: Schema.String,
              execute: Effect.sync(() => {
                activityRuns++
                return "done"
              })
            })
            if (attempts === 1) return yield* Effect.failCause(cause)
            return value
          })
        ).pipe(Layer.provideMerge(EngineLive))

        const ownerA = yield* Scope.fork(yield* Effect.scope, ExecutionStrategy.sequential)
        const contextA = yield* Layer.build(layer).pipe(Scope.extend(ownerA))
        const executionId = yield* workflow.execute({ id: "one" }, { discard: true }).pipe(Effect.provide(contextA))
        yield* TestClock.adjust(1000)
        const run = driver.journal.find((e) =>
          e._tag === "Request" && e.tag === "run" && e.address.entityId === executionId
        )
        assert(run?._tag === "Request")
        assert.strictEqual(
          driver.requests.get(run.requestId)!.replies.length,
          0,
          "abandonment must not persist Complete or Suspended"
        )
        assert.deepStrictEqual(events, ["acquire", "release"])
        assert.strictEqual(activityRuns, 1)
        assert.strictEqual(driver.journal.filter((e) => e._tag === "Interrupt").length, 0)
        yield* Scope.close(ownerA, Exit.void)
        ownerBStarted = true

        const ownerB = yield* Scope.fork(yield* Effect.scope, ExecutionStrategy.sequential)
        const contextB = yield* Layer.build(layer).pipe(Scope.extend(ownerB))
        yield* TestClock.adjust(1000)
        const result = yield* workflow.poll(executionId).pipe(Effect.provide(contextB))
        assert(result?._tag === "Complete")
        assert.deepStrictEqual(result.exit, Exit.succeed("done"))
        assert.isAtLeast(attempts, 2)
        assert.strictEqual(activityRuns, 1, "completed activity must not execute again on replay")
        assert.deepStrictEqual(events, ["acquire", "release", "acquire", "release", "durable-finalizer"])
      }).pipe(Effect.scoped, Effect.provide(MemoryLive)))
  }

  it.effect("a recorded durable interrupt wins over abandonment and runs compensation", () =>
    Effect.gen(function*() {
      const result = yield* runFixture(new URL("./fixtures/workflow-interrupt-abandonment.ts", import.meta.url))
      assert.isFalse(result.timedOut, `workflow runtime stalled after releasing abandonment: ${result.output}`)
      assert.strictEqual(result.code, 0, result.output)
    }), 30_000)

  it.effect("an abandoned child does not enqueue a parent resume", () =>
    Effect.gen(function*() {
      const cause = yield* abandonmentCause
      const driver = yield* MessageStorage.MemoryDriver
      const child = Workflow.make({
        name: "AbandonedChild",
        payload: { id: Schema.String },
        idempotencyKey: ({ id }) => id
      })
      const parent = Workflow.make({
        name: "AbandonedParent",
        payload: { id: Schema.String },
        idempotencyKey: ({ id }) => id
      })
      let attempted = false
      const layers = Layer.merge(
        child.toLayer(() =>
          Effect.suspend(() => {
            if (attempted) return Effect.never
            attempted = true
            return Effect.failCause(cause)
          })
        ),
        parent.toLayer(({ id }) => child.execute({ id }, { discard: true }).pipe(Effect.andThen(Effect.never)))
      ).pipe(Layer.provideMerge(EngineLive))
      const context = yield* Layer.build(layers)
      yield* parent.execute({ id: "one" }, { discard: true }).pipe(Effect.provide(context))
      yield* TestClock.adjust(1000)
      const request = driver.journal.find((e) =>
        e._tag === "Request" && e.address.entityType === "Workflow/AbandonedChild" && e.tag === "run"
      )
      assert(request?._tag === "Request")
      assert.isDefined((request.payload as any)["~@effect/workflow/parent"])
      assert.strictEqual(driver.journal.filter((e) => e._tag === "Request" && e.tag === "resume").length, 0)
      assert.strictEqual(driver.requests.get(request.requestId)!.replies.length, 0)
      assert.isFalse(yield* Context.get(context, Sharding.Sharding).isShutdown)
    }).pipe(Effect.scoped, Effect.provide(MemoryLive)))
})
