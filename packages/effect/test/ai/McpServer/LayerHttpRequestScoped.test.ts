import { assert, describe, it } from "@effect/vitest"
import * as McpProtocol from "effect/ai/McpProtocol"
import * as McpSchema from "effect/ai/McpSchema"
import * as McpServer from "effect/ai/McpServer"
import * as Tool from "effect/ai/Tool"
import * as Toolkit from "effect/ai/Toolkit"
import * as Context from "effect/Context"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as HttpRouter from "effect/http/HttpRouter"
import * as HttpServerRequest from "effect/http/HttpServerRequest"
import * as Layer from "effect/Layer"
import * as Predicate from "effect/Predicate"
import * as Schema from "effect/Schema"
import * as BaseProtocolTest from "./McpConformance/BaseProtocolTest.ts"
import * as CompletionTest from "./McpConformance/CompletionTest.ts"
import { layer as makeMcpConformanceLayer } from "./McpConformance/McpConformance.ts"
import * as MultiRoundTripTest from "./McpConformance/MultiRoundTripTest.ts"
import * as PromptsTest from "./McpConformance/PromptsTest.ts"
import * as ResourcesTest from "./McpConformance/ResourcesTest.ts"
import * as ToolsTest from "./McpConformance/ToolsTest.ts"
import { makeHttpHarness, MCP_ENDPOINT } from "./TestUtils/McpHttpHarness.ts"
import { makeMcpSseReader, readMcpHttpResponse } from "./TestUtils/McpHttpResponse.ts"
import { makeServerLayer } from "./TestUtils/McpServerLayer.ts"
import { makeWorkerdHarness } from "./TestUtils/McpWorkerdHarness.ts"

const protocol = McpProtocol.v2026_07_28
const conformance = makeMcpConformanceLayer(protocol, { mode: "request" })

describe("McpServer.layerHttpRequestScoped conformance", () => {
  BaseProtocolTest.statelessModernSuite(protocol, conformance)
  ToolsTest.suite(protocol, conformance)
  ToolsTest.statelessModernSuite(protocol, conformance)
  ResourcesTest.suite(protocol, conformance)
  PromptsTest.suite(protocol, conformance, { additionalPromptNames: ["MrtrPrompt"] })
  CompletionTest.suite(protocol, conformance)
  MultiRoundTripTest.suite(protocol, conformance)
})

const progressToken = "progress-1"

const callTool = (
  name: string,
  id: number,
  args: Record<string, unknown> = {},
  metadata: Record<string, unknown> = {}
) => ({
  body: {
    jsonrpc: "2.0",
    id,
    method: "tools/call",
    params: {
      name,
      arguments: args,
      _meta: {
        progressToken,
        ...metadata,
        "io.modelcontextprotocol/protocolVersion": protocol.protocolVersion,
        "io.modelcontextprotocol/clientCapabilities": {},
        "io.modelcontextprotocol/clientInfo": { name: "test", version: "1.0.0" }
      }
    }
  },
  headers: {
    accept: "application/json, text/event-stream",
    "content-type": "application/json",
    "MCP-Protocol-Version": protocol.protocolVersion,
    "Mcp-Method": "tools/call",
    "Mcp-Name": name
  }
})

const sseMessages = (body: string): Array<Record<string, any>> =>
  body.split("\n").filter((line) => line.startsWith("data: ")).map((line) => JSON.parse(line.slice(6)))

const toolRegistration = (
  name: string,
  handle: (server: McpServer.McpServer["Service"], args: any) => Effect.Effect<McpSchema.CallToolResult>
) =>
  Layer.effectDiscard(Effect.gen(function*() {
    const server = yield* McpServer.McpServer
    yield* server.addTool({
      tool: new McpSchema.Tool({ name, inputSchema: { type: "object" } }),
      annotations: Context.empty(),
      handle: (args) => handle(server, args)
    })
  }))

const toolLayer = (
  name: string,
  handle: (server: McpServer.McpServer["Service"], args: any) => Effect.Effect<McpSchema.CallToolResult>
) =>
  toolRegistration(name, handle).pipe(
    Layer.provideMerge(makeServerLayer({ name: "RequestMode", protocols: [protocol], mode: "request" }))
  )

const reportProgress = (server: McpServer.McpServer["Service"]) =>
  server.notifications["notifications/progress"]({ progressToken, progress: 1 }).pipe(
    Effect.as(new McpSchema.CallToolResult({ content: [{ type: "text", text: "done" }] }))
  )

