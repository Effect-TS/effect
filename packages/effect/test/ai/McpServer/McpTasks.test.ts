import { assert, it } from "@effect/vitest"
import * as TaskWire from "effect/ai/internal/mcpSchema/v2026_07_28"
import * as McpProtocol from "effect/ai/McpProtocol"
import * as McpSchema from "effect/ai/McpSchema"
import * as McpServer from "effect/ai/McpServer"
import * as McpTasks from "effect/ai/McpTasks"
import * as Tool from "effect/ai/Tool"
import * as Toolkit from "effect/ai/Toolkit"
import * as Context from "effect/Context"
import * as DateTime from "effect/DateTime"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Base64Url from "effect/encoding/Base64Url"
import * as Exit from "effect/Exit"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import * as SchemaGetter from "effect/SchemaGetter"
import * as Scope from "effect/Scope"
import * as Activity from "effect/workflow/Activity"
import * as DurableDeferred from "effect/workflow/DurableDeferred"
import * as WorkflowEngine from "effect/workflow/WorkflowEngine"
import { externalReports, type ReportJob, ReportJobs } from "./TestUtils/McpExternalJobs.ts"
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
const request = (
  method: string,
  params: Record<string, unknown>,
  client = "TaskClient",
  tasks = true,
  clientCapabilities?: McpSchema.ClientCapabilities
) => ({
  jsonrpc: "2.0",
  id: 1,
  method,
  params: {
    ...params,
    _meta: {
      ...metadata,
      tenant: method === "tools/call" ? "acme" : "polling-client",
      "io.modelcontextprotocol/clientInfo": { name: client, version: "1" },
      "io.modelcontextprotocol/clientCapabilities": tasks
        ? clientCapabilities ?? metadata["io.modelcontextprotocol/clientCapabilities"]
        : {}
    }
  }
})
type Harness = Effect.Success<ReturnType<typeof makeHttpHarness>>
const post = (
  harness: Harness,
  method: string,
  params: Record<string, unknown>,
  client?: string,
  tasks?: boolean,
  capabilities?: McpSchema.ClientCapabilities
) =>
  harness.post(
    request(method, params, client, tasks, capabilities),
    headers(method, String(params.taskId ?? params.name ?? ""))
  )
    .pipe(
      Effect.flatMap(readMcpHttpResponse)
    )
const create = (harness: Harness, name = "report", args = {}, client?: string) =>
  post(harness, "tools/call", { name, arguments: args }, client).pipe(
    Effect.flatMap(Schema.decodeUnknownEffect(Schema.Struct({ result: TaskWire.CreateTaskResult }))),
    Effect.map(({ result }) => result)
  )
