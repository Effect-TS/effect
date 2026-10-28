import { assert, describe, it } from "@effect/vitest"
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
import * as Fiber from "effect/Fiber"
import * as HttpServerRequest from "effect/http/HttpServerRequest"
import * as Layer from "effect/Layer"
import * as Schedule from "effect/Schedule"
import * as Schema from "effect/Schema"
import * as SchemaGetter from "effect/SchemaGetter"
import * as Scope from "effect/Scope"
import { TestClock } from "effect/testing"
import * as Activity from "effect/workflow/Activity"
import * as DurableClock from "effect/workflow/DurableClock"
import * as DurableDeferred from "effect/workflow/DurableDeferred"
import * as WorkflowEngine from "effect/workflow/WorkflowEngine"
import { externalReports, type ReportJob, ReportJobs } from "./TestUtils/McpExternalJobs.ts"
import { initializeHttpSession, makeHttpHarness } from "./TestUtils/McpHttpHarness.ts"
import { makeMcpSseReader, readMcpHttpResponse } from "./TestUtils/McpHttpResponse.ts"
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

for (const supported of [false, true]) {
  it.effect(`should ${supported ? "acknowledge" : "reject"} task subscriptions ${supported ? "with" : "without"} Tasks capability`, () =>
    Effect.gen(function*() {
      const harness = yield* makeHttpHarness(server)
      const response = yield* harness.post(
        request("subscriptions/listen", { notifications: { taskIds: ["example-task"] } }, undefined, supported),
        headers("subscriptions/listen")
      )
      let body: unknown
      if (response.headers.get("content-type")?.includes("text/event-stream")) {
        const subscription = makeMcpSseReader(response)
        yield* Effect.addFinalizer(() => subscription.cancel)
        body = yield* subscription.take()
      } else {
        body = yield* readMcpHttpResponse(response)
      }
      if (supported) {
        const acknowledgement = yield* Schema.decodeUnknownEffect(Schema.Struct({
          method: Schema.Literal("notifications/subscriptions/acknowledged"),
          params: Schema.Struct({ notifications: Schema.JsonObject })
        }))(body)
        assert.deepStrictEqual(acknowledgement.params.notifications, {})
      } else {
        const { error } = yield* decodeError(body)
        assert.strictEqual(error.code, TaskWire.MISSING_REQUIRED_CLIENT_CAPABILITY)
        assert.deepStrictEqual(error.data, {
          requiredCapabilities: { extensions: { "io.modelcontextprotocol/tasks": {} } }
        })
      }
    }))
}

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

it.effect("should enforce the current request's ownership when registration retains another owner", () =>
  Effect.gen(function*() {
    const layer = McpTasks.toolkit(Reports, {
      owner: HttpServerRequest.HttpServerRequest.useSync((request) => request.headers["x-test-owner"] ?? "anonymous")
    }, (tools) => McpTasks.layerMemory(tools, { report: () => Effect.succeed("private") })).pipe(
      Layer.provide(Layer.succeed(
        HttpServerRequest.HttpServerRequest,
        HttpServerRequest.fromWeb(new Request("http://registration", { headers: { "x-test-owner": "registration" } }))
      )),
      Layer.provideMerge(serverLayer)
    )
    const harness = yield* makeHttpHarness(layer)
    const ownedPost = (owner: string, method: string, params: Record<string, unknown>) =>
      harness.post(request(method, params), {
        ...headers(method, String(params.taskId ?? params.name ?? "")),
        "x-test-owner": owner
      }).pipe(Effect.flatMap(readMcpHttpResponse))
    const { result: task } = yield* Schema.decodeUnknownEffect(Schema.Struct({ result: TaskWire.CreateTaskResult }))(
      yield* ownedPost("alice", "tools/call", { name: "report", arguments: {} })
    )
    const own = yield* ownedPost("alice", "tasks/get", { taskId: task.taskId })
    yield* Schema.decodeUnknownEffect(Schema.Struct({ result: TaskWire.GetTaskResult }))(own)
    for (const method of ["tasks/get", "tasks/update", "tasks/cancel"]) {
      const { error } = yield* decodeError(
        yield* ownedPost("bob", method, {
          taskId: task.taskId,
          ...(method === "tasks/update" ? { inputResponses: {} } : {})
        })
      )
      assert.strictEqual(error.code, -32602)
    }
  }))

