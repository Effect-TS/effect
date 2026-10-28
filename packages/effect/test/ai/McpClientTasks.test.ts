import { assert, describe, it } from "@effect/vitest"
import { Context, DateTime, Deferred, Effect, Exit, Fiber, Layer, Queue, Schema, Scope, Stream } from "effect"
import { McpClient, McpProtocol, McpSchema, McpServer, McpTasks, Tool, Toolkit } from "effect/ai"
import * as FetchHttpClient from "effect/http/FetchHttpClient"
import * as TestClock from "effect/testing/TestClock"
import { makeHttpHarness, MCP_ENDPOINT } from "./McpServer/TestUtils/McpHttpHarness.ts"
import { makeServerLayer } from "./McpServer/TestUtils/McpServerLayer.ts"

const Reports = Toolkit.make(Tool.make("report", { success: Schema.String, failure: Schema.String }))
const Inline = Toolkit.make(Tool.make("inline", { success: Schema.String }))
const answerSchema = Schema.Struct({
  action: Schema.Literal("accept"),
  content: Schema.Struct({ value: Schema.String })
})
const ask = (key: string) =>
  McpTasks.TaskContext.use((task) =>
    task.requestInput({
      key,
      request: {
        method: "elicitation/create",
        params: {
          mode: "form",
          message: `Enter ${key}`,
          requestedSchema: { type: "object", properties: { value: { type: "string" } }, required: ["value"] }
        }
      },
      response: answerSchema
    }).pipe(Effect.orDie)
  )

const connect = Effect.fnUntraced(function*<R = never>(
  run: Effect.Effect<string, string, McpTasks.TaskContext>,
  options: Partial<McpClient.ClientOptions<R>> & {
    readonly execution?: McpTasks.Execution["Service"] | undefined
    readonly registration?: Layer.Layer<never, never, McpServer.McpServer> | undefined
  } = {}
) {
  const { execution, registration = Layer.empty, ...clientOptions } = options
  const server = Layer.mergeAll(
    registration,
    McpTasks.toolkit(
      Reports,
      { owner: "shared" },
      (tools) =>
        execution === undefined
          ? McpTasks.layerMemory(tools, { report: () => run })
          : Layer.succeed(McpTasks.Execution, execution)
    ),
    McpServer.toolkit(Inline).pipe(Layer.provide(Inline.toLayer({ inline: () => Effect.succeed("inline result") })))
  ).pipe(Layer.provideMerge(makeServerLayer({ name: "Tasks", protocols: [McpProtocol.v2026_07_28] })))
  const { handler } = yield* makeHttpHarness(server)
  const requests: Array<{ message: McpSchema.JsonRpcRequest; headers: Headers }> = []
  const observed = yield* Queue.unbounded<string>()
  const fetch: typeof globalThis.fetch = Object.assign(async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init)
    const message = await request.clone().json() as McpSchema.JsonRpcRequest
    requests.push({ message, headers: request.headers })
    const response = await handler(request)
    Queue.offerUnsafe(observed, message.method)
    return response
  }, { preconnect() {} })
  const client = yield* McpClient.make({ name: "task-client", version: "1", tasks: { mode: "poll" }, ...clientOptions })
    .pipe(
      Effect.provideService(
        McpClient.Transport,
        yield* McpClient.http({ url: MCP_ENDPOINT, protocol: McpProtocol.v2026_07_28 }).pipe(
          Effect.provide(FetchHttpClient.layer),
          Effect.provideService(FetchHttpClient.Fetch, fetch)
        )
      )
    )
  const tools = yield* client.listTools()
  const report = tools.find((tool) => tool.name === "report")
  const inline = tools.find((tool) => tool.name === "inline")
  assert.isDefined(report)
  assert.isDefined(inline)
  const next = Effect.fnUntraced(function*(method: string) {
    while ((yield* Queue.take(observed)) !== method) { /* Ignore unrelated operations. */ }
  })
  return { client, report, inline, requests, next }
})

const finish = Effect.fnUntraced(function*<A, E>(fiber: Fiber.Fiber<A, E>) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (fiber.pollUnsafe() !== undefined) return yield* Fiber.join(fiber)
    yield* TestClock.adjust("1 second")
    yield* Effect.yieldNow
  }
  return assert.fail("Execution did not finish after advancing the polling clock")
})

