import { assert, it } from "@effect/vitest"
import * as TaskWire from "effect/ai/internal/mcpSchema/v2026_07_28"
import * as McpProtocol from "effect/ai/McpProtocol"
import * as McpSchema from "effect/ai/McpSchema"
import * as McpServer from "effect/ai/McpServer"
import * as McpTasks from "effect/ai/McpTasks"
import * as Tool from "effect/ai/Tool"
import * as Toolkit from "effect/ai/Toolkit"
import * as Context from "effect/Context"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import * as SchemaGetter from "effect/SchemaGetter"
import * as Activity from "effect/workflow/Activity"
import * as DurableDeferred from "effect/workflow/DurableDeferred"
import * as WorkflowEngine from "effect/workflow/WorkflowEngine"
import { initializeHttpSession, makeHttpHarness } from "./TestUtils/McpHttpHarness.ts"
import { readMcpHttpResponse } from "./TestUtils/McpHttpResponse.ts"
import { makeServerLayer } from "./TestUtils/McpServerLayer.ts"

const metadata = {
  "io.modelcontextprotocol/protocolVersion": "2026-07-28",
  "io.modelcontextprotocol/clientCapabilities": { extensions: { "io.modelcontextprotocol/tasks": {} } },
  "io.modelcontextprotocol/clientInfo": { name: "TaskClient", version: "1" }
}
const headers = (method: string, name?: string): HeadersInit => ({
  "MCP-Protocol-Version": "2026-07-28",
  "Mcp-Method": method,
  ...(name === undefined ? {} : { "Mcp-Name": name })
})
const request = (method: string, params: Record<string, unknown>, client = "TaskClient", tasks = true) => ({
  jsonrpc: "2.0",
  id: 1,
  method,
  params: {
    ...params,
    _meta: {
      ...metadata,
      tenant: method === "tools/call" ? "acme" : "polling-client",
      "io.modelcontextprotocol/clientInfo": { name: client, version: "1" },
      "io.modelcontextprotocol/clientCapabilities": tasks ? metadata["io.modelcontextprotocol/clientCapabilities"] : {}
    }
  }
})
type Harness = Effect.Success<ReturnType<typeof makeHttpHarness>>
const post = (harness: Harness, method: string, params: Record<string, unknown>, client?: string, tasks?: boolean) =>
  harness.post(request(method, params, client, tasks), headers(method, String(params.taskId ?? params.name ?? "")))
    .pipe(
      Effect.flatMap(readMcpHttpResponse)
    )
const create = (harness: Harness, name = "report", args = {}, client?: string) =>
  post(harness, "tools/call", { name, arguments: args }, client).pipe(
    Effect.flatMap(Schema.decodeUnknownEffect(Schema.Struct({ result: TaskWire.CreateTaskResult }))),
    Effect.map(({ result }) => result)
  )
const get = (harness: Harness, taskId: string) =>
  post(harness, "tasks/get", { taskId }).pipe(
    Effect.flatMap(Schema.decodeUnknownEffect(Schema.Struct({ result: TaskWire.GetTaskResult }))),
    Effect.map(({ result }) => result)
  )
const terminal = Effect.fnUntraced(function*(harness: Harness, taskId: string) {
  for (let attempt = 0; attempt < 200; attempt++) {
    const task = yield* get(harness, taskId)
    if (task.status !== "working") return task
    yield* Effect.yieldNow
  }
  return assert.fail("Task did not finish")
})
const serverLayer = makeServerLayer({
  name: "Tasks",
  protocols: [
    McpProtocol.v2026_07_28,
    McpProtocol.v2025_11_25,
    McpProtocol.v2025_06_18,
    McpProtocol.v2025_03_26,
    McpProtocol.v2024_11_05
  ]
})
const Reports = Toolkit.make(Tool.make("report", { parameters: Tool.EmptyParams, success: Schema.String }))
const server = McpTasks.toolkit(Reports, { report: () => Effect.succeed("finished") }, {
  name: "reports",
  owner: "shared"
}).pipe(Layer.provide(WorkflowEngine.layerMemory), Layer.provideMerge(serverLayer))
const decodeError = Schema.decodeUnknownEffect(Schema.Struct({ error: McpSchema.McpError }))

