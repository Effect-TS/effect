import { assert, describe, it } from "@effect/vitest"
import { type Cause, Context, Deferred, Effect, Fiber, Layer, Queue, Schema, Sink, Stream } from "effect"
import { LanguageModel, McpClient, McpProtocol, McpSchema, McpServer, Tool, Toolkit } from "effect/ai"
import * as FetchHttpClient from "effect/http/FetchHttpClient"
import * as HttpClient from "effect/http/HttpClient"
import type * as HttpClientRequest from "effect/http/HttpClientRequest"
import * as HttpClientResponse from "effect/http/HttpClientResponse"
import * as ChildProcess from "effect/process/ChildProcess"
import * as Spawner from "effect/process/ChildProcessSpawner"
import * as Stdio from "effect/Stdio"
import * as TestClock from "effect/testing/TestClock"
import { makeHttpHarness, MCP_ENDPOINT } from "./McpServer/TestUtils/McpHttpHarness.ts"
import { makeServerLayer } from "./McpServer/TestUtils/McpServerLayer.ts"
import * as TestUtils from "./utils.ts"

const clientInfo = { name: "test-client", version: "1.0.0" }

const Add = Tool.make("add", {
  parameters: Schema.Struct({ a: Schema.Number, b: Schema.Number }),
  success: Schema.Struct({ total: Schema.Number })
})

const Fail = Tool.make("fail", {
  success: Schema.String,
  failure: Schema.String
})

const Slow = Tool.make("slow", {
  success: Schema.String
})

const TestToolkit = Toolkit.make(Add, Fail, Slow)

const serverLayer = Layer.mergeAll(
  McpServer.toolkit(TestToolkit),
  McpServer.prompt({
    name: "explain",
    parameters: { total: Schema.String },
    content: ({ total }) => Effect.succeed(`Explain ${total}`)
  }),
  McpServer.resource({
    uri: "demo://guide",
    name: "guide",
    content: Effect.succeed("Guide")
  })
).pipe(
  Layer.provideMerge(TestToolkit.toLayer({
    add: ({ a, b }) => Effect.succeed({ total: a + b }),
    fail: () => Effect.fail("denied"),
    slow: () => Effect.never
  })),
  Layer.provideMerge(makeServerLayer({
    name: "test-server",
    protocols: [McpProtocol.v2026_07_28, McpProtocol.v2025_11_25]
  }))
)

const protocols = [McpProtocol.v2025_11_25, McpProtocol.v2026_07_28] as const

const connect = Effect.fnUntraced(function*(protocol: McpProtocol.ProtocolAdapter<McpClient.ProtocolVersion>) {
  const { handler } = yield* makeHttpHarness(serverLayer)
  const fetch: typeof globalThis.fetch = Object.assign(
    (input: RequestInfo | URL, init?: RequestInit) => handler(new Request(input, init)),
    { preconnect() {} }
  )
  const context = yield* Layer.build(
    McpClient.layerHttp({ ...clientInfo, url: MCP_ENDPOINT, protocol }).pipe(
      Layer.provide(FetchHttpClient.layer),
      Layer.provide(Layer.succeed(FetchHttpClient.Fetch, fetch))
    )
  )
  return Context.get(context, McpClient.McpClient)
})

const findTool = Effect.fnUntraced(function*(client: McpClient.McpClient, name: string) {
  const tool = (yield* client.listTools()).find((tool) => tool.name === name)
  assert.isDefined(tool)
  return tool
})

