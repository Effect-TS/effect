import { assert, describe, it } from "@effect/vitest"
import * as AiError from "effect/ai/AiError"
import * as McpCore from "effect/ai/internal/mcpCore"
import * as TaskWire from "effect/ai/internal/mcpSchema/v2026_07_28"
import { taskResult } from "effect/ai/internal/mcpTasks"
import * as TasksBinding from "effect/ai/internal/mcpTasksBinding"
import * as McpProtocol from "effect/ai/McpProtocol"
import * as McpSchema from "effect/ai/McpSchema"
import * as McpTasks from "effect/ai/McpTasks"
import * as Tool from "effect/ai/Tool"
import * as Toolkit from "effect/ai/Toolkit"
import * as Context from "effect/Context"
import * as DateTime from "effect/DateTime"
import * as Deferred from "effect/Deferred"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import * as HttpRouter from "effect/http/HttpRouter"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import * as SchemaGetter from "effect/SchemaGetter"
import * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"
import * as TestClock from "effect/testing/TestClock"
import { initializeHttpSession, makeHttpHarness } from "./TestUtils/McpHttpHarness.ts"
import { readMcpHttpResponse } from "./TestUtils/McpHttpResponse.ts"
import { makeServerLayer } from "./TestUtils/McpServerLayer.ts"

const Slow = Tool.make("slow", { parameters: Tool.EmptyParams, success: Schema.String })
const Wait = Tool.make("wait", { parameters: Tool.EmptyParams, success: Schema.String })
const Ask = Tool.make("ask", { parameters: Tool.EmptyParams, success: Schema.String })
const tools = Toolkit.make(Slow, Wait, Ask)
const registrations = McpTasks.toolkit(tools, {
  slow: { mode: "required", retention: Duration.infinity },
  wait: { mode: "required" },
  ask: { mode: "required" }
}, {
  slow: () => Effect.succeed("finished"),
  wait: () => Effect.never,
  ask: () =>
    McpTasks.Input.use((input) => input.roots()).pipe(
      Effect.orDie,
      Effect.map((response) => JSON.stringify(response))
    )
}).pipe(McpTasks.toLayer).pipe(
  Layer.provideMerge(McpTasks.layerMemory({ maxActive: 2, maxRecords: 4, owner: "shared", shutdownWait: "10 millis" }))
)
const server = registrations.pipe(Layer.provideMerge(makeServerLayer({
  name: "TaskServer",
  protocols: [
    McpProtocol.v2026_07_28,
    McpProtocol.v2025_11_25,
    McpProtocol.v2025_06_18,
    McpProtocol.v2025_03_26,
    McpProtocol.v2024_11_05
  ]
})))
const metadata = {
  "io.modelcontextprotocol/protocolVersion": "2026-07-28",
  "io.modelcontextprotocol/clientCapabilities": {
    extensions: { "io.modelcontextprotocol/tasks": {} }
  },
  "io.modelcontextprotocol/clientInfo": { name: "TaskClient", version: "1.0.0" }
}
const headers = (method: string, name?: string): HeadersInit => ({
  "MCP-Protocol-Version": "2026-07-28",
  "Mcp-Method": method,
  ...(name === undefined ? {} : { "Mcp-Name": name })
})
const request = (
  id: number,
  method: string,
  params: Record<string, unknown>,
  capabilities?: Record<string, unknown>
) => ({
  jsonrpc: "2.0",
  id,
  method,
  params: {
    ...params,
    _meta: capabilities === undefined ? metadata : {
      ...metadata,
      "io.modelcontextprotocol/clientCapabilities": capabilities
    }
  }
})
const requestAs = (client: string, id: number, method: string, params: Record<string, unknown>) => ({
  jsonrpc: "2.0",
  id,
  method,
  params: {
    ...params,
    _meta: { ...metadata, "io.modelcontextprotocol/clientInfo": { name: client, version: "1.0.0" } }
  }
})

const getTask = (harness: Effect.Success<ReturnType<typeof makeHttpHarness>>, taskId: string) =>
  Effect.gen(function*() {
    const response = yield* harness.post(request(2, "tasks/get", { taskId }), headers("tasks/get", taskId))
    assert.strictEqual(response.status, 200)
    return (yield* Schema.decodeUnknownEffect(Schema.Struct({ result: TaskWire.GetTaskResult }))(
      yield* readMcpHttpResponse(response)
    )).result
  })

const awaitStatus = (harness: Effect.Success<ReturnType<typeof makeHttpHarness>>, taskId: string, status: string) =>
  Effect.gen(function*() {
    let task: typeof TaskWire.GetTaskResult.Type | undefined
    for (let attempt = 0; attempt < 200; attempt++) {
      task = yield* getTask(harness, taskId)
      if (task.status === status) return task
      yield* Effect.yieldNow
    }
    assert.fail(`Task did not reach ${status}; last status was ${task?.status}`)
  })

it.effect("should advertise Tasks support when task execution is installed", () =>
  Effect.gen(function*() {
    const harness = yield* makeHttpHarness(server)
    const discoveryResponse = yield* harness.post(request(0, "server/discover", {}), headers("server/discover"))
    const discovery = yield* Schema.decodeUnknownEffect(Schema.Struct({
      result: Schema.Struct({
        capabilities: Schema.Struct({ extensions: Schema.Record(Schema.String, Schema.JsonObject) })
      })
    }))(yield* readMcpHttpResponse(discoveryResponse))
    assert.deepStrictEqual(discovery.result.capabilities.extensions["io.modelcontextprotocol/tasks"], {})
  }))

it.effect("should return a retrievable tool result when a required task completes", () =>
  Effect.gen(function*() {
    const harness = yield* makeHttpHarness(server)
    const createResponse = yield* harness.post(
      request(1, "tools/call", { name: "slow", arguments: {} }),
      headers("tools/call", "slow")
    )
    assert.strictEqual(createResponse.status, 200)
    const created = yield* Schema.decodeUnknownEffect(Schema.Struct({ result: TaskWire.CreateTaskResult }))(
      yield* readMcpHttpResponse(createResponse)
    )
    assert.strictEqual(created.result.resultType, "task")
    assert.strictEqual(created.result.ttlMs, null)
    const taskId = created.result.taskId
    const task = yield* awaitStatus(harness, taskId, "completed")
    assert.strictEqual(task.taskId, taskId)
    if (task.status === "completed") assert.strictEqual(task.result.structuredContent, "finished")
  }))

for (
  const protocol of [McpProtocol.v2025_11_25, McpProtocol.v2025_06_18, McpProtocol.v2025_03_26, McpProtocol.v2024_11_05]
) {
  it.effect(`should hide required tools when a ${protocol.protocolVersion} client lists tools`, () =>
    Effect.gen(function*() {
      const harness = yield* makeHttpHarness(server)
      const legacyHeaders = yield* initializeHttpSession(harness, protocol)
      const response = yield* harness.post({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }, legacyHeaders)
      const listed = yield* Schema.decodeUnknownEffect(Schema.Struct({
        result: Schema.Struct({ tools: Schema.Array(Schema.Struct({ name: Schema.String })) })
      }))(yield* readMcpHttpResponse(response))
      assert.deepStrictEqual(listed.result.tools, [])
    }))
}

it.effect("should admit only one task when concurrent requests compete for one slot", () =>
  Effect.gen(function*() {
    const limitedTools = Toolkit.make(Wait)
    const limitedServer = McpTasks.toolkit(limitedTools, { wait: { mode: "required" } }, { wait: () => Effect.never })
      .pipe(McpTasks.toLayer)
      .pipe(
        Layer.provideMerge(McpTasks.layerMemory({
          maxActive: 1,
          maxRecords: 2,
          owner: "shared",
          shutdownWait: "10 millis"
        })),
        Layer.provideMerge(makeServerLayer({ name: "LimitedTasks", protocols: [McpProtocol.v2026_07_28] }))
      )
    const harness = yield* makeHttpHarness(limitedServer)
    const responses = yield* Effect.all([
      harness.post(request(1, "tools/call", { name: "wait", arguments: {} }), headers("tools/call", "wait")),
      harness.post(request(2, "tools/call", { name: "wait", arguments: {} }), headers("tools/call", "wait"))
    ], { concurrency: 2 })
    const messages = yield* Effect.forEach(responses, (response) =>
      readMcpHttpResponse(response).pipe(Effect.flatMap(Schema.decodeUnknownEffect(Schema.JsonObject))))
    assert.strictEqual(
      messages.filter((message) =>
        "result" in message
      ).length,
      1
    )
    assert.strictEqual(messages.filter((message) => "error" in message).length, 1)
    const rejected = messages.find((message) => "error" in message)
    const rejection = yield* Schema.decodeUnknownEffect(Schema.Struct({ error: McpSchema.McpError }))(rejected)
    assert.strictEqual(rejection.error.code, -32000)
    const admitted = messages.find((message) => "result" in message)
    if (admitted !== undefined) {
      const created = Schema.decodeUnknownSync(Schema.Struct({ result: TaskWire.CreateTaskResult }))(admitted)
      yield* harness.post(
        request(3, "tasks/cancel", { taskId: created.result.taskId }),
        headers("tasks/cancel", created.result.taskId)
      )
    }
  }))

it.effect("should complete with submitted input when the client answers a pending request", () =>
  Effect.gen(function*() {
    const harness = yield* makeHttpHarness(server)
    const response = yield* harness.post(
      request(1, "tools/call", { name: "ask", arguments: {} }, {
        extensions: { "io.modelcontextprotocol/tasks": {} },
        roots: {}
      }),
      headers("tools/call", "ask")
    )
    const created = yield* Schema.decodeUnknownEffect(Schema.Struct({ result: TaskWire.CreateTaskResult }))(
      yield* readMcpHttpResponse(response)
    )
    const taskId = created.result.taskId
    const waiting = yield* awaitStatus(harness, taskId, "input_required")
    if (waiting.status !== "input_required") return assert.fail("Task must wait for input")
    const [key] = Object.keys(waiting.inputRequests)
    assert.isDefined(key)
    const update = yield* harness.post(
      request(3, "tasks/update", {
        taskId,
        inputResponses: { [key]: { roots: [{ uri: "file:///docs" }] }, ignored: { roots: [] } }
      }),
      headers("tasks/update", taskId)
    )
    assert.strictEqual(update.status, 200)
    yield* Schema.decodeUnknownEffect(Schema.Struct({ result: TaskWire.TaskAcknowledgement }))(
      yield* readMcpHttpResponse(update)
    )
    const completed = yield* awaitStatus(harness, taskId, "completed")
    if (completed.status === "completed") {
      assert.strictEqual(completed.result.structuredContent, JSON.stringify({ roots: [{ uri: "file:///docs" }] }))
    }
  }))

