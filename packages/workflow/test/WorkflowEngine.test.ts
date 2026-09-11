import { assert, describe, expect, it } from "@effect/vitest"
import { DurableClock, DurableDeferred, Workflow, WorkflowEngine } from "@effect/workflow"
import { Fiber, Scope } from "effect"
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as FiberId from "effect/FiberId"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import * as TestClock from "effect/TestClock"
import * as WorkflowEngineContractTest from "./WorkflowEngineContractTest.js"
import { makeAwaitResult } from "./WorkflowEngineContractTest.js"

describe("WorkflowEngine", () => {
  it.effect("works with TestClock", () =>
    Effect.gen(function*() {
      const executionId = yield* LongWorkflow.execute({ id: "test-1" }, { discard: true })

      yield* TestClock.adjust("1 day")

      expect(yield* LongWorkflow.poll(executionId))
        .toEqual(new Workflow.Complete({ exit: Exit.void }))
    }).pipe(
      Effect.provide(LongWorkflowLayer.pipe(
        Layer.provideMerge(WorkflowEngine.layerMemory)
      ))
    ))

  it.effect("nested workflows", () =>
    Effect.gen(function*() {
      const executionId = yield* ParentWorkflow.execute({ id: "parent-1" }, { discard: true })

      yield* TestClock.adjust("1 hour")

      expect(yield* ParentWorkflow.poll(executionId))
        .toEqual(new Workflow.Complete({ exit: Exit.void }))
    }).pipe(
      Effect.provide(
        Layer.mergeAll(ParentWorkflowLayer, ChildWorkflowLayer).pipe(
          Layer.provideMerge(WorkflowEngine.layerMemory)
        )
      )
    ))

  it.effect("does not squash workflow failures after suspension", () =>
    Effect.gen(function*() {
      const instance = WorkflowEngine.WorkflowInstance.initial(TestWorkflow, "workflow-failure")
      instance.suspended = true

      const result = yield* Workflow.intoResult(Effect.fail("boom")).pipe(
        Effect.provideService(WorkflowEngine.WorkflowInstance, instance)
      )

      assert.deepStrictEqual(result, new Workflow.Complete({ exit: Exit.fail("boom") }))
    }))

  it.effect("removes suspension interrupts from mixed workflow failures", () =>
    Effect.gen(function*() {
      const instance = WorkflowEngine.WorkflowInstance.initial(TestWorkflow, "mixed-workflow-failure")
      const cause = Cause.parallel(Cause.fail("boom"), Cause.interrupt(FiberId.none))

      const result = yield* Workflow.intoResult(Effect.failCause(cause)).pipe(
        Effect.provideService(WorkflowEngine.WorkflowInstance, instance)
      )

      assert.deepStrictEqual(result, new Workflow.Complete({ exit: Exit.fail("boom") }))
    }))

  it.effect("DurableDeferred.into isolates inner suspension from failure recording", () =>
    Effect.gen(function*() {
      const exits: Array<Exit.Exit<number, string>> = []
      const instance = WorkflowEngine.WorkflowInstance.initial(TestWorkflow, "deferred-failure")
      const deferred = DurableDeferred.make("deferred-failure", {
        success: Schema.Number,
        error: Schema.String
      })

      yield* DurableDeferred.into(
        Effect.flatMap(WorkflowEngine.WorkflowInstance, (instance) =>
          Effect.zipRight(
            Effect.sync(() => {
              instance.suspended = true
            }),
            Effect.fail("boom")
          )),
        deferred
      ).pipe(
        Effect.exit,
        Effect.provideService(WorkflowEngine.WorkflowInstance, instance),
        Effect.provideService(WorkflowEngine.WorkflowEngine, makeDeferredEngine(exits))
      )

      assert.isFalse(instance.suspended)
      assert.deepStrictEqual(exits, [Exit.fail("boom")])
    }))

  it.effect("DurableDeferred.into propagates interrupt-only suspension to the parent", () =>
    Effect.gen(function*() {
      const exits: Array<Exit.Exit<number, string>> = []
      const instance = WorkflowEngine.WorkflowInstance.initial(TestWorkflow, "deferred-suspended")
      const deferred = DurableDeferred.make("deferred-suspended", {
        success: Schema.Number,
        error: Schema.String
      })

      yield* DurableDeferred.into(
        Effect.flatMap(WorkflowEngine.WorkflowInstance, (instance) =>
          Effect.zipRight(
            Effect.sync(() => {
              instance.suspended = true
            }),
            Effect.interrupt
          )),
        deferred
      ).pipe(
        Effect.exit,
        Effect.provideService(WorkflowEngine.WorkflowInstance, instance),
        Effect.provideService(WorkflowEngine.WorkflowEngine, makeDeferredEngine(exits))
      )

      assert.isTrue(instance.suspended)
      assert.deepStrictEqual(exits, [])
    }))
})

