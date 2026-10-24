import { assert, describe, it } from "@effect/vitest"
import * as McpClient from "effect/ai/McpClient"
import * as McpProtocol from "effect/ai/McpProtocol"
import * as McpSchema from "effect/ai/McpSchema"
import * as McpServer from "effect/ai/McpServer"
import * as Tool from "effect/ai/Tool"
import * as Toolkit from "effect/ai/Toolkit"
import * as Context from "effect/Context"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as FetchHttpClient from "effect/http/FetchHttpClient"
import * as HttpRouter from "effect/http/HttpRouter"
import * as HttpServerRequest from "effect/http/HttpServerRequest"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import * as Scope from "effect/Scope"
import { makeHttpHarness, MCP_ENDPOINT } from "./TestUtils/McpHttpHarness.ts"
import { makeMcpSseReader, readMcpHttpResponse } from "./TestUtils/McpHttpResponse.ts"

const protocols = [
  McpProtocol.v2025_11_25,
  McpProtocol.v2025_06_18,
  McpProtocol.v2025_03_26,
  McpProtocol.v2024_11_05,
  McpProtocol.v2026_07_28
] as const

const toolkit = Toolkit.make(
  Tool.make("inspect", {
    parameters: Schema.Struct({ label: Schema.String }),
    success: Schema.Struct({
      label: Schema.String,
      version: Schema.String,
      client: Schema.String,
      canSample: Schema.Boolean
    }),
    dependencies: [McpSchema.McpRequestContext]
  }),
  Tool.make("fail", { success: Schema.String, failure: Schema.String })
)

const handlers = toolkit.toLayer({
  inspect: Effect.fnUntraced(function*({ label }) {
    const context = yield* McpSchema.McpRequestContext
    yield* Effect.yieldNow
    return {
      label,
      version: context.protocolVersion,
      client: context.clientInfo?.name ?? "unknown",
      canSample: context.clientCapabilities.sampling !== undefined
    }
  }),
  fail: () => Effect.fail("expected failure")
})

const serverLayer = (
  sessionMode?: "stateful" | "stateless",
  allowSessionTermination = false,
  registration: Layer.Layer<never, never, McpServer.McpServer> = Layer.empty
) =>
  McpServer.layerHttp({
    name: "stateless-test",
    version: "1",
    path: "/mcp",
    protocols,
    sessionMode,
    allowSessionTermination,
    registrations: Layer.merge(McpServer.toolkit(toolkit), registration).pipe(Layer.provide(handlers))
  })

const initialize = (protocolVersion: string) => ({
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion,
    capabilities: { sampling: {} },
    clientInfo: { name: "original-client", version: "1" }
  }
})

const inspect = (label: string) => ({
  jsonrpc: "2.0",
  id: 2,
  method: "tools/call",
  params: { name: "inspect", arguments: { label } }
})

const expectedResult = (label: string, version: string, client = "unknown", canSample = false) => ({
  jsonrpc: "2.0",
  id: 2,
  result: {
    isError: false,
    ...(version === "2026-07-28" ?
      {
        resultType: "complete",
        _meta: { "io.modelcontextprotocol/serverInfo": { name: "stateless-test", version: "1" } }
      } :
      {}),
    content: [{ type: "text", text: JSON.stringify({ label, version, client, canSample }) }],
    ...(version === "2025-06-18" || version === "2025-11-25" || version === "2026-07-28"
      ? { structuredContent: { label, version, client, canSample } }
      : {})
  }
})

