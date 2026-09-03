import { assert, describe, it } from "@effect/vitest"
import { Effect, Exit, Option, Schema, Scope } from "effect"
import { DurableClock, Workflow, WorkflowEngine } from "effect/unstable/workflow"

const workflow = Workflow.make("DurableClock/ZeroThreshold", {
  payload: { id: Schema.String },
  idempotencyKey: ({ id }) => id
})

const verify = Effect.fn(function*(id: string, inMemoryThreshold: 0 | 0n) {
  const scope = yield* Scope.make()
  yield* Effect.addFinalizer((exit) => Scope.close(scope, exit))
  const instance = WorkflowEngine.WorkflowInstance.initial(workflow, `execution/${id}`, scope)
  const calls: Array<string> = []
  const unexpected = () => Effect.die("unexpected engine operation")
  const engine = WorkflowEngine.makeUnsafe({
    register: unexpected,
    execute: unexpected,
    poll: unexpected,
    interrupt: unexpected,
    interruptUnsafe: unexpected,
    resume: unexpected,
    deferredDone: unexpected,
    activityExecute: () =>
      Effect.sync(() => {
        calls.push("activityExecute")
        return new Workflow.Complete({ exit: Exit.void })
      }),
    scheduleClock: () =>
      Effect.sync(() => {
        calls.push("scheduleClock")
      }),
    deferredResult: () =>
      Effect.sync(() => {
        calls.push("deferredResult")
        return Option.some(Exit.void)
      })
  })
  yield* DurableClock.sleep({ name: `clock/${id}`, duration: 10, inMemoryThreshold }).pipe(
    Effect.provideService(WorkflowEngine.WorkflowEngine, engine),
    Effect.provideService(WorkflowEngine.WorkflowInstance, instance)
  )
  assert.deepStrictEqual(calls, ["scheduleClock", "deferredResult"])
})

describe("DurableClock", () => {
  for (const [id, threshold] of [["number", 0], ["bigint", 0n]] as const) {
    it.effect(`preserves an explicit ${id} zero threshold`, () => verify(id, threshold))
  }
})
