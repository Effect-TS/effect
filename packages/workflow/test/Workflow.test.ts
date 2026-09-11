import { assert, describe, it } from "@effect/vitest"
import { Workflow, WorkflowEngine } from "@effect/workflow"
import { Effect, Exit, Fiber, Scheduler } from "effect"

describe("Workflow", () => {
  const TestWorkflow = Workflow.make({ name: "Backports", payload: {}, idempotencyKey: () => "one" })

  it.effect("releases activity acquisition interrupted before the body starts", () =>
    Effect.gen(function*() {
      const instance = WorkflowEngine.WorkflowInstance.initial(TestWorkflow, "acquisition")
      const scheduler = new class extends Scheduler.MixedScheduler {
        yielded = false
        override shouldYield(fiber: Fiber.RuntimeFiber<unknown, unknown>): number | false {
          if (this.yielded || instance.activityState.count !== 1) return super.shouldYield(fiber)
          this.yielded = true
          return 0
        }
      }(2048)
      let entered = false
      const fiber = Effect.runFork(
        Workflow.wrapActivityResult(
          Effect.sync(() => {
            entered = true
          }),
          () => false
        ).pipe(
          Effect.provideService(WorkflowEngine.WorkflowInstance, instance),
          Effect.withScheduler(scheduler)
        )
      )
      assert.isTrue(scheduler.yielded)
      yield* Fiber.interrupt(fiber)
      assert.isTrue(Exit.isInterrupted(yield* Fiber.await(fiber)))
      assert.isFalse(entered)
      assert.strictEqual(instance.activityState.count, 0)
      yield* instance.activityState.latch.await
    }))
})
