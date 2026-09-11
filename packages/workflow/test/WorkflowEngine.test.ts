import { assert, describe, expect, it } from "@effect/vitest"
import { Activity, DurableClock, DurableDeferred, Workflow, WorkflowEngine } from "@effect/workflow"
import { Duration, Fiber, Scope } from "effect"
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as FiberId from "effect/FiberId"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import * as TestClock from "effect/TestClock"

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
  const awaitResult = <A, E>(
    workflow: {
      readonly poll: (
        id: string
      ) => Effect.Effect<Workflow.Result<A, E> | undefined, never, WorkflowEngine.WorkflowEngine>
    },
    executionId: string,
    tag: "Suspended" | "Complete"
  ) =>
    Effect.gen(function*() {
      let result = yield* workflow.poll(executionId)
      for (let i = 0; i < 2000 && result?._tag !== tag; i++) {
        yield* Effect.yieldNow()
        result = yield* workflow.poll(executionId)
      }
      assert.strictEqual(result?._tag, tag)
      return result
    })
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

describe("workflow engine contract", () => {
  const backend = "memory"
  const engineLayer = WorkflowEngine.layerMemory
  const settle = Effect.gen(function*() {
    yield* Effect.yieldNow()
    yield* TestClock.adjust(1)
  })
  const awaitResult = <A, E>(
    workflow: {
      readonly poll: (
        id: string
      ) => Effect.Effect<Workflow.Result<A, E> | undefined, never, WorkflowEngine.WorkflowEngine>
    },
    executionId: string,
    tag: "Suspended" | "Complete",
    ready: () => boolean = () => true
  ) =>
    Effect.gen(function*() {
      let result = yield* workflow.poll(executionId)
      for (let i = 0; i < 100 && (result?._tag !== tag || !ready()); i++) {
        yield* settle
        result = yield* workflow.poll(executionId)
      }
      assert.strictEqual(result?._tag, tag)
      assert.isTrue(ready())
      return result
    })

  describe(`${backend} suspension and deferred completion`, () => {
    for (
      const { childCount, concurrency, waves } of [
        { childCount: 3, concurrency: "unbounded" as const, waves: [3] },
        { childCount: 5, concurrency: 2, waves: [2, 4, 5] }
      ]
    ) {
      it.effect(`activity fan-out suspends and replays with concurrency ${concurrency}`, () =>
        Effect.gen(function*() {
          const Parent = Workflow.make({
            name: "BackportFanOutParent",
            payload: {},
            success: Schema.Array(Schema.Number),
            idempotencyKey: () => "parent"
          })
          const Child = Workflow.make({
            name: "BackportFanOutChild",
            payload: { index: Schema.Number },
            success: Schema.Number,
            idempotencyKey: ({ index }) => String(index)
          })
          const started = new Set<number>()
          let parentRuns = 0
          let activityRuns = 0
          let released = 0
          const parentLayer = Parent.toLayer(() =>
            Effect.suspend(() => {
              parentRuns++
              return Activity.make({
                name: "fan-out",
                success: Schema.Array(Schema.Number),
                execute: Effect.suspend(() => {
                  activityRuns++
                  return Effect.forEach(
                    Array.from({ length: childCount }, (_, index) => index),
                    (index) => Child.execute({ index }),
                    { concurrency }
                  )
                }).pipe(Effect.ensuring(Effect.sync(() => {
                  released++
                })))
              })
            })
          )
          const childLayer = Child.toLayer(({ index }) =>
            Effect.gen(function*() {
              started.add(index)
              yield* DurableClock.sleep({ name: "child", duration: "2 seconds", inMemoryThreshold: Duration.zero })
              return index
            })
          )
          yield* Effect.gen(function*() {
            const executionId = yield* Parent.execute(undefined, { discard: true })
            for (const expected of waves) {
              yield* awaitResult(Parent, executionId, "Suspended", () => started.size === expected)
              assert.deepStrictEqual([...started].sort(), Array.from({ length: expected }, (_, index) => index))
              assert.strictEqual(released, activityRuns)
              assert.isAtMost(activityRuns, parentRuns)
              if (expected === waves[0]) assert.strictEqual(parentRuns, 1)
              yield* TestClock.adjust("2 seconds")
              yield* settle
            }
            const result = yield* awaitResult(Parent, executionId, "Complete")
            assert.deepStrictEqual(
              result,
              new Workflow.Complete({
                exit: Exit.succeed(Array.from({ length: childCount }, (_, index) => index))
              })
            )
            assert.isAtLeast(parentRuns, waves.length + 1)
          }).pipe(Effect.provide(Layer.mergeAll(parentLayer, childLayer).pipe(Layer.provideMerge(engineLayer))))
        }))
    }

    it.effect("child completions during activity cleanup wake the parent", () =>
      Effect.gen(function*() {
        const release = yield* Effect.makeLatch()
        let cleaningUp = false
        const gate = DurableDeferred.make("cleanup-gate")
        const Parent = Workflow.make({
          name: "BackportCleanupParent",
          payload: {},
          success: Schema.Array(Schema.Number),
          idempotencyKey: () => "parent"
        })
        const Child = Workflow.make({
          name: "BackportCleanupChild",
          payload: { index: Schema.Number },
          success: Schema.Number,
          idempotencyKey: ({ index }) => String(index)
        })
        const parentLayer = Parent.toLayer(() =>
          Activity.make({
            name: "children",
            success: Schema.Array(Schema.Number),
            execute: Effect.forEach([0, 1], (index) => Child.execute({ index }), { concurrency: "unbounded" }).pipe(
              Effect.ensuring(
                Effect.sync(() => {
                  cleaningUp = true
                }).pipe(Effect.zipRight(release.await))
              )
            )
          })
        )
        const childLayer = Child.toLayer(({ index }) => DurableDeferred.await(gate).pipe(Effect.as(index)))
        yield* Effect.gen(function*() {
          const executionId = yield* Parent.execute(undefined, { discard: true })
          for (let i = 0; i < 100 && !cleaningUp; i++) yield* settle
          assert.isTrue(cleaningUp)
          for (const index of [0, 1]) {
            const childId = yield* Child.executionId({ index })
            yield* DurableDeferred.succeed(gate, {
              token: DurableDeferred.tokenFromExecutionId(gate, { workflow: Child, executionId: childId }),
              value: undefined
            })
            yield* awaitResult(Child, childId, "Complete")
          }
          yield* release.open
          assert.deepStrictEqual(
            yield* awaitResult(Parent, executionId, "Complete"),
            new Workflow.Complete({ exit: Exit.succeed([0, 1]) })
          )
        }).pipe(
          Effect.ensuring(release.open),
          Effect.provide(Layer.mergeAll(parentLayer, childLayer).pipe(Layer.provideMerge(engineLayer)))
        )
      }))

    it.effect("activity suspension survives beyond the ordinary interruption retry budget", () =>
      Effect.gen(function*() {
        const gate = DurableDeferred.make("retry-gate")
        let attempts = 0
        const Suspends = Workflow.make({ name: "BackportSuspensionBudget", payload: {}, idempotencyKey: () => "one" })
        const layer = Suspends.toLayer(() =>
          Activity.make({
            name: "suspend",
            execute: Effect.suspend(() => {
              attempts++
              return DurableDeferred.await(gate)
            })
          })
        ).pipe(Layer.provideMerge(engineLayer))
        yield* Effect.gen(function*() {
          const executionId = yield* Suspends.execute(undefined, { discard: true })
          yield* settle
          yield* TestClock.adjust("2 minutes")
          const result = yield* awaitResult(Suspends, executionId, "Suspended")
          assert.strictEqual(result?._tag, "Suspended")
          assert.strictEqual(attempts, 1)
          yield* DurableDeferred.succeed(gate, {
            token: DurableDeferred.tokenFromExecutionId(gate, { workflow: Suspends, executionId }),
            value: undefined
          })
          assert.deepStrictEqual(
            yield* awaitResult(Suspends, executionId, "Complete"),
            new Workflow.Complete({ exit: Exit.void })
          )
        }).pipe(Effect.provide(layer))
      }))

    for (const mode of ["mapped", "into", "multi-await", "active-wins"] as const) {
      it.effect(`deferred race ${mode} preserves the winning branch and replay`, () =>
        Effect.gen(function*() {
          const gate = DurableDeferred.make("race-gate", { success: Schema.String })
          const second = DurableDeferred.make("second-gate", { success: Schema.String })
          const auxiliary = DurableDeferred.make("auxiliary", { success: Schema.String })
          const readGate = yield* Effect.makeLatch()
          let readSecond = false
          const active = yield* Effect.makeLatch()
          let runs = 0
          let activeCompleted = false
          const Race = Workflow.make({
            name: "BackportRace",
            payload: {},
            success: Schema.String,
            idempotencyKey: () => "race"
          })
          const layer = Race.toLayer(() =>
            Effect.gen(function*() {
              runs++
              const engine = yield* WorkflowEngine.WorkflowEngine
              const branch = mode === "multi-await"
                ? Effect.gen(function*() {
                  const first = yield* DurableDeferred.await(gate)
                  const next = yield* DurableDeferred.await(second)
                  return `${first}:${next}`
                })
                : DurableDeferred.await(gate).pipe(Effect.map((value) => `mapped:${value}`))
              return yield* DurableDeferred.raceAll({
                name: "race",
                success: Schema.String,
                error: Schema.Never,
                effects: [
                  mode === "into" ? DurableDeferred.into(branch, auxiliary) : branch,
                  Activity.make({
                    name: "slow",
                    success: Schema.String,
                    execute: Effect.gen(function*() {
                      yield* active.open
                      yield* Effect.sleep("30 seconds")
                      activeCompleted = true
                      return "active"
                    })
                  })
                ]
              }).pipe(Effect.provideService(WorkflowEngine.WorkflowEngine, {
                ...engine,
                deferredResult: (deferred) =>
                  engine.deferredResult(deferred).pipe(Effect.tap(() =>
                    deferred.name === gate.name ? readGate.open : Effect.sync(() => {
                      if (deferred.name === second.name) readSecond = true
                    })
                  ))
              }))
            })
          ).pipe(Layer.provideMerge(engineLayer))
          yield* Effect.gen(function*() {
            const executionId = yield* Race.execute(undefined, { discard: true })
            yield* active.await
            yield* readGate.await
            yield* settle
            if (mode === "active-wins") {
              yield* TestClock.adjust("30 seconds")
            } else {
              yield* DurableDeferred.succeed(gate, {
                token: DurableDeferred.tokenFromExecutionId(gate, { workflow: Race, executionId }),
                value: "signal"
              })
              if (mode === "multi-await") {
                for (let i = 0; i < 100 && !readSecond; i++) yield* settle
                assert.isTrue(readSecond)
                yield* DurableDeferred.succeed(second, {
                  token: DurableDeferred.tokenFromExecutionId(second, { workflow: Race, executionId }),
                  value: "second"
                })
              }
            }
            const result = yield* awaitResult(Race, executionId, "Complete")
            const expected = mode === "active-wins"
              ? "active"
              : mode === "multi-await"
              ? "signal:second"
              : "mapped:signal"
            assert.deepStrictEqual(result, new Workflow.Complete({ exit: Exit.succeed(expected) }))
            assert.strictEqual(activeCompleted, mode === "active-wins")
            if (mode !== "active-wins") assert.isAtLeast(runs, mode === "multi-await" ? 3 : 2)
            assert.strictEqual(yield* Race.execute(undefined), expected)
          }).pipe(Effect.provide(layer))
        }))
    }

    it.effect("DurableDeferred.into does not persist an interrupted attempt", () =>
      Effect.gen(function*() {
        const deferred = DurableDeferred.make("interrupted", { success: Schema.String })
        const instance = WorkflowEngine.WorkflowInstance.initial(
          Workflow.make({ name: "BackportInterrupted", payload: {}, idempotencyKey: () => "one" }),
          "interrupted"
        )
        const engine = yield* WorkflowEngine.WorkflowEngine
        const writes: Array<Exit.Exit<unknown, unknown>> = []
        const exit = yield* DurableDeferred.into(Effect.interrupt, deferred).pipe(
          Effect.provideService(WorkflowEngine.WorkflowInstance, instance),
          Effect.provideService(WorkflowEngine.WorkflowEngine, {
            ...engine,
            deferredDone: (_deferred, options) =>
              Effect.sync(() => {
                writes.push(options.exit)
              })
          }),
          Effect.exit
        )
        assert.isTrue(Exit.isInterrupted(exit))
        assert.deepStrictEqual(writes, [])
      }).pipe(Effect.provide(engineLayer)))
  })
})