it.effect("should finish without exposing input requests when roots capability is absent", () =>
  Effect.gen(function*() {
    const harness = yield* makeHttpHarness(server)
    const response = yield* harness.post(
      request(1, "tools/call", { name: "ask", arguments: {} }),
      headers("tools/call", "ask")
    )
    const created = yield* Schema.decodeUnknownEffect(Schema.Struct({ result: TaskWire.CreateTaskResult }))(
      yield* readMcpHttpResponse(response)
    )
    const completed = yield* awaitStatus(harness, created.result.taskId, "completed")
    assert.strictEqual(completed.status, "completed")
    if (completed.status === "completed") assert.strictEqual(completed.result.isError, true)
  }))

it.effect("should acknowledge cancellation and eventually stop work when a running task is cancelled", () =>
  Effect.gen(function*() {
    const harness = yield* makeHttpHarness(server)
    const response = yield* harness.post(
      request(1, "tools/call", { name: "wait", arguments: {} }),
      headers("tools/call", "wait")
    )
    const created = yield* Schema.decodeUnknownEffect(Schema.Struct({ result: TaskWire.CreateTaskResult }))(
      yield* readMcpHttpResponse(response)
    )
    const taskId = created.result.taskId
    const cancelled = yield* harness.post(request(3, "tasks/cancel", { taskId }), headers("tasks/cancel", taskId))
    assert.strictEqual(cancelled.status, 200)
    yield* Schema.decodeUnknownEffect(Schema.Struct({ result: TaskWire.TaskAcknowledgement }))(
      yield* readMcpHttpResponse(cancelled)
    )
    const task = yield* awaitStatus(harness, taskId, "cancelled")
    assert.strictEqual(task.status, "cancelled")
  }))

// These IDs stand for server-authenticated connections. Client-supplied clientInfo is not identity.
for (const operation of ["get", "update", "cancel"] as const) {
  it.effect(`should deny another principal without changing pending work when it attempts to ${operation} a task`, () =>
    Effect.gen(function*() {
      const execution = yield* McpTasks.Execution
      const waiting = yield* Deferred.make<void>()
      const alice = McpSchema.McpRequestContext.of({
        clientId: 1,
        protocolVersion: "2026-07-28",
        clientCapabilities: { roots: {} },
        clientInfo: { name: "same-spoofable-name", version: "1" }
      })
      const bob = { ...alice, clientId: 2 }
      const task = yield* execution.create(
        McpTasks.Input.use((input) => input.roots()).pipe(
          Effect.map((response) =>
            new McpSchema.CallToolResult({ content: [{ type: "text", text: response.roots[0]?.uri ?? "empty" }] })
          ),
          Effect.onExit(() => Deferred.succeed(waiting, undefined))
        ),
        alice,
        {}
      )
      yield* Effect.yieldNow
      const before = yield* execution.get(task.taskId, alice)
      assert.strictEqual(before.status, "input_required")
      if (before.status !== "input_required") return
      const key = Object.keys(before.inputRequests)[0]
      assert.isDefined(key)
      const responses = { [key]: { roots: [{ uri: "file:///intruder" }] } }
      const denied = yield* Effect.result(
        operation === "get"
          ? execution.get(task.taskId, bob)
          : operation === "update"
          ? execution.update(task.taskId, responses, bob)
          : execution.cancel(task.taskId, bob)
      )
      assert.strictEqual(denied._tag, "Failure")
      if (denied._tag === "Failure") assert.strictEqual(denied.failure.code, -32602)
      assert.deepStrictEqual(yield* execution.get(task.taskId, alice), before)
      yield* execution.update(task.taskId, { [key]: { roots: [{ uri: "file:///owner" }] } }, alice)
      yield* Deferred.await(waiting)
      const completed = yield* execution.get(task.taskId, alice)
      assert.strictEqual(completed.status, "completed")
      if (completed.status === "completed") {
        assert.deepStrictEqual(completed.result.content, [{ type: "text", text: "file:///owner" }])
      }
    }).pipe(Effect.provide(McpTasks.layerMemory({
      maxActive: 1,
      maxRecords: 1,
      owner: McpSchema.McpRequestContext.useSync((context) => context.clientId === 1 ? "alice" : "bob")
    }))))
}

it.effect("should release capacity when an active task reaches its retention deadline", () =>
  Effect.gen(function*() {
    const execution = yield* McpTasks.Execution
    const invocation: McpTasks.TaskRequestContext = {
      clientId: 1,
      protocolVersion: "2026-07-28",
      clientCapabilities: McpSchema.ClientCapabilities.make({})
    }
    const first = yield* execution.create(
      Effect.sleep("3 millis").pipe(Effect.as(new McpSchema.CallToolResult({ content: [] }))),
      invocation,
      {}
    )
    yield* TestClock.adjust("2 millis")
    const expired = yield* Effect.result(execution.get(first.taskId, invocation))
    assert.strictEqual(expired._tag, "Failure")
    const replacement = yield* execution.create(
      Effect.succeed(new McpSchema.CallToolResult({ content: [] })),
      invocation,
      {}
    )
    assert.notStrictEqual(replacement.taskId, first.taskId)
  }).pipe(Effect.provide(McpTasks.layerMemory({
    maxActive: 1,
    maxRecords: 2,
    owner: "shared",
    retention: "1 milli",
    shutdownWait: "1 milli"
  }))))

it.effect("should interrupt expired work while its execution scope remains open", () =>
  Effect.gen(function*() {
    const started = yield* Deferred.make<void>()
    const interrupted = yield* Deferred.make<void>()
    const scope = yield* Scope.make()
    const context = yield* Layer.buildWithScope(
      McpTasks.layerMemory({
        maxActive: 1,
        maxRecords: 1,
        owner: "shared",
        retention: "1 milli",
        shutdownWait: "1 milli"
      }),
      scope
    )
    const execution = Context.get(context, McpTasks.Execution)
    const invocation: McpTasks.TaskRequestContext = {
      clientId: 1,
      protocolVersion: "2026-07-28",
      clientCapabilities: McpSchema.ClientCapabilities.make({})
    }
    const run = Deferred.succeed(started, undefined).pipe(
      Effect.andThen(Effect.never),
      Effect.onInterrupt(() => Deferred.succeed(interrupted, undefined))
    )
    const task = yield* execution.create(run, invocation, {})
    yield* Deferred.await(started)
    yield* TestClock.adjust("2 millis")
    const expired = yield* Effect.result(execution.get(task.taskId, invocation))
    assert.strictEqual(expired._tag, "Failure")
    yield* Deferred.await(interrupted)
    yield* Scope.close(scope, Exit.void)
  }))

it.effect("should reuse decoded input when an optional decision chooses inline execution", () =>
  Effect.gen(function*() {
    let decodes = 0
    const Rows = Schema.String.pipe(Schema.decodeTo(Schema.Number, {
      decode: SchemaGetter.transformEffect((value) =>
        Effect.sync(() => {
          decodes++
          return Number(value)
        })
      ),
      encode: SchemaGetter.transformEffect((value: number) => Effect.succeed(String(value)))
    }))
    const Estimate = Tool.make("estimate", {
      parameters: Schema.Struct({ rows: Rows }),
      success: Schema.String
    })
    const selected = Toolkit.make(Estimate)
    const registration = McpTasks.toolkit(selected, {
      estimate: {
        mode: "optional",
        whenUnavailable: "inline",
        decide: ({ rows }) => {
          assert.strictEqual(rows, 2)
          return Effect.succeed("inline")
        }
      }
    }, {
      estimate: ({ rows }) => Effect.succeed(String(rows))
    }).pipe(McpTasks.toLayer).pipe(
      Layer.provideMerge(McpTasks.layerMemory({ maxActive: 2, maxRecords: 2, owner: "shared" })),
      Layer.provideMerge(makeServerLayer({
        name: "OptionalTasks",
        protocols: [McpProtocol.v2026_07_28, McpProtocol.v2025_06_18]
      }))
    )
    const harness = yield* makeHttpHarness(registration)
    const estimate = yield* harness.post(
      request(1, "tools/call", { name: "estimate", arguments: { rows: "2" } }),
      headers("tools/call", "estimate")
    )
    const result = yield* Schema.decodeUnknownEffect(Schema.Struct({ result: TaskWire.CallToolResult }))(
      yield* readMcpHttpResponse(estimate)
    )
    assert.strictEqual(result.result.structuredContent, "2")
    assert.strictEqual(decodes, 1)
  }))

it.effect("should provide inline context when a legacy client calls a tool without a task policy", () =>
  Effect.gen(function*() {
    const Ordinary = Tool.make("ordinary", {
      parameters: Tool.EmptyParams,
      success: Schema.String
    })
    const selected = Toolkit.make(Ordinary)
    const registration = McpTasks.toolkit(selected, {}, {
      ordinary: () => McpTasks.TaskContext.useSync((context) => context.mode)
    }).pipe(McpTasks.toLayer).pipe(
      Layer.provideMerge(McpTasks.layerMemory({ maxActive: 1, maxRecords: 1, owner: "shared" })),
      Layer.provideMerge(makeServerLayer({ name: "InlineContext", protocols: [McpProtocol.v2025_06_18] }))
    )
    const harness = yield* makeHttpHarness(registration)
    const legacyHeaders = yield* initializeHttpSession(harness, McpProtocol.v2025_06_18)
    const response = yield* harness.post({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name: "ordinary", arguments: {} }
    }, legacyHeaders)
    const result = yield* Schema.decodeUnknownEffect(Schema.Struct({
      result: Schema.Struct({
        content: Schema.Array(Schema.Struct({ type: Schema.Literal("text"), text: Schema.String }))
      })
    }))(yield* readMcpHttpResponse(response))
    assert.deepStrictEqual(result.result.content, [{ type: "text", text: "inline" }])
  }))

it.effect("should return a tool error without occupying capacity when a decision fails", () =>
  Effect.gen(function*() {
    const Decide = Tool.make("decide", {
      parameters: Tool.EmptyParams,
      success: Schema.String,
      failure: Schema.String
    })
    const selected = Toolkit.make(Decide, Slow)
    const registration = McpTasks.toolkit(selected, {
      decide: { mode: "optional", whenUnavailable: "reject", decide: () => Effect.fail("denied") },
      slow: { mode: "required" }
    }, { decide: () => Effect.succeed("ran"), slow: () => Effect.succeed("finished") }).pipe(McpTasks.toLayer).pipe(
      Layer.provideMerge(McpTasks.layerMemory({ maxActive: 1, maxRecords: 1, owner: "shared" })),
      Layer.provideMerge(makeServerLayer({ name: "DecisionFailure", protocols: [McpProtocol.v2026_07_28] }))
    )
    const harness = yield* makeHttpHarness(registration)
    const response = yield* harness.post(
      request(1, "tools/call", { name: "decide", arguments: {} }),
      headers("tools/call", "decide")
    )
    const result = yield* Schema.decodeUnknownEffect(Schema.Struct({ result: TaskWire.CallToolResult }))(
      yield* readMcpHttpResponse(response)
    )
    assert.strictEqual(result.result.isError, true)
    const [content] = result.result.content
    assert.strictEqual(content?.type, "text")
    if (content?.type === "text") assert.strictEqual(content.text, "\"denied\"")
    const next = yield* harness.post(
      request(2, "tools/call", { name: "slow", arguments: {} }),
      headers("tools/call", "slow")
    )
    yield* Schema.decodeUnknownEffect(Schema.Struct({ result: TaskWire.CreateTaskResult }))(
      yield* readMcpHttpResponse(next)
    )
  }))