const get = (harness: Harness, taskId: string, capabilities?: McpSchema.ClientCapabilities) =>
  post(harness, "tasks/get", { taskId }, undefined, undefined, capabilities).pipe(
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
const server = McpTasks.toolkit(Reports, { owner: "shared" }).pipe(
  Layer.provide(McpTasks.layerWorkflow(Reports, { report: () => Effect.succeed("finished") }, { name: "reports" }))
).pipe(Layer.provide(WorkflowEngine.layerMemory), Layer.provideMerge(serverLayer))
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
    const layer = McpTasks.toolkit(Reports, { owner: "shared" }).pipe(Layer.provide(McpTasks.layerWorkflow(Reports, {
      report: () =>
        Effect.sync(() => {
          runs++
          return "done"
        })
    }, { name: "capability" }))).pipe(Layer.provide(WorkflowEngine.layerMemory), Layer.provideMerge(serverLayer))
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
      const layer = McpTasks.toolkit(tools, { owner: "shared" }).pipe(Layer.provide(McpTasks.layerWorkflow(tools, {
        report: () => defect ? Effect.die("secret-token") : Effect.fail("declined")
      }, { name: "errors" }))).pipe(Layer.provide(WorkflowEngine.layerMemory), Layer.provideMerge(serverLayer))
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
    const layer = McpTasks.toolkit(tools, { owner: "shared" }).pipe(Layer.provide(McpTasks.layerWorkflow(tools, {
      report: ({ value }) =>
        Effect.sync(() => {
          runs++
          return value
        })
    }, { name: "strict" }))).pipe(Layer.provide(WorkflowEngine.layerMemory), Layer.provideMerge(serverLayer))
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
    const layer = McpTasks.toolkit(tools, { owner: "shared" }).pipe(Layer.provide(McpTasks.layerWorkflow(tools, {
      report: Effect.fnUntraced(function*({ value }) {
        const prefix = yield* Prefix
        const context = yield* McpSchema.McpRequestContext
        return `${prefix}:${context.clientInfo?.name}:${value + 1}`
      })
    }, { name: "transformed" }))).pipe(
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
      McpTasks.toolkit(Reports, { owner: "shared" }).pipe(
        Layer.provide(McpTasks.layerWorkflow(Reports, {
          report: () => Effect.succeed("task-result")
        }, { name: "coexistence" }))
      ).pipe(Layer.provide(WorkflowEngine.layerMemory))
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
    const layer = McpTasks.toolkit(Reports, {
      owner: McpSchema.McpRequestContext.useSync((context) => context.clientInfo?.name ?? "anonymous")
    }).pipe(
      Layer.provide(McpTasks.layerWorkflow(Reports, { report: () => Effect.succeed("private") }, { name: "private" }))
    ).pipe(Layer.provide(WorkflowEngine.layerMemory), Layer.provideMerge(serverLayer))
    const harness = yield* makeHttpHarness(layer)
    const task = yield* create(harness)
    const parsed = DurableDeferred.TokenParsed.fromString(
      JSON.parse(Schema.decodeUnknownSync(Schema.StringFromBase64Url)(task.taskId))[1]
    )
    const unknownIds = [
      "malformed",
      Base64Url.encode(
        JSON.stringify(["report", new DurableDeferred.TokenParsed({ ...parsed, workflowName: "unknown" }).asToken])
      ),
      Base64Url.encode(
        JSON.stringify(["report", new DurableDeferred.TokenParsed({ ...parsed, executionId: "unknown" }).asToken])
      ),
      JSON.stringify([
        "report",
        new DurableDeferred.TokenParsed({ ...parsed, deferredName: "mcp/task/finishedAt" }).asToken
      ])
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
    const layer = McpTasks.toolkit(Reports, { owner: "shared" }).pipe(Layer.provide(McpTasks.layerWorkflow(Reports, {
      report: () => Deferred.succeed(started, undefined).pipe(Effect.andThen(Effect.never))
    }, { name: "cancel" }))).pipe(Layer.provide(WorkflowEngine.layerMemory), Layer.provideMerge(serverLayer))
    const harness = yield* makeHttpHarness(layer)
    const task = yield* create(harness)
    yield* Deferred.await(started)
    const body = yield* post(harness, "tasks/cancel", { taskId: task.taskId })
    yield* Schema.decodeUnknownEffect(Schema.Struct({ result: TaskWire.TaskAcknowledgement }))(body)
  }))