describe("McpServer.layerHttpRequestScoped", () => {
  it.live("should expose tools registered after the first POST in later lists and discovery", () =>
    Effect.gen(function*() {
      const serverReady = yield* Deferred.make<McpServer.McpServer["Service"]>()
      const harness = yield* makeHttpHarness(
        Layer.effectDiscard(Effect.gen(function*() {
          yield* Deferred.succeed(serverReady, yield* McpServer.McpServer)
        })).pipe(
          Layer.provideMerge(makeServerLayer({ name: "LateRegistration", protocols: [protocol], mode: "request" }))
        )
      )
      let id = 0
      const post = Effect.fnUntraced(function*(method: "tools/list" | "server/discover") {
        const response = yield* harness.post({
          jsonrpc: "2.0",
          id: ++id,
          method,
          params: {
            _meta: {
              "io.modelcontextprotocol/protocolVersion": protocol.protocolVersion,
              "io.modelcontextprotocol/clientCapabilities": {},
              "io.modelcontextprotocol/clientInfo": { name: "test", version: "1.0.0" }
            }
          }
        }, {
          "MCP-Protocol-Version": protocol.protocolVersion,
          "Mcp-Method": method
        })
        assert.strictEqual(response.status, 200)
        const message = Schema.decodeUnknownSync(Schema.Struct({ result: Schema.JsonObject }))(
          yield* readMcpHttpResponse(response)
        )
        return message.result
      })

      assert.deepStrictEqual((yield* post("tools/list")).tools, [])
      const before = yield* post("server/discover")
      assert(Predicate.isObject(before.capabilities))
      assert.notProperty(before.capabilities, "tools")

      const server = yield* Deferred.await(serverReady)
      yield* server.addTool({
        tool: new McpSchema.Tool({ name: "LateTool", inputSchema: { type: "object" } }),
        annotations: Context.empty(),
        handle: () => Effect.succeed(new McpSchema.CallToolResult({ content: [] }))
      })

      assert.deepStrictEqual((yield* post("tools/list")).tools, [
        { name: "LateTool", inputSchema: { type: "object" } }
      ])
      const after = yield* post("server/discover")
      assert(Predicate.isObject(after.capabilities))
      assert.deepStrictEqual(after.capabilities.tools, { listChanged: false })
    }).pipe(Effect.timeout("2 seconds")))

  // https://github.com/Effect-TS/effect/issues/9026
  it.live("should let each request's services override the layer services seen by tools", () =>
    Effect.gen(function*() {
      const Label = Context.Reference<string>("test/RequestScoped/Label", { defaultValue: () => "default" })
      const { dispose, handler } = HttpRouter.toWebHandler(
        toolLayer("Label", () =>
          Effect.gen(function*() {
            return new McpSchema.CallToolResult({ content: [{ type: "text", text: yield* Label }] })
          })).pipe(Layer.provide(Layer.succeed(Label)("layer"))),
        { disableLogger: true }
      )
      yield* Effect.addFinalizer(() => Effect.promise(dispose))
      const call = (override?: string) => {
        const { body, headers } = callTool("Label", 1)
        return Effect.promise(() =>
          handler(
            new Request(MCP_ENDPOINT, { method: "POST", headers, body: JSON.stringify(body) }),
            override === undefined ? undefined : Label.context(override)
          )
        ).pipe(Effect.flatMap(readMcpHttpResponse))
      }

      for (const override of [undefined, "first", "second"]) {
        assert.nestedPropertyVal(yield* call(override), "result.content[0].text", override ?? "layer")
      }
    }))

  it.live("should serve each POST when timers from completed requests never fire", () =>
    Effect.gen(function*() {
      const worker = yield* makeWorkerdHarness(toolLayer("ReportProgress", reportProgress))
      // The first request builds the server and completes without serving MCP.
      const first = yield* worker.request(new Request(MCP_ENDPOINT, { method: "GET" }))
      assert.strictEqual(first.status, 405)

      for (const id of [1, 2]) {
        const { body, headers } = callTool("ReportProgress", id)
        const response = yield* worker.request(
          new Request(MCP_ENDPOINT, { method: "POST", headers, body: JSON.stringify(body) })
        ).pipe(Effect.timeoutOrElse({
          duration: "1 second",
          orElse: () => Effect.die(`POST ${id} stalled`)
        }))
        assert.deepStrictEqual(sseMessages(response.body).map((message) => message.method ?? message.id), [
          "notifications/progress",
          id
        ])
      }
    }))

  it.live("should interrupt the handler when the client aborts its POST", () =>
    Effect.gen(function*() {
      const entered = yield* Deferred.make<void>()
      const interrupted = yield* Deferred.make<void>()
      const { dispose, handler } = HttpRouter.toWebHandler(
        toolLayer("Block", () =>
          Deferred.succeed(entered, undefined).pipe(
            Effect.andThen(Effect.never),
            Effect.onInterrupt(() => Deferred.succeed(interrupted, undefined))
          )),
        { disableLogger: true }
      )
      yield* Effect.addFinalizer(() => Effect.promise(dispose))
      const abort = new AbortController()
      const { body, headers } = callTool("Block", 1)
      const response = handler(
        new Request(MCP_ENDPOINT, { method: "POST", headers, body: JSON.stringify(body), signal: abort.signal })
      )
      response.catch(() => undefined)

      yield* Deferred.await(entered)
      abort.abort()
      yield* Deferred.await(interrupted).pipe(Effect.timeout("1 second"))
    }))

  for (const cancel of ["abort", "body"] as const) {
    it.live(`should interrupt a streaming handler when the client cancels by ${cancel} after headers`, () =>
      Effect.gen(function*() {
        const interrupted = yield* Deferred.make<void>()
        const { dispose, handler } = HttpRouter.toWebHandler(
          toolLayer("ProgressThenBlock", (server) =>
            reportProgress(server).pipe(
              Effect.andThen(Effect.never),
              Effect.onInterrupt(() => Deferred.succeed(interrupted, undefined))
            )),
          { disableLogger: true }
        )
        yield* Effect.addFinalizer(() => Effect.promise(dispose))
        const abort = new AbortController()
        const { body, headers } = callTool("ProgressThenBlock", 1)
        const response = yield* Effect.promise(() =>
          handler(
            new Request(MCP_ENDPOINT, { method: "POST", headers, body: JSON.stringify(body), signal: abort.signal })
          )
        )
        const reader = makeMcpSseReader(response)
        yield* Effect.addFinalizer(() => reader.cancel)
        assert.strictEqual((yield* reader.take()).method, "notifications/progress")

        if (cancel === "abort") abort.abort()
        else yield* reader.cancel
        yield* Deferred.await(interrupted).pipe(Effect.timeout("1 second"))
      }))
  }

  it.live("should interrupt a streaming handler when the client aborts while its unread body is full", () =>
    Effect.gen(function*() {
      const headersSent = yield* Deferred.make<void>()
      const backpressured = yield* Deferred.make<void>()
      const interrupted = yield* Deferred.make<void>()
      const { dispose, handler } = HttpRouter.toWebHandler(
        toolLayer("ProgressUnread", (server) =>
          Effect.gen(function*() {
            yield* reportProgress(server)
            yield* Deferred.await(headersSent)
            // Later chunks arrive while the client reads nothing, so the body stops pulling.
            yield* reportProgress(server)
            yield* reportProgress(server)
            yield* Deferred.succeed(backpressured, undefined)
            return yield* Effect.never
          }).pipe(Effect.onInterrupt(() => Deferred.succeed(interrupted, undefined)))),
        { disableLogger: true }
      )
      yield* Effect.addFinalizer(() => Effect.promise(dispose))
      const abort = new AbortController()
      const { body, headers } = callTool("ProgressUnread", 1)
      const response = yield* Effect.promise(() =>
        handler(
          new Request(MCP_ENDPOINT, { method: "POST", headers, body: JSON.stringify(body), signal: abort.signal })
        )
      )
      yield* Effect.addFinalizer(() => Effect.promise(() => response.body!.cancel()))
      yield* Deferred.succeed(headersSent, undefined)
      yield* Deferred.await(backpressured)
      // Let the body stream take the next chunk and wait for a pull that never comes.
      yield* Effect.sleep("50 millis")

      abort.abort()
      yield* Deferred.await(interrupted).pipe(Effect.timeout("1 second"))
    }))

  it.live("should deliver overlapping requests only their own notifications", () =>
    Effect.gen(function*() {
      const arrived = { a: yield* Deferred.make<void>(), b: yield* Deferred.make<void>() }
      const harness = yield* makeHttpHarness(toolLayer("Overlap", (server, { marker }: { marker: "a" | "b" }) =>
        Effect.gen(function*() {
          // Both requests are in flight before either emits a notification.
          yield* Deferred.succeed(arrived[marker], undefined)
          yield* Deferred.await(arrived[marker === "a" ? "b" : "a"])
          yield* server.notifications["notifications/progress"]({ progressToken, progress: 1, message: marker })
          yield* server.notifications["notifications/message"]({ level: "info", data: marker })
          if (marker === "a") {
            yield* server.notifications["notifications/tools/list_changed"]({})
          }
          return new McpSchema.CallToolResult({ content: [{ type: "text", text: marker }] })
        })))

      const responses = yield* Effect.forEach(["a", "b"] as const, (marker) => {
        // Both requests reuse the same JSON-RPC id and progress token.
        const { body, headers } = callTool("Overlap", 1, { marker }, {
          "io.modelcontextprotocol/logLevel": "debug"
        })
        return harness.post(body, headers).pipe(
          Effect.flatMap((response) =>
            Effect.promise(() => response.text())
          ),
          Effect.map((body) => [marker, sseMessages(body)] as const)
        )
      }, { concurrency: "unbounded" }).pipe(Effect.timeout("2 seconds"))

      for (const [marker, messages] of responses) {
        assert.deepStrictEqual(
          messages.map((message) => [message.method ?? message.id, message.params ?? message.result.content]),
          [
            ["notifications/progress", { progressToken, progress: 1, message: marker }],
            ["notifications/message", { level: "info", data: marker }],
            [1, [{ type: "text", text: marker }]]
          ]
        )
      }
    }))

  it.live("should keep layerHttp notifications when a request-scoped endpoint shares the server", () =>
    Effect.gen(function*() {
      const harness = yield* makeHttpHarness(
        toolRegistration("ReportProgress", reportProgress).pipe(
          Layer.provideMerge(Layer.merge(
            makeServerLayer({ name: "DefaultMode", protocols: [protocol] }),
            McpServer.layerHttpRequestScoped({
              name: "RequestMode",
              version: "1.0.0",
              path: "/request",
              protocols: [protocol]
            })
          ))
        )
      )
      for (const path of ["/mcp", "/request"]) {
        const { body, headers } = callTool("ReportProgress", 1)
        const response = yield* Effect.promise(() =>
          harness.handler(
            new Request(new URL(path, MCP_ENDPOINT), { method: "POST", headers, body: JSON.stringify(body) })
          )
        )
        const messages = sseMessages(yield* Effect.promise(() => response.text()))
        assert.deepStrictEqual(messages.map((message) => message.method ?? message.id), [
          "notifications/progress",
          1
        ], path)
      }
    }).pipe(Effect.timeout("2 seconds")))
})

