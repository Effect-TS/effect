import { assert, describe, it } from "@effect/vitest"
import { DurableClock, Workflow, WorkflowEngine } from "@effect/workflow"
import { Effect, Exit } from "effect"

describe("DurableClock", () => {
  const TestWorkflow = Workflow.make({ name: "Backports", payload: {}, idempotencyKey: () => "one" })

  for (const threshold of [0, 0n, "0 millis", undefined] as const) {
    it.effect(`DurableClock preserves threshold ${String(threshold)} (${typeof threshold})`, () =>
      Effect.gen(function*() {
        const calls: Array<string> = []
        const unexpected = () => Effect.die("unexpected engine operation")
        const engine = WorkflowEngine.makeUnsafe({
          register: unexpected,
          execute: unexpected,
          poll: unexpected,
          interrupt: unexpected,
          resume: unexpected,
          deferredDone: unexpected,
          activityExecute: () =>
            Effect.sync(() => {
              calls.push("activity")
              return new Workflow.Complete({ exit: Exit.void })
            }),
          scheduleClock: () =>
            Effect.sync(() => {
              calls.push("clock")
            }),
          deferredResult: () =>
            Effect.sync(() => {
              calls.push("deferred")
              return Exit.void
            })
        })
        yield* DurableClock.sleep({ name: "short", duration: 10, inMemoryThreshold: threshold }).pipe(
          Effect.provideService(WorkflowEngine.WorkflowEngine, engine),
          Effect.provideService(
            WorkflowEngine.WorkflowInstance,
            WorkflowEngine.WorkflowInstance.initial(TestWorkflow, "clock")
          )
        )
        assert.deepStrictEqual(calls, threshold === undefined ? ["activity"] : ["clock", "deferred"])
      }))
  }
})