it.effect("should execute Activities with the Workflow context when a task handler checkpoints work", () =>
  Effect.gen(function*() {
    const layer = McpTasks.toolkit(Reports, { owner: "shared" }).pipe(Layer.provide(McpTasks.layerWorkflow(Reports, {
      report: () => Activity.make({ name: "draft", success: Schema.String, execute: Effect.succeed("checkpointed") })
    }, { name: "activities" }))).pipe(
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
    const layer = McpTasks.toolkit(Reports, { owner: "shared" }).pipe(Layer.provide(McpTasks.layerWorkflow(Reports, {
      report: () =>
        Effect.sync(() => {
          runs++
          return "unexpected"
        })
    }, { name: "rejected" }))).pipe(Layer.provide(rejectingEngine), Layer.provideMerge(serverLayer))
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
      const layer = McpTasks.toolkit(Reports, { owner: "shared" }).pipe(Layer.provide(McpTasks.layerWorkflow(Reports, {
        report: Effect.fnUntraced(function*() {
          for (let index = 0; index < checkpoints; index++) {
            yield* Activity.make({ name: `checkpoint-${index}`, success: Schema.Void, execute: Effect.void })
          }
          yield* Deferred.succeed(ready, undefined)
          yield* Deferred.await(finish)
          return "finished"
        })
      }, { name: "polling" }))).pipe(Layer.provide(countedEngine), Layer.provideMerge(serverLayer))
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
    const layer = McpTasks.toolkit(tools, { owner: "shared" }).pipe(Layer.provide(McpTasks.layerWorkflow(tools, {
      report: ({ value }) =>
        McpSchema.McpRequestContext.useSync((context) => `${value}:${context.requestMetadata?.tenant}`)
    }, { name: "request-metadata" }))).pipe(
      Layer.provide(WorkflowEngine.layerMemory),
      Layer.provideMerge(serverLayer)
    )
    const harness = yield* makeHttpHarness(layer)
    const completed = yield* terminal(harness, (yield* create(harness, "report", { value: "report" })).taskId)
    assert.strictEqual(completed.status, "completed")
    if (completed.status === "completed") assert.strictEqual(completed.result.structuredContent, "acme:report:acme")
  }))

it.effect("should complete an external job input round trip without a Workflow engine", () =>
  Effect.gen(function*() {
    const now = "2026-10-17T10:00:00.000Z"
    const jobsById = new Map<string, ReportJob>()
    const owned = (id: string, owner: string) =>
      Effect.suspend(() => {
        const job = jobsById.get(id)
        return job && owner === "TaskClient"
          ? Effect.succeed(job)
          : Effect.fail(new McpTasks.TaskError({ code: -32602, message: "Unknown taskId" }))
      })
    const jobs = Layer.succeed(ReportJobs, {
      submit: () =>
        Effect.sync(() => {
          const job: ReportJob = { id: crypto.randomUUID(), createdAt: now, updatedAt: now, state: "awaiting_roots" }
          jobsById.set(job.id, job)
          return job
        }),
      getOwned: owned,
      provideRoots: (id, owner, roots) =>
        owned(id, owner).pipe(Effect.andThen(Effect.sync(() => {
          const job = jobsById.get(id)!
          jobsById.set(id, { ...job, state: "done", report: `Report covers ${roots.length} roots` })
        }))),
      cancelOwned: (id, owner) =>
        owned(id, owner).pipe(Effect.andThen(Effect.sync(() => {
          const job = jobsById.get(id)!
          if (job.state === "awaiting_roots" || job.state === "queued") jobsById.set(id, { ...job, state: "cancelled" })
        })))
    })
    const layer = McpTasks.toolkit(Reports, {
      owner: McpSchema.McpRequestContext.useSync((context) => context.clientInfo?.name ?? "anonymous")
    }).pipe(Layer.provide(externalReports.pipe(Layer.provide(jobs))), Layer.provideMerge(serverLayer))
    const harness = yield* makeHttpHarness(layer)
    const capabilities = { ...metadata["io.modelcontextprotocol/clientCapabilities"], roots: {} }
    const created = yield* create(harness)
    assert.strictEqual(created.ttlMs, 60_000)
    assert.strictEqual(created.pollIntervalMs, 1000)
    const waiting = yield* get(harness, created.taskId, capabilities)
    assert.strictEqual(waiting.status, "input_required")
    if (waiting.status === "input_required") {
      assert.deepStrictEqual(waiting.inputRequests, { roots: { method: "roots/list" } })
    }
    for (const method of ["tasks/get", "tasks/update", "tasks/cancel"]) {
      const body = yield* post(harness, method, {
        taskId: created.taskId,
        ...(method === "tasks/update" ? { inputResponses: {} } : {})
      }, "OtherClient")
      assert.strictEqual((yield* decodeError(body)).error.code, -32602)
    }
    yield* post(harness, "tasks/update", { taskId: created.taskId, inputResponses: { unknown: { roots: [] } } })
    assert.strictEqual((yield* get(harness, created.taskId, capabilities)).status, "input_required")
    yield* post(harness, "tasks/update", {
      taskId: created.taskId,
      inputResponses: { roots: { roots: [{ uri: "file:///workspace" }] } }
    })
    const completed = yield* get(harness, created.taskId, capabilities)
    assert.strictEqual(completed.status, "completed")
    if (completed.status === "completed") {
      assert.deepStrictEqual(completed.result.content, [{ type: "text", text: "Report covers 1 roots" }])
    }
    yield* post(harness, "tasks/update", { taskId: created.taskId, inputResponses: { roots: { roots: [] } } })
    assert.deepStrictEqual(yield* get(harness, created.taskId, capabilities), completed)
    yield* post(harness, "tasks/cancel", { taskId: created.taskId })
    assert.deepStrictEqual(yield* get(harness, created.taskId, capabilities), completed)
    const second = yield* create(harness)
    yield* post(harness, "tasks/cancel", { taskId: second.taskId })
    assert.strictEqual((yield* get(harness, second.taskId, capabilities)).status, "cancelled")
  }))

it.effect("should run and cancel memory tasks using scoped fibers without a Workflow engine", () =>
  Effect.gen(function*() {
    const started = yield* Deferred.make<void>()
    const layer = McpTasks.toolkit(Reports, { owner: "shared" }).pipe(
      Layer.provide(McpTasks.layerMemory(Reports, {
        report: () => Deferred.succeed(started, undefined).pipe(Effect.andThen(Effect.never))
      })),
      Layer.provideMerge(serverLayer)
    )
    const harness = yield* makeHttpHarness(layer)
    const created = yield* create(harness)
    yield* Deferred.await(started)
    assert.strictEqual((yield* get(harness, created.taskId)).status, "working")
    yield* post(harness, "tasks/cancel", { taskId: created.taskId })
    assert.strictEqual((yield* terminal(harness, created.taskId)).status, "cancelled")
  }))

it.effect("should decode and encode memory task handlers with original request metadata", () =>
  Effect.gen(function*() {
    const tools = Toolkit.make(Tool.make("report", {
      parameters: Schema.Struct({ rows: Schema.NumberFromString }),
      success: Schema.String
    }))
    const layer = McpTasks.toolkit(tools, { owner: "shared" }).pipe(
      Layer.provide(McpTasks.layerMemory(tools, {
        report: ({ rows }) =>
          McpSchema.McpRequestContext.useSync((request) => `${request.requestMetadata?.tenant}:${rows + 1}`)
      })),
      Layer.provideMerge(serverLayer)
    )
    const harness = yield* makeHttpHarness(layer)
    const completed = yield* terminal(harness, (yield* create(harness, "report", { rows: "2" })).taskId)
    assert.strictEqual(completed.status, "completed")
    if (completed.status === "completed") assert.strictEqual(completed.result.structuredContent, "acme:3")
  }))

it.effect("should interrupt memory handlers and discard records when the execution layer closes", () =>
  Effect.gen(function*() {
    const scope = yield* Scope.make()
    const started = yield* Deferred.make<void>()
    const stopped = yield* Deferred.make<void>()
    const layer = McpTasks.layerMemory(Reports, {
      report: () =>
        Deferred.succeed(started, undefined).pipe(
          Effect.andThen(Effect.never),
          Effect.ensuring(Deferred.succeed(stopped, undefined))
        )
    })
    const context = yield* Layer.build(layer).pipe(Scope.provide(scope))
    const execution = Context.get(context, McpTasks.Execution)
    const created = yield* execution.create({
      toolName: "report",
      arguments: {},
      ownerId: "owner",
      requestContext: { clientId: 1, protocolVersion: "2026-07-28", clientCapabilities: {} }
    })
    yield* Deferred.await(started)
    const wrongOwner = yield* execution.get({ taskId: created.taskId, ownerId: "other" }).pipe(Effect.exit)
    assert.isTrue(Exit.isFailure(wrongOwner))
    yield* Scope.close(scope, Exit.void)
    yield* Deferred.await(stopped)
    const missing = yield* execution.get({ taskId: created.taskId, ownerId: "owner" }).pipe(Effect.exit)
    assert.isTrue(Exit.isFailure(missing))
  }))

it.effect("should route multiple toolkits to their independently provided execution layers", () =>
  Effect.gen(function*() {
    const Other = Toolkit.make(Tool.make("other", { parameters: Tool.EmptyParams, success: Schema.String }))
    const layer = Layer.mergeAll(
      McpTasks.toolkit(Reports, { owner: "shared" }).pipe(Layer.provide(McpTasks.layerMemory(Reports, {
        report: () => Effect.succeed("memory")
      }))),
      McpTasks.toolkit(Other, { owner: "shared" }).pipe(Layer.provide(
        McpTasks.layerWorkflow(Other, {
          other: () => Effect.succeed("workflow")
        }, { name: "other-workflow" }).pipe(Layer.provide(WorkflowEngine.layerMemory))
      ))
    ).pipe(Layer.provideMerge(serverLayer))
    const harness = yield* makeHttpHarness(layer)
    for (const [name, expected] of [["report", "memory"], ["other", "workflow"]]) {
      const task = yield* terminal(harness, (yield* create(harness, name)).taskId)
      assert.strictEqual(task.status, "completed")
      if (task.status === "completed") assert.strictEqual(task.result.structuredContent, expected)
    }
  }))

it.effect("should create a Workflow task when optional client information is absent", () =>
  Effect.gen(function*() {
    const harness = yield* makeHttpHarness(server)
    const body = yield* harness.post({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        name: "report",
        arguments: {},
        _meta: {
          "io.modelcontextprotocol/protocolVersion": "2026-07-28",
          "io.modelcontextprotocol/clientCapabilities": {
            extensions: { "io.modelcontextprotocol/tasks": {} }
          }
        }
      }
    }, headers("tools/call", "report")).pipe(Effect.flatMap(readMcpHttpResponse))
    const { result } = yield* Schema.decodeUnknownEffect(Schema.Struct({ result: TaskWire.CreateTaskResult }))(body)
    assert.strictEqual((yield* terminal(harness, result.taskId)).status, "completed")
  }))

