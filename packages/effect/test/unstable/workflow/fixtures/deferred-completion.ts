import { Cause, Effect, Exit, Fiber, Latch, Layer, Option, Schema } from "effect"
import { DurableDeferred, Workflow, WorkflowEngine } from "effect/unstable/workflow"
import * as assert from "node:assert/strict"

const scenario = process.argv[2]

const program = Effect.gen(function*() {
  const signal = DurableDeferred.make("signal", { success: Schema.String, error: Schema.String })
  const unrelated = DurableDeferred.make("unrelated", { success: Schema.String })
  const read = yield* Latch.make()
  const active = yield* Latch.make()
  const cleanup = yield* Latch.make()
  const releaseCleanup = yield* Latch.make()
  const finishActive = yield* Latch.make()
  const events: Array<string> = []
  let runs = 0
  let finalizers = 0
  const selfReplay = scenario === "self-replay"
  const selfCompletion = scenario === "self-success" || scenario === "self-failure" || selfReplay
  const internalCompletion = selfCompletion || scenario === "plain"
  const workflow = Workflow.make("DeferredCompletion", {
    payload: {},
    success: Schema.String,
    error: Schema.String,
    idempotencyKey: () => "one"
  })
  const layer = workflow.toLayer(() =>
    Effect.gen(function*() {
      const run = ++runs
      events.push(`start-${run}`)
      if (run === 1) {
        yield* Workflow.addFinalizer(() =>
          Effect.sync(() => {
            finalizers++
            events.push("terminal")
          })
        )
      }
      const engine = yield* WorkflowEngine.WorkflowEngine
      const producer = internalCompletion
        ? read.await.pipe(
          Effect.andThen(Effect.yieldNow),
          Effect.tap(() => Effect.sync(() => events.push("completing-signal"))),
          Effect.andThen(scenario === "self-failure" ? Effect.fail("boom") : Effect.succeed("ok")),
          (effect) => selfCompletion ? DurableDeferred.into(effect, signal) : effect,
          (effect) =>
            selfReplay
              ? effect.pipe(
                // Keep the producer alive after recording so only preemption and replay can finish the run.
                Effect.andThen(Effect.never),
                Effect.onInterrupt(() =>
                  run === 1
                    ? Effect.gen(function*() {
                      events.push("cleanup-start")
                      yield* cleanup.open
                      yield* releaseCleanup.await
                      events.push("cleanup-end")
                    })
                    : Effect.void
                )
              )
              : effect
        )
        : active.open.pipe(
          Effect.andThen(finishActive.await),
          Effect.as("active"),
          Effect.onInterrupt(() =>
            run === 1
              ? Effect.gen(function*() {
                events.push("cleanup-start")
                yield* cleanup.open
                yield* releaseCleanup.await
                events.push("cleanup-end")
              })
              : Effect.void
          )
        )
      return yield* DurableDeferred.raceAll({
        name: "race",
        success: Schema.String,
        error: Schema.String,
        effects: [DurableDeferred.await(signal), producer]
      }).pipe(
        Effect.provideService(WorkflowEngine.WorkflowEngine, {
          ...engine,
          deferredResult: (deferred) =>
            engine.deferredResult(deferred).pipe(
              Effect.tap(() => deferred.name === signal.name ? read.open : Effect.void)
            )
        }),
        Effect.ensuring(Effect.sync(() => events.push(`body-end-${run}`)))
      )
    })
  ).pipe(Layer.provideMerge(WorkflowEngine.layerMemory))

  yield* Effect.gen(function*() {
    const executionId = yield* workflow.execute({}, { discard: true })
    yield* read.await
    process.stdout.write("deferred-completion-ready\n")
    if (selfReplay) {
      yield* cleanup.await
      for (let i = 0; i < 20; i++) yield* Effect.yieldNow
      assert.equal(runs, 1, "self-completion replay must wait for cleanup")
      assert.equal(finalizers, 0, "self-completion must preserve the workflow scope during cleanup")
      assert.equal(yield* workflow.poll(executionId).pipe(Effect.map(Option.getOrUndefined)), undefined)
      yield* releaseCleanup.open
    }
    if (!internalCompletion) {
      yield* active.await
      if (scenario === "external") {
        const completion = yield* DurableDeferred.succeed(signal, {
          token: DurableDeferred.tokenFromExecutionId(signal, { workflow, executionId }),
          value: "ok"
        }).pipe(Effect.forkChild)
        yield* cleanup.await
        for (let i = 0; i < 20; i++) yield* Effect.yieldNow
        assert.equal(runs, 1, "replay must wait for the previous body's finalizers")
        assert.equal(finalizers, 0, "suspension must preserve the workflow scope")
        assert.equal(yield* workflow.poll(executionId).pipe(Effect.map(Option.getOrUndefined)), undefined)
        assert.equal(completion.pollUnsafe(), undefined, "external completion must wait for cleanup")
        yield* releaseCleanup.open
        yield* Fiber.join(completion)
      } else {
        yield* DurableDeferred.succeed(unrelated, {
          token: DurableDeferred.tokenFromExecutionId(unrelated, { workflow, executionId }),
          value: "unrelated"
        })
        for (let i = 0; i < 20; i++) yield* Effect.yieldNow
        assert.deepEqual(events, ["start-1"], "an unrelated completion must not interrupt the active race")
        assert.equal(finalizers, 0)
        yield* finishActive.open
      }
    }

    let result = yield* workflow.poll(executionId).pipe(Effect.map(Option.getOrUndefined))
    for (let i = 0; i < 2_000 && result?._tag !== "Complete"; i++) {
      yield* Effect.yieldNow
      result = yield* workflow.poll(executionId).pipe(Effect.map(Option.getOrUndefined))
    }
    assert.ok(result?._tag === "Complete", `workflow must complete: ${JSON.stringify(events)}`)
    if (scenario === "self-failure") {
      assert.ok(Exit.isFailure(result.exit))
      assert.equal(result.exit.cause.reasons.length, 1)
      const reason = result.exit.cause.reasons[0]
      assert.ok(Cause.isFailReason(reason), "terminal exit must contain only the typed failure")
      assert.equal(reason.error, "boom")
    } else {
      assert.ok(Exit.isSuccess(result.exit))
      assert.equal(result.exit.value, scenario === "unrelated" ? "active" : "ok")
    }
    for (let run = 2; run <= runs; run++) {
      const previousEnd = events.indexOf(`body-end-${run - 1}`)
      assert.ok(previousEnd !== -1 && previousEnd < events.indexOf(`start-${run}`), "cleanup must precede replay")
    }
    assert.equal(finalizers, 1, "terminal finalization must happen exactly once")
    if (scenario === "external" || selfReplay) {
      assert.equal(runs, 2, "completion must replay the workflow")
      assert.deepEqual(events, [
        "start-1",
        ...(selfReplay ? ["completing-signal"] : []),
        "cleanup-start",
        "cleanup-end",
        "body-end-1",
        "start-2",
        "body-end-2",
        "terminal"
      ])
    }
    const completedRuns = runs
    yield* DurableDeferred.succeed(signal, {
      token: DurableDeferred.tokenFromExecutionId(signal, { workflow, executionId }),
      value: "late"
    })
    yield* workflow.resume(executionId)
    assert.deepEqual(
      yield* workflow.poll(executionId).pipe(Effect.map(Option.getOrUndefined)),
      result,
      "late completion must preserve the terminal result"
    )
    assert.equal(runs, completedRuns)
    assert.equal(finalizers, 1)
    console.log(JSON.stringify({ scenario, result: "passed", events, runs, finalizers }))
  }).pipe(Effect.provide(layer))
})

// An unresolved Effect need not keep Node's event loop alive. Early exit must
// fail too, even when the parent's watchdog never needs to kill the process.
process.exitCode = 1
Effect.runPromise(program).then(
  () => {
    process.stdout.write("deferred-completion-passed\n")
    process.exitCode = 0
  },
  (error) => {
    process.stderr.write(String(error))
    process.exitCode = 1
  }
)