describe("McpClient", () => {
  for (const protocol of protocols) {
    describe(protocol.protocolVersion, () => {
      it.effect("should discover and call tools, prompts and resources", () =>
        Effect.gen(function*() {
          const client = yield* connect(protocol)
          assert.strictEqual(client.protocolVersion, protocol.protocolVersion)
          assert.deepStrictEqual(client.serverInfo, { name: "test-server", version: "1.0.0" })

          const tool = yield* findTool(client, "add")
          const raw = yield* client.callTool({ tool, arguments: { a: 20, b: 22 } })
          assert.deepStrictEqual(raw.structuredContent, { total: 42 })
          const decoded = yield* client.callTool({
            tool,
            arguments: { a: 1, b: 2 },
            schema: Schema.Struct({ total: Schema.Number })
          })
          assert.deepStrictEqual(decoded, { total: 3 })

          const [prompt] = yield* client.listPrompts()
          const messages = yield* client.getPrompt({ prompt, arguments: { total: "42" } })
          assert.deepStrictEqual(messages.messages.map((message) => message.content), [{
            type: "text",
            text: "Explain 42"
          }])

          const [resource] = yield* client.listResources()
          const contents = yield* client.readResource({ uri: resource.uri })
          assert.deepStrictEqual(contents.contents, [{ uri: "demo://guide", text: "Guide" }])
        }).pipe(Effect.scoped))

      // isError is a tool result; supplying a schema turns it into a ToolError retaining the result.
      it.effect("should fail with ToolError when a schema call reports isError", () =>
        Effect.gen(function*() {
          const client = yield* connect(protocol)
          const tool = yield* findTool(client, "fail")
          const raw = yield* client.callTool({ tool })
          assert.isTrue(raw.isError)

          const error = yield* client.callTool({ tool, schema: Schema.String }).pipe(Effect.flip)
          assert(error.reason._tag === "ToolError")
          assert.deepStrictEqual(error.reason.result, raw)
        }).pipe(Effect.scoped))

      // Resource not found is -32002 in 2025-11-25 and -32602 in 2026-07-28.
      it.effect("should preserve JSON-RPC error code when the server rejects a request", () =>
        Effect.gen(function*() {
          const client = yield* connect(protocol)
          const error = yield* client.readResource({ uri: "demo://missing" }).pipe(Effect.flip)
          assert(error.reason._tag === "ProtocolError")
          assert.strictEqual(error.reason.code, protocol.protocolVersion === "2025-11-25" ? -32002 : -32602)
        }).pipe(Effect.scoped))

      it.effect("should time out when a call exceeds its deadline", () =>
        Effect.gen(function*() {
          const client = yield* connect(protocol)
          const tool = yield* findTool(client, "slow")
          const call = yield* client.callTool({ tool }, { timeout: "1 second" }).pipe(Effect.flip, Effect.forkChild)
          yield* TestClock.adjust("1 second")
          assert.strictEqual((yield* Fiber.join(call)).reason._tag, "TimeoutError")
        }).pipe(Effect.scoped))

      it.effect("should expose remote tools to a language model through McpClient.toolkit", () =>
        Effect.gen(function*() {
          const client = yield* connect(protocol)
          const toolkit = yield* McpClient.toolkit(client, "calc__")
          assert.deepStrictEqual(Object.keys(toolkit.tools).sort(), ["calc__add", "calc__fail", "calc__slow"])

          const response = yield* LanguageModel.generateText({ prompt: "Add", toolkit }).pipe(
            TestUtils.withLanguageModel({
              generateText: [{ type: "tool-call", id: "call-1", name: "calc__add", params: { a: 20, b: 22 } }]
            })
          )
          assert.deepStrictEqual(response.toolResults.map((part) => part.result), ["{\"total\":42}"])
        }).pipe(Effect.scoped))
    })
  }

  // Both supported revisions allow error responses without an ID, e.g. HTTP 400 version rejections.
  // https://modelcontextprotocol.io/specification/2026-07-28/basic/transports#sending-messages-to-the-server
  it.effect("should retry discovery when an unsupported-version error omits its ID", () =>
    Effect.gen(function*() {
      const requests: Array<McpSchema.JsonRpcRequest> = []
      const { client } = yield* scriptedHttp((message) => {
        requests.push(message)
        return requests.length === 1
          ? new Response(
            JSON.stringify({
              jsonrpc: "2.0",
              error: {
                code: -32022,
                message: "Unsupported protocol version",
                data: { requested: "2026-07-28", supported: ["2026-07-28"] }
              }
            }),
            { status: 400, headers: { "content-type": "application/json" } }
          )
          : jsonRpcResult(message, discoverResult)
      })
      assert.deepStrictEqual(client.serverInfo, serverInfo)
      assert.deepStrictEqual(requests.map((request) => request.method), ["server/discover", "server/discover"])
      assert.deepStrictEqual(requests[1].params, {
        _meta: {
          "io.modelcontextprotocol/protocolVersion": "2026-07-28",
          "io.modelcontextprotocol/clientInfo": clientInfo,
          "io.modelcontextprotocol/clientCapabilities": {}
        }
      })
      assert.notStrictEqual(requests[0].id, requests[1].id)
    }))

  // Annotated arguments are mirrored into headers only when present as own JSON properties.
  // https://modelcontextprotocol.io/specification/2026-07-28/basic/transports#custom-headers-from-tool-parameters
  it.effect("should mirror own annotated tool arguments into HTTP headers", () =>
    Effect.gen(function*() {
      const definition = {
        name: "routed",
        inputSchema: {
          type: "object",
          properties: {
            region: { type: "string", "x-mcp-header": "Region" },
            constructor: { type: "string", "x-mcp-header": "Ctor" }
          }
        }
      }
      const calls: Array<Readonly<Record<string, string>>> = []
      const { client } = yield* scriptedHttp((message, request) => {
        if (message.method === "tools/call") calls.push(request.headers)
        return message.method === "server/discover"
          ? jsonRpcResult(message, discoverResult)
          : message.method === "tools/list"
          ? jsonRpcResult(message, { ...discoverResult, tools: [definition] })
          : jsonRpcResult(message, { ...discoverResult, content: [] })
      })
      const [tool] = yield* client.listTools()
      yield* client.callTool({ tool, arguments: { region: "Hello, 世界" } })
      assert.strictEqual(calls[0]["mcp-method"], "tools/call")
      assert.strictEqual(calls[0]["mcp-name"], "routed")
      assert.strictEqual(calls[0]["mcp-param-region"], "=?base64?SGVsbG8sIOS4lueVjA==?=")
      assert.isUndefined(calls[0]["mcp-param-ctor"])
    }))

  // An annotation outside a chain of `properties` keys invalidates the tool definition.
  // https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http#schema-extension
  it.effect("should omit tools with header annotations outside properties-only paths", () =>
    Effect.gen(function*() {
      const annotated = { type: "string", "x-mcp-header": "Region" }
      const tools = [
        {
          name: "nested",
          inputSchema: { type: "object", properties: { scope: { type: "object", properties: { region: annotated } } } }
        },
        {
          name: "items",
          inputSchema: { type: "object", properties: { regions: { type: "array", items: annotated } } }
        },
        { name: "anyOf", inputSchema: { type: "object", properties: { region: { anyOf: [annotated] } } } },
        { name: "defs", inputSchema: { type: "object", properties: {}, $defs: { region: annotated } } }
      ]
      const { client } = yield* scriptedHttp((message) =>
        message.method === "server/discover"
          ? jsonRpcResult(message, discoverResult)
          : jsonRpcResult(message, { ...discoverResult, tools })
      )
      assert.deepStrictEqual((yield* client.listTools()).map((tool) => tool.name), ["nested"])
    }))

  // Results are validated against the selected revision as well as the public model.
  // https://modelcontextprotocol.io/specification/2026-07-28/schema#listtoolsresult
  it.effect("should reject a modern list result that omits revision-required fields", () =>
    Effect.gen(function*() {
      const { client } = yield* scriptedHttp((message) =>
        message.method === "tools/list"
          ? jsonRpcResult(message, { resultType: "complete", tools: [] })
          : scriptedReply(McpProtocol.v2026_07_28, message)
      )
      const error = yield* client.listTools().pipe(Effect.flip)
      assert.strictEqual(error.reason._tag, "ValidationError")
    }))

  // A single page larger than the item limit must fail with LimitError, not exceed the call argument limit.
  it.effect("should fail with LimitError when one discovery page exceeds the item limit", () =>
    Effect.gen(function*() {
      const prompts = Array.from({ length: 150_000 }, () => ({ name: "p" }))
      const { client } = yield* scriptedHttp((message) =>
        message.method === "prompts/list"
          ? jsonRpcResult(message, { prompts })
          : scriptedReply(McpProtocol.v2025_11_25, message), { protocol: McpProtocol.v2025_11_25 })
      const error = yield* client.listPrompts().pipe(Effect.flip)
      assert.strictEqual(error.reason._tag, "LimitError")
    }))

  describe("cancellation", () => {
    // Legacy HTTP sends notifications/cancelled; modern HTTP closes the response stream instead.
    // https://modelcontextprotocol.io/specification/2025-11-25/basic/utilities/cancellation
    // https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http#cancellation
    for (const protocol of protocols) {
      it.effect(`should cancel a timed out ${protocol.protocolVersion} HTTP call`, () =>
        Effect.gen(function*() {
          let closed = false
          const { client, sent } = yield* scriptedHttp((message) =>
            message.method === "tools/call"
              ? new Response(
                new ReadableStream({
                  cancel() {
                    closed = true
                  }
                }),
                { headers: { "content-type": "text/event-stream" } }
              )
              : scriptedReply(protocol, message), { protocol })
          const call = yield* client.callTool({ tool: slowTool }, { timeout: "1 second" }).pipe(
            Effect.flip,
            Effect.forkChild
          )
          yield* TestClock.adjust("1 second")
          assert.strictEqual((yield* Fiber.join(call)).reason._tag, "TimeoutError")

          const callRequest = sent.find(({ message }) => methodOf(message) === "tools/call")?.message
          assert(isRequest(callRequest))
          const cancellations = sent.filter(({ message }) => methodOf(message) === "notifications/cancelled")
          assert.isTrue(closed)
          if (protocol.protocolVersion === "2025-11-25") {
            assert.deepStrictEqual(
              cancellations.map(({ message }) =>
                message !== undefined && "params" in message ? message.params : undefined
              ),
              [{ requestId: callRequest.id }]
            )
            assert.strictEqual(cancellations[0].request.headers["mcp-session-id"], "session-1")
          } else {
            assert.deepStrictEqual(cancellations, [])
          }
        }))

      // stdio sends notifications/cancelled for both revisions.
      // https://modelcontextprotocol.io/specification/2026-07-28/basic/patterns/cancellation
      it.effect(`should cancel a timed out ${protocol.protocolVersion} stdio call`, () =>
        Effect.gen(function*() {
          const server = yield* connectStdio(protocol)
          const call = yield* server.client.callTool({ tool: slowTool }, { timeout: "1 second" }).pipe(
            Effect.flip,
            Effect.forkChild
          )
          const request = yield* server.receive
          assert(isRequest(request))
          yield* TestClock.adjust("1 second")
          assert.strictEqual((yield* Fiber.join(call)).reason._tag, "TimeoutError")
          assert.deepStrictEqual(yield* server.receive, {
            jsonrpc: "2.0",
            method: "notifications/cancelled",
            params: { requestId: request.id }
          })
        }))
    }
  })

  // https://modelcontextprotocol.io/specification/2025-11-25/basic/transports#session-management
  describe("legacy HTTP sessions", () => {
    it.effect("should echo the session ID and delete the session when the scope closes", () =>
      Effect.gen(function*() {
        const sent = yield* Effect.gen(function*() {
          const { client, sent } = yield* scriptedHttp(
            (message) => scriptedReply(McpProtocol.v2025_11_25, message),
            { protocol: McpProtocol.v2025_11_25 }
          )
          yield* client.listTools()
          return sent
        }).pipe(Effect.scoped)

        const [initialize, ...rest] = sent
        assert(isRequest(initialize.message) && initialize.message.method === "initialize")
        assert.deepStrictEqual(initialize.message.params?.clientInfo, clientInfo)
        assert.deepStrictEqual(rest.map(({ request }) => request.headers["mcp-session-id"]), [
          "session-1",
          "session-1",
          "session-1"
        ])
        assert.deepStrictEqual(rest.map(({ request, message }) => methodOf(message) ?? request.method), [
          "notifications/initialized",
          "tools/list",
          "DELETE"
        ])
      }))

    it.effect("should fail with sessionExpired when the server no longer recognizes the session", () =>
      Effect.gen(function*() {
        const { client, sent } = yield* scriptedHttp((message) =>
          message.method === "tools/list"
            ? new Response(null, { status: 404 })
            : scriptedReply(McpProtocol.v2025_11_25, message), { protocol: McpProtocol.v2025_11_25 })
        const error = yield* client.listTools().pipe(Effect.flip)
        assert(error.reason._tag === "ClosedError")
        assert.isTrue(error.reason.sessionExpired)

        const count = sent.length
        assert.strictEqual(yield* client.listTools().pipe(Effect.flip), error)
        assert.strictEqual(sent.length, count)
      }))
  })

  describe("HTTP responses", () => {
    // Legacy servers may send requests such as ping on the response stream before the result.
    // https://modelcontextprotocol.io/specification/2025-11-25/basic/transports#sending-messages-to-the-server
    it.effect("should answer a legacy ping before the final SSE response", () =>
      Effect.gen(function*() {
        const { client, sent } = yield* scriptedHttp((message) =>
          message.method === "tools/list"
            ? sseResponse([
              { jsonrpc: "2.0", id: "ping-1", method: "ping" },
              { jsonrpc: "2.0", id: message.id, result: { tools: [] } }
            ])
            : scriptedReply(McpProtocol.v2025_11_25, message), { protocol: McpProtocol.v2025_11_25 })
        assert.deepStrictEqual(yield* client.listTools(), [])
        assert.isTrue(sent.some(({ message }) => message?.id === "ping-1" && "result" in message))
      }))

    // https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http#receiving-messages
    it.effect("should skip modern progress notifications before the final SSE response", () =>
      Effect.gen(function*() {
        const { client } = yield* scriptedHttp((message) =>
          message.method === "tools/list"
            ? sseResponse([
              { jsonrpc: "2.0", method: "notifications/progress", params: { progressToken: 1, progress: 1 } },
              { jsonrpc: "2.0", id: message.id, result: { ...discoverResult, tools: [] } }
            ])
            : scriptedReply(McpProtocol.v2026_07_28, message)
        )
        assert.deepStrictEqual(yield* client.listTools(), [])
      }))

    it.effect("should preserve HTTP status and JSON-RPC error details when the client filters status codes", () =>
      Effect.gen(function*() {
        const { client } = yield* scriptedHttp((message) =>
          message.method === "tools/list"
            ? new Response(
              JSON.stringify({ jsonrpc: "2.0", id: message.id, error: { code: -32000, message: "Denied" } }),
              {
                status: 401,
                headers: { "content-type": "application/json", "www-authenticate": "Bearer realm=\"tools\"" }
              }
            )
            : scriptedReply(McpProtocol.v2026_07_28, message), { filterStatusOk: true })
        const error = yield* client.listTools().pipe(Effect.flip)
        assert(error.reason._tag === "HttpError")
        assert.strictEqual(error.reason.status, 401)
        assert.strictEqual(error.reason.code, -32000)
        assert.strictEqual(error.reason.wwwAuthenticate, "Bearer realm=\"tools\"")
      }))
  })

  describe("stdio", () => {
    it.effect("should connect over stdio and close the process when the layer scope ends", () =>
      Effect.gen(function*() {
        const exit = yield* Effect.gen(function*() {
          const server = yield* connectStdio(McpProtocol.v2025_11_25)
          assert.deepStrictEqual(server.client.serverInfo, serverInfo)

          const listing = yield* server.client.listTools().pipe(Effect.forkChild)
          const list = yield* server.receive
          assert(isRequest(list) && list.method === "tools/list")
          yield* server.send({
            jsonrpc: "2.0",
            id: list.id,
            result: { tools: [{ name: "read", inputSchema: { type: "object" } }] }
          })
          assert.deepStrictEqual((yield* Fiber.join(listing)).map((tool) => tool.name), ["read"])
          return server.exit
        }).pipe(Effect.scoped)

        assert.isTrue(yield* Deferred.isDone(exit))
      }))

    // Handshake and discovery are bounded by default; server work is bounded only on request.
    it.effect("should apply the default deadline to discovery", () =>
      Effect.gen(function*() {
        const server = yield* connectStdio(McpProtocol.v2025_11_25)
        const listing = yield* server.client.listTools().pipe(Effect.flip, Effect.forkChild)
        yield* server.receive
        yield* TestClock.adjust("60 seconds")
        assert.strictEqual((yield* Fiber.join(listing)).reason._tag, "TimeoutError")
      }))

    it.effect("should not apply a default deadline to tool calls, prompts or resource reads", () =>
      Effect.gen(function*() {
        const server = yield* connectStdio(McpProtocol.v2025_11_25)
        const prompt = McpSchema.Prompt.make({ name: "slow" })
        const fibers = [
          yield* server.client.callTool({ tool: slowTool }).pipe(Effect.forkChild),
          yield* server.client.getPrompt({ prompt }).pipe(Effect.forkChild),
          yield* server.client.readResource({ uri: "demo://slow" }).pipe(Effect.forkChild)
        ]
        for (let i = 0; i < fibers.length; i++) yield* server.receive
        yield* TestClock.adjust("10 minutes")
        for (const fiber of fibers) assert.isUndefined(fiber.pollUnsafe())
        yield* Fiber.interruptAll(fibers)
      }))

    // An uncorrelated error cannot be matched to a request, so pending calls fail instead of waiting.
    it.effect("should fail pending calls when the server sends an error without an ID", () =>
      Effect.gen(function*() {
        const server = yield* connectStdio(McpProtocol.v2025_11_25)
        const call = yield* server.client.callTool({ tool: slowTool }).pipe(Effect.flip, Effect.forkChild)
        yield* server.receive
        yield* server.send({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } })
        assert.strictEqual((yield* Fiber.join(call)).reason._tag, "ProtocolError")
      }))

    it.effect("should fail pending calls when the process exits", () =>
      Effect.gen(function*() {
        const server = yield* connectStdio(McpProtocol.v2025_11_25)
        const call = yield* server.client.callTool({ tool: slowTool }).pipe(Effect.flip, Effect.forkChild)
        yield* server.receive
        yield* Deferred.succeed(server.exit, Spawner.ExitCode(1))
        yield* TestClock.adjust("5 seconds")
        assert.strictEqual((yield* Fiber.join(call)).reason._tag, "TransportError")
      }))

    // Server rejections are JSON-RPC errors and must not break later requests on the same transport.
    it.effect("should return McpServer request errors and keep the transport usable", () =>
      Effect.gen(function*() {
        const transport = yield* connectStdioServer(McpProtocol.v2025_11_25)
        yield* McpClient.make(clientInfo).pipe(Effect.provideService(McpClient.Transport, transport))

        const missing = yield* transport.request({ jsonrpc: "2.0", id: "missing", method: "missing/method" })
        assert("error" in missing)
        assert.strictEqual(missing.error.code, -32601)

        const invalid = yield* transport.request({
          jsonrpc: "2.0",
          id: "invalid",
          method: "resources/read",
          params: { uri: 1 }
        })
        assert("error" in invalid)
        assert.strictEqual(invalid.error.code, -32602)

        assert.deepStrictEqual(
          yield* transport.request({ jsonrpc: "2.0", id: "ping", method: "ping" }),
          { jsonrpc: "2.0", id: "ping", result: {} }
        )
      }))
  })
})