it.effect("should construct the callback once and scope its execution layer across task calls", () =>
  Effect.gen(function*() {
    let callbacks = 0
    let acquired = 0
    let released = 0
    const scope = yield* Scope.make()
    const layer = McpTasks.toolkit(Reports, { owner: "shared" }, (tools) => {
      callbacks++
      assert.strictEqual(tools, Reports)
      return McpTasks.layerMemory(
        tools,
        Effect.acquireRelease(
          Effect.sync(() => {
            acquired++
            return { report: () => Effect.succeed("callback report") }
          }),
          () =>
            Effect.sync(() => {
              released++
            })
        )
      )
    }).pipe(Layer.provideMerge(serverLayer))
    assert.strictEqual(callbacks, 1)
    const harness = yield* makeHttpHarness(layer).pipe(Scope.provide(scope))
    for (let i = 0; i < 2; i++) {
      const completed = yield* terminal(harness, (yield* create(harness)).taskId)
      assert.strictEqual(completed.status, "completed")
      if (completed.status === "completed") assert.strictEqual(completed.result.structuredContent, "callback report")
    }
    assert.strictEqual(callbacks, 1)
    assert.strictEqual(acquired, 1)
    yield* Scope.close(scope, Exit.void)
    assert.strictEqual(released, 1)
  }))

