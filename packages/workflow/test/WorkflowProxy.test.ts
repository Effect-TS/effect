import { HttpApi, HttpApiBuilder, HttpServer } from "@effect/platform"
import { assert, describe, it } from "@effect/vitest"
import { Workflow, WorkflowEngine, WorkflowProxy, WorkflowProxyServer } from "@effect/workflow"
import { Effect, Exit, Layer, Schema } from "effect"
import { makeAwaitResult } from "./WorkflowEngineContractTest.js"

describe("WorkflowProxy", () => {
  const TestWorkflow = Workflow.make({ name: "Backports", payload: {}, idempotencyKey: () => "one" })

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
  const awaitResult = makeAwaitResult(Effect.yieldNow(), 2000)
})