it.effect("should reject invalid handles when Workflow task methods are called", () =>
  Effect.gen(function*() {
    const harness = yield* makeHttpHarness(server)
    const task = yield* create(harness)
    const parsed = DurableDeferred.TokenParsed.fromString(
      JSON.parse(Schema.decodeUnknownSync(Schema.StringFromBase64Url)(task.taskId))[1]
    )
    // Construct adversarial handles here to exercise the Workflow adapter's token validation.
    const unknownIds = [
      "malformed",
      ...[
        { ...parsed, workflowName: "unknown" },
        { ...parsed, executionId: "unknown" },
        { ...parsed, deferredName: "mcp/task/finishedAt" }
      ].map((token) => Base64Url.encode(JSON.stringify(["report", new DurableDeferred.TokenParsed(token).asToken])))
    ]
    for (const method of ["tasks/get", "tasks/update", "tasks/cancel"]) {
      for (const taskId of unknownIds) {
        const { error } = yield* decodeError(
          yield* post(harness, method, {
            taskId,
            ...(method === "tasks/update" ? { inputResponses: {} } : {})
          })
        )
        assert.strictEqual(error.code, -32602)
      }
    }
    assert.strictEqual((yield* terminal(harness, task.taskId)).status, "completed")
  }))

it.effect("should acknowledge unrelated input when a known task is updated", () =>
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

it.effect("should keep polling cost independent of history when Activity checkpoints accumulate", () =>
  Effect.gen(function*() {
    const costs: Array<{ active: number; completed: number }> = []
    for (const checkpoints of [0, 100]) {
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
      const active = reads
      yield* Deferred.succeed(finish, undefined)
      yield* terminal(harness, task.taskId)
      reads = 0
      assert.strictEqual((yield* get(harness, task.taskId)).status, "completed")
      costs.push({ active, completed: reads })
    }
    assert.isAbove(costs[0]!.active, 0)
    assert.isAbove(costs[0]!.completed, 0)
    assert.deepStrictEqual(costs[1], costs[0])
  }))

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

const externalJobHarness = Effect.gen(function*() {
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
  return { harness, capabilities }
})

it.effect("should complete an external job when the client supplies requested input", () =>
  Effect.gen(function*() {
    const { harness, capabilities } = yield* externalJobHarness
    const created = yield* create(harness)
    assert.strictEqual(created.ttlMs, 60_000)
    assert.strictEqual(created.pollIntervalMs, 1000)
    const waiting = yield* get(harness, created.taskId, capabilities)
    assert.strictEqual(waiting.status, "input_required")
    if (waiting.status === "input_required") {
      assert.deepStrictEqual(waiting.inputRequests, { roots: { method: "roots/list" } })
    }
    yield* post(harness, "tasks/update", {
      taskId: created.taskId,
      inputResponses: { roots: { roots: [{ uri: "file:///workspace" }] } }
    })
    const completed = yield* get(harness, created.taskId, capabilities)
    assert.strictEqual(completed.status, "completed")
    if (completed.status === "completed") {
      assert.deepStrictEqual(completed.result.content, [{ type: "text", text: "Report covers 1 roots" }])
    }
  }))

it.effect("should retain outstanding input when an external job receives an unrelated response", () =>
  Effect.gen(function*() {
    const { harness, capabilities } = yield* externalJobHarness
    const created = yield* create(harness)
    const waiting = yield* get(harness, created.taskId, capabilities)
    const response = yield* post(harness, "tasks/update", {
      taskId: created.taskId,
      inputResponses: { unknown: { roots: [] } }
    })
    yield* Schema.decodeUnknownEffect(Schema.Struct({ result: TaskWire.TaskAcknowledgement }))(response)
    assert.deepStrictEqual(yield* get(harness, created.taskId, capabilities), waiting)
  }))

it.effect("should preserve a completed external job when an input response is repeated", () =>
  Effect.gen(function*() {
    const { harness, capabilities } = yield* externalJobHarness
    const created = yield* create(harness)
    const update = post(harness, "tasks/update", {
      taskId: created.taskId,
      inputResponses: { roots: { roots: [{ uri: "file:///workspace" }] } }
    })
    yield* update
    const completed = yield* get(harness, created.taskId, capabilities)
    assert.strictEqual(completed.status, "completed")
    const response = yield* update
    yield* Schema.decodeUnknownEffect(Schema.Struct({ result: TaskWire.TaskAcknowledgement }))(response)
    assert.deepStrictEqual(yield* get(harness, created.taskId, capabilities), completed)
  }))

it.effect("should cancel active memory tasks when cancellation is requested", () =>
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

for (const backend of ["memory", "workflow"] as const) {
  it.effect(`should use fresh request metadata without a stale transport when a ${backend} layer was built during a request`, () =>
    Effect.gen(function*() {
      class Prefix extends Context.Service<Prefix, string>()("test/TaskPrefix") {}
      const staleClient = McpSchema.McpServerClient.of({
        clientId: 100,
        protocolVersion: "2025-11-25",
        clientCapabilities: {},
        clientInfo: { name: "stale", version: "1" },
        initializePayload: {
          protocolVersion: "2025-11-25",
          capabilities: {},
          clientInfo: { name: "stale", version: "1" }
        },
        getClient: Effect.die("The task must not use the stale transport")
      })
      const tools = Toolkit.make(Tool.make("report", {
        parameters: Schema.Struct({ rows: Schema.NumberFromString }),
        success: Schema.String
      }))
      const handlers = {
        report: Effect.fnUntraced(function*({ rows }: { readonly rows: number }) {
          const prefix = yield* Prefix
          const request = yield* McpSchema.McpRequestContext
          assert.strictEqual((yield* Effect.serviceOption(McpSchema.McpServerClient))._tag, "None")
          return `${prefix}:${request.requestMetadata?.tenant}:${rows + 1}`
        })
      }
      const execution = backend === "memory"
        ? McpTasks.layerMemory(tools, handlers)
        : McpTasks.layerWorkflow(tools, handlers, { name: "fresh-request" }).pipe(
          Layer.provide(WorkflowEngine.layerMemory)
        )
      const layer = McpTasks.toolkit(tools, { owner: "shared" }).pipe(
        Layer.provide(execution.pipe(Layer.provide(Layer.succeed(McpSchema.McpServerClient, staleClient)))),
        Layer.provide(Layer.succeed(Prefix, backend)),
        Layer.provideMerge(serverLayer)
      )
      const harness = yield* makeHttpHarness(layer)
      const completed = yield* terminal(harness, (yield* create(harness, "report", { rows: "2" })).taskId)
      assert.strictEqual(completed.status, "completed")
      if (completed.status === "completed") assert.strictEqual(completed.result.structuredContent, `${backend}:acme:3`)
    }))
}

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
    yield* Scope.close(scope, Exit.void)
    yield* Deferred.await(stopped)
    const missing = yield* execution.get({ taskId: created.taskId, ownerId: "owner" }).pipe(Effect.flip)
    assert.instanceOf(missing, McpTasks.TaskError)
    assert.strictEqual(missing.code, -32602)
  }))