it.effect("should call an inline replacement while retaining existing task handles", () =>
  Effect.gen(function*() {
    const release = yield* Deferred.make<void>()
    const registry = yield* Deferred.make<McpServer.McpServer["Service"]>()
    const layer = Layer.mergeAll(
      McpTasks.toolkit(Reports, {
        owner: McpSchema.McpRequestContext.useSync((request) => request.clientInfo?.name ?? "anonymous")
      }, (tools) =>
        McpTasks.layerMemory(tools, {
          report: () => Deferred.await(release).pipe(Effect.as("original task"))
        })),
      Layer.effectDiscard(McpServer.McpServer.use((server) => Deferred.succeed(registry, server)))
    ).pipe(Layer.provideMerge(serverLayer))
    const harness = yield* makeHttpHarness(layer)
    const first = yield* create(harness)
    const second = yield* create(harness)
    const server = yield* Deferred.await(registry)
    yield* server.addTool({
      tool: new McpSchema.Tool({
        name: "report",
        description: "inline replacement",
        inputSchema: { type: "object", properties: {} }
      }),
      annotations: Context.empty(),
      handle: () =>
        Effect.succeed(new McpSchema.CallToolResult({ content: [], structuredContent: "replacement result" }))
    })
    const listed = yield* Schema.decodeUnknownEffect(Schema.Struct({
      result: Schema.Struct({ tools: Schema.Array(Schema.Struct({ name: Schema.String, description: Schema.String })) })
    }))(yield* post(harness, "tools/list", {}))
    assert.deepStrictEqual(listed.result.tools, [{ name: "report", description: "inline replacement" }])
    for (const supportsTasks of [true, false]) {
      const called = yield* Schema.decodeUnknownEffect(Schema.Struct({ result: TaskWire.CallToolResult }))(
        yield* post(harness, "tools/call", { name: "report", arguments: {} }, undefined, supportsTasks)
      )
      assert.strictEqual(called.result.resultType, "complete")
      assert.strictEqual(called.result.structuredContent, "replacement result")
    }
    assert.strictEqual((yield* get(harness, first.taskId)).status, "working")
    for (const method of ["tasks/get", "tasks/update", "tasks/cancel"]) {
      const body = yield* post(harness, method, {
        taskId: first.taskId,
        ...(method === "tasks/update" ? { inputResponses: {} } : {})
      }, "OtherClient")
      assert.strictEqual((yield* decodeError(body)).error.code, -32602)
    }
    yield* post(harness, "tasks/update", { taskId: first.taskId, inputResponses: {} })
    yield* post(harness, "tasks/cancel", { taskId: second.taskId })
    assert.strictEqual((yield* terminal(harness, second.taskId)).status, "cancelled")
    yield* Deferred.succeed(release, undefined)
    const completed = yield* terminal(harness, first.taskId)
    assert.strictEqual(completed.status, "completed")
    if (completed.status === "completed") assert.strictEqual(completed.result.structuredContent, "original task")
  }))