for (const policy of ["inline", "reject"] as const) {
  it.effect(`should ${policy === "inline" ? "return an inline result" : "report the required capability"} when an unsupported client calls a tool with ${policy} fallback`, () =>
    Effect.gen(function*() {
      const selected = Toolkit.make(Slow)
      const registration = McpTasks.toolkit(selected, { slow: { mode: "optional", whenUnavailable: policy } }, {
        slow: () => Effect.succeed("finished")
      }).pipe(McpTasks.toLayer).pipe(
        Layer.provideMerge(McpTasks.layerMemory({ maxActive: 1, maxRecords: 1, owner: "shared" })),
        Layer.provideMerge(makeServerLayer({ name: "UnsupportedTasks", protocols: [McpProtocol.v2026_07_28] }))
      )
      const harness = yield* makeHttpHarness(registration)
      const response = yield* harness.post(
        request(1, "tools/call", { name: "slow", arguments: {} }, {}),
        headers("tools/call", "slow")
      )
      const body = yield* readMcpHttpResponse(response)
      if (policy === "inline") {
        const result = yield* Schema.decodeUnknownEffect(Schema.Struct({ result: TaskWire.CallToolResult }))(body)
        assert.strictEqual(result.result.structuredContent, "finished")
      } else {
        const result = yield* Schema.decodeUnknownEffect(Schema.Struct({ error: McpSchema.McpError }))(body)
        assert.strictEqual(result.error.code, -32021)
        assert.deepStrictEqual(result.error.data, {
          requiredCapabilities: { extensions: { "io.modelcontextprotocol/tasks": {} } }
        })
      }
    }))
}

it.effect("should reject registration when a task duration is invalid", () =>
  Effect.gen(function*() {
    const selected = Toolkit.make(Slow)
    const registration = McpTasks.toolkit(selected, {
      slow: { mode: "required", timeout: "0 millis" }
    }, { slow: () => Effect.succeed("done") }).pipe(McpTasks.toLayer).pipe(
      Layer.provideMerge(McpTasks.layerMemory({ maxActive: 1, maxRecords: 1, owner: "shared" })),
      Layer.provideMerge(makeServerLayer({ name: "InvalidDuration", protocols: [McpProtocol.v2026_07_28] }))
    )
    const result = yield* Effect.result(Layer.build(registration.pipe(Layer.provide(HttpRouter.layer))))
    assert.strictEqual(result._tag, "Failure")
    if (result._tag === "Failure") {
      assert.strictEqual(result.failure._tag, "McpTasksInvalidOption")
      if (result.failure._tag === "McpTasksInvalidOption") assert.strictEqual(result.failure.option, "slow.timeout")
    }
  }))

it.effect("should reject excess parameters before user code runs when an optional tool has strict input", () =>
  Effect.gen(function*() {
    let calls = 0
    let decisions = 0
    const Strict = Tool.make("strict", {
      parameters: Schema.Struct({ value: Schema.String }),
      success: Schema.String
    })
      .annotate(Tool.Strict, true)
    const toolkit = Toolkit.make(Strict)
    const layer = McpTasks.toolkit(toolkit, {
      strict: {
        mode: "optional",
        whenUnavailable: "inline",
        decide: () =>
          Effect.sync(() => {
            decisions++
            return "inline" as const
          })
      }
    }, {
      strict: ({ value }) =>
        Effect.sync(() => {
          calls++
          return value
        })
    }).pipe(McpTasks.toLayer).pipe(
      Layer.provideMerge(McpTasks.layerMemory({ maxActive: 1, maxRecords: 1, owner: "shared" })),
      Layer.provideMerge(makeServerLayer({ name: "StrictTasks", protocols: [McpProtocol.v2026_07_28] }))
    )
    const harness = yield* makeHttpHarness(layer)
    const response = yield* harness.post(
      request(1, "tools/call", { name: "strict", arguments: { value: "ok", extra: true } }),
      headers("tools/call", "strict")
    )
    const body = yield* Schema.decodeUnknownEffect(Schema.Struct({ error: Schema.Struct({ code: Schema.Number }) }))(
      yield* readMcpHttpResponse(response)
    )
    assert.strictEqual(body.error.code, -32602)
    assert.strictEqual(decisions, 0)
    assert.strictEqual(calls, 0)
  }))
it.effect("should retain completed results when retention is unlimited", () =>
  Effect.gen(function*() {
    const execution = yield* McpTasks.Execution
    const context = McpSchema.McpRequestContext.of({
      clientId: 1,
      protocolVersion: "2026-07-28",
      clientCapabilities: {}
    })
    const invocation = context
    const task = yield* execution.create(Effect.succeed(new McpSchema.CallToolResult({ content: [] })), invocation, {})
    yield* TestClock.adjust("2 hours")
    const result = yield* execution.get(task.taskId, invocation)
    assert.strictEqual(result.status, "completed")
    assert.isFalse(Duration.isFinite(result.ttl))
  }).pipe(
    Effect.provide(McpTasks.layerMemory({ maxActive: 1, maxRecords: 1, owner: "shared", retention: Duration.infinity }))
  ))

it.effect("should fail a task when a handler returns an unsupported continuation", () =>
  Effect.gen(function*() {
    const execution = yield* McpTasks.Execution
    const invocation = McpSchema.McpRequestContext.of({
      clientId: 1,
      protocolVersion: "2026-07-28",
      clientCapabilities: {}
    })
    const task = yield* execution.create(
      taskResult(
        Effect.succeed(McpCore.OperationOutcome.InputRequired({
          inputRequests: { answer: { method: "roots/list" } }
        }))
      ),
      invocation,
      {}
    )
    yield* Effect.yieldNow
    const result = yield* execution.get(task.taskId, invocation)
    assert.strictEqual(result.status, "failed")
  }).pipe(Effect.provide(McpTasks.layerMemory({ maxActive: 1, maxRecords: 1, owner: "shared" }))))

it.effect("should finish shutdown when an interrupted task has a blocked finalizer", () =>
  Effect.gen(function*() {
    const started = yield* Deferred.make<void>()
    const cleaning = yield* Deferred.make<void>()
    const release = yield* Deferred.make<void>()
    const scope = yield* Scope.make()
    const context = yield* Layer.buildWithScope(
      McpTasks.layerMemory({
        maxActive: 1,
        maxRecords: 1,
        owner: "shared",
        shutdownWait: "10 millis"
      }),
      scope
    )
    const execution = Context.get(context, McpTasks.Execution)
    const invocation = McpSchema.McpRequestContext.of({
      clientId: 1,
      protocolVersion: "2026-07-28",
      clientCapabilities: {}
    })
    yield* execution.create(
      Deferred.succeed(started, undefined).pipe(
        Effect.andThen(Effect.never),
        Effect.ensuring(Deferred.succeed(cleaning, undefined).pipe(Effect.andThen(Deferred.await(release))))
      ),
      invocation,
      {}
    )
    yield* Deferred.await(started)
    let closed = false
    const closing = yield* Effect.forkChild(
      Scope.close(scope, Exit.void).pipe(Effect.tap(() =>
        Effect.sync(() => {
          closed = true
        })
      ))
    )
    yield* TestClock.adjust("10 millis")
    yield* Deferred.await(cleaning)
    yield* Fiber.join(closing)
    assert.isTrue(closed)
    yield* Deferred.succeed(release, undefined)
  }))

for (const method of ["tasks/get", "tasks/update", "tasks/cancel"]) {
  it.effect(`should report required capability on each ${method} request when Tasks support is omitted`, () =>
    Effect.gen(function*() {
      const harness = yield* makeHttpHarness(server)
      const errorSchema = Schema.Struct({
        error: Schema.Struct({ code: Schema.Number, data: Schema.optionalKey(Schema.JsonObject) })
      })
      for (const capabilities of [{}, metadata["io.modelcontextprotocol/clientCapabilities"], {}]) {
        const response = yield* harness.post(
          request(
            1,
            method,
            { taskId: "missing", ...(method === "tasks/update" ? { inputResponses: {} } : {}) },
            capabilities
          ),
          headers(method, "missing")
        )
        const { error } = yield* Schema.decodeUnknownEffect(errorSchema)(yield* readMcpHttpResponse(response))
        if ("extensions" in capabilities) {
          assert.strictEqual(error.code, -32602)
        } else {
          assert.strictEqual(error.code, -32021)
          assert.deepStrictEqual(error.data, {
            requiredCapabilities: { extensions: { "io.modelcontextprotocol/tasks": {} } }
          })
        }
      }
    }))
}

for (const choice of ["inline", "task"] as const) {
  it.effect(`should pass decoded undefined to the handler when execution is ${choice}`, () =>
    Effect.gen(function*() {
      let decodes = 0
      const parameters = Tool.EmptyParams.pipe(Schema.decodeTo(Schema.Undefined, {
        decode: SchemaGetter.transformEffect(() =>
          Effect.sync(() => {
            decodes++
            return undefined
          })
        ),
        encode: SchemaGetter.transform(() => ({}))
      }))
      const Undefined = Tool.make("undefined", { parameters, success: Schema.String })
      const toolkit = Toolkit.make(Undefined)
      const registration = McpTasks.toolkit(toolkit, {
        undefined: {
          mode: "optional",
          whenUnavailable: "inline",
          decide: (input) => {
            assert.isUndefined(input)
            return Effect.succeed(choice)
          }
        }
      }, {
        undefined: (input) =>
          Effect.sync(() => {
            assert.isUndefined(input)
            return "done"
          })
      }).pipe(McpTasks.toLayer).pipe(
        Layer.provideMerge(McpTasks.layerMemory({ maxActive: 1, maxRecords: 1, owner: "shared" })),
        Layer.provideMerge(makeServerLayer({ name: "Undefined", protocols: [McpProtocol.v2026_07_28] }))
      )
      const harness = yield* makeHttpHarness(registration)
      const response = yield* harness.post(
        request(1, "tools/call", { name: "undefined", arguments: {} }),
        headers("tools/call", "undefined")
      )
      const body = yield* readMcpHttpResponse(response)
      if (choice === "inline") {
        const { result } = yield* Schema.decodeUnknownEffect(Schema.Struct({ result: TaskWire.CallToolResult }))(body)
        assert.strictEqual(result.structuredContent, "done")
      } else {
        const { result } = yield* Schema.decodeUnknownEffect(Schema.Struct({ result: TaskWire.CreateTaskResult }))(body)
        const completed = yield* awaitStatus(harness, result.taskId, "completed")
        if (completed.status === "completed") assert.strictEqual(completed.result.structuredContent, "done")
      }
      assert.strictEqual(decodes, 1)
    }))
}