const serverInfo = { name: "scripted-server", version: "1.0.0" }

const isRequest = Schema.is(McpSchema.JsonRpcRequest)

const methodOf = (message: McpSchema.JsonRpcMessage | undefined) =>
  message !== undefined && "method" in message ? message.method : undefined

const slowTool = McpSchema.Tool.make({ name: "slow", inputSchema: { type: "object" } })

const initializeResult = {
  protocolVersion: "2025-11-25",
  serverInfo,
  capabilities: { tools: {}, prompts: {}, resources: {} }
}

const discoverResult = {
  resultType: "complete",
  _meta: { "io.modelcontextprotocol/serverInfo": serverInfo },
  supportedVersions: ["2026-07-28"],
  capabilities: { tools: {} },
  ttlMs: 0,
  cacheScope: "private"
}

const jsonRpcResult = (message: McpSchema.JsonRpcRequest, result: unknown, headers?: Record<string, string>) =>
  new Response(JSON.stringify({ jsonrpc: "2.0", id: message.id, result }), {
    headers: { "content-type": "application/json", ...headers }
  })

const sseResponse = (messages: ReadonlyArray<unknown>) =>
  new Response(messages.map((message) => `data: ${JSON.stringify(message)}\n\n`).join(""), {
    headers: { "content-type": "text/event-stream" }
  })