for (
  const [capability, input] of [
    ["roots", { method: "roots/list" }],
    ["sampling", { method: "sampling/createMessage", params: { messages: [], maxTokens: 1 } }],
    ["elicitation", {
      method: "elicitation/create",
      params: { mode: "form", message: "Approve", requestedSchema: { type: "object", properties: {} } }
    }]
  ] satisfies ReadonlyArray<readonly [string, McpSchema.McpInputRequest]>
) {
  it.effect(`should reject task input when the polling client omits ${capability} support`, () =>
    Effect.gen(function*() {
      const createdAt = yield* DateTime.now
      const task: McpTasks.Task = {
        taskId: crypto.randomUUID(),
        createdAt,
        lastUpdatedAt: createdAt,
        ttlMs: null,
        status: "input_required",
        inputRequests: { request: input }
      }
      const execution = Layer.succeed(McpTasks.Execution, {
        create: () => Effect.succeed(task),
        get: () => Effect.succeed(task),
        update: () => Effect.void,
        cancel: () => Effect.void
      })
      const layer = McpTasks.toolkit(Reports, { owner: "shared" }, () => execution).pipe(
        Layer.provideMerge(serverLayer)
      )
      const harness = yield* makeHttpHarness(layer)
      const created = yield* create(harness)
      const supported = yield* get(harness, created.taskId, {
        ...metadata["io.modelcontextprotocol/clientCapabilities"],
        [capability]: {}
      })
      assert.strictEqual(supported.status, "input_required")
      const rejected = yield* decodeError(yield* post(harness, "tasks/get", { taskId: created.taskId }))
      assert.strictEqual(rejected.error.code, -32021)
      assert.deepStrictEqual(rejected.error.data, {
        requiredCapabilities: { [capability]: capability === "elicitation" ? { form: {} } : {} }
      })
    }))
}
