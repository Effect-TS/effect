import { assert, it } from "@effect/vitest"
import { Effect, FileSystem, Layer, Path, Schema } from "effect"
import { Etag, HttpPlatform } from "effect/unstable/http"
import { HttpApi, HttpApiTest } from "effect/unstable/httpapi"
import * as RpcTest from "effect/unstable/rpc/RpcTest"
import { Workflow, WorkflowEngine, WorkflowProxy, WorkflowProxyServer } from "effect/unstable/workflow"

const TestWorkflow = Workflow.make("TestWorkflow", {
  payload: { id: Schema.String },
  success: Schema.String,
  idempotencyKey: ({ id }) => id
})
const workflows = [TestWorkflow] as const
const WorkflowLive = TestWorkflow.toLayer(({ id }) => Effect.succeed(id)).pipe(
  Layer.provideMerge(WorkflowEngine.layerMemory)
)

const Rpcs = WorkflowProxy.toRpcGroup(workflows)
class Api extends HttpApi.make("Api").add(WorkflowProxy.toHttpApiGroup("workflows", workflows)) {}

const HttpTestServices = Layer.mergeAll(
  Path.layer,
  Etag.layerWeak,
  HttpPlatform.layer
).pipe(Layer.provideMerge(FileSystem.layerNoop({})))

it.layer(HttpTestServices)("WorkflowProxy", (it) => {
  it.effect("round trips discard execution IDs over RPC", () =>
    Effect.gen(function*() {
      const client = yield* RpcTest.makeClient(Rpcs).pipe(
        Effect.provide(WorkflowProxyServer.layerRpcHandlers(workflows).pipe(Layer.provide(WorkflowLive)))
      )
      const payload = { id: "rpc" }
      const expected = yield* TestWorkflow.executionId(payload)
      const actual: string = yield* client.TestWorkflowDiscard(payload)

      assert.strictEqual(actual, expected)
    }))

  it.effect("round trips discard execution IDs over HTTP", () =>
    Effect.gen(function*() {
      const client = yield* HttpApiTest.groups(Api, ["workflows"]).pipe(
        Effect.provide(WorkflowProxyServer.layerHttpApi(Api, "workflows", workflows).pipe(Layer.provide(WorkflowLive)))
      )
      const payload = { id: "http" }
      const expected = yield* TestWorkflow.executionId(payload)
      const actual: string = yield* client.workflows.TestWorkflowDiscard({ payload })

      assert.strictEqual(actual, expected)
    }))
})