// Answers the handshake and empty discovery for either revision.
const scriptedReply = (
  protocol: McpProtocol.ProtocolAdapter<McpClient.ProtocolVersion>,
  message: McpSchema.JsonRpcRequest
) =>
  message.method === "initialize"
    ? jsonRpcResult(message, initializeResult, { "mcp-session-id": "session-1" })
    : message.method === "server/discover"
    ? jsonRpcResult(message, discoverResult)
    : jsonRpcResult(
      message,
      protocol.protocolVersion === "2025-11-25" ? { tools: [] } : { ...discoverResult, tools: [] }
    )

// Connects through the public HTTP transport, recording every request. Requests
// are answered by `reply`; notifications, responses and DELETE are accepted.
const scriptedHttp = Effect.fnUntraced(function*(
  reply: (message: McpSchema.JsonRpcRequest, request: HttpClientRequest.HttpClientRequest) => Response,
  options: {
    readonly protocol?: McpProtocol.ProtocolAdapter<McpClient.ProtocolVersion> | undefined
    readonly filterStatusOk?: boolean | undefined
  } = {}
) {
  const sent: Array<{
    readonly request: HttpClientRequest.HttpClientRequest
    readonly message: McpSchema.JsonRpcMessage | undefined
  }> = []
  const http = HttpClient.make((request) =>
    Effect.sync(() => {
      const message = request.body._tag === "Uint8Array"
        ? JSON.parse(new TextDecoder().decode(request.body.body)) as McpSchema.JsonRpcMessage
        : undefined
      sent.push({ request, message })
      return HttpClientResponse.fromWeb(
        request,
        message !== undefined && isRequest(message)
          ? reply(message, request)
          : new Response(null, { status: 202 })
      )
    })
  )
  const transport = yield* McpClient.http({ url: MCP_ENDPOINT, protocol: options.protocol ?? McpProtocol.v2026_07_28 })
    .pipe(Effect.provideService(HttpClient.HttpClient, options.filterStatusOk ? HttpClient.filterStatusOk(http) : http))
  const client = yield* McpClient.make(clientInfo).pipe(Effect.provideService(McpClient.Transport, transport))
  return { client, sent }
})