const TestWorkflow = Workflow.make({
  name: "TestWorkflow",
  payload: {},
  idempotencyKey: () => "test",
  success: Schema.Number,
  error: Schema.String
})

const makeDeferredEngine = (exits: Array<Exit.Exit<number, string>>): WorkflowEngine.WorkflowEngine["Type"] =>
  WorkflowEngine.WorkflowEngine.of({
    register: () => Effect.void,
    execute: () => Effect.die("not implemented"),
    poll: () => Effect.succeed(undefined),
    interrupt: () => Effect.void,
    resume: () => Effect.void,
    activityExecute: () => Effect.die("not implemented"),
    deferredResult: () => Effect.succeed(undefined),
    deferredDone: (_deferred: DurableDeferred.Any, options: { readonly exit: Exit.Exit<unknown, unknown> }) =>
      Effect.sync(() => {
        exits.push(options.exit as Exit.Exit<number, string>)
      }),
    scheduleClock: () => Effect.void
  } as any)

const LongWorkflow = Workflow.make({
  name: "LongWorkflow",
  payload: {
    id: Schema.String
  },
  idempotencyKey: ({ id }) => id
})

const LongWorkflowLayer = LongWorkflow.toLayer(Effect.fnUntraced(function*() {
  yield* DurableClock.sleep({
    name: "LongWorkflow sleep",
    duration: "1 day"
  })
}))

const ChildWorkflow = Workflow.make({
  name: "ChildWorkflow",
  payload: {
    id: Schema.String
  },
  idempotencyKey: ({ id }) => id
})

const ChildWorkflowLayer = ChildWorkflow.toLayer(Effect.fnUntraced(function*() {
  yield* DurableClock.sleep({
    name: "ChildWorkflow sleep",
    duration: "1 hour"
  })
}))

const ParentWorkflow = Workflow.make({
  name: "ParentWorkflow",
  payload: {
    id: Schema.String
  },
  idempotencyKey: ({ id }) => id
})
const ParentWorkflowLayer = ParentWorkflow.toLayer(Effect.fnUntraced(function*() {
  yield* ChildWorkflow.execute({ id: "child-1" })
}))