const makePreparedHarness = Effect.fnUntraced(function*(choice: "inline" | "task") {
  class Label extends Context.Service<Label, string>()("test/PreparedLabel") {}
  let decodes = 0
  const NumberInput = Schema.String.pipe(Schema.decodeTo(Schema.Number, {
    decode: SchemaGetter.transformEffect((value) =>
      Effect.sync(() => {
        decodes++
        return Number(value)
      })
    ),
    encode: SchemaGetter.transform(String)
  }))
  const Prepared = Tool.make("prepared", {
    parameters: Schema.Struct({ value: NumberInput }),
    success: Schema.String,
    failure: Schema.String
  })
  const toolkit = Toolkit.make(Prepared)
  const started = yield* Deferred.make<void>()
  const interrupted = yield* Deferred.make<void>()
  const registration = McpTasks.toolkit(toolkit, {
    prepared: { mode: "optional", whenUnavailable: "inline", decide: () => Effect.succeed(choice) }
  }, {
    prepared: Effect.fnUntraced(function*({ value }) {
      const label = yield* Label
      const request = yield* McpSchema.McpRequestContext
      if (value === 0) {
        yield* Deferred.succeed(started, undefined)
        return yield* Effect.never.pipe(Effect.onInterrupt(() => Deferred.succeed(interrupted, undefined)))
      }
      const result = `${label}:${request.clientInfo?.name}:${value}`
      return value < 0 ? yield* Effect.fail(result) : result
    })
  }).pipe(McpTasks.toLayer).pipe(
    Layer.provideMerge(McpTasks.layerMemory({ maxActive: 1, maxRecords: 3, owner: "shared" })),
    Layer.provideMerge(makeServerLayer({ name: "Prepared", protocols: [McpProtocol.v2026_07_28] })),
    Layer.provide(Layer.succeed(Label, "captured")),
    Layer.provide(Layer.succeed(McpSchema.McpRequestContext, {
      clientId: 0,
      protocolVersion: "2026-07-28",
      clientCapabilities: {},
      clientInfo: { name: "stale", version: "1" }
    }))
  )
  const harness = yield* makeHttpHarness(registration)
  return { harness, started, interrupted, decodeCount: () => decodes }
})

it.effect("should advertise the encoded input schema when a task toolkit has transformed parameters", () =>
  Effect.gen(function*() {
    const { harness } = yield* makePreparedHarness("inline")
    const discovery = yield* harness.post(request(0, "tools/list", {}), headers("tools/list"))
    const advertised = yield* Schema.decodeUnknownEffect(Schema.Struct({
      result: Schema.Struct({
        tools: Schema.Array(Schema.Struct({
          name: Schema.String,
          inputSchema: Schema.Struct({ properties: Schema.Struct({ value: Schema.Struct({ type: Schema.String }) }) })
        }))
      })
    }))(yield* readMcpHttpResponse(discovery))
    assert.strictEqual(advertised.result.tools[0]?.inputSchema.properties.value.type, "string")
  }))

for (const choice of ["inline", "task"] as const) {
  for (const value of [1, -1]) {
    it.effect(`should preserve the current request context in a ${value < 0 ? "declared failure" : "successful result"} when optional execution is ${choice}`, () =>
      Effect.gen(function*() {
        const { harness, decodeCount } = yield* makePreparedHarness(choice)
        const ToolResult = Schema.Struct({
          isError: Schema.Boolean,
          content: Schema.Array(Schema.Struct({ type: Schema.Literal("text"), text: Schema.String }))
        })
        {
          const response = yield* harness.post(
            requestAs(`client${value}`, value + 3, "tools/call", {
              name: "prepared",
              arguments: { value: String(value) }
            }),
            headers("tools/call", "prepared")
          )
          const body = yield* readMcpHttpResponse(response)
          let result: typeof ToolResult.Type
          if (choice === "inline") {
            result = (yield* Schema.decodeUnknownEffect(Schema.Struct({ result: ToolResult }))(body)).result
          } else {
            const created = yield* Schema.decodeUnknownEffect(Schema.Struct({ result: TaskWire.CreateTaskResult }))(
              body
            )
            const completed = yield* awaitStatus(harness, created.result.taskId, "completed")
            assert.strictEqual(completed.status, "completed")
            if (completed.status !== "completed") return
            result = yield* Schema.decodeUnknownEffect(ToolResult)(completed.result)
          }
          assert.strictEqual(result.isError, value < 0)
          const content = result.content[0]
          assert.strictEqual(content?.type, "text")
          if (content?.type === "text") {
            assert.strictEqual(content.text, JSON.stringify(`captured:client${value}:${value}`))
          }
        }
        assert.strictEqual(decodeCount(), 1)
      }))
  }

  if (choice === "task") {
    it.effect(`should interrupt prepared work when optional execution is ${choice} and the client cancels`, () =>
      Effect.gen(function*() {
        const { harness, started, interrupted, decodeCount } = yield* makePreparedHarness(choice)
        {
          const response = yield* harness.post(
            request(9, "tools/call", { name: "prepared", arguments: { value: "0" } }),
            headers("tools/call", "prepared")
          )
          const created = yield* Schema.decodeUnknownEffect(Schema.Struct({ result: TaskWire.CreateTaskResult }))(
            yield* readMcpHttpResponse(response)
          )
          yield* Deferred.await(started)
          yield* harness.post(
            request(10, "tasks/cancel", { taskId: created.result.taskId }),
            headers("tasks/cancel", created.result.taskId)
          )
          yield* Deferred.await(interrupted)
          assert.strictEqual((yield* awaitStatus(harness, created.result.taskId, "cancelled")).status, "cancelled")
          assert.strictEqual(decodeCount(), 1)
        }
      }))
  }
}

it.effect("should expose equivalent retention and polling durations when equivalent inputs are configured", () =>
  Effect.gen(function*() {
    const inputs: ReadonlyArray<Duration.Input> = [
      Duration.seconds(1),
      1000,
      1_000_000_000n,
      [1, 0],
      "1 second",
      { seconds: 1 }
    ]
    const request = McpSchema.McpRequestContext.of({
      clientId: 1,
      protocolVersion: "2026-07-28",
      clientCapabilities: {}
    })
    for (const input of inputs) {
      const context = yield* Layer.build(McpTasks.layerMemory({
        maxActive: 1,
        maxRecords: 1,
        owner: "shared",
        retention: input,
        pollInterval: input,
        timeout: input,
        shutdownWait: input
      }))
      const execution = Context.get(context, McpTasks.Execution)
      const task = yield* execution.create(Effect.succeed(new McpSchema.CallToolResult({ content: [] })), request, {})
      assert.strictEqual(Duration.toMillis(task.ttl), 1000)
      assert.strictEqual(Duration.toMillis(task.pollInterval!), 1000)
    }
  }))

it.effect("should report the offending option when memory settings are invalid", () =>
  Effect.gen(function*() {
    const cases = [
      ["maxActive", 0],
      ["maxActive", 1.5],
      ["maxRecords", Number.MAX_SAFE_INTEGER + 1],
      ["retention", "-Infinity"],
      ["retention", "invalid duration"],
      ["pollInterval", "Infinity"],
      ["timeout", Duration.infinity],
      ["shutdownWait", [0, 1]],
      ["pollInterval", 0.5]
    ] as const
    for (const [option, value] of cases) {
      const result = yield* Effect.result(Layer.build(McpTasks.layerMemory({
        maxActive: 1,
        maxRecords: 1,
        owner: "shared",
        [option]: value
      } as McpTasks.MemoryOptions)))
      assert.strictEqual(result._tag, "Failure")
      if (result._tag === "Failure") {
        assert.instanceOf(result.failure, McpTasks.InvalidOption)
        assert.strictEqual(result.failure.option, option)
        assert.strictEqual(
          result.failure.message,
          option === "maxActive" || option === "maxRecords"
            ? `${option} must be a positive integer`
            : `${option} must be a positive whole number of milliseconds`
        )
      }
    }
  }))

it.effect("should deliver the sampling response when optional request fields are omitted", () =>
  Effect.gen(function*() {
    const execution = yield* McpTasks.Execution
    const finished = yield* Deferred.make<void>()
    const context = McpSchema.McpRequestContext.of({
      clientId: 1,
      protocolVersion: "2026-07-28",
      clientCapabilities: { sampling: {} }
    })
    const task = yield* execution.create(
      McpTasks.Input.use((input) =>
        input.sampling(McpSchema.CreateMessage.payloadSchema.make({
          messages: [McpSchema.SamplingMessage.make({
            role: "user",
            content: McpSchema.TextContent.make({ text: "sample" })
          })],
          maxTokens: 64,
          systemPrompt: undefined,
          metadata: { trace: "request" }
        }))
      ).pipe(
        Effect.map((response) =>
          new McpSchema.CallToolResult({ content: [{ type: "text", text: JSON.stringify(response.content) }] })
        ),
        Effect.ensuring(Deferred.succeed(finished, undefined))
      ),
      context,
      {}
    )
    yield* Effect.yieldNow
    const waiting = yield* execution.get(task.taskId, context)
    if (waiting.status !== "input_required") {
      return assert.fail(`Expected input_required, got ${waiting.status}`)
    }
    const [key, input] = Object.entries(waiting.inputRequests)[0]!
    assert.strictEqual(input.method, "sampling/createMessage")
    assert.deepStrictEqual(input.params, {
      messages: [{ role: "user", content: { type: "text", text: "sample" } }],
      maxTokens: 64,
      metadata: { trace: "request" }
    })
    yield* execution.update(task.taskId, {
      [key]: { role: "assistant", model: "test", content: { type: "text", text: "sampled" } }
    }, context)
    yield* Deferred.await(finished)
    yield* Effect.yieldNow
    const completed = yield* execution.get(task.taskId, context)
    if (completed.status !== "completed") {
      return assert.fail(`Expected completed, got ${completed.status}`)
    }
    assert.deepStrictEqual(completed.result.content, [{
      type: "text",
      text: "{\"type\":\"text\",\"text\":\"sampled\"}"
    }])
  }).pipe(Effect.provide(McpTasks.layerMemory({ maxActive: 1, maxRecords: 1, owner: "shared" }))))