it.effect("should use each toolkit's execution layer when multiple toolkits are registered", () =>
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

it("should construct the execution layer once when the toolkit callback is supplied", () => {
  let callbacks = 0
  McpTasks.toolkit(Reports, { owner: "shared" }, (tools) => {
    callbacks++
    return McpTasks.layerMemory(tools, { report: () => Effect.succeed("report") })
  })
  assert.strictEqual(callbacks, 1)
})

it.effect("should share and release execution resources when multiple tasks use the callback layer", () =>
  Effect.gen(function*() {
    let acquired = 0
    let released = 0
    const scope = yield* Scope.make()
    const layer = McpTasks.toolkit(Reports, { owner: "shared" }, (tools) => {
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
    const harness = yield* makeHttpHarness(layer).pipe(Scope.provide(scope))
    for (let i = 0; i < 2; i++) {
      const completed = yield* terminal(harness, (yield* create(harness)).taskId)
      assert.strictEqual(completed.status, "completed")
      if (completed.status === "completed") assert.strictEqual(completed.result.structuredContent, "callback report")
    }
    assert.strictEqual(acquired, 1)
    yield* Scope.close(scope, Exit.void)
    assert.strictEqual(released, 1)
  }))

it.effect("should retain old task handles when an inline tool replaces a task tool", () =>
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

it.effect("should expose input and status and resume the handler when MCP task methods are called", () =>
  Effect.gen(function*() {
    const layer = McpTasks.toolkit(Reports, { owner: "shared" }, (tools) =>
      McpTasks.layerMemory(tools, {
        report: Effect.fnUntraced(function*() {
          const task = yield* McpTasks.TaskContext
          yield* task.setStatusMessage("choose-roots", "Choose workspace roots")
          const response = yield* task.requestInput({
            key: "roots",
            request: { method: "roots/list" },
            response: Schema.Struct({ roots: Schema.Array(Schema.Struct({ uri: Schema.String })) })
          })
          yield* task.setStatusMessage("ready", "Report ready")
          return `Report covers ${response.roots.length} roots`
        }, Effect.orDie)
      })).pipe(Layer.provideMerge(serverLayer))
    const harness = yield* makeHttpHarness(layer)
    const created = yield* create(harness)
    const capabilities = { ...metadata["io.modelcontextprotocol/clientCapabilities"], roots: {} }
    let waiting = yield* get(harness, created.taskId, capabilities)
    for (let attempt = 0; waiting.status === "working" && attempt < 100; attempt++) {
      yield* Effect.yieldNow
      waiting = yield* get(harness, created.taskId, capabilities)
    }
    assert.strictEqual(waiting.status, "input_required")
    assert.strictEqual(waiting.statusMessage, "Choose workspace roots")
    if (waiting.status === "input_required") {
      assert.deepStrictEqual(waiting.inputRequests, { roots: { method: "roots/list" } })
    }
    const acknowledgement = yield* post(
      harness,
      "tasks/update",
      {
        taskId: created.taskId,
        inputResponses: { roots: { roots: [{ uri: "file:///workspace" }] } }
      },
      undefined,
      undefined,
      capabilities
    )
    yield* Schema.decodeUnknownEffect(Schema.Struct({ result: TaskWire.TaskAcknowledgement }))(acknowledgement)
    const completed = yield* terminal(harness, created.taskId)
    assert.strictEqual(completed.status, "completed")
    assert.strictEqual(completed.statusMessage, "Report ready")
    if (completed.status === "completed") {
      assert.strictEqual(completed.result.structuredContent, "Report covers 1 roots")
    }
  }))

describe("layerMemory input and status", () => {
  const tools = Toolkit.make(Tool.make("report", { success: Schema.String }))
  const input = (key: string) => ({
    key,
    request: {
      method: "elicitation/create" as const,
      params: {
        mode: "form",
        message: `Enter ${key}`,
        requestedSchema: { type: "object", properties: { value: { type: "string" } }, required: ["value"] }
      }
    },
    response: Schema.Struct({
      action: Schema.Literal("accept"),
      content: Schema.Struct({ value: Schema.NumberFromString })
    })
  })
  const response = (value: string) => ({ action: "accept", content: { value } })
  const open = Effect.fnUntraced(function*(handler: Effect.Effect<string, Schema.SchemaError, McpTasks.TaskContext>) {
    const context = yield* Layer.build(McpTasks.layerMemory(tools, { report: () => Effect.orDie(handler) }))
    const execution = Context.get(context, McpTasks.Execution)
    const start = execution.create({
      toolName: "report",
      arguments: {},
      ownerId: "alice",
      requestContext: { clientId: 1, protocolVersion: "2026-07-28", clientCapabilities: {} }
    })
    const get = (taskId: string) => execution.get({ taskId, ownerId: "alice" })
    const waitFor = Effect.fnUntraced(function*(taskId: string, predicate: (task: McpTasks.Task) => boolean) {
      for (let attempt = 0; attempt < 100; attempt++) {
        const task = yield* get(taskId)
        if (predicate(task)) return task
        yield* Effect.yieldNow
      }
      return assert.fail("Task did not reach the expected state")
    })
    const update = (taskId: string, inputResponses: McpTasks.UpdateRequest["inputResponses"]) =>
      execution.update({ taskId, ownerId: "alice", inputResponses })
    return { execution, start, get, waitFor, update }
  })

  it.effect("should retain decoded answers and the latest status when successive input rounds complete", () =>
    Effect.gen(function*() {
      const harness = yield* open(Effect.gen(function*() {
        const task = yield* McpTasks.TaskContext
        yield* task.setStatusMessage("first", "Waiting for the first value")
        const first = yield* task.requestInput(input("first"))
        yield* task.setStatusMessage("second", "Waiting for the second value")
        const second = yield* task.requestInput(input("second"))
        yield* task.setStatusMessage("ready", "Report ready")
        return String(first.content.value + second.content.value)
      }))
      const created = yield* harness.start
      const waiting = yield* harness.waitFor(created.taskId, (task) => task.status === "input_required")
      assert.strictEqual(waiting.statusMessage, "Waiting for the first value")
      assert.strictEqual(waiting.status, "input_required")
      if (waiting.status !== "input_required") return
      assert.deepStrictEqual(waiting.inputRequests, { first: input("first").request })
      yield* TestClock.adjust(1000)
      yield* harness.update(created.taskId, { first: response("2") })
      const second = yield* harness.waitFor(
        created.taskId,
        (task) => task.status === "input_required" && "second" in task.inputRequests
      )
      assert.strictEqual(second.statusMessage, "Waiting for the second value")
      assert.notStrictEqual(second.lastUpdatedAt.epochMilliseconds, waiting.lastUpdatedAt.epochMilliseconds)
      yield* harness.update(created.taskId, { second: response("3") })
      const completed = yield* harness.waitFor(created.taskId, (task) => task.status === "completed")
      assert.strictEqual(completed.statusMessage, "Report ready")
      assert.deepStrictEqual(completed.createdAt, created.createdAt)
      assert.isFalse("inputRequests" in completed)
      if (completed.status === "completed") assert.strictEqual(completed.result.structuredContent, "5")
    }))

  it.effect("should let the handler request a replacement when the first response fails decoding", () =>
    Effect.gen(function*() {
      const harness = yield* open(Effect.gen(function*() {
        const task = yield* McpTasks.TaskContext
        const [value, other] = yield* Effect.all([
          task.requestInput(input("value")).pipe(
            Effect.catchTag("SchemaError", () => task.requestInput(input("replacement")))
          ),
          task.requestInput(input("other"))
        ], { concurrency: "unbounded" })
        return String(value.content.value + other.content.value)
      }))
      const created = yield* harness.start
      const waiting = yield* harness.waitFor(
        created.taskId,
        (task) => task.status === "input_required" && Object.keys(task.inputRequests).length === 2
      )
      const denied = yield* Effect.flip(harness.execution.update({
        taskId: created.taskId,
        ownerId: "bob",
        inputResponses: { value: response("1") }
      }))
      assert.strictEqual(denied.message, "Unknown taskId")
      yield* harness.update(created.taskId, { unknown: response("1") })
      assert.deepStrictEqual(yield* harness.get(created.taskId), waiting)
      yield* harness.update(created.taskId, {
        value: { action: "accept", content: { value: 42 } },
        other: response("2")
      })
      const replacement = yield* harness.waitFor(
        created.taskId,
        (task) => task.status === "input_required" && "replacement" in task.inputRequests
      )
      if (replacement.status !== "input_required") return assert.fail("Expected a replacement input")
      assert.deepStrictEqual(Object.keys(replacement.inputRequests), ["replacement"])
      yield* harness.update(created.taskId, { value: response("7") })
      assert.deepStrictEqual(yield* harness.get(created.taskId), replacement)
      yield* harness.update(created.taskId, { replacement: response("8") })
      const completed = yield* harness.waitFor(created.taskId, (task) => task.status === "completed")
      if (completed.status === "completed") assert.strictEqual(completed.result.structuredContent, "10")
    }))

  it.effect("should keep the first received reply when concurrent inputs are answered separately", () =>
    Effect.gen(function*() {
      const harness = yield* open(Effect.gen(function*() {
        const task = yield* McpTasks.TaskContext
        const results = yield* Effect.all([
          task.requestInput(input("left")),
          task.requestInput(input("right"))
        ], { concurrency: "unbounded" })
        return String(results[0].content.value + results[1].content.value)
      }))
      const created = yield* harness.start
      yield* harness.waitFor(
        created.taskId,
        (task) => task.status === "input_required" && Object.keys(task.inputRequests).length === 2
      )
      yield* harness.update(created.taskId, { left: response("2") })
      yield* harness.update(created.taskId, { left: response("999") })
      const partial = yield* harness.get(created.taskId)
      if (partial.status === "input_required") {
        assert.deepStrictEqual(Object.keys(partial.inputRequests), ["right"])
      } else assert.fail("The other input must remain outstanding")
      yield* harness.update(created.taskId, { right: response("3") })
      const completed = yield* harness.waitFor(created.taskId, (task) => task.status === "completed")
      if (completed.status === "completed") assert.strictEqual(completed.result.structuredContent, "5")
    }))

  it.effect("should reserve every batch response when decoding an answer submits another update", () =>
    Effect.gen(function*() {
      let updateRight: Effect.Effect<void> = Effect.die("The task has not been created")
      const leftResponse = Schema.Struct({ value: Schema.NumberFromString }).pipe(Schema.decodeTo(Schema.Number, {
        decode: SchemaGetter.transformEffect(({ value }) => updateRight.pipe(Effect.as(value))),
        encode: SchemaGetter.transform((value) => ({ value }))
      }))
      const harness = yield* open(Effect.gen(function*() {
        const task = yield* McpTasks.TaskContext
        const [left, right] = yield* Effect.all([
          task.requestInput({ ...input("left"), response: leftResponse }),
          task.requestInput(input("right"))
        ], { concurrency: "unbounded" })
        return String(left + right.content.value)
      }))
      const created = yield* harness.start
      yield* harness.waitFor(
        created.taskId,
        (task) => task.status === "input_required" && Object.keys(task.inputRequests).length === 2
      )
      updateRight = harness.update(created.taskId, { right: response("999") }).pipe(Effect.orDie)
      yield* harness.update(created.taskId, { left: { value: "2" }, right: response("3") })
      const completed = yield* harness.waitFor(created.taskId, (task) => task.status === "completed")
      if (completed.status === "completed") assert.strictEqual(completed.result.structuredContent, "5")
    }))

  it.effect("should leave other tasks runnable when an input-waiting task is cancelled", () =>
    Effect.gen(function*() {
      const harness = yield* open(
        McpTasks.TaskContext.use((task) => task.requestInput(input("value"))).pipe(
          Effect.map((result) => String(result.content.value))
        )
      )
      const first = yield* harness.start
      const second = yield* harness.start
      yield* harness.waitFor(first.taskId, (task) => task.status === "input_required")
      yield* harness.waitFor(second.taskId, (task) => task.status === "input_required")
      yield* harness.execution.cancel({ taskId: first.taskId, ownerId: "alice" })
      const cancelled = yield* harness.waitFor(first.taskId, (task) => task.status === "cancelled")
      assert.isFalse("inputRequests" in cancelled)
      yield* harness.update(first.taskId, { value: response("2") })
      assert.deepStrictEqual(yield* harness.get(first.taskId), cancelled)
      yield* harness.update(second.taskId, { value: response("4") })
      const completed = yield* harness.waitFor(second.taskId, (task) => task.status === "completed")
      if (completed.status === "completed") assert.strictEqual(completed.result.structuredContent, "4")
    }))

  it.effect("should remove abandoned input and clear status when the handler continues", () =>
    Effect.gen(function*() {
      const stop = yield* Deferred.make<void>()
      const finish = yield* Deferred.make<void>()
      const harness = yield* open(Effect.gen(function*() {
        const task = yield* McpTasks.TaskContext
        const waiting = yield* task.requestInput(input("abandoned")).pipe(Effect.forkChild)
        yield* Deferred.await(stop)
        yield* Fiber.interrupt(waiting)
        yield* task.setStatusMessage("working", "Still working")
        yield* Deferred.await(finish)
        yield* task.setStatusMessage("clear", undefined)
        return "done"
      }))
      const created = yield* harness.start
      yield* harness.waitFor(created.taskId, (task) => task.status === "input_required")
      yield* Deferred.succeed(stop, undefined)
      const working = yield* harness.waitFor(created.taskId, (task) =>
        task.status === "working" &&
        task.statusMessage === "Still working")
      assert.isFalse("inputRequests" in working)
      yield* harness.update(created.taskId, { abandoned: response("1") })
      assert.deepStrictEqual(yield* harness.get(created.taskId), working)
      yield* Deferred.succeed(finish, undefined)
      const completed = yield* harness.waitFor(created.taskId, (task) => task.status === "completed")
      assert.isUndefined(completed.statusMessage)
    }))

  for (const cancel of [false, true]) {
    it.effect(`should preserve ${cancel ? "cancellation" : "the first received response"} when the handler is still decoding`, () =>
      Effect.gen(function*() {
        const decoding = yield* Deferred.make<void>()
        const release = yield* Deferred.make<void>()
        class DecodeLabel extends Context.Service<DecodeLabel, string>()("test/TaskDecodeLabel") {}
        const value = Schema.String.pipe(Schema.decodeTo(Schema.String, {
          decode: SchemaGetter.transformEffect(Effect.fnUntraced(function*(value) {
            const label = yield* DecodeLabel
            if (value === "slow") {
              yield* Deferred.succeed(decoding, undefined)
              yield* Deferred.await(release)
            }
            return `${label}:${value}`
          })),
          encode: SchemaGetter.transform((value) => value)
        }))
        const harness = yield* open(
          McpTasks.TaskContext.use((task) =>
            task.requestInput({
              ...input("value"),
              response: Schema.Struct({ value })
            })
          ).pipe(Effect.provideService(DecodeLabel, "handler"), Effect.map((answer) => answer.value))
        )
        const created = yield* harness.start
        yield* harness.waitFor(created.taskId, (task) => task.status === "input_required")
        yield* harness.update(created.taskId, { value: { value: "slow" } })
        yield* Deferred.await(decoding)
        if (cancel) {
          yield* harness.execution.cancel({ taskId: created.taskId, ownerId: "alice" })
        } else {
          yield* harness.update(created.taskId, { value: { value: "fast" } })
        }
        if (cancel) yield* harness.waitFor(created.taskId, (task) => task.status === "cancelled")
        else assert.strictEqual((yield* harness.get(created.taskId)).status, "working")
        yield* Deferred.succeed(release, undefined)
        const terminal = yield* harness.waitFor(
          created.taskId,
          (task) => task.status === (cancel ? "cancelled" : "completed")
        )
        if (terminal.status === "completed") assert.strictEqual(terminal.result.structuredContent, "handler:slow")
      }))
  }
})

it.live("should settle a cancelled Workflow task that is waiting on a durable timer", () =>
  Effect.scoped(Effect.gen(function*() {
    const tools = Toolkit.make(Tool.make("wait", { success: Schema.String }))
    const context = yield* Layer.build(McpTasks.layerWorkflow(tools, {
      wait: () => DurableClock.sleep({ name: "wait", duration: "1 hour", inMemoryThreshold: 0 }).pipe(Effect.as("done"))
    }, { name: "cancel-timer" }))
    const execution = Context.get(context, McpTasks.Execution)
    const task = yield* execution.create({
      toolName: "wait",
      arguments: {},
      ownerId: "owner",
      requestContext: { clientId: 1, protocolVersion: "2026-07-28", clientCapabilities: {} }
    })
    yield* execution.cancel({ taskId: task.taskId, ownerId: "owner" })
    const cancelled = yield* execution.get({ taskId: task.taskId, ownerId: "owner" }).pipe(
      Effect.repeat({ while: (task) => task.status !== "cancelled", schedule: Schedule.spaced("1 millis") }),
      Effect.timeout("1 second")
    )
    assert.strictEqual(cancelled.status, "cancelled")
  })).pipe(Effect.provide(WorkflowEngine.layerMemory)))

it.live("should publish concurrent Workflow task inputs before either is answered", () =>
  Effect.scoped(Effect.gen(function*() {
    const tools = Toolkit.make(Tool.make("confirm", { success: Schema.String }))
    const context = yield* Layer.build(McpTasks.layerWorkflow(tools, {
      confirm: Effect.fnUntraced(function*() {
        const task = yield* McpTasks.TaskContext
        yield* Effect.forEach(["left", "right"], (key) =>
          task.requestInput({
            key,
            request: { method: "roots/list" },
            response: Schema.Struct({ roots: Schema.Array(Schema.String) })
          }), { concurrency: "unbounded" })
        return "done"
      }, Effect.orDie)
    }, { name: "parallel-input" }))
    const execution = Context.get(context, McpTasks.Execution)
    const created = yield* execution.create({
      toolName: "confirm",
      arguments: {},
      ownerId: "owner",
      requestContext: { clientId: 1, protocolVersion: "2026-07-28", clientCapabilities: {} }
    })
    const request = { taskId: created.taskId, ownerId: "owner" }
    const waiting = yield* execution.get(request).pipe(
      Effect.repeat({
        while: (task) => task.status !== "input_required" || Object.keys(task.inputRequests).length !== 2,
        schedule: Schedule.spaced("1 millis")
      }),
      Effect.timeout("1 second")
    )
    if (waiting.status !== "input_required") return assert.fail("Expected both inputs")
    assert.deepStrictEqual(Object.keys(waiting.inputRequests).sort(), ["left", "right"])
    yield* execution.update({ ...request, inputResponses: { left: { roots: [] } } })
    const partial = yield* execution.get(request)
    if (partial.status !== "input_required") return assert.fail("Expected the unanswered input")
    assert.deepStrictEqual(Object.keys(partial.inputRequests), ["right"])
    yield* execution.update({ ...request, inputResponses: { right: { roots: [] } } })
    const completed = yield* execution.get(request).pipe(
      Effect.repeat({ while: (task) => task.status !== "completed", schedule: Schedule.spaced("1 millis") }),
      Effect.timeout("1 second")
    )
    assert.strictEqual(completed.status, "completed")
  })).pipe(Effect.provide(WorkflowEngine.layerMemory)))
