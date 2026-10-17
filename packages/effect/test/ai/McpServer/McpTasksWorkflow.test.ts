import { NodeCrypto, NodeFileSystem } from "@effect/platform-node"
import { SqliteClient } from "@effect/sql-sqlite-node"
import { assert, it } from "@effect/vitest"
import * as TaskWire from "effect/ai/internal/mcpSchema/v2026_07_28"
import * as McpProtocol from "effect/ai/McpProtocol"
import * as McpSchema from "effect/ai/McpSchema"
import * as McpTasks from "effect/ai/McpTasks"
import * as Tool from "effect/ai/Tool"
import * as Toolkit from "effect/ai/Toolkit"
import * as ClusterWorkflowEngine from "effect/cluster/ClusterWorkflowEngine"
import * as Sharding from "effect/cluster/Sharding"
import * as SingleRunner from "effect/cluster/SingleRunner"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as FileSystem from "effect/FileSystem"
import * as Layer from "effect/Layer"
import * as Reactivity from "effect/reactivity/Reactivity"
import * as Schema from "effect/Schema"
import * as Scope from "effect/Scope"
import * as SqlClient from "effect/sql/SqlClient"
import { TestClock } from "effect/testing"
import * as Activity from "effect/workflow/Activity"
import * as DurableDeferred from "effect/workflow/DurableDeferred"
import * as WorkflowEngine from "effect/workflow/WorkflowEngine"
import { makeHttpHarness } from "./TestUtils/McpHttpHarness.ts"
import { readMcpHttpResponse } from "./TestUtils/McpHttpResponse.ts"
import { makeServerLayer } from "./TestUtils/McpServerLayer.ts"

const Report = Tool.make("report", { parameters: Tool.EmptyParams, success: Schema.String })
const tools = Toolkit.make(Report)
const resume = DurableDeferred.make("report/resume", { success: Schema.Void })
type Handler = Effect.Effect<
  string,
  never,
  WorkflowEngine.WorkflowEngine | WorkflowEngine.WorkflowInstance | McpSchema.McpRequestContext
>

const database = Effect.gen(function*() {
  const fs = yield* FileSystem.FileSystem
  const directory = yield* fs.makeTempDirectoryScoped()
  const filename = `${directory}/tasks.sqlite`
  return { first: yield* SqliteClient.make({ filename }), second: yield* SqliteClient.make({ filename }) }
}).pipe(Effect.provide([NodeFileSystem.layer, Reactivity.layer]))

const open = Effect.fnUntraced(function*(client: SqlClient.SqlClient, run: Handler) {
  const scope = yield* Effect.acquireRelease(Scope.make(), (scope) => Scope.close(scope, Exit.void))
  const context = yield* Layer.build(ClusterWorkflowEngine.layer.pipe(
    Layer.provideMerge(SingleRunner.layer({
      runnerStorage: "memory",
      shardingConfig: {
        shardsPerGroup: 4,
        availableShardGroups: ["default", "workflow"],
        assignedShardGroups: ["default", "workflow"],
        entityTerminationTimeout: 0,
        refreshAssignmentsInterval: 10,
        shardLockRefreshInterval: 10,
        shardLockExpiration: 1000,
        entityMessagePollInterval: 10,
        sendRetryInterval: 10
      }
    })),
    Layer.provide(NodeCrypto.layer),
    Layer.provide(Layer.succeed(SqlClient.SqlClient, client))
  )).pipe(Scope.provide(scope))
  const underlying = Context.get(context, WorkflowEngine.WorkflowEngine)
  let cancellations = 0
  const engine: typeof underlying = {
    ...underlying,
    interrupt: (workflow, executionId) => {
      cancellations++
      return underlying.interrupt(workflow, executionId)
    }
  }
  const sharding = Context.get(context, Sharding.Sharding)
  const registration = McpTasks.toolkit(tools, {
    owner: McpSchema.McpRequestContext.use((request) => Effect.succeed(request.clientInfo?.name ?? "anonymous"))
  }).pipe(Layer.provide(McpTasks.layerWorkflow(tools, { report: () => run }, { name: "sql-reports" }))).pipe(
    Layer.provide(Layer.succeed(WorkflowEngine.WorkflowEngine, engine)),
    Layer.provideMerge(makeServerLayer({ name: "SqlTasks", protocols: [McpProtocol.v2026_07_28] }))
  )
  const harness = yield* makeHttpHarness(registration).pipe(Scope.provide(scope))
  const drive = Effect.fnUntraced(function*<A, E, R>(effect: Effect.Effect<A, E, R>) {
    const fiber = yield* Effect.forkChild(effect, { startImmediately: true })
    for (let attempt = 0; attempt < 300; attempt++) {
      yield* TestClock.adjust(10)
      yield* sharding.pollStorage
      const exit = fiber.pollUnsafe()
      if (exit) return yield* exit
    }
    return yield* Effect.die("MCP task operation did not finish")
  })
  const request = (method: string, params: Record<string, unknown>, owner = "alice") =>
    drive(Effect.gen(function*() {
      const response = yield* harness.post({
        jsonrpc: "2.0",
        id: 1,
        method,
        params: {
          ...params,
          _meta: {
            tenant: method === "tools/call" ? "acme" : "polling-client",
            "io.modelcontextprotocol/protocolVersion": "2026-07-28",
            "io.modelcontextprotocol/clientCapabilities": {
              extensions: { "io.modelcontextprotocol/tasks": {} }
            },
            "io.modelcontextprotocol/clientInfo": { name: owner, version: "1" }
          }
        }
      }, {
        "MCP-Protocol-Version": "2026-07-28",
        "Mcp-Method": method,
        "Mcp-Name": String(params.name ?? params.taskId ?? "")
      })
      return yield* readMcpHttpResponse(response)
    }))
  const get = (taskId: string) =>
    Effect.flatMap(
      request("tasks/get", { taskId }),
      Schema.decodeUnknownEffect(Schema.Struct({
        result: TaskWire.GetTaskResult
      }))
    ).pipe(Effect.map((response) => response.result))
  const waitFor = Effect.fnUntraced(function*(taskId: string, status: string | ReadonlyArray<string>) {
    let last
    for (let attempt = 0; attempt < 100; attempt++) {
      const task = yield* get(taskId)
      last = task
      if (typeof status === "string" ? task.status === status : status.includes(task.status)) return task
    }
    return assert.fail(`Task did not reach ${status}: ${JSON.stringify(last)}`)
  })
  const start = Effect.gen(function*() {
    const response = yield* request("tools/call", { name: "report", arguments: {} })
    assert.isTrue(typeof response === "object" && response !== null && "result" in response, JSON.stringify(response))
    return (yield* Schema.decodeUnknownEffect(Schema.Struct({ result: TaskWire.CreateTaskResult }))(response)).result
  })
  const release = (taskId: string) => {
    const token = DurableDeferred.TokenParsed.fromString(
      JSON.parse(Schema.decodeUnknownSync(Schema.StringFromBase64Url)(taskId))[1]
    )
    return drive(
      DurableDeferred.succeed(resume, {
        token: new DurableDeferred.TokenParsed({ ...token, deferredName: resume.name }).asToken,
        value: undefined
      }).pipe(Effect.provideService(WorkflowEngine.WorkflowEngine, engine))
    )
  }
  return {
    start,
    get,
    request,
    waitFor,
    release,
    cancellations: () => cancellations,
    close: Scope.close(scope, Exit.void)
  }
})