it.effect("should advertise Tasks support when a task toolkit is registered", () =>
  Effect.gen(function*() {
    const harness = yield* makeHttpHarness(server)
    const body = yield* post(harness, "server/discover", {})
    const { result } = yield* Schema.decodeUnknownEffect(Schema.Struct({
      result: Schema.Struct({
        capabilities: Schema.Struct({ extensions: Schema.Record(Schema.String, Schema.JsonObject) })
      })
    }))(body)
    assert.deepStrictEqual(result.capabilities.extensions["io.modelcontextprotocol/tasks"], {})
  }))

it.effect("should return stable task fields and the result when a Workflow completes", () =>
  Effect.gen(function*() {
    const harness = yield* makeHttpHarness(server)
    const created = yield* create(harness)
    assert.strictEqual(created.ttlMs, null)
    assert.isUndefined(created.pollIntervalMs)
    const task = yield* terminal(harness, created.taskId)
    assert.strictEqual(task.status, "completed")
    if (task.status !== "completed") return
    assert.strictEqual(task.result.structuredContent, "finished")
    assert.strictEqual(task.createdAt, created.createdAt)
    assert.deepStrictEqual(yield* get(harness, created.taskId), task)
  }))

for (
  const protocol of [McpProtocol.v2025_11_25, McpProtocol.v2025_06_18, McpProtocol.v2025_03_26, McpProtocol.v2024_11_05]
) {
  it.effect(`should hide task tools when a ${protocol.protocolVersion} client lists tools`, () =>
    Effect.gen(function*() {
      const harness = yield* makeHttpHarness(server)
      const legacyHeaders = yield* initializeHttpSession(harness, protocol)
      const response = yield* harness.post({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }, legacyHeaders)
      const { result } = yield* Schema.decodeUnknownEffect(Schema.Struct({
        result: Schema.Struct({ tools: Schema.Array(Schema.Struct({ name: Schema.String })) })
      }))(yield* readMcpHttpResponse(response))
      assert.deepStrictEqual(result.tools, [])
    }))
}

it.effect("should reject missing capability before starting work when the client does not support Tasks", () =>
  Effect.gen(function*() {
    let runs = 0
    const layer = McpTasks.toolkit(Reports, {
      report: () =>
        Effect.sync(() => {
          runs++
          return "done"
        })
    }, {
      name: "capability",
      owner: "shared"
    }).pipe(Layer.provide(WorkflowEngine.layerMemory), Layer.provideMerge(serverLayer))
    const harness = yield* makeHttpHarness(layer)
    const { error } = yield* decodeError(
      yield* post(harness, "tools/call", { name: "report", arguments: {} }, undefined, false)
    )
    assert.strictEqual(error.code, -32021)
    assert.strictEqual(runs, 0)
  }))

for (const defect of [false, true]) {
  it.effect(`should ${defect ? "sanitize the failure" : "return a completed tool error"} when a handler ${defect ? "dies" : "returns its declared failure"}`, () =>
    Effect.gen(function*() {
      const tools = Toolkit.make(Tool.make("report", { success: Schema.String, failure: Schema.String }))
      const layer = McpTasks.toolkit(tools, {
        report: () => defect ? Effect.die("secret-token") : Effect.fail("declined")
      }, {
        name: "errors",
        owner: "shared"
      }).pipe(Layer.provide(WorkflowEngine.layerMemory), Layer.provideMerge(serverLayer))
      const harness = yield* makeHttpHarness(layer)
      const task = yield* terminal(harness, (yield* create(harness)).taskId)
      if (defect) {
        assert.strictEqual(task.status, "completed")
        if (task.status === "completed") assert.strictEqual(task.result.isError, true)
        assert.strictEqual(JSON.stringify(task).includes("secret-token"), false)
      } else {
        assert.strictEqual(task.status, "completed")
        if (task.status === "completed") {
          assert.strictEqual(task.result.isError, true)
          assert.deepStrictEqual(task.result.content, [{ type: "text", text: JSON.stringify("declined") }])
        }
      }
    }))
}

