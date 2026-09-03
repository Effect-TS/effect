import { assert, describe, it } from "@effect/vitest"
import { Duration, Effect, Exit, Option, Schema, Scope } from "effect"
import { DurableClock, Workflow, WorkflowEngine } from "effect/unstable/workflow"

const workflow = Workflow.make("DurableClock/BoundaryRouting", {
  payload: { id: Schema.String },
  idempotencyKey: ({ id }) => id
})

interface Case {
  readonly id: string
  readonly duration: Duration.Input
  readonly inMemoryThreshold?: Duration.Input | undefined
  readonly expected: "durable" | "activity" | "none"
}

const cases: ReadonlyArray<Case> = [
  { id: "numeric-zero", duration: 10, inMemoryThreshold: 0, expected: "durable" },
  { id: "bigint-zero", duration: 10, inMemoryThreshold: 0n, expected: "durable" },
  { id: "duration-zero", duration: 10, inMemoryThreshold: Duration.zero, expected: "durable" },
  { id: "string-zero", duration: 10, inMemoryThreshold: "0 millis", expected: "durable" },
  { id: "omitted-short", duration: 10, expected: "activity" },
  { id: "omitted-exact-default", duration: 60_000, expected: "activity" },
  { id: "omitted-above-default", duration: 60_001, expected: "durable" },
  { id: "explicit-undefined", duration: 10, inMemoryThreshold: undefined, expected: "activity" },
  { id: "equal-threshold", duration: 10, inMemoryThreshold: 10, expected: "activity" },
  { id: "above-threshold", duration: 10, inMemoryThreshold: 9, expected: "durable" },
  { id: "zero-duration-number", duration: 0, inMemoryThreshold: 0, expected: "none" },
  { id: "zero-duration-bigint", duration: 0n, inMemoryThreshold: 0n, expected: "none" },
  { id: "zero-duration-object", duration: Duration.zero, inMemoryThreshold: Duration.zero, expected: "none" },
  { id: "zero-duration-string", duration: "0 millis", inMemoryThreshold: "0 millis", expected: "none" }
]

// A finite routing recorder, not a persistence implementation. Neither branch
// executes a real sleep: both return the known completed void result.
const verify = Effect.fn(function*(test: Case) {
  const scope = yield* Scope.make()
  yield* Effect.addFinalizer((exit) => Scope.close(scope, exit))
  const executionId = `execution/${test.id}`
  const name = `clock/${test.id}`
  const instance = WorkflowEngine.WorkflowInstance.initial(workflow, executionId, scope)
  const calls: Array<string> = []
  let scheduled: DurableClock.DurableClock | undefined
  const unexpected = () => Effect.die("unexpected engine operation")
  const engine = WorkflowEngine.makeUnsafe({
    register: unexpected,
    execute: unexpected,
    poll: unexpected,
    interrupt: unexpected,
    interruptUnsafe: unexpected,
    resume: unexpected,
    deferredDone: unexpected,
    activityExecute: (activity, attempt) =>
      Effect.gen(function*() {
        const current = yield* WorkflowEngine.WorkflowInstance
        assert.strictEqual(current, instance)
        assert.strictEqual(current.workflow, workflow)
        assert.strictEqual(current.executionId, executionId)
        assert.strictEqual(activity.name, `DurableClock/${name}`)
        assert.strictEqual(attempt, 1)
        calls.push("activityExecute")
        return new Workflow.Complete({ exit: Exit.void })
      }),
    scheduleClock: (forwardedWorkflow, options) =>
      Effect.sync(() => {
        assert.strictEqual(forwardedWorkflow, workflow)
        assert.strictEqual(options.executionId, executionId)
        assert.strictEqual(options.clock.name, name)
        assert.strictEqual(
          Duration.toMillis(options.clock.duration),
          Duration.toMillis(Duration.fromInputUnsafe(test.duration))
        )
        assert.strictEqual(options.clock.deferred.name, `DurableClock/${name}`)
        assert.strictEqual(options.clock.deferred.successSchema, Schema.Void)
        scheduled = options.clock
        calls.push("scheduleClock")
      }),
    deferredResult: (deferred) =>
      Effect.gen(function*() {
        const current = yield* WorkflowEngine.WorkflowInstance
        assert.strictEqual(current, instance)
        assert.strictEqual(current.workflow, workflow)
        assert.strictEqual(current.executionId, executionId)
        assert.isDefined(scheduled)
        assert.strictEqual(deferred, scheduled!.deferred)
        assert.isTrue(current.awaitedDeferreds.has(deferred.name))
        calls.push("deferredResult")
        return Option.some(Exit.void)
      })
  })
  const { expected, id: _, ...options } = test
  const result = yield* DurableClock.sleep({ ...options, name }).pipe(
    Effect.provideService(WorkflowEngine.WorkflowEngine, engine),
    Effect.provideService(WorkflowEngine.WorkflowInstance, instance)
  )
  assert.isUndefined(result)
  assert.isFalse(instance.suspended)
  assert.strictEqual(instance.activityState.count, 0)
  console.log(JSON.stringify({
    candidate: "durable-clock-zero-threshold-defaulted",
    id: test.id,
    result: "void",
    expected,
    calls,
    executionId,
    workflow: workflow._tag,
    clock: scheduled?.name ?? null,
    deferred: scheduled?.deferred.name ?? null,
    identitiesChecked: true
  }))
  assert.deepStrictEqual(
    calls,
    expected === "durable" ? ["scheduleClock", "deferredResult"] : expected === "activity" ? ["activityExecute"] : []
  )
})

describe("DurableClock routing boundary", () => {
  for (const test of cases) {
    it.effect(test.id, () => verify(test))
  }
})
