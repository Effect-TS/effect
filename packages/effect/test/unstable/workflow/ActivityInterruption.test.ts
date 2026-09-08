import { assert, describe, it } from "@effect/vitest"
import { Effect, Exit, Fiber, Latch, Layer, Option, Scheduler, Schema } from "effect"
import { TestClock } from "effect/testing"
import {
  ClusterWorkflowEngine,
  MessageStorage,
  RunnerHealth,
  Runners,
  RunnerStorage,
  Sharding,
  ShardingConfig
} from "effect/unstable/cluster"
import { Activity, DurableDeferred, Workflow, WorkflowEngine } from "effect/unstable/workflow"
import { WorkflowInstance } from "effect/unstable/workflow/WorkflowEngine"

// Select one legal automatic yield without depending on primitive counts or timers.
class YieldOnce extends Scheduler.MixedScheduler {
  yielded = false
  constructor(readonly atBoundary: () => boolean) {
    super()
  }
  override shouldYield(): boolean {
    if (this.yielded || !this.atBoundary()) return false
    this.yielded = true
    return true
  }
}

const workflow = Workflow.make("ActivityInterruption", {
  payload: {},
  idempotencyKey: () => "activity-interruption"
})

const clusterLayer = ClusterWorkflowEngine.layer.pipe(
  Layer.provideMerge(Sharding.layer),
  Layer.provide(Runners.layerNoop),
  Layer.provide(MessageStorage.layerMemory),
  Layer.provide(RunnerStorage.layerMemory),
  Layer.provide(RunnerHealth.layerNoop),
  Layer.provide(ShardingConfig.layer({
    shardsPerGroup: 32,
    availableShardGroups: ["default", "workflow"],
    assignedShardGroups: ["default", "workflow"],
    entityTerminationTimeout: 0,
    entityMessagePollInterval: 10,
    sendRetryInterval: 10
  }))
)

describe("Workflow activity interruption", () => {
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
          for (let i = 0; i < 10; i++) yield* Effect.yieldNow
          assert.strictEqual(fiber.pollUnsafe() === undefined, masked)
          yield* release.open
          yield* Fiber.join(cancellation)
          assert.strictEqual(completed, masked)
          assert.strictEqual(instance.activityState.count, 0)
        }).pipe(Effect.ensuring(release.open))
      }))
  }

  for (const [name, engineLayer] of [["memory", WorkflowEngine.layerMemory], ["cluster", clusterLayer]] as const) {
    for (const operation of ["activity", "deferred"] as const) {
      it.effect(`${name} suspends and replays after interrupting ${operation} acquisition`, () =>
        Effect.gen(function*() {
          const engine = yield* WorkflowEngine.WorkflowEngine
          const ready = yield* Latch.make()
          const proceed = yield* Latch.make()
          const gate = DurableDeferred.make("resume", { success: Schema.String })
          const parent = Workflow.make(`ActivityInterruption/${name}/${operation}`, {
            payload: {},
            success: Schema.String,
            idempotencyKey: () => "parent"
          })
          const instances: Array<WorkflowInstance["Service"]> = []
          let countAfterInterrupt = -1
          yield* engine.register(parent, () =>
            Effect.gen(function*() {
              const instance = yield* WorkflowInstance
              instances.push(instance)
              if (instances.length === 1) {
                const scheduler = new YieldOnce(() => instance.activityState.count === 1)
                const child = yield* (operation === "activity"
                  ? Activity.make({ name: "candidate", execute: Effect.void })
                  : DurableDeferred.await(DurableDeferred.make("interrupted"))).pipe(
                    Effect.provideService(Scheduler.Scheduler, scheduler),
                    Effect.forkChild({ startImmediately: true })
                  )
                assert.isTrue(scheduler.yielded)
                yield* Fiber.interrupt(child)
                assert.isTrue(Exit.hasInterrupts(yield* Fiber.await(child)))
                countAfterInterrupt = instance.activityState.count
                yield* ready.open
                yield* proceed.await
              }
              return yield* DurableDeferred.await(gate)
            }))
          yield* TestClock.adjust(1)
          const executionId = yield* parent.execute({}, { discard: true })
          yield* ready.await
          // Fail before suspension on the broken implementation, without repairing
          // counters or leaving a deliberately uninterruptible finalizer in teardown.
          assert.strictEqual(countAfterInterrupt, 0)
          yield* proceed.open
          let result = yield* parent.poll(executionId)
          while (Option.isNone(result)) {
            yield* Effect.yieldNow
            result = yield* parent.poll(executionId)
          }
          assert.strictEqual(result.value._tag, "Suspended")
          yield* DurableDeferred.succeed(gate, {
            token: DurableDeferred.tokenFromExecutionId(gate, { workflow: parent, executionId }),
            value: "resumed"
          })
          yield* TestClock.adjust(100)
          result = yield* parent.poll(executionId)
          while (Option.isNone(result) || result.value._tag === "Suspended") {
            yield* Effect.yieldNow
            result = yield* parent.poll(executionId)
          }
          assert.deepStrictEqual(result.value, new Workflow.Complete({ exit: Exit.succeed("resumed") }))
          assert.strictEqual(instances.length, 2)
          assert.notStrictEqual(instances[0], instances[1])
          assert.strictEqual(instances[1].activityState.count, 0)
        }).pipe(Effect.provide(engineLayer)))
    }
  }
})