it.effect("should reject excess parameters when the tool declares strict input", () =>
  Effect.gen(function*() {
    let runs = 0
    const tools = Toolkit.make(
      Tool.make("report", { parameters: Schema.Struct({ value: Schema.String }), success: Schema.String }).annotate(
        Tool.Strict,
        true
      )
    )
    const layer = McpTasks.toolkit(tools, {
      report: ({ value }) =>
        Effect.sync(() => {
          runs++
          return value
        })
    }, {
      name: "strict",
      owner: "shared"
    }).pipe(Layer.provide(WorkflowEngine.layerMemory), Layer.provideMerge(serverLayer))
    const harness = yield* makeHttpHarness(layer)
    const task = yield* terminal(harness, (yield* create(harness, "report", { value: "ok", extra: true })).taskId)
    assert.strictEqual(task.status, "failed")
    if (task.status === "failed") assert.strictEqual(task.error.code, -32602)
    assert.strictEqual(runs, 0)
  }))

it.effect("should decode transformed parameters and provide handler services when execution enters Workflow", () =>
  Effect.gen(function*() {
    class Prefix extends Context.Service<Prefix, string>()("test/TaskPrefix") {}
    const tools = Toolkit.make(
      Tool.make("report", {
        parameters: Schema.Struct({
          value: Schema.String.pipe(Schema.decodeTo(Schema.Number, {
            decode: SchemaGetter.transformEffect((value) =>
              Prefix.use((prefix) =>
                Effect.sync(() => {
                  assert.strictEqual(prefix, "captured")
                  return Number(value)
                })
              )
            ),
            encode: SchemaGetter.transform(String)
          }))
        }),
        success: Schema.String
      })
    )
    const layer = McpTasks.toolkit(tools, {
      report: Effect.fnUntraced(function*({ value }) {
        const prefix = yield* Prefix
        const context = yield* McpSchema.McpRequestContext
        return `${prefix}:${context.clientInfo?.name}:${value + 1}`
      })
    }, { name: "transformed", owner: "shared" }).pipe(
      Layer.provide(Layer.succeed(Prefix, "captured")),
      Layer.provide(WorkflowEngine.layerMemory),
      Layer.provideMerge(serverLayer)
    )
    const harness = yield* makeHttpHarness(layer)
    const task = yield* terminal(harness, (yield* create(harness, "report", { value: "12" })).taskId)
    assert.strictEqual(task.status, "completed")
    if (task.status === "completed") assert.strictEqual(task.result.structuredContent, "captured:TaskClient:13")
  }))

it.effect("should keep ordinary tools inline when task and ordinary toolkits share a server", () =>
  Effect.gen(function*() {
    const ordinary = Toolkit.make(Tool.make("inline", { success: Schema.String }))
    const inlineLayer = McpServer.toolkit(ordinary).pipe(
      Layer.provide(ordinary.toLayer({ inline: () => Effect.succeed("inline-result") }))
    )
    const layer = Layer.mergeAll(
      inlineLayer,
      McpTasks.toolkit(Reports, { report: () => Effect.succeed("task-result") }, {
        name: "coexistence",
        owner: "shared"
      }).pipe(Layer.provide(WorkflowEngine.layerMemory))
    ).pipe(Layer.provideMerge(serverLayer))
    const harness = yield* makeHttpHarness(layer)
    const body = yield* post(harness, "tools/call", { name: "inline", arguments: {} }, undefined, false)
    const { result } = yield* Schema.decodeUnknownEffect(Schema.Struct({ result: TaskWire.CallToolResult }))(body)
    assert.strictEqual(result.resultType, "complete")
    assert.strictEqual(result.structuredContent, "inline-result")
    assert.strictEqual((yield* terminal(harness, (yield* create(harness)).taskId)).status, "completed")
  }))

