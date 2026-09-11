import {
  ClusterWorkflowEngine,
  MessageStorage,
  RunnerHealth,
  Runners,
  RunnerStorage,
  Sharding,
  ShardingConfig
} from "@effect/cluster"
import { Workflow } from "@effect/workflow"
import { Cause, Effect, Exit, Layer, Schema, TestClock, TestContext } from "effect"
import * as assert from "node:assert/strict"
import { abandonmentCause, MemoryLive } from "./abandonment.js"

const program = Effect.gen(function*() {
  const cause = yield* abandonmentCause
  const ready = yield* Effect.makeLatch()
  const release = yield* Effect.makeLatch()
  const events: Array<string> = []
  let attempts = 0
  const workflow = Workflow.make({
    name: "AbandonmentDurableInterrupt",
    payload: { id: Schema.String },
    idempotencyKey: ({ id }) => id
  })
    .annotate(Workflow.SuspendOnFailure, true)
  const layer = workflow.toLayer(() =>
    Effect.gen(function*() {
      yield* Effect.void.pipe(workflow.withCompensation(() => Effect.sync(() => events.push("compensate"))))
      yield* Effect.acquireRelease(Effect.void, () => Effect.sync(() => events.push("release"))).pipe(
        Workflow.provideScope
      )
      yield* ready.open
      yield* release.await
      if (attempts++ === 0) return yield* Effect.failCause(cause)
    })
  ).pipe(
    Layer.provideMerge(ClusterWorkflowEngine.layer.pipe(
      Layer.provideMerge(Sharding.layer),
      Layer.provide(RunnerStorage.layerMemory),
      Layer.provide(RunnerHealth.layerNoop),
      Layer.provide(Runners.layerNoop),
      Layer.provide(
        ShardingConfig.layer({
          shardsPerGroup: 1,
          entityTerminationTimeout: 0,
          entityMessagePollInterval: 100,
          entityReplyPollInterval: 100,
          refreshAssignmentsInterval: 100,
          sendRetryInterval: 10
        })
      )
    ))
  )
  const context = yield* Layer.build(layer)
  const executionId = yield* workflow.executionId({ id: "one" })
  yield* workflow.interrupt(executionId).pipe(Effect.provide(context))
  yield* TestClock.adjust(100)
  const driver = yield* MessageStorage.MemoryDriver
  const signal = driver.journal.find((e) =>
    e._tag === "Request" && e.tag === "deferred" &&
    (e.payload as { name?: string }).name === "Workflow/InterruptSignal"
  )
  assert.ok(signal?._tag === "Request")
  assert.ok(
    driver.requests.get(signal.requestId)!.replies.length > 0,
    "durable interrupt must be recorded before abandonment"
  )
  yield* workflow.execute({ id: "one" }, { discard: true }).pipe(Effect.provide(context))
  yield* TestClock.adjust(1)
  yield* ready.await
  yield* release.open
  process.stdout.write("durable-interrupt-stored-and-abandonment-released\n")
  yield* TestClock.adjust(1000)
  const result = yield* workflow.poll(executionId).pipe(Effect.provide(context))
  assert.ok(result?._tag === "Complete")
  assert.ok(Exit.isFailure(result.exit))
  assert.ok(Cause.isInterruptedOnly(result.exit.cause))
  assert.deepStrictEqual(events, ["release", "compensate"])
}).pipe(Effect.scoped, Effect.provide(MemoryLive), Effect.provide(TestContext.TestContext))

Effect.runPromise(program).then(
  () => {
    process.exitCode = 0
  },
  (error) => {
    process.stderr.write(String(error))
    process.exitCode = 1
  }
)