describe("McpServer.layerHttpRequestScoped legacy adapters", () => {
  const Inspect = Toolkit.make(Tool.make("Inspect", {
    success: Schema.String,
    dependencies: [McpSchema.McpRequestContext]
  }))
  const registrations = Layer.mergeAll(
    McpServer.toolkit(Inspect),
    McpServer.resource({ uri: "test://legacy", name: "legacy", content: Effect.succeed("legacy") }),
    toolRegistration("Broadcast", (server) =>
      Effect.gen(function*() {
        yield* server.notifications["notifications/tools/list_changed"]({})
        yield* server.notifications["notifications/message"]({ level: "error", data: "log" })
        return new McpSchema.CallToolResult({ content: [{ type: "text", text: "done" }] })
      }))
  ).pipe(Layer.provide(Inspect.toLayer({
    Inspect: () =>
      Effect.map(McpSchema.McpRequestContext, (context) =>
        [
          context.protocolVersion,
          context.clientInfo?.name,
          context.clientCapabilities.sampling === undefined ? "no-sampling" : "sampling"
        ].join(" "))
  })))
  const makeLegacyHarness = () =>
    makeHttpHarness(registrations.pipe(
      Layer.provideMerge(makeServerLayer({
        name: "Legacy",
        protocols: [
          McpProtocol.v2026_07_28,
          McpProtocol.v2025_11_25,
          McpProtocol.v2025_06_18,
          McpProtocol.v2025_03_26
        ],
        mode: "request"
      }))
    ))
  const legacyToolLayer = (
    name: string,
    handle: (server: McpServer.McpServer["Service"], args: any) => Effect.Effect<McpSchema.CallToolResult>
  ) =>
    toolRegistration(name, handle).pipe(
      Layer.provideMerge(makeServerLayer({ name: "Legacy", protocols: [McpProtocol.v2025_11_25], mode: "request" }))
    )
  const initialize = (protocolVersion: string) => ({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion,
      capabilities: { sampling: {} },
      clientInfo: { name: "original-client", version: "1.0.0" }
    }
  })
  const legacyCall = (name: string, id = 2, _meta?: Record<string, unknown>) => ({
    jsonrpc: "2.0",
    id,
    method: "tools/call",
    params: { name, arguments: {}, ...(_meta === undefined ? {} : { _meta }) }
  })
  const legacyRequest = (name: string, id: number, signal?: AbortSignal) =>
    new Request(MCP_ENDPOINT, {
      method: "POST",
      headers: {
        accept: "application/json, text/event-stream",
        "content-type": "application/json",
        "MCP-Protocol-Version": "2025-11-25"
      },
      body: JSON.stringify(legacyCall(name, id, { progressToken })),
      signal: signal ?? null
    })
  const toolText = (response: Response) =>
    Effect.map(readMcpHttpResponse(response), (message: any) => message.result.content[0].text)

  it.live("should initialize without a session id and advertise no session-bound capabilities", () =>
    Effect.gen(function*() {
      const harness = yield* makeLegacyHarness()
      const response = yield* harness.post(initialize("2025-11-25"))
      assert.strictEqual(response.status, 200)
      assert.isNull(response.headers.get("Mcp-Session-Id"))
      assert.strictEqual(response.headers.get("Mcp-Protocol-Version"), "2025-11-25")
      const capabilities = ((yield* readMcpHttpResponse(response)) as any).result.capabilities
      assert.notProperty(capabilities, "logging")
      assert.deepStrictEqual(capabilities.tools, { listChanged: false })
      assert.deepStrictEqual(capabilities.resources, { listChanged: false, subscribe: false })
    }))

  for (const version of ["2025-03-26", "2025-06-18", "2025-11-25"]) {
    it.live(`should serve ${version} POSTs with a conservative client profile`, () =>
      Effect.gen(function*() {
        const harness = yield* makeLegacyHarness()
        yield* readMcpHttpResponse(yield* harness.post(initialize(version)))
        const called = yield* harness.post(legacyCall("Inspect"), { "MCP-Protocol-Version": version })
        assert.isNull(called.headers.get("Mcp-Session-Id"))
        assert.strictEqual(yield* toolText(called), `${version} unknown no-sampling`)
      }))
  }

  it.live("should default a missing protocol header and reject unsupported versions and session ids", () =>
    Effect.gen(function*() {
      const harness = yield* makeLegacyHarness()
      assert.strictEqual(yield* toolText(yield* harness.post(legacyCall("Inspect"))), "2025-03-26 unknown no-sampling")
      for (const version of ["2024-11-05", "9999-12-31"]) {
        const response = yield* harness.post(legacyCall("Inspect"), { "MCP-Protocol-Version": version })
        assert.strictEqual(response.status, 400, version)
      }
      const withSession = yield* harness.post(legacyCall("Inspect"), {
        "MCP-Protocol-Version": "2025-11-25",
        "Mcp-Session-Id": "unknown-session"
      })
      assert.strictEqual(withSession.status, 404)
    }))

  it.live("should serve a layer with only legacy adapters", () =>
    Effect.gen(function*() {
      const harness = yield* makeHttpHarness(registrations.pipe(
        Layer.provideMerge(makeServerLayer({
          name: "LegacyOnly",
          protocols: [McpProtocol.v2025_11_25, McpProtocol.v2025_06_18],
          mode: "request"
        }))
      ))
      const called = yield* harness.post(legacyCall("Inspect"), { "MCP-Protocol-Version": "2025-06-18" })
      assert.strictEqual(yield* toolText(called), "2025-06-18 unknown no-sampling")
      // `2025-03-26` is the assumed version when the header is absent, and it is not configured.
      assert.strictEqual((yield* harness.post(legacyCall("Inspect"))).status, 400)
    }))

  it.live("should reject session-bound methods and deliver no list-change or log notifications", () =>
    Effect.gen(function*() {
      const harness = yield* makeLegacyHarness()
      const headers = { "MCP-Protocol-Version": "2025-11-25" }
      for (
        const [method, params] of [
          ["logging/setLevel", { level: "debug" }],
          ["resources/subscribe", { uri: "test://legacy" }]
        ] as const
      ) {
        const response = yield* harness.post({ jsonrpc: "2.0", id: 1, method, params }, headers)
        assert.nestedPropertyVal(
          yield* readMcpHttpResponse(response),
          "error.code",
          McpSchema.METHOD_NOT_FOUND_ERROR_CODE,
          method
        )
      }
      const response = yield* harness.post(legacyCall("Broadcast"), headers)
      const body = yield* Effect.promise(() => response.text())
      assert.notInclude(body, "notifications/")
      assert.include(body, "\"text\":\"done\"")
    }))

  it.live("should resolve HTTP middleware services and visibility for every legacy POST", () =>
    Effect.gen(function*() {
      class CurrentUser extends Context.Service<CurrentUser, string>()("test/RequestScoped/CurrentUser") {}
      const HttpAuth = HttpRouter.middleware<{ provides: CurrentUser }>()((effect) =>
        Effect.flatMap(
          HttpServerRequest.HttpServerRequest,
          (request) => Effect.provideService(effect, CurrentUser, request.headers["x-user"] ?? "guest")
        )
      )
      const Identity = Toolkit.make(Tool.make("Identity", { success: Schema.String, dependencies: [CurrentUser] }))
      const harness = yield* makeHttpHarness(
        McpServer.layerHttpRequestScoped({
          name: "LegacyAuth",
          version: "1.0.0",
          path: "/mcp",
          protocols: [McpProtocol.v2025_11_25],
          registrations: McpServer.toolkit(Identity).pipe(
            Layer.provide(McpServer.visibility(() => Effect.map(CurrentUser, (user) => user === "admin")).layer),
            Layer.provide(Identity.toLayer({ Identity: () => Effect.service(CurrentUser) }))
          )
        }).pipe(Layer.provide(HttpAuth.layer))
      )
      const headers = { "MCP-Protocol-Version": "2025-11-25" }
      const listed = yield* harness.post({ jsonrpc: "2.0", id: 1, method: "tools/list" }, headers)
      assert.deepStrictEqual(((yield* readMcpHttpResponse(listed)) as any).result.tools, [])
      const allowed = yield* harness.post(legacyCall("Identity"), { ...headers, "x-user": "admin" })
      assert.strictEqual(yield* toolText(allowed), "admin")
      const denied = yield* harness.post(legacyCall("Identity"), headers)
      assert.deepStrictEqual(((yield* readMcpHttpResponse(denied)) as any).error, {
        code: McpSchema.INVALID_PARAMS_ERROR_CODE,
        message: "Tool 'Identity' not found"
      })
    }))

  it.live("should keep 2026-07-28 requests unchanged alongside legacy adapters", () =>
    Effect.gen(function*() {
      const harness = yield* makeLegacyHarness()
      const { body, headers } = callTool("Inspect", 1)
      assert.nestedPropertyVal(yield* readMcpHttpResponse(yield* harness.post(body, headers)), "result.isError", false)
      const { _meta: _, ...params } = body.params
      assert.strictEqual((yield* harness.post({ ...body, params }, headers)).status, 400)
    }))

  it.live("should serve each legacy POST when timers from completed requests never fire", () =>
    Effect.gen(function*() {
      const worker = yield* makeWorkerdHarness(legacyToolLayer("ReportProgress", reportProgress))
      // The first request builds the server and completes without serving MCP.
      const first = yield* worker.request(new Request(MCP_ENDPOINT, { method: "GET" }))
      assert.strictEqual(first.status, 405)

      for (const id of [1, 2]) {
        const response = yield* worker.request(legacyRequest("ReportProgress", id)).pipe(Effect.timeoutOrElse({
          duration: "1 second",
          orElse: () => Effect.die(`POST ${id} stalled`)
        }))
        assert.deepStrictEqual(sseMessages(response.body).map((message) => message.method ?? message.id), [
          "notifications/progress",
          id
        ])
      }
    }))

  it.live("should interrupt a legacy handler when the client aborts its POST", () =>
    Effect.gen(function*() {
      const entered = yield* Deferred.make<void>()
      const interrupted = yield* Deferred.make<void>()
      const { dispose, handler } = HttpRouter.toWebHandler(
        legacyToolLayer("Block", () =>
          Deferred.succeed(entered, undefined).pipe(
            Effect.andThen(Effect.never),
            Effect.onInterrupt(() => Deferred.succeed(interrupted, undefined))
          )),
        { disableLogger: true }
      )
      yield* Effect.addFinalizer(() => Effect.promise(dispose))
      const abort = new AbortController()
      const response = handler(legacyRequest("Block", 1, abort.signal))
      response.catch(() => undefined)

      yield* Deferred.await(entered)
      abort.abort()
      yield* Deferred.await(interrupted).pipe(Effect.timeout("1 second"))
    }))
})
