import { DurableDeferred, Workflow, WorkflowEngine } from "@effect/workflow"
import { Effect, Equal, Exit, Fiber, Layer, Schema, Scope } from "effect"
import * as assert from "node:assert/strict"

const scenario = process.argv[2]

const teardown = Effect.gen(function*() {
  const signal = DurableDeferred.make("signal", { success: Schema.String })
  const read = yield* Effect.makeLatch()
  const cleanup = yield* Effect.makeLatch()
  const releaseCleanup = yield* Effect.makeLatch()
  let runs = 0
  let cleanupEnded = false
  const workflow = Workflow.make({
    name: "DeferredCompletionTeardown",
    payload: {},
    success: Schema.String,
    idempotencyKey: () => "one"
  })
  const layer = workflow.toLayer(() =>
    Effect.gen(function*() {
      runs++
      const engine = yield* WorkflowEngine.WorkflowEngine
      const instance = yield* WorkflowEngine.WorkflowInstance
      const complete = scenario === "teardown-finalizer"
        ? DurableDeferred.into(Effect.succeed("ok"), signal)
        : DurableDeferred.succeed(signal, {
          token: DurableDeferred.tokenFromExecutionId(signal, instance),
          value: "ok"
        })
      return yield* DurableDeferred.raceAll({
        name: "race",
        success: Schema.String,
        error: Schema.Never,
        effects: [
          DurableDeferred.await(signal),
          read.await.pipe(Effect.andThen(complete), Effect.andThen(Effect.never))
        ]
      }).pipe(
        Effect.provideService(WorkflowEngine.WorkflowEngine, {
          ...engine,
          deferredResult: (deferred) =>
            engine.deferredResult(deferred).pipe(
              Effect.tap(() => deferred.name === signal.name ? read.open : Effect.void)
            )
        }),
        Effect.ensuring(Effect.gen(function*() {
          yield* cleanup.open
          yield* releaseCleanup.await
          cleanupEnded = true
        }))
      )
    })
  )
  // Separate wake cancellation from the workflow's blocked cleanup.
  const engineScope = yield* Scope.make()
  const workflowScope = yield* Scope.make()
  const context = yield* Layer.build(WorkflowEngine.layerMemory).pipe(Scope.extend(engineScope))
  yield* Layer.build(layer).pipe(Effect.provide(context), Scope.extend(workflowScope))
  yield* workflow.execute(undefined, { discard: true }).pipe(Effect.provide(context))
  yield* cleanup.await
  process.stdout.write("deferred-completion-ready\n")
  const closeEngine = yield* Scope.close(engineScope, Exit.void).pipe(Effect.fork)
  for (let i = 0; i < 100; i++) yield* Effect.yieldNow()
  const engineClosed = closeEngine.unsafePoll()
  const cleanupBlocked = !cleanupEnded
  const closeWorkflow = yield* Scope.close(workflowScope, Exit.void).pipe(Effect.fork)
  for (let i = 0; i < 100; i++) yield* Effect.yieldNow()
  const workflowClosed = closeWorkflow.unsafePoll()
  // Release cleanup before asserting, including on the failing baseline.
  yield* releaseCleanup.open
  yield* Fiber.join(closeWorkflow)
  yield* Fiber.join(closeEngine)
  process.stdout.write(
    `${JSON.stringify({ scenario, engineClosed, workflowClosed, cleanupBlocked, cleanupEnded, runs })}\n`
  )
  assert.equal(cleanupBlocked, true, "workflow cleanup must still be blocked during engine teardown")
  assert.equal(workflowClosed, null, "workflow scope closure must wait for its own body finalizer")
  assert.ok(
    engineClosed && Exit.isSuccess(engineClosed),
    "engine teardown must cancel its wake before workflow cleanup is released"
  )
  assert.equal(cleanupEnded, true)
  assert.equal(runs, 1, "a cancelled wake must not replay the workflow")
})

const program = Effect.gen(function*() {
  if (scenario === "teardown-finalizer" || scenario === "teardown-interruptible") return yield* teardown
  const signal = DurableDeferred.make("signal", { success: Schema.String, error: Schema.String })
  const unrelated = DurableDeferred.make("unrelated", { success: Schema.String })
  const read = yield* Effect.makeLatch()
  const active = yield* Effect.makeLatch()
  const cleanup = yield* Effect.makeLatch()
  const releaseCleanup = yield* Effect.makeLatch()
  const finishActive = yield* Effect.makeLatch()
  const events: Array<string> = []
  let runs = 0
  let finalizers = 0
  const selfCompletion = scenario === "self-success" || scenario === "self-failure"
  const workflow = Workflow.make({
    name: "DeferredCompletion",
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
      const producer = selfCompletion
        ? read.await.pipe(
          Effect.andThen(Effect.yieldNow()),
          Effect.tap(() => Effect.sync(() => events.push("completing-signal"))),
          Effect.andThen(scenario === "self-failure" ? Effect.fail("boom") : Effect.succeed("ok")),
          DurableDeferred.into(signal)
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
    const executionId = yield* workflow.execute(undefined, { discard: true })
    yield* read.await
    process.stdout.write("deferred-completion-ready\n")
    if (!selfCompletion) {
      yield* active.await
      if (scenario === "external") {
        const completion = yield* DurableDeferred.succeed(signal, {
          token: DurableDeferred.tokenFromExecutionId(signal, { workflow, executionId }),
          value: "ok"
        }).pipe(Effect.fork)
        yield* cleanup.await
        for (let i = 0; i < 20; i++) yield* Effect.yieldNow()
        assert.equal(runs, 1, "replay must wait for the previous body's finalizers")
        assert.equal(finalizers, 0, "suspension must preserve the workflow scope")
        assert.equal(yield* workflow.poll(executionId), undefined)
        assert.equal(completion.unsafePoll(), null, "external completion must remain pending during cleanup")
        yield* releaseCleanup.open
        yield* Fiber.join(completion)
      } else {
        yield* DurableDeferred.succeed(unrelated, {
          token: DurableDeferred.tokenFromExecutionId(unrelated, { workflow, executionId }),
          value: "unrelated"
        })
        for (let i = 0; i < 20; i++) yield* Effect.yieldNow()
        assert.deepEqual(events, ["start-1"], "an unrelated completion must not interrupt the active race")
        assert.equal(finalizers, 0)
        yield* finishActive.open
      }
    }

    let result = yield* workflow.poll(executionId)
    for (let i = 0; i < 2_000 && result?._tag !== "Complete"; i++) {
      yield* Effect.yieldNow()
      result = yield* workflow.poll(executionId)
    }
    assert.ok(result?._tag === "Complete", `workflow must complete: ${JSON.stringify(events)}`)
    const expected = scenario === "self-failure"
      ? Exit.fail("boom")
      : Exit.succeed(scenario === "unrelated" ? "active" : "ok")
    assert.ok(Equal.equals(result.exit, expected), "terminal exit must preserve the race result")
    assert.equal(finalizers, 1, "terminal finalization must happen exactly once")
    if (scenario === "external") {
      assert.equal(runs, 2)
      assert.deepEqual(events, [
        "start-1",
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
    assert.deepEqual(yield* workflow.poll(executionId), result, "late completion must preserve the terminal result")
    assert.equal(runs, completedRuns)
    assert.equal(finalizers, 1)
  }).pipe(Effect.provide(layer))
})

// An unresolved Effect can let Node exit; require explicit success.
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