describe("memory lifecycle", () => {
  const TestWorkflow = Workflow.make({ name: "Backports", payload: {}, idempotencyKey: () => "one" })

  it.effect("memory closes finalizers from every suspended run on completion", () =>
    Effect.gen(function*() {
      const gate = DurableDeferred.make("scope-gate")
      const finalized: Array<number> = []
      let runs = 0
      const layer = TestWorkflow.toLayer(() =>
        Effect.gen(function*() {
          const run = ++runs
          yield* Workflow.addFinalizer(() => Effect.sync(() => finalized.push(run)))
          yield* DurableDeferred.await(gate)
        })
      ).pipe(Layer.provideMerge(WorkflowEngine.layerMemory))
      yield* Effect.gen(function*() {
        const executionId = yield* TestWorkflow.execute(undefined, { discard: true })
        yield* awaitResult(TestWorkflow, executionId, "Suspended")
        assert.deepStrictEqual(finalized, [])
        yield* DurableDeferred.succeed(gate, {
          token: DurableDeferred.tokenFromExecutionId(gate, { workflow: TestWorkflow, executionId }),
          value: undefined
        })
        yield* awaitResult(TestWorkflow, executionId, "Complete")
        assert.deepStrictEqual(finalized, [2, 1])
      }).pipe(Effect.provide(layer))
    }))

  for (const observe of ["body", "terminal", "late completion"] as const) {
    it.effect(`memory deposited interrupt ${observe} ordering`, () =>
      Effect.gen(function*() {
        const gate = DurableDeferred.make("interrupt-gate")
        const body: Array<boolean> = []
        const terminal: Array<boolean> = []
        let runs = 0
        const layer = TestWorkflow.toLayer(() =>
          Effect.gen(function*() {
            const instance = yield* WorkflowEngine.WorkflowInstance
            if (++runs === 2) {
              yield* Workflow.addFinalizer(() => Effect.sync(() => terminal.push(instance.interrupted)))
            }
            yield* DurableDeferred.await(gate).pipe(
              Effect.onExit(() => Effect.sync(() => body.push(instance.interrupted)))
            )
          })
        ).pipe(Layer.provideMerge(WorkflowEngine.layerMemory))
        yield* Effect.gen(function*() {
          const executionId = yield* TestWorkflow.execute(undefined, { discard: true })
          yield* awaitResult(TestWorkflow, executionId, "Suspended")
          yield* TestWorkflow.interrupt(executionId)
          const result = yield* awaitResult(TestWorkflow, executionId, "Complete")
          assert(result?._tag === "Complete" && Exit.isInterrupted(result.exit))
          if (observe === "terminal") assert.deepStrictEqual(terminal, [true])
          if (observe === "body") assert.deepStrictEqual(body, [false, false])
          yield* DurableDeferred.succeed(gate, {
            token: DurableDeferred.tokenFromExecutionId(gate, { workflow: TestWorkflow, executionId }),
            value: undefined
          })
          yield* TestWorkflow.resume(executionId)
          assert.deepStrictEqual(yield* TestWorkflow.poll(executionId), result)
          assert.strictEqual(runs, 2)
        }).pipe(Effect.provide(layer))
      }))
  }
  const awaitResult = makeAwaitResult(Effect.yieldNow())
})

describe("shutdown", () => {
  it.effect("memory engine shutdown runs workflow compensations", () =>
    Effect.gen(function*() {
      const ready = yield* Effect.makeLatch()
      const compensated: Array<string> = []
      const Stuck = Workflow.make({
        name: "WorkflowEngine/ShutdownCompensation",
        payload: { id: Schema.String },
        idempotencyKey: ({ id }) => id
      })
      const layer = Stuck.toLayer(() =>
        Effect.gen(function*() {
          yield* Effect.succeed("a").pipe(
            Stuck.withCompensation((value) => Effect.sync(() => compensated.push(value)))
          )
          yield* ready.open
          return yield* Effect.never
        })
      ).pipe(Layer.provideMerge(WorkflowEngine.layerMemory))
      const scope = yield* Scope.make()
      const context = yield* Layer.build(layer).pipe(Scope.extend(scope))
      const fiber = yield* Stuck.execute({ id: "one" }).pipe(Effect.provide(context), Effect.fork)
      yield* ready.await
      yield* Scope.close(scope, Exit.void)
      const exit = yield* Fiber.await(fiber)
      assert(Exit.isInterrupted(exit))
      assert.deepStrictEqual(compensated, ["a"])
    }))
})

WorkflowEngineContractTest.suite({
  name: "memory",
  engineLayer: WorkflowEngine.layerMemory,
  tick: Effect.yieldNow()
})
