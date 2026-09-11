import { HttpApi, HttpApiBuilder, HttpServer } from "@effect/platform"
import { assert, describe, it } from "@effect/vitest"
import {
  DurableClock,
  DurableDeferred,
  Workflow,
  WorkflowEngine,
  WorkflowProxy,
  WorkflowProxyServer
} from "@effect/workflow"
import { Effect, Exit, Fiber, Layer, Scheduler, Schema } from "effect"

const TestWorkflow = Workflow.make({ name: "Backports", payload: {}, idempotencyKey: () => "one" })

describe("workflow backports", () => {
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

  for (const transport of ["rpc", "http"] as const) {
    it.effect(`${transport} discard schema round-trips the deterministic execution ID`, () =>
      Effect.gen(function*() {
        const executionId = yield* TestWorkflow.executionId({})
        const group = WorkflowProxy.toRpcGroup([TestWorkflow], { prefix: "test/" })
        const schema = transport === "rpc"
          ? group.requests.get("test/BackportsDiscard")!.successSchema
          : WorkflowProxy.toHttpApiGroup("test", [TestWorkflow]).endpoints.BackportsDiscard.successSchema
        const encoded = yield* Schema.encode(schema as Schema.Schema.AnyNoContext)(executionId)
        assert.strictEqual(yield* Schema.decodeUnknown(schema as Schema.Schema.AnyNoContext)(encoded), executionId)
        assert.isFalse(Schema.is(schema as Schema.Schema.AnyNoContext)(undefined))
      }))
  }

  it.effect("HTTP discard responds with an execution ID that can be polled", () =>
    Effect.gen(function*() {
      const api = HttpApi.make("backports").add(WorkflowProxy.toHttpApiGroup("test", [TestWorkflow]))
      const workflowLayer = TestWorkflow.toLayer(() => Effect.void).pipe(Layer.provideMerge(WorkflowEngine.layerMemory))
      const context = yield* Layer.build(workflowLayer)
      const layer = HttpApiBuilder.api(api).pipe(
        Layer.provide(WorkflowProxyServer.layerHttpApi(api, "test", [TestWorkflow])),
        Layer.provide(Layer.succeedContext(context)),
        Layer.merge(HttpServer.layerContext)
      )
      const { dispose, handler } = HttpApiBuilder.toWebHandler(layer)
      yield* Effect.addFinalizer(() => Effect.promise(dispose))
      const response = yield* Effect.promise(() =>
        handler(
          new Request("http://localhost/backports/discard", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: "{}"
          })
        )
      )
      assert.strictEqual(response.status, 200)
      const executionId = yield* Effect.promise(() => response.json())
      assert.strictEqual(executionId, yield* TestWorkflow.executionId({}))
      const result = yield* awaitResult(TestWorkflow, executionId, "Complete").pipe(Effect.provide(context))
      assert.deepStrictEqual(result, new Workflow.Complete({ exit: Exit.void }))
    }).pipe(Effect.scoped))

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
})

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
