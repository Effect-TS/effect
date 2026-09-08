import { assert, describe, it } from "@effect/vitest"
import { Effect, Exit, Fiber, Latch, Scheduler } from "effect"
import { Workflow } from "effect/unstable/workflow"
import { WorkflowInstance } from "effect/unstable/workflow/WorkflowEngine"

// Select one legal automatic yield without depending on primitive counts or timers.
class YieldOnce extends Scheduler.MixedScheduler {
  yielded = false
  constructor(readonly atBoundary: () => boolean) {
    super()
  }
  override shouldYield(fiber: Fiber.Fiber<unknown, unknown>): boolean {
    if (this.yielded || !this.atBoundary()) return super.shouldYield(fiber)
    this.yielded = true
    return true
  }
}

const workflow = Workflow.make("ActivityInterruption", {
  payload: {},
  idempotencyKey: () => "activity-interruption"
})

describe("Workflow.wrapActivityResult", () => {
  it.effect("releases acquisition interrupted before the body starts", () =>
    Effect.gen(function*() {
      const instance = WorkflowInstance.initial(workflow, "acquisition")
      const scheduler = new YieldOnce(() => instance.activityState.count === 1)
      let entered = false
      const fiber = yield* Workflow.wrapActivityResult(
        Effect.sync(() => {
          entered = true
        }),
        () => false
      ).pipe(
        Effect.provideService(WorkflowInstance, instance),
        Effect.provideService(Scheduler.Scheduler, scheduler),
        Effect.forkChild({ startImmediately: true })
      )
      assert.isTrue(scheduler.yielded)
      yield* Fiber.interrupt(fiber)
      assert.isTrue(Exit.hasInterrupts(yield* Fiber.await(fiber)))
      assert.isFalse(entered)
      assert.strictEqual(instance.activityState.count, 0)
      yield* instance.activityState.latch.await
    }))

  for (
    const { exit, name } of [
      { name: "success", exit: Exit.succeed("ok") },
      { name: "failure", exit: Exit.fail("failure") },
      { name: "defect", exit: Exit.die("defect") }
    ]
  ) {
    it.effect(`releases accounting on ${name}`, () =>
      Effect.gen(function*() {
        const instance = WorkflowInstance.initial(workflow, "exit")
        const actual = yield* Workflow.wrapActivityResult(exit, () => false).pipe(
          Effect.provideService(WorkflowInstance, instance),
          Effect.exit
        )
        assert.deepStrictEqual(actual, exit)
        assert.strictEqual(instance.activityState.count, 0)
        yield* instance.activityState.latch.await
      }))
  }

  for (const masked of [false, true]) {
    it.effect(`preserves the body's interruptibility when masked=${masked}`, () =>
      Effect.gen(function*() {
        const instance = WorkflowInstance.initial(workflow, "body")
        const entered = yield* Latch.make()
        const release = yield* Latch.make()
        let completed = false
        const body = Effect.gen(function*() {
          yield* entered.open
          yield* release.await
          completed = true
        })
        const wrapped = Workflow.wrapActivityResult(body, () => false)
        yield* Effect.gen(function*() {
          const fiber = yield* (masked ? Effect.uninterruptible(wrapped) : wrapped).pipe(
            Effect.provideService(WorkflowInstance, instance),
            Effect.forkChild({ startImmediately: true })
          )
          yield* entered.await
          const cancellation = yield* Fiber.interrupt(fiber).pipe(Effect.forkChild({ startImmediately: true }))
          if (!masked) {
            assert.isTrue(Exit.hasInterrupts(yield* Fiber.await(fiber)))
          }
          yield* release.open
          yield* Fiber.join(cancellation)
          assert.strictEqual(completed, masked)
          assert.strictEqual(instance.activityState.count, 0)
          yield* instance.activityState.latch.await
        }).pipe(Effect.ensuring(release.open))
      }))
  }
})
