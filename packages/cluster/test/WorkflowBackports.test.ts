import {
  ClusterWorkflowEngine,
  MessageStorage,
  RunnerHealth,
  Runners,
  RunnerStorage,
  Sharding,
  ShardingConfig
} from "@effect/cluster"
import { assert, describe, it } from "@effect/vitest"
import { Activity, DurableClock, DurableDeferred, Workflow, WorkflowEngine } from "@effect/workflow"
import { Duration, Effect, Exit, Layer, Option, Schema, TestClock } from "effect"

const clusterEngine = ClusterWorkflowEngine.layer.pipe(
  Layer.provideMerge(Sharding.layer),
  Layer.provide(Runners.layerNoop),
  Layer.provideMerge(MessageStorage.layerMemory),
  Layer.provide(RunnerStorage.layerMemory),
  Layer.provide(RunnerHealth.layerNoop),
  Layer.provide(ShardingConfig.layer({
    shardsPerGroup: 10,
    entityTerminationTimeout: 0,
    entityMessagePollInterval: 5000,
    sendRetryInterval: 10
  }))
)

for (const backend of ["memory", "cluster"] as const) {
  const engineLayer = backend === "memory" ? WorkflowEngine.layerMemory : clusterEngine
  const tick = Effect.flatMap(
    Effect.serviceOption(Sharding.Sharding),
    (sharding) => Option.isSome(sharding) ? sharding.value.pollStorage : Effect.yieldNow()
  )
  const settle = Effect.gen(function*() {
    yield* tick
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

  describe(`${backend} workflow backports`, () => {
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
}
