import { Cause, Effect, Exit, Fiber, Latch, Layer, Schema } from "effect"
import { DurableDeferred, Workflow, WorkflowEngine } from "effect/unstable/workflow"
import * as assert from "node:assert/strict"

const failure = process.argv[2] === "failure"
const program = Effect.gen(function*() {
  const signal = DurableDeferred.make("signal", { success: Schema.String, error: Schema.String })
  const read = yield* Latch.make()
  const cleanup = yield* Latch.make()
  const release = yield* Latch.make()
  const events: Array<string> = []
  let runs = 0
  const workflow = Workflow.make("SelfCompletion", {
    payload: {},
    success: Schema.String,
    error: Schema.String,
    idempotencyKey: () => "one"
  })
  const layer = workflow.toLayer(() =>
    Effect.gen(function*() {
      const run = ++runs
      events.push(`start-${run}`)
      const engine = yield* WorkflowEngine.WorkflowEngine
      return yield* DurableDeferred.raceAll({
        name: "race",
        success: Schema.String,
        error: Schema.String,
        effects: [
          DurableDeferred.await(signal),
          read.await.pipe(
            Effect.andThen(Effect.yieldNow),
            Effect.andThen(failure ? Effect.fail("boom") : Effect.succeed("ok")),
            DurableDeferred.into(signal),
            // Successful completion must preempt this producer and replay the run.
            Effect.andThen(Effect.never),
            Effect.onInterrupt(() =>
              run === 1
                ? Effect.gen(function*() {
                  events.push("cleanup-start")
                  yield* cleanup.open
                  yield* release.await
                  events.push("cleanup-end")
                })
                : Effect.void
            )
          )
        ]
      }).pipe(
        Effect.provideService(WorkflowEngine.WorkflowEngine, {
          ...engine,
          deferredResult: (deferred) =>
            engine.deferredResult(deferred).pipe(
              Effect.tap(() => deferred.name === signal.name ? read.open : Effect.void)
            )
        }),
        Effect.ensuring(Effect.sync(() => events.push(`end-${run}`)))
      )
    })
  ).pipe(Layer.provideMerge(WorkflowEngine.layerMemory))

  yield* Effect.gen(function*() {
    const execution = yield* workflow.execute({}).pipe(Effect.exit, Effect.forkChild({ startImmediately: true }))
    if (!failure) {
      yield* cleanup.await
      for (let i = 0; i < 20; i++) yield* Effect.yieldNow
      assert.deepEqual(events, ["start-1", "cleanup-start"], "replay must wait for cleanup")
      yield* release.open
    }
    const result = yield* Fiber.join(execution)
    if (failure) {
      assert.ok(Exit.isFailure(result))
      assert.equal(result.cause.reasons.length, 1)
      const reason = result.cause.reasons[0]
      assert.ok(Cause.isFailReason(reason))
      assert.equal(reason.error, "boom")
    } else {
      assert.deepEqual(result, Exit.succeed("ok"))
      assert.deepEqual(events, ["start-1", "cleanup-start", "cleanup-end", "end-1", "start-2", "end-2"])
    }
  }).pipe(Effect.provide(layer))
})

// An unresolved Effect can leave Node's event loop empty. Reject early exit too.
process.exitCode = 1
Effect.runPromise(program).then(
  () => {
    process.exitCode = 0
  },
  (error) => {
    console.error(error)
  }
)