describe("legacy stateless Streamable HTTP", () => {
  for (const protocol of protocols.filter((protocol) => protocol.runtime._tag === "Stateful")) {
    it.effect(`serves ${protocol.protocolVersion} after the initialization runtime is disposed`, () =>
      Effect.gen(function*() {
        const originalScope = yield* Scope.make()
        const original = yield* makeHttpHarness(serverLayer("stateless")).pipe(
          Effect.provideService(Scope.Scope, originalScope)
        )
        const initialized = yield* original.post(initialize(protocol.protocolVersion))
        assert.strictEqual(initialized.status, 200)
        assert.isNull(initialized.headers.get("Mcp-Session-Id"))
        const result = (yield* readMcpHttpResponse(initialized)) as any
        assert.strictEqual(result.result.protocolVersion, protocol.protocolVersion)
        assert.deepStrictEqual(result.result.capabilities.tools, { listChanged: false })
        assert.isUndefined(result.result.capabilities.logging)
        yield* Scope.close(originalScope, Exit.void)

        const replacement = yield* makeHttpHarness(serverLayer("stateless"))
        const headers = { "Mcp-Protocol-Version": protocol.protocolVersion }
        const notification = yield* replacement.post({ jsonrpc: "2.0", method: "notifications/initialized" }, headers)
        assert.strictEqual(notification.status, 202)
        const listed = yield* replacement.post({ jsonrpc: "2.0", id: 3, method: "tools/list" }, headers)
        assert.strictEqual(listed.status, 200)
        const tools = (yield* readMcpHttpResponse(listed)) as any
        assert.strictEqual(tools.result.tools[0].name, "inspect")
        const called = yield* replacement.post(inspect("replacement"), headers)
        assert.strictEqual(called.status, 200)
        assert.isNull(called.headers.get("Mcp-Session-Id"))
        assert.deepStrictEqual(
          yield* readMcpHttpResponse(called),
          expectedResult("replacement", protocol.protocolVersion)
        )
      }))
  }

  it.effect("defaults an absent protocol header and rejects unsupported versions and stale session IDs", () =>
    Effect.gen(function*() {
      const server = yield* makeHttpHarness(serverLayer("stateless"))
      const fallback = yield* server.post(inspect("fallback"))
      assert.strictEqual(fallback.status, 200)
      assert.deepStrictEqual(yield* readMcpHttpResponse(fallback), expectedResult("fallback", "2025-03-26"))
      const unsupported = yield* server.post(inspect("unsupported"), { "Mcp-Protocol-Version": "9999-12-31" })
      assert.strictEqual(unsupported.status, 400)
      const stale = yield* server.post(inspect("stale"), {
        "Mcp-Protocol-Version": "2025-11-25",
        "Mcp-Session-Id": "retired-stateful-session"
      })
      assert.strictEqual(stale.status, 404)
      const malformed = yield* server.post({ jsonrpc: "2.0", id: 1, method: "tools/call", params: {} })
      const invalidParams = (yield* readMcpHttpResponse(malformed)) as any
      assert.strictEqual(invalidParams.error.code, McpSchema.INVALID_PARAMS_ERROR_CODE)
      const logging = yield* server.post({
        jsonrpc: "2.0",
        id: 1,
        method: "logging/setLevel",
        params: { level: "debug" }
      })
      const logError = (yield* readMcpHttpResponse(logging)) as any
      assert.strictEqual(logError.error.code, McpSchema.METHOD_NOT_FOUND_ERROR_CODE)
    }))

  it.effect("isolates concurrent requests with equal JSON-RPC IDs and different protocol versions", () =>
    Effect.gen(function*() {
      const server = yield* makeHttpHarness(serverLayer("stateless"))
      yield* Effect.forEach(["2025-03-26", "2025-11-25"], (version) =>
        Effect.gen(function*() {
          const response = yield* server.post(inspect(version), { "Mcp-Protocol-Version": version })
          assert.deepStrictEqual(yield* readMcpHttpResponse(response), expectedResult(version, version))
        }), { concurrency: "unbounded" })
    }))

  it.effect("resolves HTTP middleware services and visibility independently for every stateless POST", () =>
    Effect.gen(function*() {
      class CurrentUser extends Context.Service<CurrentUser, string>()("test/stateless/CurrentUser") {}
      const HttpAuth = HttpRouter.middleware<{ provides: CurrentUser }>()((effect) =>
        Effect.flatMap(
          HttpServerRequest.HttpServerRequest,
          (request) => Effect.provideService(effect, CurrentUser, request.headers["x-user"] ?? "guest")
        )
      )
      const identity = Toolkit.make(Tool.make("identity", { success: Schema.String, dependencies: [CurrentUser] }))
      const registrations = McpServer.toolkit(identity).pipe(
        Layer.provide(McpServer.visibility(() => Effect.map(CurrentUser, (user) => user === "admin")).layer),
        Layer.provide(identity.toLayer({ identity: () => Effect.map(CurrentUser, (user) => user) }))
      )
      const server = yield* makeHttpHarness(
        McpServer.layerHttp({
          name: "stateless-auth",
          version: "1",
          path: "/mcp",
          protocols: [McpProtocol.v2025_11_25],
          sessionMode: "stateless",
          registrations
        }).pipe(Layer.provide(HttpAuth.layer))
      )
      const headers = { "Mcp-Protocol-Version": "2025-11-25" }
      const listed = yield* server.post({ jsonrpc: "2.0", id: 1, method: "tools/list" }, headers)
      assert.deepStrictEqual(((yield* readMcpHttpResponse(listed)) as any).result.tools, [])
      const request = { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "identity" } }
      const allowed = yield* server.post(request, { ...headers, "x-user": "admin" })
      assert.deepStrictEqual(((yield* readMcpHttpResponse(allowed)) as any).result.content, [
        { type: "text", text: "admin" }
      ])
      const denied = yield* server.post(request, headers)
      assert.deepStrictEqual(((yield* readMcpHttpResponse(denied)) as any).error, {
        code: McpSchema.INVALID_PARAMS_ERROR_CODE,
        message: "Tool 'identity' not found"
      })
    }))

  it.effect("rejects logging changes after another request has created a batch binding", () =>
    Effect.gen(function*() {
      const server = yield* makeHttpHarness(serverLayer("stateless"))
      const response = yield* server.post([
        { jsonrpc: "2.0", id: "ping", method: "ping" },
        { jsonrpc: "2.0", id: "logging", method: "logging/setLevel", params: { level: "debug" } }
      ], { "Mcp-Protocol-Version": "2025-03-26" })
      const messages = (yield* readMcpHttpResponse(response)) as Array<any>
      assert.deepInclude(messages, { jsonrpc: "2.0", id: "ping", result: {} })
      const logging = messages.find((message) => message.id === "logging")
      assert.strictEqual(logging?.error?.code, McpSchema.METHOD_NOT_FOUND_ERROR_CODE)
    }))

  it.effect("rejects resource subscriptions and suppresses list-change broadcasts", () =>
    Effect.gen(function*() {
      const registration = Layer.effectDiscard(McpServer.McpServer.use((server) =>
        server.addTool({
          tool: new McpSchema.Tool({ name: "broadcast", inputSchema: { type: "object" } }),
          annotations: Context.empty(),
          handle: Effect.fnUntraced(function*() {
            yield* server.notifications["notifications/tools/list_changed"]({})
            yield* server.notifications["notifications/resources/list_changed"]({})
            yield* server.notifications["notifications/prompts/list_changed"]({})
            return new McpSchema.CallToolResult({ content: [{ type: "text", text: "done" }] })
          })
        })
      ))
      const server = yield* makeHttpHarness(serverLayer("stateless", false, registration))
      const headers = { "Mcp-Protocol-Version": "2025-11-25" }
      for (const method of ["resources/subscribe", "resources/unsubscribe"]) {
        const response = yield* server.post(
          { jsonrpc: "2.0", id: 2, method, params: { uri: "test://resource" } },
          headers
        )
        const message = (yield* readMcpHttpResponse(response)) as any
        assert.strictEqual(message.error.code, McpSchema.METHOD_NOT_FOUND_ERROR_CODE)
      }
      const response = yield* server.post({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: { name: "broadcast" }
      }, headers)
      const body = yield* Effect.promise(() => response.text())
      assert.notInclude(body, "notifications/")
      assert.include(body, "\"text\":\"done\"")
    }))

  it.live("serves a native client when every HTTP request uses a fresh server runtime", () =>
    Effect.gen(function*() {
      const methods: Array<string> = []
      const fetch: typeof globalThis.fetch = Object.assign(async (input: RequestInfo | URL, init?: RequestInit) => {
        const request = new Request(input, init)
        methods.push((await request.clone().json()).method)
        assert.isFalse(request.headers.has("Mcp-Session-Id"))
        const { handler, dispose } = HttpRouter.toWebHandler(serverLayer("stateless"), { disableLogger: true })
        try {
          const response = await handler(request)
          assert.isFalse(response.headers.has("Mcp-Session-Id"))
          return new Response(await response.arrayBuffer(), { status: response.status, headers: response.headers })
        } finally {
          await dispose()
        }
      }, { preconnect() {} })
      const context = yield* Layer.build(
        McpClient.layerHttp({
          name: "native-client",
          version: "1",
          url: MCP_ENDPOINT,
          protocol: McpProtocol.v2025_11_25
        }).pipe(
          Layer.provide(FetchHttpClient.layer),
          Layer.provide(Layer.succeed(FetchHttpClient.Fetch, fetch))
        )
      )
      const client = Context.get(context, McpClient.McpClient)
      const tool = (yield* client.listTools()).find((tool) => tool.name === "inspect")
      assert.isDefined(tool)
      const result = yield* client.callTool({ tool, arguments: { label: "native" } })
      assert.deepStrictEqual(result.structuredContent, {
        label: "native",
        version: "2025-11-25",
        client: "unknown",
        canSample: false
      })
      assert.deepStrictEqual(methods, ["initialize", "notifications/initialized", "tools/list", "tools/call"])
    }))

  it.effect("keeps execution failures distinct from protocol errors and serves the next POST", () =>
    Effect.gen(function*() {
      const server = yield* makeHttpHarness(serverLayer("stateless"))
      const headers = { "Mcp-Protocol-Version": "2025-11-25" }
      const failed = yield* server.post({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: { name: "fail", arguments: {} }
      }, headers)
      assert.strictEqual(failed.status, 200)
      const execution = (yield* readMcpHttpResponse(failed)) as any
      assert.strictEqual(execution.result.isError, true)
      assert.deepStrictEqual(execution.result.content, [{ type: "text", text: JSON.stringify("expected failure") }])
      const unknown = yield* server.post({ jsonrpc: "2.0", id: 2, method: "unknown" }, headers)
      const protocol = (yield* readMcpHttpResponse(unknown)) as any
      assert.strictEqual(protocol.error.code, McpSchema.METHOD_NOT_FOUND_ERROR_CODE)
      const called = yield* server.post(inspect("after-failure"), headers)
      assert.deepStrictEqual(yield* readMcpHttpResponse(called), expectedResult("after-failure", "2025-11-25"))
    }))

  it.live("releases tool resources on HTTP abort before response headers", () =>
    Effect.gen(function*() {
      const entered = yield* Deferred.make<void>()
      const released = yield* Deferred.make<void>()
      const registration = Layer.effectDiscard(McpServer.McpServer.use((server) =>
        server.addTool({
          tool: new McpSchema.Tool({ name: "wait", inputSchema: { type: "object" } }),
          annotations: Context.empty(),
          handle: () =>
            Deferred.succeed(entered, undefined).pipe(
              Effect.andThen(Effect.never),
              Effect.ensuring(Deferred.succeed(released, undefined))
            )
        })
      ))
      const server = yield* makeHttpHarness(serverLayer("stateless", false, registration))
      const abort = new AbortController()
      const response = server.handler(
        new Request(MCP_ENDPOINT, {
          method: "POST",
          headers: { accept: "application/json, text/event-stream", "content-type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "wait" } }),
          signal: abort.signal
        })
      )
      response.catch(() => undefined)
      yield* Deferred.await(entered)
      abort.abort()
      yield* Deferred.await(released).pipe(Effect.timeout("1 second"))
    }))

  it.live("isolates cancellation POSTs and releases streaming tool resources on disconnect", () =>
    Effect.gen(function*() {
      const released = yield* Deferred.make<void>()
      const registration = Layer.effectDiscard(McpServer.McpServer.use((server) =>
        server.addTool({
          tool: new McpSchema.Tool({ name: "wait", inputSchema: { type: "object" } }),
          annotations: Context.empty(),
          handle: () =>
            server.notifications["notifications/progress"]({ progressToken: "wait", progress: 1 }).pipe(
              Effect.andThen(Effect.never),
              Effect.ensuring(Deferred.succeed(released, undefined))
            )
        })
      ))
      const server = yield* makeHttpHarness(serverLayer("stateless", false, registration))
      const headers = { "Mcp-Protocol-Version": "2025-11-25" }
      const response = yield* server.post({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: { name: "wait", _meta: { progressToken: "wait" } }
      }, headers)
      const stream = makeMcpSseReader(response)
      yield* Effect.addFinalizer(() => stream.cancel)
      assert.strictEqual((yield* stream.take()).method, "notifications/progress")
      const cancelled = yield* server.post({
        jsonrpc: "2.0",
        method: "notifications/cancelled",
        params: { requestId: 2 }
      }, headers)
      assert.strictEqual(cancelled.status, 202)
      assert.isFalse(yield* Deferred.isDone(released))
      yield* stream.cancel
      yield* Deferred.await(released).pipe(Effect.timeout("1 second"))
      const called = yield* server.post(inspect("after-disconnect"), headers)
      assert.deepStrictEqual(yield* readMcpHttpResponse(called), expectedResult("after-disconnect", "2025-11-25"))
    }))

  it.effect("preserves stateful sessions by default", () =>
    Effect.gen(function*() {
      const original = yield* makeHttpHarness(serverLayer())
      const replacement = yield* makeHttpHarness(serverLayer())
      const initialized = yield* original.post(initialize("2025-11-25"))
      yield* readMcpHttpResponse(initialized)
      const sessionId = initialized.headers.get("Mcp-Session-Id")
      assert.isNotNull(sessionId)
      const headers = { "Mcp-Session-Id": sessionId, "Mcp-Protocol-Version": "2025-11-25" }
      const called = yield* original.post(inspect("stateful"), headers)
      assert.deepStrictEqual(
        yield* readMcpHttpResponse(called),
        expectedResult("stateful", "2025-11-25", "original-client", true)
      )
      const missing = yield* original.post(inspect("missing"))
      assert.strictEqual(missing.status, 400)
      const retired = yield* replacement.post(inspect("retired"), headers)
      assert.strictEqual(retired.status, 404)
    }))

  it.effect("does not enable DELETE session termination when stateless", () =>
    Effect.gen(function*() {
      const server = yield* makeHttpHarness(serverLayer("stateless", true))
      const response = yield* server.delete({ "Mcp-Session-Id": "unused" })
      assert.strictEqual(response.status, 405)
      assert.strictEqual(response.headers.get("Allow"), "POST")
    }))

  it.effect("preserves modern stateless discovery, tool calls, and metadata validation", () =>
    Effect.gen(function*() {
      const server = yield* makeHttpHarness(serverLayer("stateless"))
      const version = "2026-07-28"
      const metadata = {
        "io.modelcontextprotocol/protocolVersion": version,
        "io.modelcontextprotocol/clientCapabilities": {}
      }
      const discovered = yield* server.post({
        jsonrpc: "2.0",
        id: 1,
        method: "server/discover",
        params: { _meta: metadata }
      }, {
        "Mcp-Protocol-Version": version,
        "Mcp-Method": "server/discover"
      })
      assert.strictEqual(discovered.status, 200)
      assert.isNull(discovered.headers.get("Mcp-Session-Id"))
      yield* readMcpHttpResponse(discovered)
      const request = inspect("modern")
      const headers = { "Mcp-Protocol-Version": version, "Mcp-Method": "tools/call", "Mcp-Name": "inspect" }
      const called = yield* server.post({ ...request, params: { ...request.params, _meta: metadata } }, headers)
      assert.deepStrictEqual(yield* readMcpHttpResponse(called), expectedResult("modern", version))
      const missingMetadata = yield* server.post(request, headers)
      assert.strictEqual(missingMetadata.status, 400)
    }))
})
