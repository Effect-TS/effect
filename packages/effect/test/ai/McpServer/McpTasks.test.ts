import { assert, describe, it } from "@effect/vitest"
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
import * as Exit from "effect/Exit"
import * as HttpServerRequest from "effect/http/HttpServerRequest"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import * as Scope from "effect/Scope"
import * as Activity from "effect/workflow/Activity"
import * as DurableDeferred from "effect/workflow/DurableDeferred"
import * as Workflow from "effect/workflow/Workflow"
import * as WorkflowEngine from "effect/workflow/WorkflowEngine"
import { initializeHttpSession, makeHttpHarness } from "./TestUtils/McpHttpHarness.ts"
import {
  assertMcpTaskAcknowledgement,
  McpCreatedTask,
  McpTaskSnapshot,
  readMcpHttpResponse
} from "./TestUtils/McpHttpResponse.ts"
import { makeServerLayer } from "./TestUtils/McpServerLayer.ts"

const InlineResult = Schema.Struct({ resultType: Schema.Literal("complete"), structuredContent: Schema.Unknown })

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
    Effect.flatMap(Schema.decodeUnknownEffect(Schema.Struct({ result: McpCreatedTask }))),
    Effect.map(({ result }) => result)
  )

const get = (harness: Harness, taskId: string, capabilities?: McpSchema.ClientCapabilities) =>
  post(harness, "tasks/get", { taskId }, undefined, undefined, capabilities).pipe(
    Effect.flatMap(Schema.decodeUnknownEffect(Schema.Struct({ result: McpTaskSnapshot }))),
    Effect.map(({ result }) => result)
  )

const rootsCapabilities = { ...metadata["io.modelcontextprotocol/clientCapabilities"], roots: {} }