it.effect("should reject sampling before requesting input when metadata is not JSON", () =>
  Effect.gen(function*() {
    const execution = yield* McpTasks.Execution
    const finished = yield* Deferred.make<void>()
    const context = McpSchema.McpRequestContext.of({
      clientId: 1,
      protocolVersion: "2026-07-28",
      clientCapabilities: { sampling: {} }
    })
    const task = yield* execution.create(
      McpTasks.Input.use((input) =>
        input.sampling(McpSchema.CreateMessage.payloadSchema.make({
          messages: [McpSchema.SamplingMessage.make({
            role: "user",
            content: McpSchema.TextContent.make({ text: "sample" })
          })],
          maxTokens: 64,
          metadata: { invalid: () => "not JSON" }
        }))
      ).pipe(
        Effect.catchTag("SchemaError", () => Effect.succeed("invalid sampling request")),
        Effect.map((result) => new McpSchema.CallToolResult({ content: [{ type: "text", text: String(result) }] })),
        Effect.ensuring(Deferred.succeed(finished, undefined))
      ),
      context,
      { timeout: Duration.millis(10) }
    )
    yield* Deferred.await(finished)
    yield* Effect.yieldNow
    const completed = yield* execution.get(task.taskId, context)
    assert.strictEqual(completed.status, "completed")
    if (completed.status === "completed") {
      assert.deepStrictEqual(completed.result.content, [{ type: "text", text: "invalid sampling request" }])
    }
  }).pipe(Effect.provide(McpTasks.layerMemory({ maxActive: 1, maxRecords: 1, owner: "shared" }))))

it.effect("should provide inline schema context when an optional decision fails", () =>
  Effect.gen(function*() {
    const Value = Schema.String.pipe(Schema.decodeTo(Schema.String, {
      decode: SchemaGetter.transformEffect((value) =>
        McpTasks.TaskContext.useSync((context) => {
          return `${value}:${context.mode}`
        })
      ),
      encode: SchemaGetter.transform((value) => value)
    }))
    const Failure = Schema.String.pipe(Schema.decodeTo(Schema.String, {
      decode: SchemaGetter.transform((value) => value),
      encode: SchemaGetter.transformEffect((value) =>
        McpTasks.TaskContext.useSync((context) => {
          return `${value}:${context.mode}`
        })
      )
    }))
    const Decide = Tool.make("decide", {
      parameters: Schema.Struct({ value: Value }),
      success: Schema.String,
      failure: Failure
    })
    const selected = Toolkit.make(Decide)
    const registration = McpTasks.toolkit(selected, {
      decide: { mode: "optional", whenUnavailable: "reject", decide: ({ value }) => Effect.fail(value) }
    }, { decide: () => Effect.succeed("ran") }).pipe(McpTasks.toLayer).pipe(
      Layer.provideMerge(McpTasks.layerMemory({ maxActive: 1, maxRecords: 1, owner: "shared" })),
      Layer.provideMerge(makeServerLayer({ name: "DecisionContext", protocols: [McpProtocol.v2026_07_28] }))
    )
    const harness = yield* makeHttpHarness(registration)
    const response = yield* harness.post(
      request(1, "tools/call", { name: "decide", arguments: { value: "input" } }),
      headers("tools/call", "decide")
    )
    const result = yield* Schema.decodeUnknownEffect(Schema.Struct({ result: TaskWire.CallToolResult }))(
      yield* readMcpHttpResponse(response)
    )
    assert.strictEqual(result.result.isError, true)
    assert.deepStrictEqual(result.result.content, [{ type: "text", text: "\"input:inline:inline\"" }])
  }))

it.effect("should preserve outstanding input and accept an answer when a client resumes polling on a later request", () =>
  Effect.gen(function*() {
    const harness = yield* makeHttpHarness(server)
    const create = yield* harness.post(
      request(1, "tools/call", { name: "ask", arguments: {} }, {
        extensions: { "io.modelcontextprotocol/tasks": {} },
        roots: {}
      }),
      headers("tools/call", "ask")
    )
    const { result } = yield* Schema.decodeUnknownEffect(Schema.Struct({ result: TaskWire.CreateTaskResult }))(
      yield* readMcpHttpResponse(create)
    )
    const first = yield* awaitStatus(harness, result.taskId, "input_required")
    if (first.status !== "input_required") return assert.fail("Expected pending input")
    // July requests have no session: recovery uses the retained handle on a later HTTP request.
    const recovered = yield* getTask(harness, result.taskId)
    assert.deepStrictEqual(recovered, first)
    const key = Object.keys(first.inputRequests)[0]
    assert.isDefined(key)
    yield* harness.post(
      request(2, "tasks/update", {
        taskId: result.taskId,
        inputResponses: { [key]: { roots: [] } }
      }),
      headers("tasks/update", result.taskId)
    )
    const completed = yield* awaitStatus(harness, result.taskId, "completed")
    if (completed.status !== "completed") return assert.fail("Expected completed task")
    assert.strictEqual(completed.result.structuredContent, "{\"roots\":[]}")
  }))

for (const stoppedBy of ["timeout", "cancel"] as const) {
  for (const state of ["working", "input_required"] as const) {
    it.effect(`should admit new work when abandoned ${state} execution stops through ${stoppedBy}`, () =>
      Effect.gen(function*() {
        const execution = yield* McpTasks.Execution
        const started = yield* Deferred.make<void>()
        const stopped = yield* Deferred.make<void>()
        const context = McpSchema.McpRequestContext.of({
          clientId: 1,
          protocolVersion: "2026-07-28",
          clientCapabilities: { roots: {} }
        })
        const work = state === "working" ? Effect.never : McpTasks.Input.use((input) => input.roots())
        const task = yield* execution.create(
          Deferred.succeed(started, undefined).pipe(
            Effect.andThen(work),
            Effect.as(new McpSchema.CallToolResult({ content: [] })),
            Effect.ensuring(Deferred.succeed(stopped, undefined))
          ),
          context,
          stoppedBy === "timeout" ? { timeout: Duration.millis(10) } : {}
        )
        yield* Deferred.await(started)
        yield* Effect.yieldNow
        assert.strictEqual((yield* execution.get(task.taskId, context)).status, state)
        if (stoppedBy === "timeout") yield* TestClock.adjust("10 millis")
        else yield* execution.cancel(task.taskId, context)
        yield* Deferred.await(stopped)
        yield* Effect.yieldNow
        const ended = yield* execution.get(task.taskId, context)
        assert.strictEqual(ended.status, stoppedBy === "timeout" ? "failed" : "cancelled")
        const replacement = yield* execution.create(
          Effect.succeed(new McpSchema.CallToolResult({ content: [] })),
          context,
          {}
        )
        assert.notStrictEqual(replacement.taskId, task.taskId)
      }).pipe(Effect.provide(McpTasks.layerMemory({ maxActive: 1, maxRecords: 2, owner: "shared" }))))
  }
}

it.effect("should retain remaining input and ignore repeated answers when only part of a task's input is fulfilled", () =>
  Effect.gen(function*() {
    const execution = yield* McpTasks.Execution
    const finished = yield* Deferred.make<void>()
    const context = McpSchema.McpRequestContext.of({
      clientId: 1,
      protocolVersion: "2026-07-28",
      clientCapabilities: { roots: {} }
    })
    const task = yield* execution.create(
      McpTasks.Input.use((input) => Effect.all([input.roots(), input.roots()], { concurrency: 2 })).pipe(
        Effect.map((responses) =>
          new McpSchema.CallToolResult({ content: [{ type: "text", text: JSON.stringify(responses) }] })
        ),
        Effect.onExit(() => Deferred.succeed(finished, undefined))
      ),
      context,
      {}
    )
    yield* Effect.yieldNow
    const pending = yield* execution.get(task.taskId, context)
    if (pending.status !== "input_required") return assert.fail("Expected pending requests")
    const keys = Object.keys(pending.inputRequests)
    assert.strictEqual(keys.length, 2)
    const first = keys[0]
    const second = keys[1]
    assert.isDefined(first)
    assert.isDefined(second)
    yield* execution.update(task.taskId, { [first]: { roots: [{ uri: "file:///first" }] } }, context)
    yield* Effect.yieldNow
    const remaining = yield* execution.get(task.taskId, context)
    if (remaining.status !== "input_required") return assert.fail("Expected remaining input")
    assert.deepStrictEqual(Object.keys(remaining.inputRequests), [second])
    yield* execution.update(task.taskId, {
      [first]: { roots: [{ uri: "file:///overwritten" }] },
      unknown: { roots: [] },
      [second]: { roots: [{ uri: "file:///second" }] }
    }, context)
    yield* Deferred.await(finished)
    const completed = yield* execution.get(task.taskId, context)
    if (completed.status !== "completed") return assert.fail("Expected completed task")
    assert.deepStrictEqual(completed.result.content, [{
      type: "text",
      text: "[{\"roots\":[{\"uri\":\"file:///first\"}]},{\"roots\":[{\"uri\":\"file:///second\"}]}]"
    }])
  }).pipe(Effect.provide(McpTasks.layerMemory({ maxActive: 1, maxRecords: 1, owner: "shared" }))))

for (
  const protocol of [McpProtocol.v2025_11_25, McpProtocol.v2025_06_18, McpProtocol.v2025_03_26, McpProtocol.v2024_11_05]
) {
  it.effect(`should reject task-only tool execution when a ${protocol.protocolVersion} client calls it directly`, () =>
    Effect.gen(function*() {
      const harness = yield* makeHttpHarness(server)
      const legacyHeaders = yield* initializeHttpSession(harness, protocol)
      const response = yield* harness.post({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name: "slow", arguments: {} }
      }, legacyHeaders)
      const result = yield* Schema.decodeUnknownEffect(Schema.Struct({ error: McpSchema.McpError }))(
        yield* readMcpHttpResponse(response)
      )
      assert.strictEqual(result.error.code, -32602)
    }))

  for (const method of ["tasks/get", "tasks/update", "tasks/cancel"]) {
    it.effect(`should report an unavailable method when a ${protocol.protocolVersion} client calls ${method}`, () =>
      Effect.gen(function*() {
        const harness = yield* makeHttpHarness(server)
        const legacyHeaders = yield* initializeHttpSession(harness, protocol)
        const response = yield* harness.post({
          jsonrpc: "2.0",
          id: 1,
          method,
          params: { taskId: "missing", inputResponses: {} }
        }, legacyHeaders)
        const result = yield* Schema.decodeUnknownEffect(Schema.Struct({ error: McpSchema.McpError }))(
          yield* readMcpHttpResponse(response)
        )
        assert.strictEqual(result.error.code, -32601)
      }))
  }
}

