import { assert, describe, it } from "@effect/vitest"
import { Context, Deferred, Effect, Fiber, Layer, Queue, Schema, Sink, Stream } from "effect"
import { LanguageModel, McpClient, McpProtocol, type McpSchema, McpServer, Tool, Toolkit } from "effect/ai"
import * as FetchHttpClient from "effect/http/FetchHttpClient"
import * as HttpClient from "effect/http/HttpClient"
import type * as HttpClientRequest from "effect/http/HttpClientRequest"
import * as HttpClientResponse from "effect/http/HttpClientResponse"
import * as ChildProcess from "effect/process/ChildProcess"
import * as Spawner from "effect/process/ChildProcessSpawner"
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
    McpClient.layerHttp({ clientInfo, url: MCP_ENDPOINT, protocol }).pipe(
      Layer.provide(FetchHttpClient.layer),
      Layer.provide(Layer.succeed(FetchHttpClient.Fetch, fetch))
    )
  )
  return Context.get(context, McpClient.McpClient)
})

const findTool = Effect.fnUntraced(function*(client: McpClient.Client, name: string) {
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
          const decoded = yield* McpClient.callTool(client, {
            tool,
            arguments: { a: 1, b: 2 },
            schema: Schema.Struct({ total: Schema.Number })
          })
          assert.deepStrictEqual(decoded, { total: 3 })

          const [prompt] = yield* McpClient.listPrompts(client)
          const messages = yield* McpClient.getPrompt(client, { prompt, arguments: { total: "42" } })
          assert.deepStrictEqual(messages.messages.map((message) => message.content), [{
            type: "text",
            text: "Explain 42"
          }])

          const [resource] = yield* McpClient.listResources(client)
          const contents = yield* McpClient.readResource(client, { uri: resource.uri })
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
      const client = yield* scriptedHttp((message) => {
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
      const client = yield* scriptedHttp((message, request) => {
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

  it.effect("should connect over stdio and close the process when the layer scope ends", () =>
    Effect.gen(function*() {
      const output = yield* Queue.unbounded<Uint8Array>()
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

      yield* Effect.gen(function*() {
        const building = yield* Layer.build(
          McpClient.layerStdio({
            clientInfo,
            command: ChildProcess.make("test-mcp-server"),
            protocol: McpProtocol.v2025_11_25
          }).pipe(Layer.provide(Layer.succeed(Spawner.ChildProcessSpawner, spawner)))
        ).pipe(Effect.forkChild)

        const initialize = yield* receive
        assert("id" in initialize && "method" in initialize && initialize.method === "initialize")
        yield* send({
          jsonrpc: "2.0",
          id: initialize.id,
          result: { protocolVersion: "2025-11-25", serverInfo, capabilities: { tools: {} } }
        })
        const client = Context.get(yield* Fiber.join(building), McpClient.McpClient)
        assert.deepStrictEqual(client.serverInfo, serverInfo)
        assert.deepStrictEqual(yield* receive, { jsonrpc: "2.0", method: "notifications/initialized" })

        const listing = yield* client.listTools().pipe(Effect.forkChild)
        const list = yield* receive
        assert("id" in list && "method" in list && list.method === "tools/list")
        yield* send({
          jsonrpc: "2.0",
          id: list.id,
          result: { tools: [{ name: "read", inputSchema: { type: "object" } }] }
        })
        assert.deepStrictEqual((yield* Fiber.join(listing)).map((tool) => tool.name), ["read"])
      }).pipe(Effect.scoped)

      assert.isTrue(yield* Deferred.isDone(exit))
    }))
})

const serverInfo = { name: "scripted-server", version: "1.0.0" }

const discoverResult = {
  resultType: "complete",
  _meta: { "io.modelcontextprotocol/serverInfo": serverInfo },
  supportedVersions: ["2026-07-28"],
  capabilities: { tools: {} },
  ttlMs: 0,
  cacheScope: "private"
}

const jsonRpcResult = (message: McpSchema.JsonRpcRequest, result: unknown) =>
  new Response(JSON.stringify({ jsonrpc: "2.0", id: message.id, result }), {
    headers: { "content-type": "application/json" }
  })

const scriptedHttp = (
  reply: (message: McpSchema.JsonRpcRequest, request: HttpClientRequest.HttpClientRequest) => Response
) =>
  McpClient.make({ clientInfo }).pipe(
    Effect.provideServiceEffect(
      McpClient.Transport,
      McpClient.http({ url: MCP_ENDPOINT, protocol: McpProtocol.v2026_07_28 }).pipe(
        Effect.provideService(
          HttpClient.HttpClient,
          HttpClient.make((request) =>
            Effect.sync(() => {
              assert(request.body._tag === "Uint8Array")
              const message = JSON.parse(new TextDecoder().decode(request.body.body)) as McpSchema.JsonRpcRequest
              return HttpClientResponse.fromWeb(request, reply(message, request))
            })
          )
        )
      )
    )
  )