const taskMetadata = () => ({
  taskId: "job-42",
  createdAt: DateTime.makeUnsafe(0),
  lastUpdatedAt: DateTime.makeUnsafe(0),
  ttlMs: null
})

// Owner: McpClient polling and input orchestration, public ToolExecution controls and Toolkit integration.
// Server state translation belongs to McpServer/McpTasks.test.ts; SQL persistence belongs to McpTasksWorkflow.test.ts.
describe("McpClient Tasks", () => {
  // Conformance: https://modelcontextprotocol.github.io/ext-tasks/specification/2026-07-28/tasks.html#polymorphic-results
  it.effect("should return final tool output when execution is immediate or task-backed", () =>
    Effect.gen(function*() {
      const { client, report, inline } = yield* connect(Effect.succeed("report result"))
      assert.strictEqual(yield* client.callTool({ tool: inline, schema: Schema.String }), "inline result")
      const result = yield* client.callTool({ tool: report, schema: Schema.String }).pipe(Effect.forkChild)
      assert.strictEqual(yield* finish(result), "report result")
    }))

  it.effect("should expose completed controls when the server returns an immediate result", () =>
    Effect.gen(function*() {
      const { client, inline } = yield* connect(Effect.succeed("report result"))
      const execution = yield* client.startTool({ tool: inline, schema: Schema.String })
      assert.isUndefined(execution.taskId)
      yield* execution.cancel()
      assert.strictEqual(yield* execution.awaitResult(), "inline result")
    }))

  it.effect("should share one task and input handler when multiple callers await the same execution", () =>
    Effect.gen(function*() {
      let prompts = 0
      const { client, report, requests } = yield* connect(
        ask("name").pipe(Effect.map((answer) => answer.content.value)),
        {
          input: {
            elicitation: (request) =>
              Effect.sync(() => {
                prompts++
                assert.strictEqual(request.message, "Enter name")
                return { action: "accept" as const, content: { value: "Alice" } }
              })
          }
        }
      )
      const execution = yield* client.startTool({ tool: report, schema: Schema.String })
      assert.isString(execution.taskId)
      const results = yield* Effect.all([execution.awaitResult(), execution.awaitResult()], {
        concurrency: "unbounded"
      }).pipe(Effect.forkChild)
      assert.deepStrictEqual(yield* finish(results), ["Alice", "Alice"])
      assert.strictEqual(prompts, 1)
      assert.strictEqual(requests.filter(({ message }) => message.method === "tools/call").length, 1)
    }))

  // Conformance: https://modelcontextprotocol.github.io/ext-tasks/specification/2026-07-28/tasks.html#streamable-http-routing-headers
  it.effect("should route follow-up requests by task ID when execution needs user input", () =>
    Effect.gen(function*() {
      const { client, report, requests } = yield* connect(
        ask("name").pipe(Effect.map((answer) => answer.content.value)),
        {
          input: { elicitation: () => Effect.succeed({ action: "accept", content: { value: "Alice" } }) }
        }
      )
      const execution = yield* client.startTool({ tool: report, schema: Schema.String })
      const waiting = yield* execution.awaitResult().pipe(Effect.forkChild)
      assert.strictEqual(yield* finish(waiting), "Alice")
      const followups = requests.filter(({ message }) => message.method.startsWith("tasks/"))
      assert.isTrue(followups.some(({ message }) => message.method === "tasks/update"))
      for (const { headers, message } of followups) {
        assert.strictEqual(message.params?.taskId, execution.taskId)
        assert.strictEqual(headers.get("mcp-name"), execution.taskId)
        assert.strictEqual(headers.get("mcp-method"), message.method)
        const meta = message.params?._meta as Record<string, unknown>
        const capabilities = meta["io.modelcontextprotocol/clientCapabilities"] as McpSchema.ClientCapabilities
        assert.isDefined(capabilities.extensions?.["io.modelcontextprotocol/tasks"])
        assert.isDefined(capabilities.elicitation)
      }
    }))

  // Conformance: https://modelcontextprotocol.github.io/ext-tasks/specification/2026-07-28/tasks.html#task-update-requests
  it.effect("should fulfill all input rounds when the task requests concurrent and successive inputs", () =>
    Effect.gen(function*() {
      const seen: Array<string> = []
      const { client, report, requests } = yield* connect(
        Effect.gen(function*() {
          const answers = yield* Effect.all([ask("first"), ask("second")], { concurrency: "unbounded" })
          const last = yield* ask("last")
          return answers.map((answer) => answer.content.value).join(",") + "," + last.content.value
        }),
        {
          input: {
            elicitation: (request) =>
              Effect.sync(() => {
                seen.push(request.message)
                return { action: "accept" as const, content: { value: request.message } }
              })
          }
        }
      )
      const result = yield* client.callTool({ tool: report, schema: Schema.String }).pipe(Effect.forkChild)
      assert.strictEqual(yield* finish(result), "Enter first,Enter second,Enter last")
      assert.deepStrictEqual([...seen].sort(), ["Enter first", "Enter last", "Enter second"])
      assert.strictEqual(requests.filter(({ message }) => message.method === "tools/call").length, 1)
    }))

  it.effect("should use captured input services when a task requests an answer", () =>
    Effect.gen(function*() {
      class Answer extends Context.Service<Answer, string>()("test/McpClientTasks/Answer") {}
      const { client, report } = yield* connect(ask("name").pipe(Effect.map((answer) => answer.content.value)), {
        input: {
          elicitation: () => Answer.pipe(Effect.map((value) => ({ action: "accept" as const, content: { value } })))
        }
      }).pipe(Effect.provideService(Answer, "captured"))
      const result = yield* client.callTool({ tool: report, schema: Schema.String }).pipe(Effect.forkChild)
      assert.strictEqual(yield* finish(result), "captured")
    }))

  // Conformance: https://modelcontextprotocol.github.io/ext-tasks/specification/2026-07-28/tasks.html#task-status
  it.effect("should preserve tool-reported errors when a completed task returns isError", () =>
    Effect.gen(function*() {
      const { client, report } = yield* connect(Effect.fail("denied"))
      const raw = yield* client.callTool({ tool: report }).pipe(Effect.forkChild)
      assert.isTrue((yield* finish(raw)).isError)
      const failed = yield* client.callTool({ tool: report, schema: Schema.String }).pipe(Effect.flip, Effect.forkChild)
      const error = yield* finish(failed)
      assert.strictEqual(error.reason._tag, "ToolError")
    }))

  it.effect("should reject structured output when the completed task violates its schema", () =>
    Effect.gen(function*() {
      const other = yield* connect(Effect.succeed("not a number"))
      const invalid = yield* other.client.callTool({ tool: other.report, schema: Schema.Number }).pipe(
        Effect.flip,
        Effect.forkChild
      )
      assert.strictEqual((yield* finish(invalid)).reason._tag, "ValidationError")
    }))

  // Conformance: https://modelcontextprotocol.github.io/ext-tasks/specification/2026-07-28/tasks.html#task-polling
  it.effect("should preserve JSON-RPC error details when the task fails", () =>
    Effect.gen(function*() {
      const task = taskMetadata()
      const { client, report } = yield* connect(Effect.never, {
        execution: {
          create: () => Effect.succeed({ ...task, status: "working" }),
          get: () =>
            Effect.succeed({
              ...task,
              status: "failed",
              error: { code: -32603, message: "Job failed", data: { job: 42 } }
            }),
          update: () => Effect.void,
          cancel: () => Effect.void
        }
      })
      const result = yield* client.callTool({ tool: report }).pipe(Effect.flip, Effect.forkChild)
      const error = yield* finish(result)
      assert(error.reason._tag === "ProtocolError")
      assert.strictEqual(error.reason.code, -32603)
      assert.strictEqual(error.reason.description, "Job failed")
      assert.deepStrictEqual(error.reason.data, { job: 42 })
    }))

  // Conformance: https://modelcontextprotocol.github.io/ext-tasks/specification/2026-07-28/tasks.html#task-cancellation
  it.effect("should report TaskCancelled when the server confirms remote cancellation", () =>
    Effect.gen(function*() {
      const { client, report, requests, next } = yield* connect(Effect.never)
      const execution = yield* client.startTool({ tool: report })
      yield* next("tasks/get")
      const waiting = yield* execution.awaitResult().pipe(Effect.flip, Effect.forkChild)
      yield* execution.cancel()
      const error = yield* finish(waiting)
      assert(error.reason._tag === "TaskCancelled")
      assert.strictEqual(error.reason.taskId, execution.taskId)
      const cancel = requests.find(({ message }) => message.method === "tasks/cancel")
      assert.isDefined(cancel)
      assert.strictEqual(cancel.headers.get("mcp-name"), execution.taskId)
      assert.strictEqual(cancel.headers.get("mcp-method"), "tasks/cancel")
      assert.strictEqual(cancel.message.params?.taskId, execution.taskId)
      assert.isFalse(requests.some(({ message }) => message.method === "notifications/cancelled"))
    }))

  for (const condition of ["interrupted", "timed out"] as const) {
    it.effect(`should keep remote work running when a local waiter is ${condition}`, () =>
      Effect.gen(function*() {
        const done = yield* Deferred.make<string>()
        const { client, report, requests, next } = yield* connect(Deferred.await(done))
        const execution = yield* client.startTool({ tool: report, schema: Schema.String })
        yield* next("tasks/get")
        if (condition === "interrupted") {
          const first = yield* execution.awaitResult().pipe(Effect.forkChild)
          yield* Fiber.interrupt(first)
        } else {
          const timed = yield* execution.awaitResult({ timeout: "1 second" }).pipe(Effect.flip, Effect.forkChild)
          assert.strictEqual((yield* finish(timed)).reason._tag, "TimeoutError")
        }
        yield* Deferred.succeed(done, "finished later")
        const resumed = yield* execution.awaitResult().pipe(Effect.forkChild)
        assert.strictEqual(yield* finish(resumed), "finished later")
        assert.isFalse(requests.some(({ message }) => message.method === "tasks/cancel"))
      }))
  }

  it.effect("should retain the original cause when an input handler fails", () =>
    Effect.gen(function*() {
      const { client, report } = yield* connect(ask("name").pipe(Effect.as("done")), {
        input: { elicitation: () => Effect.fail("UI unavailable") }
      })
      const waiting = yield* client.callTool({ tool: report }).pipe(Effect.flip, Effect.forkChild)
      const error = yield* finish(waiting)
      assert(error.reason._tag === "InputError")
      assert.strictEqual(error.reason.cause, "UI unavailable")
    }))

  it.effect("should fail active waiters with ClosedError when the client scope closes", () =>
    Effect.gen(function*() {
      const scope = yield* Scope.make()
      const { client, report, requests, next } = yield* connect(Effect.never).pipe(
        Effect.provideService(Scope.Scope, scope)
      )
      const execution = yield* client.startTool({ tool: report })
      yield* next("tasks/get")
      const waiting = yield* execution.awaitResult().pipe(Effect.flip, Effect.forkChild({ startImmediately: true }))
      yield* Scope.close(scope, Exit.void)
      assert.strictEqual((yield* Fiber.join(waiting)).reason._tag, "ClosedError")
      const count = requests.length
      yield* TestClock.adjust("10 seconds")
      assert.strictEqual(requests.length, count)
      assert.isFalse(requests.some(({ message }) => message.method === "tasks/cancel"))
      const error = yield* client.callTool({ tool: report }).pipe(Effect.flip)
      assert.strictEqual(error.reason._tag, "ClosedError")
    }))

  // Conformance: https://modelcontextprotocol.github.io/ext-tasks/specification/2026-07-28/tasks.html#capability-negotiation
  it.effect("should omit task capability when polling is disabled", () =>
    Effect.gen(function*() {
      const { client, report, requests } = yield* connect(Effect.succeed("done"), { tasks: undefined })
      const error = yield* client.callTool({ tool: report }).pipe(Effect.flip)
      assert(error.reason._tag === "ProtocolError")
      assert.strictEqual(error.reason.code, -32021)
      const call = requests.find(({ message }) => message.method === "tools/call")
      assert.isDefined(call)
      const meta = call.message.params?._meta
      const capabilities = Schema.decodeUnknownSync(Schema.Struct({
        "io.modelcontextprotocol/clientCapabilities": Schema.Struct({
          extensions: Schema.optionalKey(Schema.Record(Schema.String, Schema.Unknown))
        })
      }))(meta)["io.modelcontextprotocol/clientCapabilities"]
      assert.isUndefined(capabilities.extensions?.["io.modelcontextprotocol/tasks"])
      assert.isFalse(requests.some(({ message }) => message.method === "tasks/get"))
    }))
  it.effect("should release prompt resources when cancellation interrupts active user input", () =>
    Effect.gen(function*() {
      const prompted = yield* Deferred.make<void>()
      const dismissed = yield* Deferred.make<void>()
      const { client, report } = yield* connect(ask("name").pipe(Effect.as("done")), {
        input: {
          elicitation: () =>
            Effect.acquireRelease(
              Deferred.succeed(prompted, undefined),
              () => Deferred.succeed(dismissed, undefined)
            ).pipe(Effect.andThen(Effect.never))
        }
      })
      const execution = yield* client.startTool({ tool: report })
      yield* finish(yield* Deferred.await(prompted).pipe(Effect.forkChild))
      yield* execution.cancel()
      const waiting = yield* execution.awaitResult().pipe(Effect.flip, Effect.forkChild)
      assert.strictEqual((yield* finish(waiting)).reason._tag, "TaskCancelled")
      yield* Deferred.await(dismissed)
    }))

  // Conformance: https://modelcontextprotocol.github.io/ext-tasks/specification/2026-07-28/tasks.html#task-cancellation
  it.effect("should return the result when completion wins a cancellation race", () =>
    Effect.gen(function*() {
      let finished = false
      const task = taskMetadata()
      const { client, report } = yield* connect(Effect.never, {
        execution: {
          create: () => Effect.succeed({ ...task, status: "working" }),
          get: () =>
            Effect.succeed(
              finished
                ? {
                  ...task,
                  status: "completed",
                  result: new McpSchema.CallToolResult({ content: [], structuredContent: "won" })
                }
                : { ...task, status: "working" }
            ),
          update: () => Effect.void,
          cancel: () =>
            Effect.sync(() => {
              finished = true
            })
        }
      })
      const execution = yield* client.startTool({ tool: report, schema: Schema.String })
      yield* execution.cancel()
      const waiting = yield* execution.awaitResult().pipe(Effect.forkChild)
      assert.strictEqual(yield* finish(waiting), "won")
    }))

  // Conformance: https://modelcontextprotocol.github.io/ext-tasks/specification/2026-07-28/tasks.html#task-polling
  it.effect("should poll at the advertised deadlines when the server changes its interval", () =>
    Effect.gen(function*() {
      let polls = 0
      const task = taskMetadata()
      const { client, report, next } = yield* connect(Effect.never, {
        execution: {
          create: () => Effect.succeed({ ...task, status: "working", pollIntervalMs: 2000 }),
          get: () =>
            Effect.sync(() => {
              polls++
              return polls < 2
                ? { ...task, status: "working" as const, pollIntervalMs: 3000 }
                : {
                  ...task,
                  status: "completed" as const,
                  result: new McpSchema.CallToolResult({ content: [], structuredContent: "done" })
                }
            }),
          update: () => Effect.void,
          cancel: () => Effect.void
        }
      })
      const execution = yield* client.startTool({ tool: report, schema: Schema.String })
      yield* TestClock.adjust("1999 millis")
      assert.strictEqual(polls, 0)
      yield* TestClock.adjust("1 millis")
      yield* next("tasks/get")
      assert.strictEqual(polls, 1)
      yield* TestClock.adjust("2999 millis")
      assert.strictEqual(polls, 1)
      yield* TestClock.adjust("1 millis")
      yield* next("tasks/get")
      assert.strictEqual(polls, 2)
      assert.strictEqual(yield* execution.awaitResult(), "done")
    }))

  // Conformance: https://modelcontextprotocol.github.io/ext-tasks/specification/2026-07-28/tasks.html#task-update-requests
  it.effect("should submit an answer once when an acknowledged input remains in a stale snapshot", () =>
    Effect.gen(function*() {
      let prompts = 0
      let updates = 0
      let polls = 0
      const task = taskMetadata()
      const { client, report } = yield* connect(Effect.never, {
        input: {
          elicitation: () =>
            Effect.sync(() => {
              prompts++
              return { action: "accept" as const, content: { value: "answer" } }
            })
        },
        execution: {
          create: () => Effect.succeed({ ...task, status: "working" }),
          get: () =>
            Effect.sync(() => {
              polls++
              return updates === 0 || polls < 3 ?
                {
                  ...task,
                  status: "input_required",
                  inputRequests: {
                    key: {
                      method: "elicitation/create",
                      params: {
                        mode: "form",
                        message: "Enter value",
                        requestedSchema: { type: "object", properties: {} }
                      }
                    }
                  }
                } :
                {
                  ...task,
                  status: "completed",
                  result: new McpSchema.CallToolResult({ content: [], structuredContent: "done" })
                }
            }),
          update: ({ inputResponses }) =>
            Effect.sync(() => {
              assert.deepStrictEqual(inputResponses, { key: { action: "accept", content: { value: "answer" } } })
              updates++
            }),
          cancel: () => Effect.void
        }
      })
      const waiting = yield* client.callTool({ tool: report, schema: Schema.String }).pipe(Effect.forkChild)
      assert.strictEqual(yield* finish(waiting), "done")
      assert.strictEqual(updates, 1)
      assert.strictEqual(prompts, 1)
    }))
  for (const kind of ["roots", "sampling"] as const) {
    // Conformance: https://modelcontextprotocol.github.io/ext-tasks/specification/2026-07-28/tasks.html#task-update-requests
    it.effect(`should dispatch ${kind} input when its application handler is configured`, () =>
      Effect.gen(function*() {
        const { client, report } = yield* connect(
          McpTasks.TaskContext.use((task) =>
            kind === "roots"
              ? task.requestInput({
                key: "roots",
                request: { method: "roots/list" },
                response: McpSchema.ListRootsResult
              }).pipe(Effect.map((result) => String(result.roots.length)))
              : task.requestInput({
                key: "sample",
                request: { method: "sampling/createMessage", params: { messages: [], maxTokens: 10 } },
                response: McpSchema.CreateMessageResult
              }).pipe(Effect.map((result) => result.model))
          ).pipe(Effect.orDie),
          {
            input: {
              roots: () => Effect.succeed({ roots: [{ uri: "file:///workspace" }] }),
              sampling: (request) =>
                Effect.sync(() => {
                  assert.strictEqual(request.maxTokens, 10)
                  return {
                    role: "assistant" as const,
                    content: { type: "text" as const, text: "answer" },
                    model: "test-model"
                  }
                })
            }
          }
        )
        const waiting = yield* client.callTool({ tool: report, schema: Schema.String }).pipe(Effect.forkChild)
        assert.strictEqual(yield* finish(waiting), kind === "roots" ? "1" : "test-model")
      }))
  }

  // Conformance: https://modelcontextprotocol.github.io/ext-tasks/specification/2026-07-28/tasks.html#task-update-requests
  it.effect("should return the server outcome when a user declines input", () =>
    Effect.gen(function*() {
      const { client, report } = yield* connect(
        Effect.gen(function*() {
          const task = yield* McpTasks.TaskContext
          const result = yield* task.requestInput({
            key: "confirm",
            request: {
              method: "elicitation/create",
              params: {
                mode: "form",
                message: "Continue?",
                requestedSchema: { type: "object", properties: {} }
              }
            },
            response: McpSchema.ElicitResult
          }).pipe(Effect.orDie)
          return result.action === "accept" ? "accepted" : "declined"
        }),
        { input: { elicitation: () => Effect.succeed({ action: "decline" }) } }
      )
      const waiting = yield* client.callTool({ tool: report, schema: Schema.String }).pipe(Effect.forkChild)
      assert.strictEqual(yield* finish(waiting), "declined")
    }))

  it.effect("should return final model tool output when Toolkit invokes a task-backed tool", () =>
    Effect.gen(function*() {
      const { client } = yield* connect(Effect.succeed("report result"))
      const toolkit = yield* McpClient.toolkit(client)
      const waiting = yield* toolkit.handle("report", {}).pipe(
        Effect.flatMap(Stream.runCollect),
        Effect.forkChild
      )
      const results = yield* finish(waiting)
      assert.strictEqual(results.length, 1)
      assert.strictEqual(results[0].result, JSON.stringify("report result"))
      assert.isFalse(results[0].isFailure)
      assert.isFalse(results[0].preliminary)
    }))
  // Conformance: https://modelcontextprotocol.github.io/ext-tasks/specification/2026-07-28/tasks.html#task-update-requests
  it.effect("should observe independent completion when a user prompt remains open", () =>
    Effect.gen(function*() {
      const completed = yield* Deferred.make<string>()
      const prompted = yield* Deferred.make<void>()
      const dismissed = yield* Deferred.make<void>()
      const { client, report } = yield* connect(
        Effect.raceFirst(ask("approval").pipe(Effect.as("approved")), Deferred.await(completed)),
        {
          input: {
            elicitation: () =>
              Effect.acquireRelease(
                Deferred.succeed(prompted, undefined),
                () => Deferred.succeed(dismissed, undefined)
              ).pipe(Effect.andThen(Effect.never))
          }
        }
      )
      const execution = yield* client.startTool({ tool: report, schema: Schema.String })
      yield* finish(yield* Deferred.await(prompted).pipe(Effect.forkChild))
      yield* Deferred.succeed(completed, "completed elsewhere")
      const waiting = yield* execution.awaitResult().pipe(Effect.forkChild)
      assert.strictEqual(yield* finish(waiting), "completed elsewhere")
      assert.isTrue(yield* Deferred.isDone(dismissed))
    }))

  // Conformance: https://modelcontextprotocol.github.io/ext-tasks/specification/2026-07-28/tasks.html#task-update-requests
  it.effect("should submit ready answers when another concurrent input remains open", () =>
    Effect.gen(function*() {
      const dismissed = yield* Deferred.make<void>()
      const { client, report } = yield* connect(
        Effect.raceFirst(ask("slow"), ask("fast")).pipe(Effect.map((answer) => answer.content.value)),
        {
          input: {
            elicitation: (request) =>
              request.message === "Enter slow"
                ? Effect.acquireRelease(Effect.void, () => Deferred.succeed(dismissed, undefined)).pipe(
                  Effect.andThen(Effect.never)
                )
                : Effect.succeed({ action: "accept", content: { value: "fast answer" } })
          }
        }
      )
      const waiting = yield* client.callTool({ tool: report, schema: Schema.String }).pipe(Effect.forkChild)
      assert.strictEqual(yield* finish(waiting), "fast answer")
      assert.isTrue(yield* Deferred.isDone(dismissed))
    }))

  // Conformance: https://modelcontextprotocol.github.io/ext-tasks/specification/2026-07-28/tasks.html#task-update-requests
  it.effect("should dismiss withdrawn input when the task continues working", () =>
    Effect.gen(function*() {
      const withdraw = yield* Deferred.make<void>()
      const done = yield* Deferred.make<string>()
      const prompted = yield* Deferred.make<void>()
      const dismissed = yield* Deferred.make<void>()
      const { client, report } = yield* connect(
        Effect.gen(function*() {
          yield* Effect.raceFirst(ask("approval"), Deferred.await(withdraw))
          return yield* Deferred.await(done)
        }),
        {
          input: {
            elicitation: () =>
              Effect.acquireRelease(
                Deferred.succeed(prompted, undefined),
                () => Deferred.succeed(dismissed, undefined)
              ).pipe(Effect.andThen(Effect.never))
          }
        }
      )
      const execution = yield* client.startTool({ tool: report, schema: Schema.String })
      yield* finish(yield* Deferred.await(prompted).pipe(Effect.forkChild))
      yield* Deferred.succeed(withdraw, undefined)
      yield* finish(yield* Deferred.await(dismissed).pipe(Effect.forkChild))
      yield* Deferred.succeed(done, "finished after withdrawal")
      const waiting = yield* execution.awaitResult().pipe(Effect.forkChild)
      assert.strictEqual(yield* finish(waiting), "finished after withdrawal")
    }))
})