for (const status of ["completed", "failed", "cancelled"] as const) {
  it.effect(`should preserve terminal state when a client updates or cancels a ${status} task`, () =>
    Effect.gen(function*() {
      const execution = yield* McpTasks.Execution
      const finished = yield* Deferred.make<void>()
      const started = yield* Deferred.make<void>()
      const context = McpSchema.McpRequestContext.of({
        clientId: 1,
        protocolVersion: "2026-07-28",
        clientCapabilities: {}
      })
      const run = status === "completed" ?
        Effect.succeed(new McpSchema.CallToolResult({ content: [] }))
        : status === "failed"
        ? Effect.fail(new McpTasks.TaskError({ code: -32603, message: "expected failure" }))
        : Effect.never
      const task = yield* execution.create(
        Deferred.succeed(started, undefined).pipe(
          Effect.andThen(run),
          Effect.ensuring(Deferred.succeed(finished, undefined))
        ),
        context,
        {}
      )
      yield* Deferred.await(started)
      if (status === "cancelled") yield* execution.cancel(task.taskId, context)
      yield* Deferred.await(finished)
      yield* Effect.yieldNow
      const before = yield* execution.get(task.taskId, context)
      assert.strictEqual(before.status, status)
      yield* execution.update(task.taskId, { unknown: { roots: [] } }, context)
      yield* execution.cancel(task.taskId, context)
      assert.deepStrictEqual(yield* execution.get(task.taskId, context), before)
    }).pipe(Effect.provide(McpTasks.layerMemory({ maxActive: 1, maxRecords: 1, owner: "shared" }))))
}

it.effect("should keep capability decisions independent when supported and unsupported clients call concurrently", () =>
  Effect.gen(function*() {
    const harness = yield* makeHttpHarness(server)
    const [supported, unsupported] = yield* Effect.all([
      harness.post(request(1, "tools/call", { name: "slow", arguments: {} }), headers("tools/call", "slow")),
      harness.post(request(2, "tools/call", { name: "slow", arguments: {} }, {}), headers("tools/call", "slow"))
    ], { concurrency: 2 })
    yield* Schema.decodeUnknownEffect(Schema.Struct({ result: TaskWire.CreateTaskResult }))(
      yield* readMcpHttpResponse(supported)
    )
    const rejected = yield* Schema.decodeUnknownEffect(Schema.Struct({ error: McpSchema.McpError }))(
      yield* readMcpHttpResponse(unsupported)
    )
    assert.strictEqual(rejected.error.code, -32021)
  }))

for (const capability of ["absent", "empty", "context", "tools"] as const) {
  for (const feature of ["plain", "context", "tools"] as const) {
    it.effect(`should ${capability !== "absent" && (feature === "plain" || feature === capability) ? "expose" : "reject"} sampling input when ${feature} sampling is requested with ${capability} support`, () =>
      Effect.gen(function*() {
        const execution = yield* McpTasks.Execution
        const finished = yield* Deferred.make<void>()
        const supported = capability !== "absent" && (feature === "plain" || feature === capability)
        const context = McpSchema.McpRequestContext.of({
          clientId: 1,
          protocolVersion: "2026-07-28",
          clientCapabilities: capability === "absent" ? {} : {
            sampling: capability === "context" ? { context: {} } : capability === "tools" ? { tools: {} } : {}
          }
        })
        const sampling = Schema.decodeUnknownSync(McpSchema.CreateMessage.payloadSchema)({
          messages: [{ role: "user", content: { type: "text", text: "sample" } }],
          maxTokens: 64,
          ...(feature === "context" ? { includeContext: "thisServer" } : {}),
          ...(feature === "tools" ? { toolChoice: { mode: "auto" } } : {})
        })
        const task = yield* execution.create(
          McpTasks.Input.use((input) => input.sampling(sampling)).pipe(
            Effect.as("accepted"),
            Effect.catchTag("McpTasksInputUnavailable", () => Effect.succeed("unsupported")),
            Effect.map((text) => new McpSchema.CallToolResult({ content: [{ type: "text", text }] })),
            Effect.onExit(() => Deferred.succeed(finished, undefined))
          ),
          context,
          {}
        )
        yield* Effect.gen(function*() {
          yield* Effect.yieldNow
          if (supported) {
            const pending = yield* execution.get(task.taskId, context)
            if (pending.status !== "input_required") return assert.fail("Expected sampling input")
            const key = Object.keys(pending.inputRequests)[0]
            assert.isDefined(key)
            const input = pending.inputRequests[key]
            assert.strictEqual(input?.method, "sampling/createMessage")
            if (input?.method === "sampling/createMessage") {
              assert.deepStrictEqual(input.params.messages, [{
                role: "user",
                content: { type: "text", text: "sample" }
              }])
              assert.strictEqual(input.params.maxTokens, 64)
              if (feature === "context") assert.strictEqual(input.params.includeContext, "thisServer")
              if (feature === "tools") assert.deepStrictEqual(input.params.toolChoice, { mode: "auto" })
            }
            yield* execution.update(task.taskId, {
              [key]: { role: "assistant", content: { type: "text", text: "reply" }, model: "test" }
            }, context)
          }
          yield* Deferred.await(finished)
          const completed = yield* execution.get(task.taskId, context)
          if (completed.status !== "completed") return assert.fail("Expected completed task")
          assert.deepStrictEqual(completed.result.content, [{
            type: "text",
            text: supported ? "accepted" : "unsupported"
          }])
        }).pipe(Effect.ensuring(execution.cancel(task.taskId, context).pipe(Effect.orDie)))
      }).pipe(Effect.provide(McpTasks.layerMemory({ maxActive: 1, maxRecords: 1, owner: "shared" }))))
  }
}

for (const capability of ["absent", "empty", "form", "url"] as const) {
  for (const mode of ["form", "url"] as const) {
    it.effect(`should ${capability === mode || (capability === "empty" && mode === "form") ? "expose" : "reject"} elicitation input when ${mode} input is requested with ${capability} support`, () =>
      Effect.gen(function*() {
        const execution = yield* McpTasks.Execution
        const finished = yield* Deferred.make<void>()
        const supported = capability === mode || (capability === "empty" && mode === "form")
        const context = McpSchema.McpRequestContext.of({
          clientId: 1,
          protocolVersion: "2026-07-28",
          clientCapabilities: capability === "absent" ? {} : {
            elicitation: capability === "form" ? { form: {} } : capability === "url" ? { url: {} } : {}
          }
        })
        const elicitation = Schema.decodeUnknownSync(McpSchema.Elicit.payloadSchema)(
          mode === "form"
            ? { mode, message: "Approve", requestedSchema: { type: "object", properties: {} } }
            : { mode, message: "Approve", url: "https://example.com/approve", elicitationId: "approval" }
        )
        const task = yield* execution.create(
          McpTasks.Input.use((input) => input.elicitation(elicitation, Schema.Struct({}))).pipe(
            Effect.as("accepted"),
            Effect.catchTag("McpTasksInputUnavailable", () => Effect.succeed("unsupported")),
            Effect.map((text) => new McpSchema.CallToolResult({ content: [{ type: "text", text }] })),
            Effect.onExit(() => Deferred.succeed(finished, undefined))
          ),
          context,
          {}
        )
        yield* Effect.gen(function*() {
          yield* Effect.yieldNow
          if (supported) {
            const pending = yield* execution.get(task.taskId, context)
            if (pending.status !== "input_required") return assert.fail("Expected elicitation input")
            const key = Object.keys(pending.inputRequests)[0]
            assert.isDefined(key)
            const input = pending.inputRequests[key]
            assert.strictEqual(input?.method, "elicitation/create")
            if (input?.method === "elicitation/create") {
              assert.strictEqual(input.params.message, "Approve")
              if (mode === "url") assert.strictEqual(input.params.url, "https://example.com/approve")
              else assert.deepStrictEqual(input.params.requestedSchema, { type: "object", properties: {} })
            }
            yield* execution.update(task.taskId, { [key]: { action: "decline" } }, context)
          }
          yield* Deferred.await(finished)
          const completed = yield* execution.get(task.taskId, context)
          if (completed.status !== "completed") return assert.fail("Expected completed task")
          assert.deepStrictEqual(completed.result.content, [{
            type: "text",
            text: supported ? "accepted" : "unsupported"
          }])
        }).pipe(Effect.ensuring(execution.cancel(task.taskId, context).pipe(Effect.orDie)))
      }).pipe(Effect.provide(McpTasks.layerMemory({ maxActive: 1, maxRecords: 1, owner: "shared" }))))
  }
}

it.effect("should admit another task after record expiry when completed records fill retention capacity", () =>
  Effect.gen(function*() {
    const execution = yield* McpTasks.Execution
    const completed = yield* Deferred.make<void>()
    const context = McpSchema.McpRequestContext.of({
      clientId: 1,
      protocolVersion: "2026-07-28",
      clientCapabilities: {}
    })
    const first = yield* execution.create(
      Effect.succeed(new McpSchema.CallToolResult({ content: [] })).pipe(
        Effect.ensuring(Deferred.succeed(completed, undefined))
      ),
      context,
      {}
    )
    yield* Deferred.await(completed)
    yield* Effect.yieldNow
    assert.strictEqual((yield* execution.get(first.taskId, context)).status, "completed")
    const refused = yield* Effect.result(
      execution.create(Effect.succeed(new McpSchema.CallToolResult({ content: [] })), context, {})
    )
    assert.strictEqual(refused._tag, "Failure")
    if (refused._tag === "Failure") assert.strictEqual(refused.failure.code, -32000)
    yield* TestClock.adjust("10 millis")
    const next = yield* execution.create(Effect.succeed(new McpSchema.CallToolResult({ content: [] })), context, {})
    assert.notStrictEqual(next.taskId, first.taskId)
    const expired = yield* Effect.result(execution.get(first.taskId, context))
    assert.strictEqual(expired._tag, "Failure")
    if (expired._tag === "Failure") assert.strictEqual(expired.failure.code, -32602)
  }).pipe(
    Effect.provide(McpTasks.layerMemory({ maxActive: 1, maxRecords: 1, owner: "shared", retention: "10 millis" }))
  ))