it.effect("should retain the result, timestamps, and owner when a completed SQL task is read by a reconstructed runner", () =>
  Effect.gen(function*() {
    const db = yield* database
    let runs = 0
    const handler = Effect.sync(() => {
      runs++
      return "report ready"
    })
    const first = yield* open(db.first, handler)
    const created = yield* first.start
    const completed = yield* first.waitFor(created.taskId, "completed")
    yield* first.close
    const second = yield* open(db.second, handler)
    const recovered = yield* second.get(created.taskId)
    assert.deepStrictEqual(recovered, completed)
    assert.strictEqual(recovered.ttlMs, null)
    assert.isAtLeast(Date.parse(recovered.lastUpdatedAt), Date.parse(recovered.createdAt))
    assert.strictEqual(runs, 1)
    const denied = yield* second.request("tasks/get", { taskId: created.taskId }, "bob")
    const error = yield* Schema.decodeUnknownEffect(Schema.Struct({ error: McpSchema.McpErrorBase }))(denied)
    assert.strictEqual(error.error.code, -32602)
  }))

it.effect("should preserve original request metadata and completed Activities when a SQL task replays on a reconstructed runner", () =>
  Effect.gen(function*() {
    const db = yield* database
    let checkpoints = 0
    const handler = Effect.gen(function*() {
      const before = yield* McpSchema.McpRequestContext.useSync((context) => context.requestMetadata?.tenant)
      yield* Activity.make({
        name: "build-report",
        execute: Effect.sync(() => {
          checkpoints++
        })
      })
      yield* DurableDeferred.await(resume)
      const after = yield* McpSchema.McpRequestContext.useSync((context) => context.requestMetadata?.tenant)
      return `${before}:${after}`
    })
    const first = yield* open(db.first, handler)
    const created = yield* first.start
    yield* first.get(created.taskId)
    assert.strictEqual(checkpoints, 1)
    yield* first.close
    const second = yield* open(db.second, handler)
    assert.strictEqual((yield* second.get(created.taskId)).status, "working")
    yield* second.release(created.taskId)
    const completed = yield* second.waitFor(created.taskId, "completed")
    if (completed.status === "completed") {
      assert.strictEqual(completed.result.structuredContent, "acme:acme")
    }
    assert.strictEqual(checkpoints, 1)
    assert.strictEqual(completed.createdAt, created.createdAt)
  }))

it.effect("should retain the engine outcome when an acknowledged cancellation is followed by runner reconstruction", () =>
  Effect.gen(function*() {
    const db = yield* database
    const handler = DurableDeferred.await(resume).pipe(Effect.as("unused"))
    const first = yield* open(db.first, handler)
    const created = yield* first.start
    yield* first.get(created.taskId)
    const response = yield* first.request("tasks/cancel", { taskId: created.taskId })
    yield* Schema.decodeUnknownEffect(Schema.Struct({ result: TaskWire.TaskAcknowledgement }))(response)
    assert.strictEqual(first.cancellations(), 1)
    assert.strictEqual((yield* first.get(created.taskId)).status, "working")
    yield* first.release(created.taskId)
    const terminal = yield* first.waitFor(created.taskId, ["completed", "cancelled"])
    yield* first.close
    const second = yield* open(db.second, handler)
    assert.deepStrictEqual(yield* second.get(created.taskId), terminal)
  }))