// Connects through `layerStdio` to a controlled process that speaks newline-delimited JSON-RPC.
const connectStdio = Effect.fnUntraced(function*(protocol: McpProtocol.ProtocolAdapter<McpClient.ProtocolVersion>) {
  const output = yield* Queue.unbounded<Uint8Array, Cause.Done>()
  const writes = yield* Queue.unbounded<Uint8Array>()
  const exit = yield* Deferred.make<Spawner.ExitCode>()
  const spawner = Spawner.make(() =>
    Effect.succeed(Spawner.makeHandle({
      pid: Spawner.ProcessId(1),
      stdin: Sink.forEach((bytes: Uint8Array) => Queue.offer(writes, bytes)).pipe(
        Sink.ensuring(Deferred.succeed(exit, Spawner.ExitCode(0)))
      ),
      stdout: Stream.fromQueue(output),
      stderr: Stream.empty,
      all: Stream.empty,
      exitCode: Deferred.await(exit),
      isRunning: Effect.succeed(true),
      kill: () => Deferred.succeed(exit, Spawner.ExitCode(0)).pipe(Effect.asVoid),
      unref: Effect.succeed(Effect.void),
      getInputFd: () => Sink.drain,
      getOutputFd: () => Stream.empty
    }))
  )
  const receive = Queue.take(writes).pipe(
    Effect.map((bytes) => JSON.parse(new TextDecoder().decode(bytes)) as McpSchema.JsonRpcMessage)
  )
  const send = (message: unknown) => Queue.offer(output, new TextEncoder().encode(JSON.stringify(message) + "\n"))

  const building = yield* Layer.build(
    McpClient.layerStdio({ ...clientInfo, command: ChildProcess.make("test-mcp-server"), protocol }).pipe(
      Layer.provide(Layer.succeed(Spawner.ChildProcessSpawner, spawner))
    )
  ).pipe(Effect.forkChild)

  const initial = yield* receive
  assert(isRequest(initial))
  const legacy = protocol.protocolVersion === "2025-11-25"
  assert.strictEqual(initial.method, legacy ? "initialize" : "server/discover")
  yield* send({ jsonrpc: "2.0", id: initial.id, result: legacy ? initializeResult : discoverResult })
  const client = Context.get(yield* Fiber.join(building), McpClient.McpClient)
  if (legacy) assert.deepStrictEqual(yield* receive, { jsonrpc: "2.0", method: "notifications/initialized" })

  return { client, receive, send, exit }
})