describe("Task binding", () => {
  const invocation: McpCore.McpInvocation = {
    clientId: 1,
    protocol: { protocolVersion: "2026-07-28", clientCapabilities: {}, clientInfo: undefined },
    requestContext: { clientId: 1, protocolVersion: "2026-07-28", clientCapabilities: {} }
  }

  it.effect("should share a binding within one core when multiple callers obtain task integration", () =>
    Effect.gen(function*() {
      const core = yield* McpCore.make
      assert.strictEqual(TasksBinding.get(core), TasksBinding.get(core))
      assert.notStrictEqual(TasksBinding.get(core), TasksBinding.get(yield* McpCore.make))
    }))

  for (const operation of ["get", "update", "cancel"] as const) {
    it.effect(`should use the current backend when a previously constructed ${operation} effect runs`, () =>
      Effect.gen(function*() {
        const binding = TasksBinding.get(yield* McpCore.make)
        const now = yield* DateTime.now
        const task: McpTasks.DetailedTask = {
          taskId: Schema.decodeUnknownSync(McpTasks.TaskId)("task"),
          status: "working",
          createdAt: now,
          lastUpdatedAt: now,
          ttl: Duration.seconds(1)
        }
        let observed = ""
        const record = (name: string, taskId: string, request: McpCore.McpInvocation) =>
          Effect.sync(() => {
            assert.strictEqual(taskId, "task")
            assert.strictEqual(request, invocation)
            observed = name
          })
        const operations = (name: string): Parameters<TasksBinding.Tasks["install"]>[1] => ({
          get: (taskId, request) => record(name, taskId, request).pipe(Effect.as(task)),
          update: (taskId, responses, request) => {
            assert.deepStrictEqual(responses, { roots: { roots: [] } })
            return record(name, taskId, request)
          },
          cancel: (taskId, request) => record(name, taskId, request)
        })
        const pending = operation === "get" ?
          binding.get("task", invocation)
          : operation === "update" ?
          binding.update("task", { roots: { roots: [] } }, invocation)
          : binding.cancel("task", invocation)
        const identity = {}
        yield* binding.install(identity, operations("first"))
        yield* pending
        assert.strictEqual(observed, "first")
        yield* binding.install(identity, operations("second"))
        yield* pending
        assert.strictEqual(observed, "second")
      }))
  }

  it.effect("should return decorated tasks and preserve inline execution when registration occurs after effect construction", () =>
    Effect.gen(function*() {
      const core = yield* McpCore.make
      const binding = TasksBinding.get(core)
      const payload = { name: "late", arguments: {} }
      const pending = binding.call(payload, invocation)
      const inline = binding.runInline(payload, invocation)
      const value = new McpSchema.CallToolResult({ content: [{ type: "text", text: "inline" }] })
      yield* core.tools.register({
        descriptor: new McpSchema.Tool({ name: "late", inputSchema: { type: "object" } }),
        isVisible: () => true,
        handle: () => Effect.succeed(McpCore.OperationOutcome.Complete(value))
      })
      const now = yield* DateTime.now
      const task: McpTasks.DetailedTask = {
        taskId: Schema.decodeUnknownSync(McpTasks.TaskId)("late-task"),
        status: "working",
        createdAt: now,
        lastUpdatedAt: now,
        ttl: Duration.seconds(1)
      }
      yield* binding.register("late", "required", () => Effect.succeed({ _tag: "Task", task }))
      assert.deepStrictEqual(yield* pending, { _tag: "Task", task })
      assert.deepStrictEqual(yield* inline, McpCore.OperationOutcome.Complete(value))
    }))
})

it.effect("should capture handler services and construction values when handlers are built with an effect", () =>
  Effect.gen(function*() {
    class Prefix extends Context.Service<Prefix, string>()("test/TaskHandlerPrefix") {}
    class Factory extends Context.Service<Factory, string>()("test/TaskHandlerFactory") {}
    const selected = Toolkit.make(Tool.make("report", { parameters: Tool.EmptyParams, success: Schema.String }))
    const registration = McpTasks.toolkit(
      selected,
      {},
      Effect.gen(function*() {
        const suffix = yield* Factory
        return {
          report: Effect.fnUntraced(function*() {
            const prefix = yield* Prefix
            const context = yield* McpTasks.TaskContext
            return `${prefix}:${suffix}:${context.mode}`
          })
        }
      })
    ).pipe(McpTasks.toLayer).pipe(
      Layer.provideMerge(McpTasks.layerMemory({ maxActive: 1, maxRecords: 1, owner: "shared" })),
      Layer.provideMerge(makeServerLayer({ name: "InferredHandlers", protocols: [McpProtocol.v2026_07_28] })),
      Layer.provide(Layer.succeed(Prefix, "captured")),
      Layer.provide(Layer.succeed(Factory, "built"))
    )
    const harness = yield* makeHttpHarness(registration)
    const response = yield* harness.post(
      request(1, "tools/call", { name: "report", arguments: {} }),
      headers("tools/call", "report")
    )
    const { result } = yield* Schema.decodeUnknownEffect(Schema.Struct({ result: TaskWire.CallToolResult }))(
      yield* readMcpHttpResponse(response)
    )
    assert.strictEqual(result.structuredContent, "captured:built:inline")
  }))

it.effect("should return a mock result without task input when an interactive handler is replaced", () =>
  Effect.gen(function*() {
    const selected = Toolkit.make(Ask)
    const registration = McpTasks.toolkit(selected, {}, { ask: () => Effect.succeed("mocked") }).pipe(McpTasks.toLayer)
      .pipe(
        Layer.provideMerge(McpTasks.layerMemory({ maxActive: 1, maxRecords: 1, owner: "shared" })),
        Layer.provideMerge(makeServerLayer({ name: "MockHandlers", protocols: [McpProtocol.v2026_07_28] }))
      )
    const harness = yield* makeHttpHarness(registration)
    const response = yield* harness.post(
      request(1, "tools/call", { name: "ask", arguments: {} }, {}),
      headers("tools/call", "ask")
    )
    const { result } = yield* Schema.decodeUnknownEffect(Schema.Struct({ result: TaskWire.CallToolResult }))(
      yield* readMcpHttpResponse(response)
    )
    assert.strictEqual(result.structuredContent, "mocked")
  }))

it.effect("should preserve JSON-RPC error details when task execution fails", () =>
  Effect.gen(function*() {
    const execution = yield* McpTasks.Execution
    const context = McpSchema.McpRequestContext.of({
      clientId: 1,
      protocolVersion: "2026-07-28",
      clientCapabilities: {}
    })
    const error = new McpTasks.TaskError({
      code: -32021,
      message: "Missing capability",
      data: { requiredCapabilities: { roots: {} } }
    })
    const task = yield* execution.create(Effect.fail(error), context, {})
    yield* Effect.yieldNow
    const result = yield* execution.get(task.taskId, context)
    assert.strictEqual(result.status, "failed")
    if (result.status === "failed") {
      assert.deepStrictEqual(result.error, { code: error.code, message: error.message, data: error.data })
    }
  }).pipe(Effect.provide(McpTasks.layerMemory({ maxActive: 1, maxRecords: 1, owner: "shared" }))))

for (const operation of ["update", "cancel"] as const) {
  it.effect(`should retrieve and ${operation} tasks from both stores when toolkits have separate memory layers`, () =>
    Effect.gen(function*() {
      const first = Toolkit.make(Tool.make("first", { parameters: Tool.EmptyParams, success: Schema.String }))
      const second = Toolkit.make(Tool.make("second", { parameters: Tool.EmptyParams, success: Schema.String }))
      const run = () => McpTasks.Input.use((input) => input.roots()).pipe(Effect.orDie, Effect.as("done"))
      const firstLayer = McpTasks.toolkit(first, { first: { mode: "required" } }, { first: run }).pipe(
        McpTasks.toLayer
      ).pipe(
        Layer.provide(McpTasks.layerMemory({ maxActive: 1, maxRecords: 1, owner: "shared", shutdownWait: "1 milli" }))
      )
      const secondLayer = McpTasks.toolkit(second, { second: { mode: "required" } }, { second: run }).pipe(
        McpTasks.toLayer
      ).pipe(
        Layer.provide(McpTasks.layerMemory({ maxActive: 1, maxRecords: 1, owner: "shared", shutdownWait: "1 milli" }))
      )
      const registration = Layer.mergeAll(firstLayer, secondLayer).pipe(
        Layer.provideMerge(makeServerLayer({ name: "MultipleStores", protocols: [McpProtocol.v2026_07_28] }))
      )
      const harness = yield* makeHttpHarness(registration)
      const created: Array<string> = []
      for (const name of ["first", "second"] as const) {
        const response = yield* harness.post(
          request(1, "tools/call", { name, arguments: {} }, {
            extensions: { "io.modelcontextprotocol/tasks": {} },
            roots: {}
          }),
          headers("tools/call", name)
        )
        const { result } = yield* Schema.decodeUnknownEffect(Schema.Struct({ result: TaskWire.CreateTaskResult }))(
          yield* readMcpHttpResponse(response)
        )
        created.push(result.taskId)
      }
      for (const taskId of created) {
        const pending = yield* awaitStatus(harness, taskId, "input_required")
        assert.strictEqual(pending.status, "input_required")
        if (pending.status !== "input_required") continue
        const responses = Object.fromEntries(Object.keys(pending.inputRequests).map((key) => [key, { roots: [] }]))
        const method = operation === "update" ? "tasks/update" : "tasks/cancel"
        const response = yield* harness.post(
          request(2, method, {
            taskId,
            ...(operation === "update" ? { inputResponses: responses } : {})
          }),
          headers(method, taskId)
        )
        yield* Schema.decodeUnknownEffect(Schema.Struct({ result: Schema.JsonObject }))(
          yield* readMcpHttpResponse(response)
        )
        const terminal = yield* awaitStatus(harness, taskId, operation === "update" ? "completed" : "cancelled")
        assert.strictEqual(terminal.status, operation === "update" ? "completed" : "cancelled")
      }
    }))
}

it.effect("should admit new work without further polling when an abandoned input request expires", () =>
  Effect.gen(function*() {
    const execution = yield* McpTasks.Execution
    const context = McpSchema.McpRequestContext.of({
      clientId: 1,
      protocolVersion: "2026-07-28",
      clientCapabilities: { roots: {} }
    })
    const waiting = yield* execution.create(
      McpTasks.Input.use((input) => input.roots()).pipe(
        Effect.as(new McpSchema.CallToolResult({ content: [] }))
      ),
      context,
      {}
    )
    yield* Effect.yieldNow
    assert.strictEqual((yield* execution.get(waiting.taskId, context)).status, "input_required")
    yield* TestClock.adjust("2 millis")
    const next = yield* execution.create(Effect.succeed(new McpSchema.CallToolResult({ content: [] })), context, {})
    assert.notStrictEqual(next.taskId, waiting.taskId)
  }).pipe(Effect.provide(McpTasks.layerMemory({ maxActive: 1, maxRecords: 1, owner: "shared", retention: "1 milli" }))))