it.effect("should conceal other owners and malformed handles when task methods are called", () =>
  Effect.gen(function*() {
    const layer = McpTasks.toolkit(Reports, { report: () => Effect.succeed("private") }, {
      name: "private",
      owner: McpSchema.McpRequestContext.useSync((context) => context.clientInfo?.name ?? "anonymous")
    }).pipe(Layer.provide(WorkflowEngine.layerMemory), Layer.provideMerge(serverLayer))
    const harness = yield* makeHttpHarness(layer)
    const task = yield* create(harness)
    const parsed = DurableDeferred.TokenParsed.fromString(task.taskId)
    const unknownIds = [
      "malformed",
      new DurableDeferred.TokenParsed({ ...parsed, workflowName: "unknown" }).asToken,
      new DurableDeferred.TokenParsed({ ...parsed, executionId: "unknown" }).asToken,
      new DurableDeferred.TokenParsed({ ...parsed, deferredName: "mcp/task/finishedAt" }).asToken
    ]
    for (const method of ["tasks/get", "tasks/update", "tasks/cancel"]) {
      for (const [taskId, client] of [[task.taskId, "OtherClient"], ...unknownIds.map((id) => [id, "TaskClient"])]) {
        const { error } = yield* decodeError(
          yield* post(harness, method, {
            taskId,
            ...(method === "tasks/update" ? { inputResponses: {} } : {})
          }, client)
        )
        assert.strictEqual(error.code, -32602)
      }
    }
    assert.strictEqual((yield* terminal(harness, task.taskId)).status, "completed")
  }))

it.effect("should ignore nonoutstanding responses when a known task is updated", () =>
  Effect.gen(function*() {
    const harness = yield* makeHttpHarness(server)
    const task = yield* create(harness)
    const body = yield* post(harness, "tasks/update", {
      taskId: task.taskId,
      inputResponses: { unknown: { roots: [] } }
    })
    yield* Schema.decodeUnknownEffect(Schema.Struct({ result: TaskWire.TaskAcknowledgement }))(body)
    assert.strictEqual((yield* terminal(harness, task.taskId)).status, "completed")
  }))

it.effect("should acknowledge cancellation when an active task receives cancellation intent", () =>
  Effect.gen(function*() {
    const started = yield* Deferred.make<void>()
    const layer = McpTasks.toolkit(Reports, {
      report: () => Deferred.succeed(started, undefined).pipe(Effect.andThen(Effect.never))
    }, {
      name: "cancel",
      owner: "shared"
    }).pipe(Layer.provide(WorkflowEngine.layerMemory), Layer.provideMerge(serverLayer))
    const harness = yield* makeHttpHarness(layer)
    const task = yield* create(harness)
    yield* Deferred.await(started)
    const body = yield* post(harness, "tasks/cancel", { taskId: task.taskId })
    yield* Schema.decodeUnknownEffect(Schema.Struct({ result: TaskWire.TaskAcknowledgement }))(body)
  }))

it.effect("should execute Activities with the Workflow context when a task handler checkpoints work", () =>
  Effect.gen(function*() {
    const layer = McpTasks.toolkit(Reports, {
      report: () => Activity.make({ name: "draft", success: Schema.String, execute: Effect.succeed("checkpointed") })
    }, { name: "activities", owner: "shared" }).pipe(
      Layer.provide(WorkflowEngine.layerMemory),
      Layer.provideMerge(serverLayer)
    )
    const harness = yield* makeHttpHarness(layer)
    const task = yield* terminal(harness, (yield* create(harness)).taskId)
    assert.strictEqual(task.status, "completed")
    if (task.status === "completed") assert.strictEqual(task.result.structuredContent, "checkpointed")
  }))

for (const method of ["tasks/get", "tasks/update", "tasks/cancel"]) {
  it.effect(`should require Tasks capability when ${method} is called without support`, () =>
    Effect.gen(function*() {
      const harness = yield* makeHttpHarness(server)
      const { error } = yield* decodeError(
        yield* post(
          harness,
          method,
          {
            taskId: "unknown",
            ...(method === "tasks/update" ? { inputResponses: {} } : {})
          },
          undefined,
          false
        )
      )
      assert.strictEqual(error.code, -32021)
    }))
}