// Connects `McpClient.stdio` to an in-memory `McpServer.layerStdio`.
const connectStdioServer = Effect.fnUntraced(function*(
  protocol: McpProtocol.ProtocolAdapter<McpClient.ProtocolVersion>
) {
  const toServer = yield* Queue.unbounded<Uint8Array, Cause.Done>()
  const toClient = yield* Queue.unbounded<Uint8Array, Cause.Done>()
  const encoder = new TextEncoder()
  const exit = yield* Deferred.make<Spawner.ExitCode>()
  yield* Layer.launch(
    McpServer.layerStdio({ ...serverInfo, protocols: [protocol] }).pipe(
      Layer.provide(Stdio.layerTest({
        stdin: Stream.fromQueue(toServer),
        stdout: () =>
          Sink.forEach((chunk: string | Uint8Array) =>
            Queue.offer(toClient, typeof chunk === "string" ? encoder.encode(chunk) : chunk)
          )
      }))
    )
  ).pipe(Effect.forkScoped)
  const spawner = Spawner.make(() =>
    Effect.succeed(Spawner.makeHandle({
      pid: Spawner.ProcessId(1),
      stdin: Sink.forEach((bytes: Uint8Array) => Queue.offer(toServer, bytes)).pipe(
        Sink.ensuring(Deferred.succeed(exit, Spawner.ExitCode(0)))
      ),
      stdout: Stream.fromQueue(toClient),
      stderr: Stream.empty,
      all: Stream.empty,
      exitCode: Deferred.await(exit),
      isRunning: Effect.succeed(true),
      kill: () => Deferred.succeed(exit, Spawner.ExitCode(0)).pipe(Effect.asVoid),
      unref: Effect.succeed(Effect.void),
      getInputFd: () => Sink.drain,
      getOutputFd: () => Stream.empty
    }))
  )
  return yield* McpClient.stdio({ command: ChildProcess.make("test-mcp-server"), protocol }).pipe(
    Effect.provideService(Spawner.ChildProcessSpawner, spawner)
  )
})