it.effect("should use task toolkit handlers directly with supplied task services", () =>
  Effect.gen(function*() {
    const selected = Toolkit.make(Tool.make("report", { success: Schema.String, failure: Schema.String }))
    const definition = McpTasks.toolkit(selected, { report: { mode: "required" } }, {
      report: Effect.fnUntraced(function*() {
        const task = yield* McpTasks.TaskContext
        const input = yield* McpTasks.Input
        const roots = yield* input.roots().pipe(Effect.mapError((error) => error.message))
        return `${task.mode}:${roots.roots.length}`
      })
    })
    const handlers = yield* selected.pipe(Effect.provide(definition.pipe(
      Layer.provide(Layer.succeed(McpTasks.TaskContext, { mode: "inline", setStatus: () => Effect.void })),
      Layer.provide(Layer.succeed(McpTasks.Input, {
        roots: () => Effect.succeed(new McpSchema.ListRootsResult({ roots: [] })),
        sampling: () => Effect.die("Unexpected sampling request"),
        elicitation: () => Effect.die("Unexpected elicitation request")
      }))
    )))
    const result = yield* handlers.handle("report", {}).pipe(Effect.flatMap(Stream.runCollect))
    assert.strictEqual(result[0]?.result, "inline:0")
  }))

it.effect("should expose MCP handlers and reject direct calls without an MCP execution context", () =>
  Effect.gen(function*() {
    const selected = Toolkit.make(Tool.make("report", { success: Schema.String }))
    const definition = McpTasks.toolkit(selected, { report: { mode: "required" } }, {
      report: () => Effect.die("Must not execute outside an MCP request")
    })
    const handlers = yield* selected.pipe(Effect.provide(definition.pipe(
      McpTasks.toLayer,
      Layer.provide(McpTasks.layerMemory({ maxActive: 1, maxRecords: 1, owner: "shared" }))
    )))
    const result = yield* handlers.handle("report", {}).pipe(Effect.flatMap(Stream.runCollect), Effect.result)
    assert.strictEqual(result._tag, "Failure")
    if (result._tag === "Failure") {
      assert.strictEqual(AiError.isAiError(result.failure), true)
      assert.strictEqual(result.failure.message.includes("require an active MCP request and execution context"), true)
    }
  }))

const FallbackReports = Toolkit.make(Tool.make("report", {
  parameters: Schema.Struct({ rows: Schema.NumberFromString }),
  success: Schema.String,
  failure: Schema.String
}))
const fallbackServer = McpTasks.toolkit(FallbackReports, {
  report: { mode: "optional", whenUnavailable: "inline" }
}, {
  report: {
    task: Effect.fnUntraced(function*({ rows }) {
      const input = yield* McpTasks.Input
      const roots = yield* input.roots().pipe(Effect.mapError((error) => error.message))
      return `task:${rows}:${roots.roots.length}`
    }),
    inline: Effect.fnUntraced(function*({ rows }) {
      const context = yield* McpTasks.TaskContext
      return `inline:${rows}:${context.mode}`
    })
  }
}).pipe(
  McpTasks.toLayer,
  Layer.provide(McpTasks.layerMemory({ maxActive: 1, maxRecords: 4, owner: "shared" })),
  Layer.provideMerge(makeServerLayer({
    name: "FallbackReports",
    protocols: [
      McpProtocol.v2026_07_28,
      McpProtocol.v2025_11_25,
      McpProtocol.v2025_06_18,
      McpProtocol.v2025_03_26,
      McpProtocol.v2024_11_05
    ]
  }))
)

for (
  const protocol of [
    McpProtocol.v2026_07_28,
    McpProtocol.v2025_11_25,
    McpProtocol.v2025_06_18,
    McpProtocol.v2025_03_26,
    McpProtocol.v2024_11_05
  ]
) {
  it.effect(`should expose one report tool and use inline execution without Tasks on ${protocol.protocolVersion}`, () =>
    Effect.gen(function*() {
      const harness = yield* makeHttpHarness(fallbackServer)
      const july = protocol.protocolVersion === "2026-07-28"
      const clientHeaders = july ? headers("tools/list") : yield* initializeHttpSession(harness, protocol)
      const listed = yield* harness.post(
        july ? request(1, "tools/list", {}, {}) : {
          jsonrpc: "2.0",
          id: 1,
          method: "tools/list",
          params: {}
        },
        clientHeaders
      )
      const tools = yield* Schema.decodeUnknownEffect(Schema.Struct({
        result: Schema.Struct({
          tools: Schema.Array(Schema.Struct({ name: Schema.String }))
        })
      }))(yield* readMcpHttpResponse(listed))
      assert.deepStrictEqual(tools.result.tools, [{ name: "report" }])
      const params = { name: "report", arguments: { rows: "12" } }
      const response = yield* harness.post(
        july ? request(2, "tools/call", params, {}) : {
          jsonrpc: "2.0",
          id: 2,
          method: "tools/call",
          params
        },
        july ? headers("tools/call", "report") : clientHeaders
      )
      const result = yield* Schema.decodeUnknownEffect(Schema.Struct({ result: McpSchema.CallToolResult }))(
        yield* readMcpHttpResponse(response)
      )
      assert.deepStrictEqual(result.result.content, [{
        type: "text",
        text: july ? JSON.stringify("inline:12:inline") : "inline:12:inline"
      }])
    }))
}

it.effect("should select task or inline handlers from each July request's capabilities", () =>
  Effect.gen(function*() {
    const harness = yield* makeHttpHarness(fallbackServer)
    const params = { name: "report", arguments: { rows: "12" } }
    const response = yield* harness.post(
      request(1, "tools/call", params, {
        extensions: { "io.modelcontextprotocol/tasks": {} },
        roots: {}
      }),
      headers("tools/call", "report")
    )
    const created = yield* Schema.decodeUnknownEffect(Schema.Struct({ result: TaskWire.CreateTaskResult }))(
      yield* readMcpHttpResponse(response)
    )
    const taskId = created.result.taskId
    const waiting = yield* awaitStatus(harness, taskId, "input_required")
    if (waiting.status !== "input_required") return assert.fail("Expected roots input")
    const key = Object.keys(waiting.inputRequests)[0]!
    const inline = yield* harness.post(request(3, "tools/call", params, {}), headers("tools/call", "report"))
    const result = yield* Schema.decodeUnknownEffect(Schema.Struct({ result: McpSchema.CallToolResult }))(
      yield* readMcpHttpResponse(inline)
    )
    assert.deepStrictEqual(result.result.content, [{ type: "text", text: JSON.stringify("inline:12:inline") }])
    yield* harness.post(
      request(4, "tasks/update", {
        taskId,
        inputResponses: { [key]: { roots: [{ uri: "file:///workspace" }] } }
      }),
      headers("tasks/update", taskId)
    )
    const completed = yield* awaitStatus(harness, taskId, "completed")
    if (completed.status !== "completed") return assert.fail("Expected completed report")
    assert.strictEqual(completed.result.structuredContent, "task:12:1")
  }))

it.effect("should reject task admission without using the inline handler when task capacity is occupied", () =>
  Effect.gen(function*() {
    const harness = yield* makeHttpHarness(fallbackServer)
    const params = { name: "report", arguments: { rows: "12" } }
    const response = yield* harness.post(
      request(1, "tools/call", params, {
        extensions: { "io.modelcontextprotocol/tasks": {} },
        roots: {}
      }),
      headers("tools/call", "report")
    )
    const created = yield* Schema.decodeUnknownEffect(Schema.Struct({ result: TaskWire.CreateTaskResult }))(
      yield* readMcpHttpResponse(response)
    )
    yield* awaitStatus(harness, created.result.taskId, "input_required")
    const capacity = yield* harness.post(request(2, "tools/call", params), headers("tools/call", "report"))
    const rejected = yield* Schema.decodeUnknownEffect(Schema.Struct({ error: Schema.Struct({ code: Schema.Int }) }))(
      yield* readMcpHttpResponse(capacity)
    )
    assert.strictEqual(rejected.error.code, -32000)
    yield* harness.post(
      request(3, "tasks/cancel", { taskId: created.result.taskId }),
      headers("tasks/cancel", created.result.taskId)
    )
    yield* awaitStatus(harness, created.result.taskId, "cancelled")
  }))

it.effect("should use the inline handler when a Tasks-capable request explicitly chooses inline", () =>
  Effect.gen(function*() {
    const registration = McpTasks.toolkit(FallbackReports, {
      report: { mode: "optional", whenUnavailable: "inline", decide: () => Effect.succeed("inline") }
    }, {
      report: {
        task: () => Effect.die("Task handler must not run"),
        inline: ({ rows }) => Effect.succeed(`inline:${rows}`)
      }
    }).pipe(
      McpTasks.toLayer,
      Layer.provide(McpTasks.layerMemory({ maxActive: 1, maxRecords: 1, owner: "shared" })),
      Layer.provideMerge(makeServerLayer({ name: "InlineChoice", protocols: [McpProtocol.v2026_07_28] }))
    )
    const harness = yield* makeHttpHarness(registration)
    const response = yield* harness.post(
      request(1, "tools/call", {
        name: "report",
        arguments: { rows: "9" }
      }),
      headers("tools/call", "report")
    )
    const result = yield* Schema.decodeUnknownEffect(Schema.Struct({ result: TaskWire.CallToolResult }))(
      yield* readMcpHttpResponse(response)
    )
    assert.strictEqual(result.result.structuredContent, "inline:9")
  }))

it.effect("should preserve a task failure without invoking its inline alternative", () =>
  Effect.gen(function*() {
    const registration = McpTasks.toolkit(FallbackReports, {
      report: { mode: "optional", whenUnavailable: "inline" }
    }, {
      report: {
        task: () => Effect.fail("Report declined"),
        inline: () => Effect.die("Inline handler must not run after a task failure")
      }
    }).pipe(
      McpTasks.toLayer,
      Layer.provide(McpTasks.layerMemory({ maxActive: 1, maxRecords: 1, owner: "shared" })),
      Layer.provideMerge(makeServerLayer({ name: "TaskFailure", protocols: [McpProtocol.v2026_07_28] }))
    )
    const harness = yield* makeHttpHarness(registration)
    const response = yield* harness.post(
      request(1, "tools/call", {
        name: "report",
        arguments: { rows: "9" }
      }),
      headers("tools/call", "report")
    )
    const created = yield* Schema.decodeUnknownEffect(Schema.Struct({ result: TaskWire.CreateTaskResult }))(
      yield* readMcpHttpResponse(response)
    )
    const completed = yield* awaitStatus(harness, created.result.taskId, "completed")
    if (completed.status !== "completed") return assert.fail("Expected completed error result")
    assert.strictEqual(completed.result.isError, true)
    assert.deepStrictEqual(completed.result.content, [{ type: "text", text: JSON.stringify("Report declined") }])
  }))