const terminal = Effect.fnUntraced(function*(harness: Harness, taskId: string) {
  for (let attempt = 0; attempt < 200; attempt++) {
    const task = yield* get(harness, taskId, rootsCapabilities)
    if (task.status !== "working" && task.status !== "input_required") return task
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

const waitForInput = Effect.fnUntraced(function*(harness: Harness, taskId: string) {
  for (let attempt = 0; attempt < 100; attempt++) {
    const task = yield* get(harness, taskId, rootsCapabilities)
    if (task.status === "input_required") return task
    yield* Effect.yieldNow
  }
  return assert.fail("Task did not request input")
})

const Fallible = Toolkit.make(Tool.make("report", { success: Schema.String, failure: Schema.String }))

const withWorkflow = <E, R>(execution: Layer.Layer<McpTasks.Execution, E, R>) =>
  McpTasks.toolkit(Fallible, { owner: "shared" }).pipe(
    Layer.provide(execution),
    Layer.provide(WorkflowEngine.layerMemory),
    Layer.provideMerge(serverLayer)
  )

describe("McpTasks", () => {
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

  it.effect("should hide task tools from clients using earlier protocol revisions", () =>
    Effect.gen(function*() {
      const harness = yield* makeHttpHarness(server)
      for (
        const protocol of [
          McpProtocol.v2025_11_25,
          McpProtocol.v2025_06_18,
          McpProtocol.v2025_03_26,
          McpProtocol.v2024_11_05
        ]
      ) {
        const legacyHeaders = yield* initializeHttpSession(harness, protocol)
        const response = yield* harness.post({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }, legacyHeaders)
        const { result } = yield* Schema.decodeUnknownEffect(Schema.Struct({
          result: Schema.Struct({ tools: Schema.Array(Schema.Struct({ name: Schema.String })) })
        }))(yield* readMcpHttpResponse(response))
        assert.deepStrictEqual(result.tools, [], protocol.protocolVersion)
      }
    }))

  it.effect("should require the Tasks capability before starting work", () =>
    Effect.gen(function*() {
      let runs = 0
      const harness = yield* makeHttpHarness(withWorkflow(McpTasks.layerWorkflow(Fallible, {
        report: () =>
          Effect.sync(() => {
            runs++
            return "done"
          })
      }, { name: "capability" })))
      const { error } = yield* decodeError(
        yield* post(harness, "tools/call", { name: "report", arguments: {} }, undefined, false)
      )
      assert.strictEqual(error.code, -32021)
      assert.deepStrictEqual(error.data, {
        requiredCapabilities: { extensions: { "io.modelcontextprotocol/tasks": {} } }
      })
      assert.strictEqual(runs, 0)
      const polled = yield* decodeError(yield* post(harness, "tasks/get", { taskId: "unknown" }, undefined, false))
      assert.strictEqual(polled.error.code, -32021)
    }))

  it.effect("should return the result when a Workflow task completes", () =>
    Effect.gen(function*() {
      const harness = yield* makeHttpHarness(server)
      const created = yield* create(harness)
      assert.strictEqual(created.ttlMs, null)
      const task = yield* terminal(harness, created.taskId)
      assert.strictEqual(task.status, "completed")
      if (task.status !== "completed") return
      assert.strictEqual(task.result.structuredContent, "finished")
      assert.strictEqual(task.createdAt, created.createdAt)
    }))

  for (const defect of [false, true]) {
    it.effect(`should compensate and return a tool error when a handler ${defect ? "dies" : "fails"}`, () =>
      Effect.gen(function*() {
        const ledger: Array<string> = []
        const harness = yield* makeHttpHarness(withWorkflow(McpTasks.layerWorkflow(Fallible, {
          report: Effect.fnUntraced(function*() {
            for (const name of ["reserve", "charge"]) {
              yield* Activity.make({
                name,
                success: Schema.String,
                execute: Effect.sync(() => {
                  ledger.push(name)
                  return name
                })
              }).pipe(Workflow.withCompensation((value) =>
                Effect.sync(() => {
                  ledger.push(`undo:${value}`)
                })
              ))
            }
            return yield* (defect ? Effect.die("secret-token") : Effect.fail("declined"))
          })
        }, { name: "errors" })))
        const task = yield* terminal(harness, (yield* create(harness)).taskId)
        assert.deepStrictEqual(ledger, ["reserve", "charge", "undo:charge", "undo:reserve"])
        assert.strictEqual(task.status, "completed")
        if (task.status !== "completed") return
        assert.strictEqual(task.result.isError, true)
        if (defect) {
          assert.isFalse(JSON.stringify(task).includes("secret-token"))
        } else {
          assert.deepStrictEqual(task.result.content, [{ type: "text", text: JSON.stringify("declined") }])
        }
      }))
  }

  it.effect("should expose input and status and resume the handler when the client answers", () =>
    Effect.gen(function*() {
      const layer = McpTasks.toolkit(Reports, { owner: "shared" }).pipe(
        Layer.provide(McpTasks.layerMemory(Reports, {
          report: Effect.fnUntraced(function*() {
            const task = yield* McpTasks.TaskContext
            yield* task.setStatusMessage("Choose workspace roots")
            const response = yield* task.requestInput({
              key: "roots",
              request: { method: "roots/list" },
              response: Schema.Struct({ roots: Schema.Array(Schema.Struct({ uri: Schema.String })) })
            })
            yield* task.setStatusMessage("Report ready")
            return `Report covers ${response.roots.length} roots`
          }, Effect.orDie)
        })),
        Layer.provideMerge(serverLayer)
      )
      const harness = yield* makeHttpHarness(layer)
      const created = yield* create(harness)
      const waiting = yield* waitForInput(harness, created.taskId)
      assert.strictEqual(waiting.statusMessage, "Choose workspace roots")
      if (waiting.status === "input_required") {
        assert.deepStrictEqual(waiting.inputRequests, { roots: { method: "roots/list" } })
      }
      assertMcpTaskAcknowledgement(
        yield* post(harness, "tasks/update", { taskId: created.taskId, inputResponses: { unknown: { roots: [] } } })
      )
      assert.deepStrictEqual(yield* get(harness, created.taskId, rootsCapabilities), waiting)
      assertMcpTaskAcknowledgement(
        yield* post(harness, "tasks/update", {
          taskId: created.taskId,
          inputResponses: { roots: { roots: [{ uri: "file:///workspace" }] } }
        })
      )
      const completed = yield* terminal(harness, created.taskId)
      assert.strictEqual(completed.status, "completed")
      assert.strictEqual(completed.statusMessage, "Report ready")
      if (completed.status === "completed") {
        assert.strictEqual(completed.result.structuredContent, "Report covers 1 roots")
      }
    }))

  // Workflow interrupts take effect when the execution next suspends.
  for (const waits of [true, false]) {
    it.effect(`should ${waits ? "compensate and cancel a task waiting for input" : "complete a running task"} when it is cancelled`, () =>
      Effect.gen(function*() {
        const ledger: Array<string> = []
        const started = yield* Deferred.make<void>()
        const release = yield* Deferred.make<void>()
        const harness = yield* makeHttpHarness(withWorkflow(McpTasks.layerWorkflow(Fallible, {
          report: Effect.fnUntraced(function*() {
            yield* Activity.make({ name: "reserve", execute: Effect.sync(() => ledger.push("reserve")) }).pipe(
              Workflow.withCompensation(() => Effect.sync(() => ledger.push("undo:reserve")))
            )
            yield* Deferred.succeed(started, undefined)
            if (waits) {
              yield* McpTasks.TaskContext.use((task) =>
                task.requestInput({ key: "roots", request: { method: "roots/list" }, response: Schema.Unknown })
              ).pipe(Effect.orDie)
            } else {
              yield* Deferred.await(release)
            }
            return "finished"
          })
        }, { name: "cancel" })))
        const created = yield* create(harness)
        yield* Deferred.await(started)
        if (waits) yield* waitForInput(harness, created.taskId)
        assertMcpTaskAcknowledgement(yield* post(harness, "tasks/cancel", { taskId: created.taskId }))
        yield* Deferred.succeed(release, undefined)
        const task = yield* terminal(harness, created.taskId)
        assert.strictEqual(task.status, waits ? "cancelled" : "completed")
        assert.deepStrictEqual(ledger, waits ? ["reserve", "undo:reserve"] : ["reserve"])
      }))
  }

  it.effect("should withdraw the losing input and ignore late answers when a durable race resolves", () =>
    Effect.gen(function*() {
      const ask = (key: string) =>
        McpTasks.TaskContext.use((task) =>
          task.requestInput({ key, request: { method: "roots/list" }, response: McpSchema.ListRootsResult })
        ).pipe(Effect.orDie, Effect.map(({ roots }) => roots[0]?.name ?? ""))
      const harness = yield* makeHttpHarness(withWorkflow(McpTasks.layerWorkflow(Fallible, {
        report: Effect.fnUntraced(function*() {
          const winner = yield* DurableDeferred.raceAll({
            name: "choice",
            success: Schema.String,
            error: Schema.Never,
            effects: [ask("left"), ask("right")]
          })
          return `${winner}:${yield* ask("confirm")}`
        })
      }, { name: "race" })))
      const created = yield* create(harness)
      const waitFor = Effect.fnUntraced(function*(keys: ReadonlyArray<string>) {
        for (let attempt = 0; attempt < 100; attempt++) {
          const task = yield* get(harness, created.taskId, rootsCapabilities)
          if (task.status === "input_required" && Object.keys(task.inputRequests).sort().join() === keys.join()) return
          yield* Effect.yieldNow
        }
        return assert.fail(`Task did not request ${keys.join()}`)
      })
      const answer = (inputResponses: Record<string, string>) =>
        post(
          harness,
          "tasks/update",
          {
            taskId: created.taskId,
            inputResponses: Object.fromEntries(
              Object.entries(inputResponses).map((
                [key, name]
              ) => [key, { roots: [{ uri: "file:///workspace", name }] }])
            )
          },
          undefined,
          undefined,
          rootsCapabilities
        )
      yield* waitFor(["left", "right"])
      assertMcpTaskAcknowledgement(yield* answer({ left: "left" }))
      yield* waitFor(["confirm"])
      assertMcpTaskAcknowledgement(yield* answer({ right: "late" }))
      yield* waitFor(["confirm"])
      assertMcpTaskAcknowledgement(yield* answer({ confirm: "yes" }))
      const task = yield* terminal(harness, created.taskId)
      assert.strictEqual(task.status, "completed")
      if (task.status === "completed") assert.strictEqual(task.result.structuredContent, "left:yes")
    }))

  it.effect("should reject task requests from another owner, with an invalid handle, or with a mismatched Mcp-Name", () =>
    Effect.gen(function*() {
      const layer = McpTasks.toolkit(Reports, {
        owner: HttpServerRequest.HttpServerRequest.useSync((request) => request.headers["x-test-owner"] ?? "anonymous")
      }).pipe(
        Layer.provide(McpTasks.layerWorkflow(Reports, { report: () => Effect.never }, { name: "ownership" })),
        Layer.provide(WorkflowEngine.layerMemory),
        // The owner must come from each task request, not the request active while the layer was built.
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
      const { result: task } = yield* Schema.decodeUnknownEffect(Schema.Struct({ result: McpCreatedTask }))(
        yield* ownedPost("alice", "tools/call", { name: "report", arguments: {} })
      )
      yield* Schema.decodeUnknownEffect(Schema.Struct({ result: McpTaskSnapshot }))(
        yield* ownedPost("alice", "tasks/get", { taskId: task.taskId })
      )
      const mismatched = yield* harness.post(request("tasks/get", { taskId: task.taskId }), {
        ...headers("tasks/get", "another-task"),
        "x-test-owner": "alice"
      })
      assert.strictEqual(mismatched.status, 400)
      assert.strictEqual((yield* decodeError(yield* readMcpHttpResponse(mismatched))).error.code, -32020)
      for (const [owner, taskId] of [["bob", task.taskId], ["alice", "malformed"]]) {
        for (const method of ["tasks/get", "tasks/update", "tasks/cancel"]) {
          const { error } = yield* decodeError(
            yield* ownedPost(owner, method, {
              taskId,
              ...(method === "tasks/update" ? { inputResponses: {} } : {})
            })
          )
          assert.strictEqual(error.code, -32602, `${owner} ${method}`)
        }
      }
    }))

  it.effect("should dispatch to an inline tool that replaces a task tool while existing tasks continue", () =>
    Effect.gen(function*() {
      const release = yield* Deferred.make<void>()
      const registry = yield* Deferred.make<McpServer.McpServer["Service"]>()
      const layer = Layer.mergeAll(
        McpTasks.toolkit(Reports, { owner: "shared" }).pipe(
          Layer.provide(McpTasks.layerMemory(Reports, {
            report: () => Deferred.await(release).pipe(Effect.as("original task"))
          }))
        ),
        Layer.effectDiscard(McpServer.McpServer.use((server) => Deferred.succeed(registry, server)))
      ).pipe(Layer.provideMerge(serverLayer))
      const harness = yield* makeHttpHarness(layer)
      const first = yield* create(harness)
      const server = yield* Deferred.await(registry)
      yield* server.addTool({
        tool: new McpSchema.Tool({ name: "report", inputSchema: { type: "object", properties: {} } }),
        annotations: Context.empty(),
        handle: () =>
          Effect.succeed(new McpSchema.CallToolResult({ content: [], structuredContent: "replacement result" }))
      })
      const called = yield* Schema.decodeUnknownEffect(Schema.Struct({ result: InlineResult }))(
        yield* post(harness, "tools/call", { name: "report", arguments: {} })
      )
      assert.strictEqual(called.result.structuredContent, "replacement result")
      yield* Deferred.succeed(release, undefined)
      const completed = yield* terminal(harness, first.taskId)
      assert.strictEqual(completed.status, "completed")
      if (completed.status === "completed") assert.strictEqual(completed.result.structuredContent, "original task")
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
      yield* Scope.close(scope, Exit.void)
      yield* Deferred.await(stopped)
      const missing = yield* execution.get({ taskId: created.taskId, ownerId: "owner" }).pipe(Effect.flip)
      assert.instanceOf(missing, McpTasks.TaskError)
      assert.strictEqual(missing.code, -32602)
    }))

  it.effect("should drive a custom Execution through create, get, update and cancel", () =>
    Effect.gen(function*() {
      const now = DateTime.makeUnsafe("2026-10-17T10:00:00.000Z")
      const base = {
        taskId: "external-report",
        createdAt: now,
        lastUpdatedAt: now,
        ttlMs: 60_000,
        pollIntervalMs: 1000
      }
      const calls: Array<string> = []
      let answered = false
      const execution: McpTasks.Execution["Service"] = {
        create: ({ toolName, ownerId }) =>
          Effect.sync(() => {
            calls.push(`create:${toolName}:${ownerId}`)
            return { ...base, status: "working" as const }
          }),
        get: () =>
          Effect.succeed(
            answered
              ? {
                ...base,
                status: "completed",
                result: new McpSchema.CallToolResult({ content: [{ type: "text", text: "report ready" }] })
              }
              : { ...base, status: "input_required", inputRequests: { roots: { method: "roots/list" } } }
          ),
        update: ({ inputResponses }) =>
          Effect.sync(() => {
            assert.deepStrictEqual(inputResponses, { roots: { roots: [{ uri: "file:///workspace" }] } })
            answered = true
          }),
        cancel: ({ taskId, ownerId }) =>
          Effect.sync(() => {
            calls.push(`cancel:${taskId}:${ownerId}`)
          })
      }
      const layer = McpTasks.toolkit(Reports, { owner: "shared" }).pipe(
        Layer.provide(Layer.succeed(McpTasks.Execution, execution)),
        Layer.provideMerge(serverLayer)
      )
      const harness = yield* makeHttpHarness(layer)
      const created = yield* create(harness)
      assert.strictEqual(created.pollIntervalMs, 1000)
      // Pending input is only readable by clients that declare the capability it needs.
      const unsupported = yield* decodeError(yield* post(harness, "tasks/get", { taskId: created.taskId }))
      assert.strictEqual(unsupported.error.code, -32021)
      assert.deepStrictEqual(unsupported.error.data, { requiredCapabilities: { roots: {} } })
      const waiting = yield* get(harness, created.taskId, rootsCapabilities)
      if (waiting.status !== "input_required") return assert.fail("Expected input_required")
      assert.deepStrictEqual(waiting.inputRequests, { roots: { method: "roots/list" } })
      yield* post(harness, "tasks/update", {
        taskId: created.taskId,
        inputResponses: { roots: { roots: [{ uri: "file:///workspace" }] } }
      })
      const completed = yield* get(harness, created.taskId, rootsCapabilities)
      if (completed.status !== "completed") return assert.fail("Expected completion")
      assert.deepStrictEqual(completed.result.content, [{ type: "text", text: "report ready" }])
      assertMcpTaskAcknowledgement(yield* post(harness, "tasks/cancel", { taskId: created.taskId }))
      assert.deepStrictEqual(calls, ["create:report:shared", "cancel:external-report:shared"])
    }))
})