it.effect("should return an error without starting work when Workflow rejects task creation", () =>
  Effect.gen(function*() {
    let runs = 0
    const rejectingEngine = Layer.effect(
      WorkflowEngine.WorkflowEngine,
      Effect.gen(function*() {
        const engine = yield* WorkflowEngine.WorkflowEngine
        return { ...engine, execute: () => Effect.die("unavailable-engine") }
      })
    ).pipe(Layer.provide(WorkflowEngine.layerMemory))
    const layer = McpTasks.toolkit(Reports, {
      report: () =>
        Effect.sync(() => {
          runs++
          return "unexpected"
        })
    }, {
      name: "rejected",
      owner: "shared"
    }).pipe(Layer.provide(rejectingEngine), Layer.provideMerge(serverLayer))
    const harness = yield* makeHttpHarness(layer)
    const { error } = yield* decodeError(yield* post(harness, "tools/call", { name: "report", arguments: {} }))
    assert.strictEqual(error.code, -32603)
    assert.strictEqual(JSON.stringify(error).includes("unavailable-engine"), false)
    assert.strictEqual(runs, 0)
  }))

for (const checkpoints of [0, 100]) {
  it.effect(`should use two active and three completed lookups when a task has ${checkpoints} Activity checkpoints`, () =>
    Effect.gen(function*() {
      let reads = 0
      const ready = yield* Deferred.make<void>()
      const finish = yield* Deferred.make<void>()
      const countedEngine = Layer.effect(
        WorkflowEngine.WorkflowEngine,
        Effect.gen(function*() {
          const engine = yield* WorkflowEngine.WorkflowEngine
          return {
            ...engine,
            deferredResult: (deferred) =>
              Effect.suspend(() => {
                reads++
                return engine.deferredResult(deferred)
              }),
            poll: (workflow, executionId) =>
              Effect.suspend(() => {
                reads++
                return engine.poll(workflow, executionId)
              })
          } satisfies WorkflowEngine.WorkflowEngine["Service"]
        })
      ).pipe(Layer.provide(WorkflowEngine.layerMemory))
      const layer = McpTasks.toolkit(Reports, {
        report: Effect.fnUntraced(function*() {
          for (let index = 0; index < checkpoints; index++) {
            yield* Activity.make({ name: `checkpoint-${index}`, success: Schema.Void, execute: Effect.void })
          }
          yield* Deferred.succeed(ready, undefined)
          yield* Deferred.await(finish)
          return "finished"
        })
      }, { name: "polling", owner: "shared" }).pipe(Layer.provide(countedEngine), Layer.provideMerge(serverLayer))
      const harness = yield* makeHttpHarness(layer)
      const task = yield* create(harness)
      yield* Deferred.await(ready)
      reads = 0
      assert.strictEqual((yield* get(harness, task.taskId)).status, "working")
      assert.strictEqual(reads, 2)
      yield* Deferred.succeed(finish, undefined)
      yield* terminal(harness, task.taskId)
      reads = 0
      assert.strictEqual((yield* get(harness, task.taskId)).status, "completed")
      assert.strictEqual(reads, 3)
    }))
}

it.effect("should preserve original request metadata for schemas and handlers when a task first executes", () =>
  Effect.gen(function*() {
    const tools = Toolkit.make(Tool.make("report", {
      parameters: Schema.Struct({
        value: Schema.String.pipe(Schema.decodeTo(Schema.String, {
          decode: SchemaGetter.transformEffect((value) =>
            McpSchema.McpRequestContext.useSync((context) => `${context.requestMetadata?.tenant}:${value}`)
          ),
          encode: SchemaGetter.transform((value) => value)
        }))
      }),
      success: Schema.String
    }))
    const layer = McpTasks.toolkit(tools, {
      report: ({ value }) =>
        McpSchema.McpRequestContext.useSync((context) => `${value}:${context.requestMetadata?.tenant}`)
    }, { name: "request-metadata", owner: "shared" }).pipe(
      Layer.provide(WorkflowEngine.layerMemory),
      Layer.provideMerge(serverLayer)
    )
    const harness = yield* makeHttpHarness(layer)
    const completed = yield* terminal(harness, (yield* create(harness, "report", { value: "report" })).taskId)
    assert.strictEqual(completed.status, "completed")
    if (completed.status === "completed") assert.strictEqual(completed.result.structuredContent, "acme:report:acme")
  }))
