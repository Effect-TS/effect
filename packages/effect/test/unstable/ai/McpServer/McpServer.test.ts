import { assert, describe, it } from "@effect/vitest"
import { assertTrue, strictEqual } from "@effect/vitest/utils"
import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as ErrorReporter from "effect/ErrorReporter"
import * as Fiber from "effect/Fiber"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as PubSub from "effect/PubSub"
import * as Queue from "effect/Queue"
import * as Ref from "effect/Ref"
import * as Schema from "effect/Schema"
import * as Sink from "effect/Sink"
import * as Stdio from "effect/Stdio"
import * as Stream from "effect/Stream"
import * as TestClock from "effect/testing/TestClock"
import * as AiError from "effect/unstable/ai/AiError"
import * as McpCore from "effect/unstable/ai/internal/mcpCore"
import type * as McpProtocolInternal from "effect/unstable/ai/internal/mcpProtocol"
import * as McpProtocol2026 from "effect/unstable/ai/internal/mcpProtocol/v2026_07_28"
import * as McpSchema2026 from "effect/unstable/ai/internal/mcpSchema/v2026_07_28"
import * as McpProtocol from "effect/unstable/ai/McpProtocol"
import * as McpSchema from "effect/unstable/ai/McpSchema"
import * as McpServer from "effect/unstable/ai/McpServer"
import * as Tool from "effect/unstable/ai/Tool"
import * as Toolkit from "effect/unstable/ai/Toolkit"
import * as FetchHttpClient from "effect/unstable/http/FetchHttpClient"
import * as HttpClient from "effect/unstable/http/HttpClient"
import * as HttpClientRequest from "effect/unstable/http/HttpClientRequest"
import * as HttpRouter from "effect/unstable/http/HttpRouter"
import { RpcSerialization } from "effect/unstable/rpc"
import * as Rpc from "effect/unstable/rpc/Rpc"
import * as RpcClient from "effect/unstable/rpc/RpcClient"
import type * as RpcMessage from "effect/unstable/rpc/RpcMessage"
import { RequestId } from "effect/unstable/rpc/RpcMessage"
import * as RpcServer from "effect/unstable/rpc/RpcServer"
import { initializeHttpSession, makeHttpHarness } from "./TestUtils/McpHttpHarness.ts"
import { makeMcpSseReader, readMcpHttpResponse } from "./TestUtils/McpHttpResponse.ts"
import { makeServerLayer } from "./TestUtils/McpServerLayer.ts"
import { makeMcpStdioHarness } from "./TestUtils/McpStdioHarness.ts"

const OptionalStringTool = Tool.make("OptionalStringTool", {
  parameters: Schema.Struct({ signature: Schema.optional(Schema.String) }),
  success: Schema.String
})

const PublicFailureTool = Tool.make("PublicFailureTool", {
  success: Schema.String,
  failure: Schema.ErrorInstance()
})

const InternalAiErrorTool = Tool.make("InternalAiErrorTool", {
  success: Schema.String
})

const DefectTool = Tool.make("DefectTool", {
  success: Schema.String
})

const UnserializableResultTool = Tool.make("UnserializableResultTool", {
  success: Schema.Unknown
})

const UntypedTool = Tool.make("UntypedTool")

const StructuredResultTool = Tool.make("StructuredResultTool", {
  success: Schema.Struct({ answer: Schema.String })
})

const AnnotatedVoidTool = Tool.make("AnnotatedVoidTool", {
  success: Schema.Void.annotate({ description: "No output" })
})

const NullableResultTool = Tool.make("NullableResultTool", {
  success: Schema.NullOr(Schema.Struct({ answer: Schema.String }))
})

const ArrayResultTool = Tool.make("ArrayResultTool", {
  success: Schema.Array(Schema.String)
})

const TestToolkit = Toolkit.make(
  OptionalStringTool,
  PublicFailureTool,
  InternalAiErrorTool,
  DefectTool,
  UnserializableResultTool,
  UntypedTool,
  StructuredResultTool,
  AnnotatedVoidTool,
  NullableResultTool,
  ArrayResultTool
)
type TestToolkitHandlers = Toolkit.HandlersFrom<Toolkit.Tools<typeof TestToolkit>>

const publicFailure = new Error("Public failure")
const internalAiError = AiError.make({
  module: "TestToolkit",
  method: "InternalAiErrorTool",
  reason: new AiError.RateLimitError({})
})
const privateDefect = new Error("private defect details")

const testToolkitHandlers = TestToolkit.of({
  OptionalStringTool: ({ signature }) => Effect.succeed(signature ?? "omitted"),
  PublicFailureTool: () => Effect.fail(publicFailure),
  InternalAiErrorTool: () => Effect.fail(internalAiError),
  DefectTool: () => Effect.die(privateDefect),
  UntypedTool: () => Effect.void,
  StructuredResultTool: () => Effect.succeed({ answer: "result" }),
  AnnotatedVoidTool: () => Effect.void,
  NullableResultTool: () => Effect.succeed(null),
  ArrayResultTool: () => Effect.succeed(["first", "second"]),
  UnserializableResultTool: () => Effect.succeed(1n)
})

const INTERNAL_TOOL_ERROR_MESSAGE = "Tool execution failed due to an internal server error."

const TestServerLayer = makeServerLayer({ name: "TestServer" })

const LatestProtocolServerLayer = makeServerLayer({ name: "TestServer", protocols: [McpProtocol.v2025_11_25] })

const initializePayload = {
  protocolVersion: "2025-06-18",
  capabilities: {},
  clientInfo: {
    name: "TestClient",
    version: "1.0.0"
  }
}

const pingBody = {
  jsonrpc: "2.0",
  method: "ping",
  params: {},
  id: 0
}

const directClient = McpSchema.McpServerClient.of({
  clientId: 1,
  protocolVersion: "2025-06-18",
  clientCapabilities: {},
  clientInfo: initializePayload.clientInfo,
  initializePayload,
  getClient: Effect.die("not used")
})

const makeTestClientWith = Effect.fnUntraced(function*<A, E>(
  serverLayer: Layer.Layer<A, E, HttpRouter.HttpRouter>,
  options?: {
    readonly routerLayer?: Layer.Layer<never, never, HttpRouter.HttpRouter> | undefined
  } | undefined
) {
  const harness = yield* makeHttpHarness(serverLayer, options)

  const clientLayer = RpcClient.layerProtocolHttp({
    url: "http://localhost/mcp",
    transformClient: HttpClient.mapRequest(
      HttpClientRequest.setHeader("accept", "application/json, text/event-stream")
    )
  }).pipe(
    Layer.provideMerge([FetchHttpClient.layer, RpcSerialization.layerJsonRpc()]),
    Layer.provide(Layer.succeed(FetchHttpClient.Fetch, harness.fetch))
  )
  const client = yield* RpcClient.make(McpSchema.ClientRpcs).pipe(
    Effect.provide(clientLayer)
  )

  const httpClient = yield* HttpClient.HttpClient.pipe(
    Effect.provide(clientLayer)
  )

  return { client, responses: harness.responses, httpClient }
})

const makeTestClient = makeTestClientWith(TestServerLayer)

const makeRouterTestClient = (
  router: Layer.Layer<never, never, HttpRouter.HttpRouter>
) => makeTestClientWith(TestServerLayer, { routerLayer: router })

const makeToolkitTestClient = Effect.fnUntraced(function*(handlers: TestToolkitHandlers = testToolkitHandlers) {
  const reported: Array<Cause.Cause<unknown>> = []
  const reporterLayer = ErrorReporter.layer([ErrorReporter.make(({ cause }) => {
    reported.push(cause)
  })])
  const serverLayer = McpServer.toolkit(TestToolkit).pipe(
    Layer.provideMerge(TestToolkit.toLayer(handlers)),
    Layer.provide(TestServerLayer),
    Layer.provide(reporterLayer)
  )
  const { client } = yield* makeTestClientWith(serverLayer)
  yield* client.initialize({
    protocolVersion: "9999-01-01",
    capabilities: {},
    clientInfo: {
      name: "TestClient",
      version: "1.0.0"
    }
  })
  return { client, reported }
})

const toolResultText = (result: McpSchema.CallToolResult): string => {
  const content = result.content[0]
  assertTrue(content?.type === "text", "Expected text tool-result content")
  return content.text
}

const collectGarbage = Effect.promise(async () => {
  const { setFlagsFromString } = await import("node:v8")
  const { runInNewContext } = await import("node:vm")
  setFlagsFromString("--expose_gc")
  const collect = runInNewContext("gc") as () => void
  setFlagsFromString("--no-expose_gc")
  // WeakRef targets remain alive until the current job ends, so collect across jobs.
  for (let i = 0; i < 8; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0))
    collect()
  }
})

describe("McpServer", () => {
  // Effect delivery contract: an unavailable destination must not leave the caller waiting.
  it.effect("should return from completion notification when the target client is absent", () =>
    Effect.gen(function*() {
      const fixture = yield* makeMcpStdioHarness(McpProtocol.v2025_11_25)
      yield* fixture.initialize()
      yield* fixture.server.notifyElicitationComplete({ clientId: 999, elicitationId: "not-connected" })
      assert.deepInclude(yield* fixture.sendRequest("ping", {}), { result: {} })
    }))

  // URL completion is unavailable in June; this checks that the Effect call returns, not wire suppression.
  it.effect("should return from completion notification when the target protocol does not support it", () =>
    Effect.gen(function*() {
      const fixture = yield* makeMcpStdioHarness(McpProtocol.v2025_06_18)
      yield* fixture.initialize()
      yield* fixture.server.notifyElicitationComplete({ clientId: 0, elicitationId: "unsupported" })
      assert.deepInclude(yield* fixture.sendRequest("ping", {}), { result: {} })
    }))

  // https://modelcontextprotocol.io/specification/2025-11-25/client/elicitation#completion-notifications-for-url-mode-elicitation
  // MCP defines the completion notification and its recipient. Awaiting delivery before returning is the Effect API contract.
  it.effect("should deliver URL elicitation completion before the tool result when the tool awaits notification delivery", () =>
    Effect.gen(function*() {
      const authorizationCompleted = yield* Deferred.make<void>()
      const registration = Layer.effectDiscard(Effect.gen(function*() {
        const server = yield* McpServer.McpServer
        yield* server.addTool({
          tool: new McpSchema.Tool({ name: "Authorize", inputSchema: { type: "object" } }),
          annotations: Context.empty(),
          handle: () =>
            Effect.gen(function*() {
              const client = yield* Effect.serviceOption(McpSchema.McpServerClient).pipe(
                Effect.flatMap(Effect.fromOption)
              )
              yield* client.getClient.pipe(
                Effect.flatMap((reverseClient) =>
                  reverseClient.elicit(
                    Schema.decodeUnknownSync(McpSchema.Elicit.payloadSchema)({
                      mode: "url",
                      message: "Authorize access",
                      url: "https://example.com/authorize",
                      elicitationId: "authorization-1"
                    })
                  )
                ),
                Effect.scoped
              )
              yield* Deferred.await(authorizationCompleted)
              yield* server.notifyElicitationComplete({
                clientId: client.clientId,
                elicitationId: "authorization-1"
              })
              return new McpSchema.CallToolResult({ content: [{ type: "text", text: "Authorized" }] })
            }).pipe(Effect.orDie)
        })
      }))
      const harness = yield* makeHttpHarness(registration.pipe(Layer.provideMerge(
        makeServerLayer({ name: "UrlElicitationCompletion", protocols: [McpProtocol.v2025_11_25] })
      )))
      const initialized = yield* harness.post({
        jsonrpc: "2.0",
        id: "initialize",
        method: "initialize",
        params: {
          protocolVersion: "2025-11-25",
          capabilities: { elicitation: { url: {} } },
          clientInfo: { name: "authorization-client", version: "1.0.0" }
        }
      })
      yield* readMcpHttpResponse(initialized)
      const sessionId = initialized.headers.get("Mcp-Session-Id")
      assert.isNotNull(sessionId)
      const headers = { "Mcp-Session-Id": sessionId, "Mcp-Protocol-Version": "2025-11-25" }
      yield* harness.post({ jsonrpc: "2.0", method: "notifications/initialized" }, headers)
      const response = yield* harness.post({
        jsonrpc: "2.0",
        id: "authorize-tool",
        method: "tools/call",
        params: { name: "Authorize", arguments: {} }
      }, headers)
      const stream = makeMcpSseReader(response)
      yield* Effect.addFinalizer(() => stream.cancel)
      const elicitation = yield* stream.take()
      assert.strictEqual(elicitation.method, "elicitation/create")
      assert.isDefined(elicitation.id)
      const accepted = yield* harness.post({
        jsonrpc: "2.0",
        id: elicitation.id,
        result: { action: "accept" }
      }, headers)
      assert.strictEqual(accepted.status, 202)
      yield* Deferred.succeed(authorizationCompleted, undefined)

      const completed = yield* stream.take()
      assert.strictEqual(completed.method, "notifications/elicitation/complete")
      assert.deepStrictEqual(completed.params, { elicitationId: "authorization-1" })
      const result = yield* stream.take()
      assert.strictEqual(result.id, "authorize-tool")
      assert.deepStrictEqual(result.result, { content: [{ type: "text", text: "Authorized" }] })
      assert.deepStrictEqual(yield* stream.drain(), [])
    }))

  // Request metadata retention is a server lifecycle concern, not an MCP wire requirement.
  // This collection hook is Node-specific; other runtimes still run the request lifecycle tests below.
  it.effect.skipIf(process.versions.bun !== undefined || process.versions.deno !== undefined)(
    "should release request metadata when HTTP requests complete without server notifications",
    () =>
      Effect.gen(function*() {
        const references: Array<WeakRef<object>> = []
        const controls: Array<WeakRef<object>> = []
        const harness = yield* makeHttpHarness(
          Layer.effectDiscard(Effect.gen(function*() {
            const server = yield* McpServer.McpServer
            yield* server.addTool({
              tool: new McpSchema.Tool({ name: "Capture", inputSchema: { type: "object" } }),
              annotations: Context.empty(),
              handle: () =>
                Effect.gen(function*() {
                  const context = yield* McpSchema.McpRequestContext
                  references.push(new WeakRef(context.requestMetadata!))
                  controls.push(new WeakRef({ unrelated: true }))
                  return new McpSchema.CallToolResult({ content: [] })
                })
            })
          })).pipe(Layer.provideMerge(makeServerLayer({
            name: "HttpRequestLifecycle",
            protocols: [McpProtocol.v2026_07_28]
          })))
        )
        for (let id = 0; id < 4; id++) {
          const response = yield* harness.post({
            jsonrpc: "2.0",
            id,
            method: "tools/call",
            params: {
              name: "Capture",
              arguments: {},
              _meta: {
                "io.modelcontextprotocol/protocolVersion": "2026-07-28",
                "io.modelcontextprotocol/clientCapabilities": {},
                marker: `request-${id}`
              }
            }
          }, { "mcp-protocol-version": "2026-07-28", "mcp-method": "tools/call", "mcp-name": "Capture" })
          assert.strictEqual(response.status, 200)
          yield* Effect.promise(() => response.text())
        }
        assert.strictEqual(references.length, 4)
        yield* collectGarbage
        assert.isTrue(controls.every((ref) => ref.deref() === undefined), "GC must collect unreachable controls")
        assert.isTrue(
          references.every((ref) => ref.deref() === undefined),
          "completed request metadata must be collectable"
        )
      })
  )

  // Cancelled reverse requests may never receive a reply. Releasing their routing state is
  // a server lifecycle concern, so this GC regression belongs here rather than conformance.
  // https://modelcontextprotocol.io/specification/2025-11-25/basic/utilities/cancellation#behavior-requirements
  it.effect.skipIf(process.versions.bun !== undefined || process.versions.deno !== undefined)(
    "should release disconnected clients when a reverse request is cancelled without a reply",
    () =>
      Effect.gen(function*() {
        const refs = new Map<number, WeakRef<object>>()
        const connected = new Set([1, 2])
        const outbound = yield* Queue.unbounded<RpcMessage.FromServerEncoded>()
        const disconnects = yield* Queue.unbounded<number>()
        type Receive = (
          clientId: number,
          message: RpcMessage.FromClientEncoded | RpcMessage.FromServerEncoded
        ) => Effect.Effect<void>
        const ready = yield* Deferred.make<Receive>()
        const cancelled = yield* Deferred.make<void>()
        const transport = yield* RpcServer.Protocol.make((write) =>
          Deferred.succeed(ready, write as Receive).pipe(Effect.as({
            disconnects,
            send: (_clientId, message) => Queue.offer(outbound, message).pipe(Effect.asVoid),
            end: () => Effect.void,
            clientIds: Effect.succeed(connected),
            initialMessage: Effect.succeedNone,
            supportsAck: false,
            supportsTransferables: false,
            supportsSpanPropagation: false,
            supportsNotifications: true,
            codecFor: Schema.toCodecJson as RpcSerialization.CodecFor
          }))
        )
        const toolkit = Toolkit.make(Tool.make("Probe", {
          success: Schema.String,
          dependencies: [McpSchema.McpServerClient]
        }))
        yield* Layer.build(
          McpServer.toolkit(toolkit).pipe(
            Layer.provide(toolkit.toLayer({
              Probe: () =>
                Effect.gen(function*() {
                  const client = yield* McpSchema.McpServerClient
                  refs.set(client.clientId, new WeakRef(client.clientInfo))
                  if (client.clientId === 2) return "control"
                  yield* McpServer.elicit({ message: "Approve", schema: Schema.Struct({ approved: Schema.Boolean }) })
                    .pipe(
                      Effect.orDie,
                      Effect.onInterrupt(() => Deferred.succeed(cancelled, undefined))
                    )
                  return "done"
                })
            })),
            Layer.provide(
              McpServer.layer({ name: "ReverseLifetime", version: "1", protocols: [McpProtocol.v2025_11_25] }).pipe(
                Layer.provide(Layer.succeed(RpcServer.Protocol, transport))
              )
            )
          )
        )
        const send = yield* Deferred.await(ready)
        for (const clientId of [1, 2]) {
          yield* send(clientId, {
            _tag: "Request",
            id: clientId,
            tag: "initialize",
            payload: {
              protocolVersion: "2025-11-25",
              capabilities: { elicitation: { form: {} } },
              clientInfo: { name: `client-${clientId}`, version: "1" }
            },
            headers: []
          })
          assert.strictEqual((yield* Queue.take(outbound))._tag, "Exit")
          yield* send(clientId, {
            _tag: "Request",
            id: 10 + clientId,
            tag: "tools/call",
            payload: { name: "Probe" },
            headers: []
          })
          const outboundMessage = yield* Queue.take(outbound)
          assert.strictEqual(outboundMessage._tag, clientId === 1 ? "Request" : "Exit")
          if (clientId === 1) {
            yield* send(clientId, {
              _tag: "Request",
              id: "",
              tag: "notifications/cancelled",
              isNotification: true,
              payload: { requestId: 11 },
              headers: []
            })
            yield* Deferred.await(cancelled)
            // The reverse client emits a control Interrupt; consume it before the next connection.
            assert.strictEqual((yield* Queue.take(outbound))._tag, "Interrupt")
          }
          yield* send(clientId, { _tag: "Eof" })
          connected.delete(clientId)
          yield* Queue.offer(disconnects, clientId)
        }
        // Allow the reverse-client cache to expire its 10-second idle entries.
        yield* TestClock.adjust("11 seconds")
        yield* collectGarbage
        assert.strictEqual(refs.get(2)!.deref(), undefined, "control client must be collectible")
        assert.strictEqual(refs.get(1)!.deref(), undefined, "cancelled reverse client must be collectible")
      })
  )

  // This server interrupts non-resumable HTTP work on disconnect; this is not an MCP conformance requirement.
  it.effect("should interrupt tool work when its non-resumable HTTP response is disconnected", () =>
    Effect.gen(function*() {
      const interrupted = yield* Deferred.make<void>()
      const protocol = McpProtocol.v2025_03_26
      const registration = Layer.effectDiscard(McpServer.McpServer.use((server) =>
        server.addTool({
          tool: new McpSchema.Tool({ name: "Wait", inputSchema: { type: "object" } }),
          annotations: Context.empty(),
          handle: () =>
            server.notifications["notifications/message"]({ level: "error", data: "running" }).pipe(
              Effect.andThen(Effect.never),
              Effect.onInterrupt(() => Deferred.succeed(interrupted, void 0))
            )
        })
      ))
      const harness = yield* makeHttpHarness(registration.pipe(Layer.provideMerge(
        makeServerLayer({ name: "HttpDisconnect", protocols: [protocol] })
      )))
      const headers = yield* initializeHttpSession(harness, protocol)
      const response = yield* harness.post({
        jsonrpc: "2.0",
        id: "wait",
        method: "tools/call",
        params: { name: "Wait", arguments: {} }
      }, headers)
      const stream = makeMcpSseReader(response)
      yield* Effect.addFinalizer(() => stream.cancel)
      assert.strictEqual((yield* stream.take()).method, "notifications/message")
      yield* stream.cancel
      yield* Deferred.await(interrupted)
    }))

  it.effect("should frame HTTP batch notifications and results as separate SSE events", () =>
    Effect.gen(function*() {
      const harness = yield* makeHttpHarness(
        Layer.effectDiscard(McpServer.McpServer.use((server) =>
          server.addTool({
            tool: new McpSchema.Tool({ name: "Emit", inputSchema: { type: "object" } }),
            annotations: Context.empty(),
            handle: () =>
              server.notifications["notifications/message"]({ level: "error", data: "batch-log" }).pipe(
                Effect.as(new McpSchema.CallToolResult({ content: [] }))
              )
          })
        )).pipe(Layer.provideMerge(makeServerLayer({
          name: "BatchNotificationFraming",
          protocols: [McpProtocol.v2025_03_26]
        })))
      )
      const initialized = yield* harness.post({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-03-26",
          capabilities: {},
          clientInfo: { name: "legacy", version: "1.0.0" }
        }
      })
      const sessionId = initialized.headers.get("mcp-session-id")
      assert.isNotNull(sessionId)
      const response = yield* harness.post([{
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: { name: "Emit" }
      }], { "mcp-session-id": sessionId, "mcp-protocol-version": "2025-03-26" })
      assert.strictEqual(response.status, 200)
      const reader = makeMcpSseReader(response)
      yield* Effect.addFinalizer(() => reader.cancel)
      const messages: ReadonlyArray<unknown> = yield* reader.drain()
      assert.deepStrictEqual(messages, [
        { jsonrpc: "2.0", method: "notifications/message", params: { level: "error", data: "batch-log" } },
        [{ jsonrpc: "2.0", id: 2, result: { content: [] } }]
      ])
    }))

  it.effect("should honor the legacy HTTP session log level when delivering notifications", () =>
    Effect.gen(function*() {
      const harness = yield* makeHttpHarness(
        Layer.effectDiscard(McpServer.McpServer.use((server) =>
          server.addTool({
            tool: new McpSchema.Tool({ name: "Emit", inputSchema: { type: "object" } }),
            annotations: Context.empty(),
            handle: () =>
              Effect.gen(function*() {
                yield* server.notifications["notifications/message"]({ level: "warning", data: "filtered" })
                yield* server.notifications["notifications/message"]({ level: "error", data: "delivered" })
                return new McpSchema.CallToolResult({ content: [] })
              })
          })
        )).pipe(Layer.provideMerge(makeServerLayer({
          name: "SessionLogLevel",
          protocols: [McpProtocol.v2025_11_25]
        })))
      )
      const initialized = yield* harness.post({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-11-25",
          capabilities: {},
          clientInfo: { name: "legacy", version: "1.0.0" }
        }
      })
      const sessionId = initialized.headers.get("mcp-session-id")
      assert.isNotNull(sessionId)
      const headers = { "mcp-session-id": sessionId, "mcp-protocol-version": "2025-11-25" }
      const configured = yield* harness.post({
        jsonrpc: "2.0",
        id: 2,
        method: "logging/setLevel",
        params: { level: "error" }
      }, headers)
      assert.strictEqual(configured.status, 200)
      const response = makeMcpSseReader(
        yield* harness.post({
          jsonrpc: "2.0",
          id: 3,
          method: "tools/call",
          params: { name: "Emit" }
        }, headers)
      )
      yield* Effect.addFinalizer(() => response.cancel)
      const messages = yield* response.drain()
      assert.deepStrictEqual(
        messages.filter((message) => message.method === "notifications/message").map(
          (message) => message.params
        ),
        [{ level: "error", data: "delivered" }]
      )
      assert.deepInclude(messages.at(-1), { id: 3, result: { content: [] } })
    }))

  for (const transport of ["http", "stdio"] as const) {
    it.effect(`should reject stateless requests inside a legacy ${transport} batch`, () =>
      Effect.gen(function*() {
        const calls = yield* Ref.make(0)
        const protocols = [McpProtocol.v2026_07_28, McpProtocol.v2025_03_26] as const
        const registrations = Layer.effectDiscard(McpServer.McpServer.use((server) =>
          server.addTool({
            tool: new McpSchema.Tool({ name: "Count", inputSchema: { type: "object" } }),
            annotations: Context.empty(),
            handle: () =>
              Ref.update(calls, (n) => n + 1).pipe(
                Effect.as(new McpSchema.CallToolResult({ content: [] }))
              )
          })
        ))
        const batch = [{
          jsonrpc: "2.0",
          id: 2,
          method: "tools/call",
          params: {
            name: "Count",
            _meta: {
              "io.modelcontextprotocol/protocolVersion": "2026-07-28",
              "io.modelcontextprotocol/clientCapabilities": {}
            }
          }
        }, { jsonrpc: "2.0", id: 3, method: "ping" }]
        if (transport === "stdio") {
          const fixture = yield* makeMcpStdioHarness(McpProtocol.v2025_03_26, protocols, registrations)
          yield* fixture.initialize()
          yield* fixture.takeFrame
          yield* fixture.sendRaw(batch)
          assert.deepInclude(yield* fixture.takeFrame, {
            id: null,
            error: { code: -32600, message: "JSON-RPC batches are not supported" }
          })
        } else {
          const harness = yield* makeHttpHarness(registrations.pipe(Layer.provideMerge(makeServerLayer({
            name: "BatchAdmission",
            protocols
          }))))
          const initialized = yield* harness.post({
            jsonrpc: "2.0",
            id: 1,
            method: "initialize",
            params: {
              protocolVersion: "2025-03-26",
              capabilities: {},
              clientInfo: { name: "legacy", version: "1.0.0" }
            }
          })
          const sessionId = initialized.headers.get("mcp-session-id")
          assert.isNotNull(sessionId)
          const response = yield* harness.post(batch, {
            "mcp-session-id": sessionId,
            "mcp-protocol-version": "2025-03-26"
          })
          assert.strictEqual(response.status, 400)
        }
        assert.strictEqual(yield* Ref.get(calls), 0)
      }))
  }

  it.effect("should isolate request notifications across mixed HTTP protocols", () =>
    Effect.gen(function*() {
      const holding = yield* Deferred.make<void>()
      const release = yield* Deferred.make<void>()
      const ready = yield* Deferred.make<McpServer.McpServer["Service"]>()
      const harness = yield* makeHttpHarness(
        Layer.effectDiscard(Effect.gen(function*() {
          const server = yield* McpServer.McpServer
          for (const name of ["Hold", "Emit"]) {
            yield* server.addTool({
              tool: new McpSchema.Tool({ name, inputSchema: { type: "object" } }),
              annotations: Context.empty(),
              handle: () =>
                (name === "Hold"
                  ? Deferred.succeed(holding, undefined).pipe(Effect.andThen(Deferred.await(release)))
                  : Effect.gen(function*() {
                    yield* server.notifications["notifications/message"]({ level: "error", data: "request-log" })
                    yield* server.notifications["notifications/progress"]({ progressToken: "token", progress: 1 })
                  })).pipe(Effect.as(new McpSchema.CallToolResult({ content: [] })))
            })
          }
          yield* Deferred.succeed(ready, server)
        })).pipe(Layer.provideMerge(makeServerLayer({
          name: "NotificationOwnership",
          protocols: [McpProtocol.v2026_07_28, McpProtocol.v2025_11_25]
        })))
      )
      const server = yield* Deferred.await(ready)
      const initialized = yield* harness.post({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-11-25",
          capabilities: {},
          clientInfo: { name: "legacy", version: "1.0.0" }
        }
      })
      const sessionId = initialized.headers.get("mcp-session-id")
      assert.isNotNull(sessionId)
      const held = yield* harness.post({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: { name: "Hold" }
      }, { "mcp-session-id": sessionId, "mcp-protocol-version": "2025-11-25" }).pipe(Effect.forkChild)
      yield* Deferred.await(holding)
      const postModern = (id: number, method: string, params: Record<string, unknown>) =>
        harness.post({
          jsonrpc: "2.0",
          id,
          method,
          params: {
            ...params,
            _meta: {
              "io.modelcontextprotocol/protocolVersion": "2026-07-28",
              "io.modelcontextprotocol/clientCapabilities": {},
              "io.modelcontextprotocol/logLevel": "warning",
              progressToken: "token"
            }
          }
        }, { "mcp-protocol-version": "2026-07-28", "mcp-method": method, "mcp-name": "Emit" })
      const subscription = makeMcpSseReader(
        yield* postModern(3, "subscriptions/listen", {
          notifications: { toolsListChanged: true }
        })
      )
      yield* Effect.addFinalizer(() => subscription.cancel)
      assert.strictEqual((yield* subscription.take()).method, "notifications/subscriptions/acknowledged")
      const response = makeMcpSseReader(yield* postModern(4, "tools/call", { name: "Emit" }))
      yield* Effect.addFinalizer(() => response.cancel)
      const messages = yield* response.drain()
      assert.deepStrictEqual(messages.map((message) => message.method ?? message.id), [
        "notifications/message",
        "notifications/progress",
        4
      ])
      yield* Deferred.succeed(release, undefined)
      const unrelated = yield* Fiber.join(held)
      assert.match(unrelated.headers.get("content-type") ?? "", /^application\/json/)
      assert.deepInclude(yield* Effect.promise(() => unrelated.json()), { id: 2, result: { content: [] } })
      yield* server.notifications["notifications/tools/list_changed"]({})
      assert.strictEqual((yield* subscription.take()).method, "notifications/tools/list_changed")
    }))

  it.effect("should deliver notifications and results to other clients when one client stops reading", () =>
    Effect.gen(function*() {
      const outbound = yield* Queue.unbounded<{ clientId: number; message: RpcMessage.FromServerEncoded }>()
      const disconnects = yield* Queue.unbounded<number>()
      const blocked = yield* Deferred.make<void>()
      const release = yield* Deferred.make<void>()
      const ready = yield* Deferred.make<
        (clientId: number, message: RpcMessage.FromClientEncoded) => Effect.Effect<void>
      >()
      const transport = yield* RpcServer.Protocol.make((write) =>
        Deferred.succeed(ready, write).pipe(Effect.as({
          disconnects,
          send: (clientId, message) =>
            Effect.gen(function*() {
              if (
                clientId === 1 && message._tag === "Request" && (message.payload as { data?: string }).data === "first"
              ) {
                yield* Deferred.succeed(blocked, undefined)
                yield* Deferred.await(release)
              }
              yield* Queue.offer(outbound, { clientId, message })
            }),
          end: () => Effect.void,
          clientIds: Effect.succeed(new Set([1, 2])),
          initialMessage: Effect.succeedNone,
          supportsAck: false,
          supportsTransferables: false,
          supportsSpanPropagation: false,
          supportsNotifications: true,
          codecFor: Schema.toCodecJson as RpcSerialization.CodecFor
        }))
      )
      const context = yield* Layer.build(
        McpServer.layer({ name: "NotificationIsolation", version: "1.0.0", protocols: [McpProtocol.v2025_11_25] })
          .pipe(Layer.provide(Layer.succeed(RpcServer.Protocol, transport)))
      )
      const server = Context.get(context, McpServer.McpServer)
      yield* server.addTool({
        tool: new McpSchema.Tool({ name: "Log", inputSchema: { type: "object" } }),
        annotations: Context.empty(),
        handle: () =>
          Effect.gen(function*() {
            yield* Effect.forEach(["first", "second"], (data) =>
              server.notifications["notifications/message"]({ level: "error", data }), { concurrency: "unbounded" })
            if ((yield* McpSchema.McpRequestContext).clientId === 2) {
              yield* server.addTool({
                tool: new McpSchema.Tool({ name: "Dynamic", inputSchema: { type: "object" } }),
                annotations: Context.empty(),
                handle: () =>
                  Effect.succeed(new McpSchema.CallToolResult({ content: [] }))
              })
            }
            return new McpSchema.CallToolResult({ content: [] })
          })
      })
      const take = Effect.fnUntraced(function*(clientId: number) {
        const event = yield* Queue.take(outbound)
        assert.strictEqual(event.clientId, clientId)
        return event.message
      })
      const send = yield* Deferred.await(ready)
      for (const clientId of [1, 2]) {
        yield* send(clientId, {
          _tag: "Request",
          id: "initialize",
          tag: "initialize",
          headers: [],
          payload: { protocolVersion: "2025-11-25", capabilities: {}, clientInfo: { name: "client", version: "1" } }
        })
        assert.deepInclude(yield* take(clientId), { _tag: "Exit", requestId: "initialize" })
        yield* send(clientId, {
          _tag: "Request",
          id: "",
          tag: "notifications/initialized",
          payload: {},
          headers: [],
          isNotification: true
        })
      }
      const request = { _tag: "Request", id: "log", tag: "tools/call", payload: { name: "Log" }, headers: [] } as const
      yield* send(1, request)
      yield* Deferred.await(blocked)
      yield* send(2, request)
      for (const data of ["first", "second"]) {
        assert.deepInclude(yield* take(2), {
          _tag: "Request",
          tag: "notifications/message",
          payload: { level: "error", data }
        })
      }
      assert.deepInclude(yield* take(2), { _tag: "Request", tag: "notifications/tools/list_changed" })
      assert.deepInclude(yield* take(2), { _tag: "Exit", requestId: "log" })
      yield* Deferred.succeed(release, undefined)
      for (const data of ["first", "second"]) {
        assert.deepInclude(yield* take(1), {
          _tag: "Request",
          tag: "notifications/message",
          payload: { level: "error", data }
        })
      }
      const remaining = yield* Effect.all([take(1), take(1)])
      assert.strictEqual(remaining.filter((message) => message._tag === "Exit").length, 1)
      assert.deepInclude(remaining.find((message) => message._tag === "Exit"), { requestId: "log" })
      assert.deepInclude(remaining.find((message) => message._tag === "Request"), {
        tag: "notifications/tools/list_changed"
      })
    }))

  it.effect("should suppress cancelled responses when a custom transport handles MCP messages", () =>
    Effect.gen(function*() {
      const outbound = yield* Queue.unbounded<RpcMessage.FromServerEncoded>()
      const disconnects = yield* Queue.unbounded<number>()
      const ready = yield* Deferred.make<
        (clientId: number, message: RpcMessage.FromClientEncoded) => Effect.Effect<void>
      >()
      const transport = yield* RpcServer.Protocol.make((write) =>
        Deferred.succeed(ready, write).pipe(Effect.as({
          disconnects,
          send: (_clientId, message) => Queue.offer(outbound, message).pipe(Effect.asVoid),
          end: () => Effect.void,
          clientIds: Effect.succeed(new Set([1])),
          initialMessage: Effect.succeedNone,
          supportsAck: false,
          supportsTransferables: false,
          supportsSpanPropagation: false,
          supportsNotifications: true,
          codecFor: Schema.toCodecJson as RpcSerialization.CodecFor
        }))
      )
      const context = yield* Layer.build(
        McpServer.layer({
          name: "CustomCancellation",
          version: "1.0.0",
          protocols: [McpProtocol.v2025_03_26]
        }).pipe(Layer.provide(Layer.succeed(RpcServer.Protocol, transport)))
      )
      const entered = yield* Deferred.make<void>()
      const interrupted = yield* Deferred.make<void>()
      yield* Context.get(context, McpServer.McpServer).addTool({
        tool: new McpSchema.Tool({ name: "Wait", inputSchema: { type: "object" } }),
        annotations: Context.empty(),
        handle: () =>
          Deferred.succeed(entered, void 0).pipe(
            Effect.andThen(Effect.never),
            Effect.onInterrupt(() => Deferred.succeed(interrupted, void 0))
          )
      })
      const send = yield* Deferred.await(ready)
      yield* send(1, {
        _tag: "Request",
        id: "initialize",
        tag: "initialize",
        payload: {
          protocolVersion: "2025-03-26",
          capabilities: {},
          clientInfo: { name: "client", version: "1.0.0" }
        },
        headers: []
      })
      assert.deepInclude(yield* Queue.take(outbound), { _tag: "Exit", requestId: "initialize" })
      yield* send(1, { _tag: "Request", id: "wait", tag: "tools/call", payload: { name: "Wait" }, headers: [] })
      yield* Deferred.await(entered)
      yield* send(1, {
        _tag: "Request",
        id: "",
        tag: "notifications/cancelled",
        payload: { requestId: "wait" },
        headers: [],
        isNotification: true
      })
      yield* Deferred.await(interrupted)
      yield* send(1, { _tag: "Request", id: "ping", tag: "ping", payload: {}, headers: [] })
      assert.deepInclude(yield* Queue.take(outbound), { _tag: "Exit", requestId: "ping" })
    }))

  it.effect("should match reverse responses to their originating connection", () =>
    Effect.gen(function*() {
      const outbound = yield* Queue.unbounded<{
        readonly clientId: number
        readonly message: RpcMessage.FromServerEncoded
      }>()
      const disconnects = yield* Queue.unbounded<number>()
      type Receive = (
        clientId: number,
        message: RpcMessage.FromClientEncoded | RpcMessage.FromServerEncoded
      ) => Effect.Effect<void>
      const ready = yield* Deferred.make<Receive>()
      const transport = yield* RpcServer.Protocol.make((write) =>
        // MCP also receives reverse replies through the ordinary RPC client-message boundary.
        Deferred.succeed(ready, write as Receive).pipe(Effect.as({
          disconnects,
          send: (clientId, message) => Queue.offer(outbound, { clientId, message }).pipe(Effect.asVoid),
          end: () => Effect.void,
          clientIds: Effect.succeed(new Set([1, 2])),
          initialMessage: Effect.succeedNone,
          supportsAck: false,
          supportsTransferables: false,
          supportsSpanPropagation: false,
          supportsNotifications: true,
          codecFor: Schema.toCodecJson as RpcSerialization.CodecFor
        }))
      )
      const toolkit = Toolkit.make(Tool.make("Approve", {
        success: Schema.Struct({ approved: Schema.Boolean }),
        dependencies: [McpSchema.McpServerClient]
      }))
      yield* Layer.build(
        McpServer.toolkit(toolkit).pipe(
          Layer.provide(toolkit.toLayer({
            Approve: () =>
              McpServer.elicit({
                message: "Approve",
                schema: Schema.Struct({ approved: Schema.Boolean })
              }).pipe(Effect.orDie)
          })),
          Layer.provide(
            McpServer.layer({
              name: "ResponseOwnership",
              version: "1.0.0",
              protocols: [McpProtocol.v2025_11_25]
            }).pipe(Layer.provide(Layer.succeed(RpcServer.Protocol, transport)))
          )
        )
      )
      const send = yield* Deferred.await(ready)
      for (const clientId of [1, 2]) {
        yield* send(clientId, {
          _tag: "Request",
          id: clientId,
          tag: "initialize",
          payload: {
            protocolVersion: "2025-11-25",
            capabilities: { elicitation: { form: {} } },
            clientInfo: { name: `client-${clientId}`, version: "1.0.0" }
          },
          headers: []
        })
        assert.strictEqual((yield* Queue.take(outbound)).message._tag, "Exit")
      }
      yield* send(1, { _tag: "Request", id: 10, tag: "tools/call", payload: { name: "Approve" }, headers: [] })
      const reverse = yield* Queue.take(outbound)
      assert.strictEqual(reverse.clientId, 1)
      if (reverse.message._tag !== "Request") return assert.fail("Expected an elicitation request")
      assert.strictEqual(reverse.message.tag, "elicitation/create")
      const requestId = reverse.message.id
      for (const clientId of [2, 1]) {
        yield* send(clientId, {
          _tag: "Exit",
          requestId,
          exit: { _tag: "Success", value: { action: "accept", content: { approved: clientId === 1 } } }
        })
      }
      const result = yield* Queue.take(outbound)
      assert.strictEqual(result.clientId, 1)
      assert.deepInclude(result.message, { _tag: "Exit", requestId: 10 })
      if (result.message._tag !== "Exit" || result.message.exit._tag !== "Success") {
        return assert.fail("Expected the tool to complete")
      }
      const decoded = yield* Schema.decodeUnknownEffect(McpSchema.CallToolResult)(result.message.exit.value)
      assert.deepStrictEqual(decoded.structuredContent, { approved: true })
    }))

  describe("direct service", () => {
    it.effect("should return from completion notification when no transport is running", () =>
      Effect.gen(function*() {
        const server = yield* McpServer.McpServer.make
        yield* server.notifyElicitationComplete({ clientId: 0, elicitationId: "not-connected" })
      }))

    describe("registration context", () => {
      class RegistrationLabel extends Context.Service<RegistrationLabel, string>()("test/RegistrationLabel") {}

      const client = (clientId: number, name: string) =>
        McpSchema.McpServerClient.of({
          clientId,
          protocolVersion: "2025-06-18",
          clientCapabilities: {},
          clientInfo: { name, version: "1" },
          initializePayload: {
            protocolVersion: "2025-06-18",
            capabilities: {},
            clientInfo: { name, version: "1" }
          },
          requestMetadata: { owner: name },
          getClient: Effect.die("No reverse requests are needed")
        })

      const alice = client(1, "Alice")
      const bob = client(2, "Bob")
      const currentOwner = Effect.gen(function*() {
        const request = yield* McpSchema.McpRequestContext
        const label = yield* RegistrationLabel
        return `${label}:${request.clientId}:${request.clientInfo?.name}:${request.requestMetadata?.owner}`
      })

      const toolkit = Toolkit.make(Tool.make("owner", {
        success: Schema.String,
        dependencies: [McpSchema.McpRequestContext, RegistrationLabel]
      }))

      // Registration captures application services, but each invocation owns its request identity.
      // This contract belongs to the public server helpers rather than wire conformance.
      const makeRegisteredServer = Effect.gen(function*() {
        const server = yield* McpServer.McpServer.make
        yield* server.addTool({
          tool: new McpSchema.Tool({ name: "register", inputSchema: { type: "object" } }),
          annotations: Context.empty(),
          handle: () =>
            Effect.gen(function*() {
              yield* McpServer.registerResource({ uri: "file:///owner", name: "owner", content: currentOwner })
              yield* McpServer.registerResource`file:///owners/${Schema.String}`({
                name: "owners",
                content: () => currentOwner,
                completion: { param0: () => Effect.map(currentOwner, (owner) => [owner]) }
              })
              yield* McpServer.registerPrompt({
                name: "owner",
                parameters: { name: Schema.String },
                content: () => currentOwner,
                completion: { name: () => Effect.map(currentOwner, (owner) => [owner]) }
              })
              yield* McpServer.registerToolkit(toolkit).pipe(
                Effect.provide(toolkit.toLayer({ owner: () => currentOwner }))
              )
              return new McpSchema.CallToolResult({ content: [] })
            }).pipe(
              Effect.provideService(McpServer.McpServer, server),
              Effect.provideService(RegistrationLabel, "registered")
            )
        })
        yield* server.callTool({ name: "register" }).pipe(Effect.provideService(McpSchema.McpServerClient, alice))
        return server
      })

      const expectedOwner = "registered:2:Bob:Bob"

      it.effect("should use the current request when a resource was registered by another client", () =>
        Effect.gen(function*() {
          const server = yield* makeRegisteredServer
          const result = yield* server.findResource("file:///owner").pipe(
            Effect.provideService(McpSchema.McpServerClient, bob),
            Effect.provideService(RegistrationLabel, "invocation")
          )
          assert.deepStrictEqual(result.contents, [{ uri: "file:///owner", text: expectedOwner }])
        }))

      it.effect("should use the current request when a resource template was registered by another client", () =>
        Effect.gen(function*() {
          const server = yield* makeRegisteredServer
          const result = yield* server.findResource("file:///owners/bob").pipe(
            Effect.provideService(McpSchema.McpServerClient, bob),
            Effect.provideService(RegistrationLabel, "invocation")
          )
          assert.deepStrictEqual(result.contents, [{ uri: "file:///owners/bob", text: expectedOwner }])
        }))

      it.effect("should use the current request when a prompt was registered by another client", () =>
        Effect.gen(function*() {
          const server = yield* makeRegisteredServer
          const result = yield* server.getPromptResult({ name: "owner", arguments: { name: "bob" } }).pipe(
            Effect.provideService(McpSchema.McpServerClient, bob),
            Effect.provideService(RegistrationLabel, "invocation")
          )
          assert.deepStrictEqual(result.messages, [{ role: "user", content: { type: "text", text: expectedOwner } }])
        }))

      it.effect("should use the current request when a resource completion was registered by another client", () =>
        Effect.gen(function*() {
          const server = yield* makeRegisteredServer
          const result = yield* server.completion({
            ref: { type: "ref/resource", uri: "file:///owners/{param0}" },
            argument: { name: "param0", value: "b" }
          }).pipe(
            Effect.provideService(McpSchema.McpServerClient, bob),
            Effect.provideService(RegistrationLabel, "invocation")
          )
          assert.deepStrictEqual(result.completion.values, [expectedOwner])
        }))

      it.effect("should use the current request when a prompt completion was registered by another client", () =>
        Effect.gen(function*() {
          const server = yield* makeRegisteredServer
          const result = yield* server.completion({
            ref: { type: "ref/prompt", name: "owner" },
            argument: { name: "name", value: "b" }
          }).pipe(
            Effect.provideService(McpSchema.McpServerClient, bob),
            Effect.provideService(RegistrationLabel, "invocation")
          )
          assert.deepStrictEqual(result.completion.values, [expectedOwner])
        }))

      it.effect("should use the current request when a toolkit was registered by another client", () =>
        Effect.gen(function*() {
          const server = yield* makeRegisteredServer
          const result = yield* server.callTool({ name: "owner" }).pipe(
            Effect.provideService(McpSchema.McpServerClient, bob),
            Effect.provideService(RegistrationLabel, "invocation")
          )
          assert.strictEqual(result.isError, false)
          assert.strictEqual(result.structuredContent, expectedOwner)
        }))
    })

    it.effect("should complete notification-emitting tools without a running transport", () =>
      Effect.gen(function*() {
        const server = yield* McpServer.McpServer.make
        yield* server.addTool({
          tool: new McpSchema.Tool({ name: "Emit", inputSchema: { type: "object" } }),
          annotations: Context.empty(),
          handle: () =>
            server.notifications["notifications/message"]({ level: "error", data: "diagnostic" }).pipe(
              Effect.as(new McpSchema.CallToolResult({ content: [] }))
            )
        })
        const result = yield* server.callTool({ name: "Emit" }).pipe(
          Effect.provideService(McpSchema.McpServerClient, directClient)
        )
        assert.deepStrictEqual(result.content, [])
      }))

    it.effect("should fail when a resource URI is unknown", () =>
      Effect.gen(function*() {
        const server = yield* McpServer.McpServer.make

        const error = yield* server.findResource("file:///unknown").pipe(
          Effect.provideService(McpSchema.McpServerClient, directClient),
          Effect.flip
        )

        assertTrue(error instanceof McpSchema.InvalidParams)
        assert.strictEqual(error.message, "Resource 'file:///unknown' not found")
      }))

    it.effect("should resolve an HTTP resource template", () =>
      Effect.gen(function*() {
        const server = yield* McpServer.McpServer.make
        yield* McpServer.registerResource`https://example.test/docs/${Schema.String}`({
          name: "document",
          content: (_uri, name) => Effect.succeed(name)
        }).pipe(Effect.provideService(McpServer.McpServer, server))

        const uri = "https://example.test/docs/alice"
        const result = yield* server.findResource(uri).pipe(
          Effect.provideService(McpSchema.McpServerClient, directClient)
        )

        assert.deepStrictEqual(result.contents, [{ uri, text: "alice" }])
      }))

    it.effect("should preserve a registered resource handler's typed failure", () =>
      Effect.gen(function*() {
        const server = yield* McpServer.McpServer.make
        const failure = new McpSchema.InternalError({ message: "resource failed" })
        yield* server.addResource({
          resource: new McpSchema.Resource({
            uri: "file:///failure",
            name: "failure"
          }),
          annotations: Context.empty(),
          handle: Effect.fail(failure)
        })

        const error = yield* server.findResource("file:///failure").pipe(
          Effect.provideService(McpSchema.McpServerClient, directClient),
          Effect.flip
        )

        assert.strictEqual(error, failure)
      }))

    it.effect("should pass decoded values to prompt handlers", () =>
      Effect.gen(function*() {
        const server = yield* McpServer.McpServer.make
        yield* McpServer.registerPrompt({
          name: "count",
          parameters: { count: Schema.FiniteFromString },
          completion: { count: () => Effect.succeed([13]) },
          content: ({ count }) => Effect.succeed(count.toFixed(0))
        }).pipe(Effect.provideService(McpServer.McpServer, server))

        const result = yield* server.getPromptResult({ name: "count", arguments: { count: "12" } }).pipe(
          Effect.provideService(McpSchema.McpServerClient, directClient)
        )
        const completion = yield* server.completion({
          ref: { type: "ref/prompt", name: "count" },
          argument: { name: "count", value: "1" }
        }).pipe(Effect.provideService(McpSchema.McpServerClient, directClient))

        assert.deepStrictEqual(result.messages, [{ role: "user", content: { type: "text", text: "12" } }])
        assert.deepStrictEqual(completion.completion.values, ["13"])
      }))

    it.effect("should pass undefined to a low-level tool handler when arguments are omitted", () =>
      Effect.gen(function*() {
        const server = yield* McpServer.McpServer.make
        let received: unknown = "not called"
        yield* server.addTool({
          tool: new McpSchema.Tool({
            name: "arguments-omitted",
            inputSchema: {
              type: "object",
              properties: {}
            }
          }),
          annotations: Context.empty(),
          handle: (payload) => {
            received = payload
            return Effect.succeed(new McpSchema.CallToolResult({ content: [] }))
          }
        })

        yield* server.callTool({ name: "arguments-omitted" }).pipe(
          Effect.provideService(McpSchema.McpServerClient, directClient)
        )

        assert.isUndefined(received)
      }))

    it.effect("should provide the neutral request service to handlers", () =>
      Effect.gen(function*() {
        const server = yield* McpServer.McpServer.make
        let received: string | undefined
        yield* server.addTool({
          tool: new McpSchema.Tool({
            name: "request-services",
            inputSchema: { type: "object" }
          }),
          annotations: Context.empty(),
          handle: () =>
            McpSchema.McpRequestContext.useSync((request) => {
              received = request.protocolVersion
              return new McpSchema.CallToolResult({ content: [] })
            })
        })

        yield* server.callTool({ name: "request-services" }).pipe(
          Effect.provideService(McpSchema.McpServerClient, directClient)
        )

        assert.strictEqual(received, "2025-06-18")
      }))
  })

  it.effect("should reject browser Origins by default while accepting Origin-less clients", () =>
    Effect.gen(function*() {
      const harness = yield* makeHttpHarness(TestServerLayer)
      assert.strictEqual(
        (yield* harness.post({
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: initializePayload
        })).status,
        200
      )
      assert.strictEqual(
        (yield* harness.post({
          jsonrpc: "2.0",
          id: 2,
          method: "initialize",
          params: initializePayload
        }, { origin: "https://browser.example" })).status,
        403
      )
    }))

  it.effect("should replay the selected protocol header when a session is initialized", () =>
    Effect.gen(function*() {
      const { client, responses } = yield* makeTestClient

      yield* client.initialize({
        protocolVersion: "2025-03-26",
        capabilities: {},
        clientInfo: {
          name: "TestClient",
          version: "1.0.0"
        }
      })

      yield* client.ping({})

      strictEqual(responses.length, 2)
      strictEqual(responses[0].headers.get("Mcp-Protocol-Version"), "2025-06-18")
      strictEqual(responses[1].headers.get("Mcp-Protocol-Version"), "2025-06-18")
    }))

  it.effect("should return 400 when a non-initialize request omits the MCP session id", () =>
    Effect.gen(function*() {
      const { httpClient } = yield* makeTestClient

      const response = yield* HttpClientRequest.post("http://localhost/mcp").pipe(
        HttpClientRequest.setHeader("accept", "application/json, text/event-stream"),
        HttpClientRequest.bodyJsonUnsafe({ jsonrpc: "2.0", method: "ping", params: {}, id: 0 }),
        httpClient.execute
      )

      strictEqual(response.status, 400)
    }))
  it.effect("negotiates an initialize request from a client on an unsupported protocol version", () =>
    Effect.gen(function*() {
      const { httpClient } = yield* makeTestClientWith(LatestProtocolServerLayer)

      const response = yield* HttpClientRequest.post("http://localhost/mcp").pipe(
        HttpClientRequest.setHeader("accept", "application/json, text/event-stream"),
        HttpClientRequest.setHeader("Mcp-Protocol-Version", "2025-06-18"),
        HttpClientRequest.bodyJsonUnsafe({ jsonrpc: "2.0", id: 1, method: "initialize", params: initializePayload }),
        httpClient.execute
      )

      strictEqual(response.status, 200)
      strictEqual(response.headers["mcp-protocol-version"], "2025-11-25")
      assertTrue(response.headers["mcp-session-id"] !== undefined)
    }))

  describe("registerToolkit", () => {
    it.effect("lists output schemas only for structured tool results", () =>
      Effect.gen(function*() {
        const { client } = yield* makeToolkitTestClient()

        const result = yield* client["tools/list"]({})
        const structuredTool = result.tools.find((tool) => tool.name === "StructuredResultTool")
        const scalarTool = result.tools.find((tool) => tool.name === "OptionalStringTool")
        const untypedTool = result.tools.find((tool) => tool.name === "UntypedTool")
        const annotatedVoidTool = result.tools.find((tool) => tool.name === "AnnotatedVoidTool")

        assert.deepStrictEqual(structuredTool?.outputSchema, {
          type: "object",
          properties: { answer: { type: "string" } },
          required: ["answer"],
          additionalProperties: true
        })
        assertTrue(scalarTool !== undefined)
        assert.isFalse("outputSchema" in scalarTool)
        assertTrue(untypedTool !== undefined)
        assert.isFalse("outputSchema" in untypedTool)
        assertTrue(annotatedVoidTool !== undefined)
        assert.isFalse("outputSchema" in annotatedVoidTool)
      }))

    it.effect("returns concise parameter-validation errors without invoking the handler", () =>
      Effect.gen(function*() {
        let handlerInvoked = false
        const { client, reported } = yield* makeToolkitTestClient(TestToolkit.of({
          ...testToolkitHandlers,
          OptionalStringTool: ({ signature }) => {
            handlerInvoked = true
            return Effect.succeed(signature ?? "omitted")
          }
        }))

        const error = yield* client["tools/call"]({
          name: "OptionalStringTool",
          arguments: { signature: null }
        }).pipe(Effect.flip)

        assert.isFalse(handlerInvoked)
        assert.isTrue("code" in error)
        if ("code" in error) assert.strictEqual(error.code, McpSchema.INVALID_PARAMS_ERROR_CODE)
        assert.match(error.message, /Invalid parameters for tool 'OptionalStringTool'/)
        assert.match(error.message, /Expected string \| undefined/)
        assert.match(error.message, /at \["signature"\]/)
        assert.lengthOf(reported, 1)
        assert.isTrue(Cause.hasFails(reported[0]))
        assert.deepInclude(Cause.squash(reported[0]), {
          _tag: "ProtocolError",
          code: McpSchema.INVALID_PARAMS_ERROR_CODE,
          message: error.message
        })
      }))

    it.effect("preserves successful results when optional parameters are omitted", () =>
      Effect.gen(function*() {
        let handlerInvoked = false
        const { client } = yield* makeToolkitTestClient(TestToolkit.of({
          ...testToolkitHandlers,
          OptionalStringTool: ({ signature }) => {
            handlerInvoked = true
            return Effect.succeed(signature ?? "omitted")
          }
        }))

        const result = yield* client["tools/call"]({
          name: "OptionalStringTool",
          arguments: {}
        })

        assert.isTrue(handlerInvoked)
        assert.deepStrictEqual(
          result,
          new McpSchema.CallToolResult({
            isError: false,
            content: [{ type: "text", text: JSON.stringify("omitted") }]
          })
        )
      }))

    it.effect("keeps void tool results successful", () =>
      Effect.gen(function*() {
        const { client, reported } = yield* makeToolkitTestClient()

        const result = yield* client["tools/call"]({
          name: "UntypedTool",
          arguments: {}
        })

        assert.deepStrictEqual(
          result,
          new McpSchema.CallToolResult({
            isError: false,
            content: []
          })
        )
        assert.deepStrictEqual(reported, [])
      }))

    it.effect("carries object tool results as structured content", () =>
      Effect.gen(function*() {
        const { client } = yield* makeToolkitTestClient()

        const result = yield* client["tools/call"]({
          name: "StructuredResultTool",
          arguments: {}
        })

        assert.deepStrictEqual(result.structuredContent, { answer: "result" })
        assert.deepStrictEqual(result.content, [{
          type: "text",
          text: JSON.stringify({ answer: "result" })
        }])
      }))

    it.effect("omits structured content for null and array tool results", () =>
      Effect.gen(function*() {
        const { client } = yield* makeToolkitTestClient()

        const nullResult = yield* client["tools/call"]({
          name: "NullableResultTool",
          arguments: {}
        })

        assert.isUndefined(nullResult.structuredContent)
        assert.deepStrictEqual(nullResult.content, [{ type: "text", text: "null" }])

        const arrayResult = yield* client["tools/call"]({
          name: "ArrayResultTool",
          arguments: {}
        })

        assert.isUndefined(arrayResult.structuredContent)
        assert.deepStrictEqual(arrayResult.content, [{
          type: "text",
          text: JSON.stringify(["first", "second"])
        }])
      }))

    it.effect("returns schema-validated messages for declared handler failures", () =>
      Effect.gen(function*() {
        const { client, reported } = yield* makeToolkitTestClient()

        const result = yield* client["tools/call"]({
          name: "PublicFailureTool",
          arguments: {}
        })

        assert.strictEqual(result.isError, true)
        const text = toolResultText(result)
        assert.strictEqual(text, "Public failure")
        assert.lengthOf(reported, 1)
        assert.isTrue(Cause.hasFails(reported[0]))
        assert.strictEqual(Cause.squash(reported[0]), publicFailure)
      }))

    it.effect("returns a generic message for non-validation AiError failures", () =>
      Effect.gen(function*() {
        const { client, reported } = yield* makeToolkitTestClient()

        const result = yield* client["tools/call"]({
          name: "InternalAiErrorTool",
          arguments: {}
        })

        assert.strictEqual(result.isError, true)
        const text = toolResultText(result)
        assert.strictEqual(text, INTERNAL_TOOL_ERROR_MESSAGE)
        assert.lengthOf(reported, 1)
        assert.isTrue(Cause.hasFails(reported[0]))
        assert.strictEqual(Cause.squash(reported[0]), internalAiError)
      }))

    it.effect("returns a generic message for handler defects", () =>
      Effect.gen(function*() {
        const { client, reported } = yield* makeToolkitTestClient()

        const result = yield* client["tools/call"]({
          name: "DefectTool",
          arguments: {}
        })

        assert.strictEqual(result.isError, true)
        const text = toolResultText(result)
        assert.strictEqual(text, INTERNAL_TOOL_ERROR_MESSAGE)
        assert.lengthOf(reported, 1)
        assert.isTrue(Cause.hasDies(reported[0]))
        assert.strictEqual(Cause.squash(reported[0]), privateDefect)
      }))

    it.effect("reports response serialization defects before returning a generic message", () =>
      Effect.gen(function*() {
        const { client, reported } = yield* makeToolkitTestClient()

        const result = yield* client["tools/call"]({
          name: "UnserializableResultTool",
          arguments: {}
        })

        assert.strictEqual(result.isError, true)
        assert.strictEqual(toolResultText(result), INTERNAL_TOOL_ERROR_MESSAGE)
        assert.lengthOf(reported, 1)
        assert.isTrue(Cause.hasDies(reported[0]))
        assert.instanceOf(Cause.squash(reported[0]), TypeError)
      }))

    it.effect("keeps unknown tools as protocol errors", () =>
      Effect.gen(function*() {
        const { client } = yield* makeToolkitTestClient()

        const error = yield* client["tools/call"]({
          name: "UnknownTool",
          arguments: {}
        }).pipe(Effect.flip)

        assert.isTrue("code" in error)
        if ("code" in error) {
          assert.strictEqual(error.code, McpSchema.INVALID_PARAMS_ERROR_CODE)
          assert.strictEqual(error.message, "Tool 'UnknownTool' not found")
        }
      }))
  })

  it.effect("rejects unsupported HTTP methods without disturbing an initialized session", () =>
    Effect.gen(function*() {
      const { client, httpClient } = yield* makeTestClient

      yield* client.initialize(initializePayload)

      for (const method of ["GET", "PUT", "PATCH", "DELETE", "HEAD"] as const) {
        const response = yield* HttpClientRequest.make(method)("http://localhost/mcp").pipe(
          httpClient.execute
        )
        strictEqual(response.status, 405)
        strictEqual(response.headers["allow"], "POST")
      }

      yield* client.ping({})
    }))

  it.effect("returns an empty 202 for notifications and responses and remains successful for request POSTs", () =>
    Effect.gen(function*() {
      const { client, httpClient } = yield* makeRouterTestClient(HttpRouter.cors())

      yield* client.initialize(initializePayload)

      const notificationResponse = yield* HttpClientRequest.post("http://localhost/mcp").pipe(
        HttpClientRequest.setHeader("accept", "application/json, text/event-stream"),
        HttpClientRequest.bodyJsonUnsafe({
          jsonrpc: "2.0",
          method: "notifications/initialized",
          params: {}
        }),
        httpClient.execute
      )
      strictEqual(notificationResponse.status, 202)
      strictEqual(yield* notificationResponse.text, "")
      strictEqual(notificationResponse.headers["content-type"], undefined)
      strictEqual(notificationResponse.headers["access-control-allow-origin"], "*")
      strictEqual(notificationResponse.headers["mcp-protocol-version"], "2025-06-18")

      const responseOnly = yield* HttpClientRequest.post("http://localhost/mcp").pipe(
        HttpClientRequest.setHeader("accept", "application/json, text/event-stream"),
        HttpClientRequest.bodyJsonUnsafe({ jsonrpc: "2.0", id: 1, result: {} }),
        httpClient.execute
      )
      strictEqual(responseOnly.status, 202)
      strictEqual(yield* responseOnly.text, "")

      const pingResponse = yield* HttpClientRequest.post("http://localhost/mcp").pipe(
        HttpClientRequest.setHeader("accept", "application/json, text/event-stream"),
        HttpClientRequest.bodyJsonUnsafe(pingBody),
        httpClient.execute
      )
      strictEqual(pingResponse.status, 200)
      const pingResponseBody = yield* pingResponse.text
      strictEqual(pingResponseBody.length > 0, true)
    }))

  it.effect("drops server notifications from buffered JSON-RPC responses", () =>
    Effect.gen(function*() {
      const serverLayer = Layer.effectDiscard(Effect.gen(function*() {
        const router = yield* HttpRouter.HttpRouter
        const { httpEffect, protocol } = yield* RpcServer.makeProtocolWithHttpEffect()
        yield* protocol.run((clientId, message) => {
          if (message._tag !== "Request") {
            return Effect.void
          }
          return Effect.gen(function*() {
            yield* protocol.send(clientId, {
              _tag: "Request",
              id: "",
              tag: "notifications/message",
              payload: { level: "info" },
              headers: [],
              isNotification: true
            })
            yield* protocol.send(clientId, {
              _tag: "Exit",
              requestId: message.id,
              exit: { _tag: "Success", value: { ok: true } }
            })
            yield* protocol.end(clientId)
          })
        }).pipe(Effect.forkScoped)
        yield* router.add("POST", "/mcp", () => httpEffect)
      })).pipe(
        Layer.provideMerge(HttpRouter.layer),
        Layer.provide(RpcSerialization.layerJsonRpc())
      )
      const harness = yield* makeHttpHarness(serverLayer)

      const response = yield* harness.post({
        jsonrpc: "2.0",
        method: "ping",
        params: {},
        id: 1
      })

      assert.strictEqual(response.status, 200)
      assert.deepStrictEqual(yield* Effect.promise(() => response.json()), {
        jsonrpc: "2.0",
        id: 1,
        result: { ok: true }
      })
    }))

  it.effect("validates supplied protocol versions on POST", () =>
    Effect.gen(function*() {
      const { client, httpClient } = yield* makeRouterTestClient(HttpRouter.cors())

      yield* client.initialize(initializePayload)

      const unsupportedResponse = yield* HttpClientRequest.post("http://localhost/mcp").pipe(
        HttpClientRequest.setHeader("accept", "application/json, text/event-stream"),
        HttpClientRequest.bodyJsonUnsafe(pingBody),
        HttpClientRequest.setHeader("Mcp-Protocol-Version", "9999-01-01"),
        httpClient.execute
      )
      strictEqual(unsupportedResponse.status, 400)
      strictEqual(yield* unsupportedResponse.text, "")
      strictEqual(unsupportedResponse.headers["access-control-allow-origin"], "*")

      const malformedResponse = yield* HttpClientRequest.post("http://localhost/mcp").pipe(
        HttpClientRequest.setHeader("accept", "application/json, text/event-stream"),
        HttpClientRequest.setHeader("Mcp-Protocol-Version", "9999-01-01"),
        HttpClientRequest.bodyText("{"),
        HttpClientRequest.setHeader("content-type", "application/json"),
        httpClient.execute
      )
      strictEqual(malformedResponse.status, 400)
      strictEqual(yield* malformedResponse.text, "")

      const malformedNoVersionResponse = yield* HttpClientRequest.post("http://localhost/mcp").pipe(
        HttpClientRequest.setHeader("accept", "application/json, text/event-stream"),
        HttpClientRequest.bodyText("{"),
        HttpClientRequest.setHeader("content-type", "application/json"),
        httpClient.execute
      )
      strictEqual(malformedNoVersionResponse.status, 200)
      const malformedNoVersionBody = JSON.parse(yield* malformedNoVersionResponse.text)
      strictEqual(malformedNoVersionBody.id, null)
      strictEqual(malformedNoVersionBody.error.code, McpSchema.PARSE_ERROR_CODE)

      const invalidRequestResponse = yield* HttpClientRequest.post("http://localhost/mcp").pipe(
        HttpClientRequest.setHeader("accept", "application/json, text/event-stream"),
        HttpClientRequest.setHeader("Mcp-Protocol-Version", "9999-01-01"),
        HttpClientRequest.bodyJsonUnsafe({ hello: "world" }),
        httpClient.execute
      )
      strictEqual(invalidRequestResponse.status, 400)
      strictEqual(yield* invalidRequestResponse.text, "")

      const invalidRequestNoVersionResponse = yield* HttpClientRequest.post("http://localhost/mcp").pipe(
        HttpClientRequest.setHeader("accept", "application/json, text/event-stream"),
        HttpClientRequest.bodyJsonUnsafe({ hello: "world" }),
        httpClient.execute
      )
      strictEqual(invalidRequestNoVersionResponse.status, 200)
      const invalidRequestNoVersionBody = JSON.parse(yield* invalidRequestNoVersionResponse.text)
      strictEqual(invalidRequestNoVersionBody.id, null)
      strictEqual(invalidRequestNoVersionBody.error.code, McpSchema.INVALID_REQUEST_ERROR_CODE)

      const invalidInitializeResponse = yield* HttpClientRequest.post("http://localhost/mcp").pipe(
        HttpClientRequest.setHeader("accept", "application/json, text/event-stream"),
        HttpClientRequest.setHeader("Mcp-Protocol-Version", "9999-01-01"),
        HttpClientRequest.bodyJsonUnsafe({ method: "initialize", id: 7 }),
        httpClient.execute
      )
      strictEqual(invalidInitializeResponse.status, 400)
      strictEqual(yield* invalidInitializeResponse.text, "")

      const responseOnly = yield* HttpClientRequest.post("http://localhost/mcp").pipe(
        HttpClientRequest.setHeader("accept", "application/json, text/event-stream"),
        HttpClientRequest.bodyJsonUnsafe({ jsonrpc: "2.0", id: 1, result: {} }),
        HttpClientRequest.setHeader("Mcp-Protocol-Version", "9999-01-01"),
        httpClient.execute
      )
      strictEqual(responseOnly.status, 400)
      strictEqual(yield* responseOnly.text, "")

      const absentVersionResponse = yield* HttpClientRequest.post("http://localhost/mcp").pipe(
        HttpClientRequest.setHeader("accept", "application/json, text/event-stream"),
        HttpClientRequest.bodyJsonUnsafe(pingBody),
        httpClient.execute
      )
      strictEqual(absentVersionResponse.status, 200)

      for (const protocolVersion of ["2025-03-26", "2024-11-05", "2024-10-07"]) {
        const response = yield* HttpClientRequest.post("http://localhost/mcp").pipe(
          HttpClientRequest.setHeader("accept", "application/json, text/event-stream"),
          HttpClientRequest.bodyJsonUnsafe(pingBody),
          HttpClientRequest.setHeader("Mcp-Protocol-Version", protocolVersion),
          httpClient.execute
        )
        strictEqual(response.status, 400)
      }

      const declaredVersionResponse = yield* HttpClientRequest.post("http://localhost/mcp").pipe(
        HttpClientRequest.setHeader("accept", "application/json, text/event-stream"),
        HttpClientRequest.bodyJsonUnsafe(pingBody),
        HttpClientRequest.setHeader("Mcp-Protocol-Version", "2025-06-18"),
        httpClient.execute
      )
      strictEqual(declaredVersionResponse.status, 200)
    }))
  describe("protocol selection", () => {
    it.effect("should select June when an unsupported version is offered", () =>
      Effect.gen(function*() {
        const { client, responses } = yield* makeTestClient

        const result = yield* client.initialize({
          protocolVersion: "2024-10-07",
          capabilities: {},
          clientInfo: {
            name: "TestClient",
            version: "1.0.0"
          }
        })

        strictEqual(result.protocolVersion, "2025-06-18")
        strictEqual(responses[0].headers.get("Mcp-Protocol-Version"), "2025-06-18")
      }))
  })

  describe("list-change notification scheduling", () => {
    it.effect("should coalesce notifications when one registration kind changes repeatedly in a scheduling window", () =>
      Effect.gen(function*() {
        const fixture = yield* makeMcpStdioHarness(McpProtocol.v2026_07_28)
        const makeTool = (name: string) => ({
          tool: new McpSchema.Tool({ name, inputSchema: { type: "object", properties: {} } }),
          annotations: Context.empty(),
          handle: () => Effect.succeed(new McpSchema.CallToolResult({ content: [] }))
        })
        const makePrompt = (name: string) => ({
          prompt: new McpSchema.Prompt({ name }),
          annotations: Context.empty(),
          completions: {},
          handle: () =>
            Effect.succeed(
              new McpSchema.GetPromptResult({
                messages: [{ role: "user", content: { type: "text", text: name } }]
              })
            )
        })

        yield* fixture.server.addTool(makeTool("baseline-tool"))
        yield* fixture.server.addPrompt(makePrompt("baseline-prompt"))
        yield* fixture.flushListChanged
        yield* fixture.initialize()
        const subscription = yield* fixture.startRequest("subscriptions/listen", {
          notifications: { toolsListChanged: true, promptsListChanged: true }
        }, "coalesced-list-change")
        assert.strictEqual((yield* fixture.takeMessage).method, "notifications/subscriptions/acknowledged")

        yield* fixture.server.addTool(makeTool("coalesced-tool-first"))
        yield* fixture.server.addTool(makeTool("coalesced-tool-second"))
        yield* fixture.server.addPrompt(makePrompt("coalescing-sentinel"))
        yield* fixture.flushListChanged

        assert.strictEqual((yield* fixture.takeMessage).method, "notifications/tools/list_changed")
        assert.strictEqual((yield* fixture.takeMessage).method, "notifications/prompts/list_changed")

        yield* fixture.server.addTool(makeTool("next-window-tool"))
        yield* fixture.flushListChanged
        assert.strictEqual((yield* fixture.takeMessage).method, "notifications/tools/list_changed")

        yield* subscription.cancel()
      }))
  })

  describe("resource subscriptions", () => {
    // Releasing the upstream listener on overflow is this server's memory-bound policy,
    // not an MCP conformance requirement. Transport writes may stay blocked indefinitely.
    for (const blockedWrite of ["acknowledgment", "cancellation"] as const) {
      it.effect(`should release the overflowing listener when its ${blockedWrite} write remains blocked`, () =>
        Effect.gen(function*() {
          const core = yield* McpCore.make
          const events = yield* PubSub.unbounded<McpProtocolInternal.CanonicalServerNotification>()
          const acknowledgmentStarted = yield* Deferred.make<void>()
          const releaseWrite = yield* Deferred.make<void>()
          const overflowed = yield* Deferred.make<void>()
          const subscriptionReleased = yield* Deferred.make<void>()
          const sent = yield* Queue.unbounded<"acknowledged" | "cancelled">()
          const handlers = McpProtocol2026.makeHandlers(core, undefined, {
            subscribeServerNotifications: Effect.acquireRelease(
              PubSub.subscribe(events),
              () => Deferred.succeed(subscriptionReleased, undefined)
            ),
            sendNotification: (_protocolVersion, _clientId, notification) =>
              notification.tag === McpSchema2026.SubscriptionsAcknowledgedNotification._tag
                ? Deferred.succeed(acknowledgmentStarted, undefined).pipe(
                  Effect.andThen(blockedWrite === "acknowledgment" ? Deferred.await(releaseWrite) : Effect.void),
                  Effect.andThen(Queue.offer(sent, "acknowledged")),
                  Effect.asVoid
                )
                : Effect.never,
            markSubscriptionCancelled: () => Deferred.succeed(overflowed, undefined).pipe(Effect.asVoid),
            terminateSubscription: () =>
              (blockedWrite === "cancellation" ? Deferred.await(releaseWrite) : Effect.void).pipe(
                Effect.andThen(Queue.offer(sent, "cancelled")),
                Effect.asVoid
              ),
            supportedVersions: [McpSchema2026.protocolVersion],
            serverInfo: { name: "SubscriptionBacklogTest", version: "1.0.0" },
            registrationPresence: Effect.succeed({ tools: true, resources: false, prompts: false })
          })
          yield* handlers["subscriptions/listen"](
            {
              notifications: { toolsListChanged: true },
              _meta: {
                "io.modelcontextprotocol/protocolVersion": McpSchema2026.protocolVersion,
                "io.modelcontextprotocol/clientCapabilities": {}
              }
            },
            { client: new Rpc.ServerClient(1), requestId: RequestId("blocked-write") }
          ).pipe(Effect.scoped, Effect.forkScoped)
          yield* Deferred.await(acknowledgmentStarted)

          for (let index = 0; index <= 65; index++) {
            yield* PubSub.publish(events, {
              notification: McpCore.ServerNotification.ToolsChanged({})
            })
            yield* Effect.yieldNow
          }
          yield* Deferred.await(overflowed)
          assert.isTrue(yield* Deferred.isDone(subscriptionReleased))
          yield* Deferred.succeed(releaseWrite, undefined)

          assert.strictEqual(yield* Queue.take(sent), "acknowledged")
          assert.strictEqual(yield* Queue.take(sent), "cancelled")
        }))
    }

    it.effect("should terminate only the slow subscription when its pending backlog overflows", () =>
      Effect.gen(function*() {
        const pendingNotificationLimit = 64
        const core = yield* McpCore.make
        const events = yield* PubSub.unbounded<McpProtocolInternal.CanonicalServerNotification>()
        const slowAcknowledged = yield* Deferred.make<void>()
        const fastAcknowledged = yield* Deferred.make<void>()
        const slowWriteStarted = yield* Deferred.make<void>()
        const blockSlowWrite = yield* Deferred.make<void>()
        const slowSubscriptionReleased = yield* Deferred.make<void>()
        const fastSubscriptionReleased = yield* Deferred.make<void>()
        const slowTerminated = yield* Deferred.make<readonly [string, number, RpcMessage.RequestId, string]>()
        const subscriptionsStarted = yield* Ref.make(0)
        const fastDeliveries = yield* Ref.make(0)
        const fastDeliveryCompleted = yield* Queue.unbounded<void>()
        const handlers = McpProtocol2026.makeHandlers(core, undefined, {
          subscribeServerNotifications: Effect.acquireRelease(
            Effect.all([
              PubSub.subscribe(events),
              Ref.getAndUpdate(subscriptionsStarted, (count) => count + 1)
            ]),
            ([, subscriptionIndex]) =>
              Deferred.succeed(
                subscriptionIndex === 0 ? slowSubscriptionReleased : fastSubscriptionReleased,
                undefined
              )
          ).pipe(Effect.map(([subscription]) => subscription)),
          sendNotification: (_protocolVersion, clientId, notification) => {
            if (notification.tag === McpSchema2026.SubscriptionsAcknowledgedNotification._tag) {
              return Deferred.succeed(clientId === 1 ? slowAcknowledged : fastAcknowledged, undefined)
            }
            if (clientId === 1) {
              return Deferred.succeed(slowWriteStarted, undefined).pipe(
                Effect.andThen(Deferred.await(blockSlowWrite))
              )
            }
            return Ref.update(fastDeliveries, (count) => count + 1).pipe(
              Effect.andThen(Queue.offer(fastDeliveryCompleted, undefined)),
              Effect.asVoid
            )
          },
          terminateSubscription: (protocolVersion, clientId, requestId, reason) =>
            Deferred.succeed(slowTerminated, [protocolVersion, clientId, requestId, reason]),
          supportedVersions: [McpSchema2026.protocolVersion],
          serverInfo: { name: "SubscriptionBacklogTest", version: "1.0.0" },
          registrationPresence: Effect.succeed({ tools: true, resources: false, prompts: false })
        })
        const listen = (clientId: number, requestId: string) =>
          handlers["subscriptions/listen"](
            {
              notifications: { toolsListChanged: true },
              _meta: {
                "io.modelcontextprotocol/protocolVersion": McpSchema2026.protocolVersion,
                "io.modelcontextprotocol/clientCapabilities": {}
              }
            },
            { client: new Rpc.ServerClient(clientId), requestId: RequestId(requestId) }
          ).pipe(Effect.scoped, Effect.forkScoped)

        yield* listen(1, "slow-subscription")
        yield* Deferred.await(slowAcknowledged)
        yield* listen(2, "responsive-subscription")
        yield* Deferred.await(fastAcknowledged)

        for (let index = 0; index <= pendingNotificationLimit; index++) {
          yield* PubSub.publish(events, {
            notification: McpCore.ServerNotification.PromptsChanged({})
          })
        }
        yield* PubSub.publish(events, {
          notification: McpCore.ServerNotification.ToolsChanged({})
        })
        yield* Deferred.await(slowWriteStarted)
        yield* Queue.take(fastDeliveryCompleted)

        for (let index = 0; index < pendingNotificationLimit; index++) {
          yield* PubSub.publish(events, {
            notification: McpCore.ServerNotification.ToolsChanged({})
          })
          yield* Queue.take(fastDeliveryCompleted)
        }
        assert.isTrue(Option.isNone(yield* Deferred.poll(slowSubscriptionReleased)))
        assert.isTrue(Option.isNone(yield* Deferred.poll(slowTerminated)))

        yield* PubSub.publish(events, {
          notification: McpCore.ServerNotification.ToolsChanged({})
        })
        yield* Queue.take(fastDeliveryCompleted)

        assert.deepStrictEqual(yield* Deferred.await(slowTerminated), [
          McpSchema2026.protocolVersion,
          1,
          RequestId("slow-subscription"),
          "Pending notification limit exceeded"
        ])
        yield* Effect.yieldNow
        assert.isTrue(yield* Deferred.isDone(slowSubscriptionReleased))
        assert.isTrue(Option.isNone(yield* Deferred.poll(fastSubscriptionReleased)))

        yield* PubSub.publish(events, {
          notification: McpCore.ServerNotification.ToolsChanged({})
        })
        yield* Queue.take(fastDeliveryCompleted)
        assert.strictEqual(yield* Ref.get(fastDeliveries), pendingNotificationLimit + 3)
        assert.isTrue(Option.isNone(yield* Deferred.poll(fastSubscriptionReleased)))
      }))

    it.effect("should isolate resource subscriptions and clear disconnected sessions", () =>
      Effect.gen(function*() {
        const clientIds = new Set([1, 2])
        const client1Outbound = yield* Queue.unbounded<RpcMessage.FromServerEncoded>()
        const client2Outbound = yield* Queue.unbounded<RpcMessage.FromServerEncoded>()
        const disconnects = yield* Queue.unbounded<number>()
        const writeRequest = yield* Deferred.make<
          (clientId: number, message: RpcMessage.FromClientEncoded) => Effect.Effect<void>
        >()
        const protocol = yield* RpcServer.Protocol.make((write) =>
          Deferred.succeed(writeRequest, write).pipe(
            Effect.as({
              disconnects,
              send: (clientId, message) =>
                Queue.offer(clientId === 1 ? client1Outbound : client2Outbound, message).pipe(Effect.asVoid),
              end: (_clientId) => Effect.void,
              clientIds: Effect.succeed(clientIds),
              initialMessage: Effect.succeedNone,
              supportsAck: false,
              supportsTransferables: false,
              supportsSpanPropagation: false,
              supportsNotifications: true,
              codecFor: Schema.toCodecJson as RpcSerialization.CodecFor
            })
          )
        )
        const ready = yield* Deferred.make<McpServer.McpServer["Service"]>()
        yield* Effect.gen(function*() {
          const context = yield* Layer.build(
            McpServer.resource({
              uri: "file:///target",
              name: "Target",
              content: Effect.succeed("target")
            }).pipe(
              Layer.provideMerge(
                McpServer.layer({
                  name: "TestServer",
                  version: "1.0.0",
                  protocols: [McpProtocol.v2025_06_18]
                }).pipe(Layer.provide(Layer.succeed(RpcServer.Protocol, protocol)))
              )
            )
          )
          yield* Deferred.succeed(ready, Context.get(context, McpServer.McpServer))
          return yield* Effect.never
        }).pipe(Effect.scoped, Effect.forkScoped)
        const server = yield* Deferred.await(ready)
        const send = yield* Deferred.await(writeRequest)
        const nextResponse = Effect.fnUntraced(function*(clientId: number, requestId: number) {
          while (true) {
            const message = yield* Queue.take(clientId === 1 ? client1Outbound : client2Outbound)
            if (message._tag === "Exit" && message.requestId === requestId) {
              return message
            }
          }
        })
        const nextResourceUpdate = Effect.fnUntraced(function*(clientId: number) {
          while (true) {
            const message = yield* Queue.take(clientId === 1 ? client1Outbound : client2Outbound)
            if (message._tag === "Request" && message.tag === "notifications/resources/updated") {
              return yield* Schema.decodeUnknownEffect(
                McpSchema.ResourceUpdatedNotification.payloadSchema
              )(message.payload)
            }
          }
        })
        const request = Effect.fnUntraced(function*(
          clientId: number,
          id: number,
          method: string,
          payload: unknown,
          isNotification = false
        ) {
          yield* send(clientId, {
            _tag: "Request",
            id,
            tag: method,
            payload,
            headers: [],
            ...(isNotification ? { isNotification: true as const } : {})
          })
          if (!isNotification) {
            yield* nextResponse(clientId, id)
          }
        })
        const initialize = (clientId: number) =>
          request(clientId, clientId, "initialize", initializePayload).pipe(
            Effect.andThen(request(clientId, clientId + 10, "notifications/initialized", {}, true))
          )

        yield* initialize(1)
        yield* initialize(2)
        yield* request(1, 21, "resources/subscribe", { uri: "file:///target" })
        yield* request(2, 22, "resources/subscribe", { uri: "file:///sentinel" })

        yield* server.notifications["notifications/resources/updated"]({ uri: "file:///target" })
        yield* server.notifications["notifications/resources/updated"]({ uri: "file:///sentinel" })

        assert.strictEqual((yield* nextResourceUpdate(1)).uri, "file:///target")
        assert.strictEqual((yield* nextResourceUpdate(2)).uri, "file:///sentinel")
        assert.isTrue(Option.isNone(yield* Queue.poll(client1Outbound)))
        assert.isTrue(Option.isNone(yield* Queue.poll(client2Outbound)))

        clientIds.delete(1)
        yield* server.notifications["notifications/resources/updated"]({ uri: "file:///sentinel" })
        assert.strictEqual((yield* nextResourceUpdate(2)).uri, "file:///sentinel")
        clientIds.add(1)
        yield* send(1, {
          _tag: "Request",
          id: 30,
          tag: "ping",
          payload: {},
          headers: []
        })
        const afterSweep = yield* nextResponse(1, 30)
        assert.strictEqual(afterSweep.exit._tag, "Failure")

        yield* initialize(1)
        yield* send(1, { _tag: "Eof" })
        yield* send(1, {
          _tag: "Request",
          id: 31,
          tag: "ping",
          payload: {},
          headers: []
        })
        const afterReconnect = yield* nextResponse(1, 31)
        assert.strictEqual(afterReconnect.exit._tag, "Failure")
      }))
  })

  describe("stdio", () => {
    it.effect("should deliver stateless request notifications over stdio", () =>
      Effect.gen(function*() {
        const fixture = yield* makeMcpStdioHarness(McpProtocol.v2026_07_28)
        yield* fixture.server.addTool({
          tool: new McpSchema.Tool({ name: "Emit", inputSchema: { type: "object" } }),
          annotations: Context.empty(),
          handle: () =>
            Effect.gen(function*() {
              yield* fixture.server.notifications["notifications/message"]({ level: "info", data: "filtered" })
              yield* fixture.server.notifications["notifications/message"]({ level: "error", data: "delivered" })
              yield* fixture.server.notifications["notifications/progress"]({ progressToken: "token", progress: 1 })
              return new McpSchema.CallToolResult({ content: [] })
            })
        })
        yield* fixture.initialize()
        yield* fixture.takeFrame
        yield* fixture.sendRequest("tools/call", {
          name: "Emit",
          _meta: { "io.modelcontextprotocol/logLevel": "warning", progressToken: "token" }
        }, 2)
        assert.deepInclude(yield* fixture.takeFrame, {
          method: "notifications/message",
          params: { level: "error", data: "delivered" }
        })
        assert.deepInclude(yield* fixture.takeFrame, {
          method: "notifications/progress",
          params: { progressToken: "token", progress: 1 }
        })
        assert.deepInclude(yield* fixture.takeFrame, { id: 2 })
      }))

    it.effect("should accept batches after falling back to a stateful protocol", () =>
      Effect.gen(function*() {
        const fixture = yield* makeMcpStdioHarness(McpProtocol.v2025_03_26, [
          McpProtocol.v2026_07_28,
          McpProtocol.v2025_03_26
        ])
        const initialized = yield* fixture.sendRequest("initialize", {
          protocolVersion: "2025-11-25",
          capabilities: {},
          clientInfo: { name: "fallback-client", version: "1.0.0" }
        }, 1)
        assert.deepInclude(initialized.result, { protocolVersion: "2025-03-26" })
        yield* fixture.sendNotification("notifications/initialized")
        yield* fixture.takeFrame
        yield* fixture.sendRaw([
          { jsonrpc: "2.0", id: 2, method: "ping" },
          { jsonrpc: "2.0", id: 3, method: "ping" }
        ])
        const batch = yield* fixture.takeFrame
        assert(Array.isArray(batch))
        assert.sameDeepMembers(batch, [
          { jsonrpc: "2.0", id: 2, result: {} },
          { jsonrpc: "2.0", id: 3, result: {} }
        ])
      }))

    it.effect("should preserve the June wire transcript when requests use stdio", () =>
      Effect.gen(function*() {
        const stdin = yield* Queue.unbounded<Uint8Array>()
        const stdout = yield* Queue.unbounded<string | Uint8Array>()
        const encoder = new TextEncoder()
        const decoder = new TextDecoder()
        const stdioLayer = Stdio.layerTest({
          stdin: Stream.fromQueue(stdin),
          stdout: () => Sink.forEach((chunk) => Queue.offer(stdout, chunk))
        })

        const ready = yield* Deferred.make<void>()
        yield* Effect.gen(function*() {
          yield* Layer.build(
            McpServer.layerStdio({
              name: "TestServer",
              version: "1.0.0",
              protocols: [McpProtocol.v2025_06_18]
            }).pipe(Layer.provide(stdioLayer))
          )
          yield* Deferred.succeed(ready, undefined)
          return yield* Effect.never
        }).pipe(
          Effect.scoped,
          Effect.forkScoped
        )
        yield* Deferred.await(ready)

        const write = (message: unknown) => Queue.offer(stdin, encoder.encode(`${JSON.stringify(message)}\n`))
        const read = Effect.fnUntraced(function*() {
          const chunk = yield* Queue.take(stdout)
          const frame = typeof chunk === "string" ? chunk : decoder.decode(chunk)
          assert.strictEqual(frame.endsWith("\n"), true)
          return JSON.parse(frame)
        })

        yield* write({
          jsonrpc: "2.0",
          id: 0,
          method: "initialize",
          params: {
            protocolVersion: "2025-06-18",
            capabilities: {},
            clientInfo: {
              name: "TestClient",
              version: "1.0.0"
            }
          }
        })

        assert.deepStrictEqual(yield* read(), {
          jsonrpc: "2.0",
          id: 0,
          result: {
            protocolVersion: "2025-06-18",
            capabilities: {
              completions: {},
              logging: {}
            },
            serverInfo: {
              name: "TestServer",
              version: "1.0.0"
            }
          }
        })

        yield* write({
          jsonrpc: "2.0",
          id: 1,
          method: "ping",
          params: {}
        })

        assert.deepStrictEqual(yield* read(), {
          jsonrpc: "2.0",
          id: 1,
          result: {}
        })
      }))

    it.effect("should emit correlated cancellation when a STDIO subscription backlog overflows", () =>
      Effect.gen(function*() {
        const stdin = yield* Queue.unbounded<Uint8Array>()
        const stdout = yield* Queue.unbounded<string | Uint8Array>()
        const blockedWriteStarted = yield* Deferred.make<void>()
        const releaseBlockedWrite = yield* Deferred.make<void>()
        const serverReady = yield* Deferred.make<McpServer.McpServer["Service"]>()
        const encoder = new TextEncoder()
        const decoder = new TextDecoder()
        let blocked = false
        const stdioLayer = Stdio.layerTest({
          stdin: Stream.fromQueue(stdin),
          stdout: () =>
            Sink.forEach((chunk) => {
              const frame = typeof chunk === "string" ? chunk : decoder.decode(chunk)
              const message = JSON.parse(frame)
              if (!blocked && message.method === "notifications/tools/list_changed") {
                blocked = true
                return Deferred.succeed(blockedWriteStarted, undefined).pipe(
                  Effect.andThen(Deferred.await(releaseBlockedWrite))
                )
              }
              return Queue.offer(stdout, chunk)
            })
        })
        yield* Effect.gen(function*() {
          const context = yield* Layer.build(
            McpServer.layerStdio({
              name: "TestServer",
              version: "1.0.0",
              protocols: [McpProtocol.v2026_07_28]
            }).pipe(
              Layer.provide(stdioLayer),
              Layer.provideMerge(HttpRouter.layer)
            )
          )
          yield* Deferred.succeed(serverReady, Context.get(context, McpServer.McpServer))
          return yield* Effect.never
        }).pipe(Effect.scoped, Effect.forkScoped)
        const server = yield* Deferred.await(serverReady)
        yield* server.addTool({
          tool: new McpSchema.Tool({ name: "subscription-tool", inputSchema: { type: "object" } }),
          annotations: Context.empty(),
          handle: () => Effect.succeed(new McpSchema.CallToolResult({ content: [] }))
        })

        const metadata = {
          "io.modelcontextprotocol/protocolVersion": "2026-07-28",
          "io.modelcontextprotocol/clientCapabilities": {},
          "io.modelcontextprotocol/clientInfo": { name: "TestClient", version: "1.0.0" }
        }
        const write = (message: unknown) => Queue.offer(stdin, encoder.encode(`${JSON.stringify(message)}\n`))
        const read = Effect.fnUntraced(function*() {
          const chunk = yield* Queue.take(stdout)
          return JSON.parse(typeof chunk === "string" ? chunk : decoder.decode(chunk))
        })

        yield* write({
          jsonrpc: "2.0",
          id: 0,
          method: "initialize",
          params: {
            protocolVersion: "2026-07-28",
            capabilities: {},
            clientInfo: metadata["io.modelcontextprotocol/clientInfo"]
          }
        })
        yield* read()
        yield* write({
          jsonrpc: "2.0",
          id: "slow-subscription",
          method: "subscriptions/listen",
          params: {
            notifications: { toolsListChanged: true },
            _meta: metadata
          }
        })
        assert.strictEqual((yield* read()).method, "notifications/subscriptions/acknowledged")

        yield* server.notifications["notifications/tools/list_changed"]({})
        yield* Deferred.await(blockedWriteStarted)
        // Exceed both the 64-message subscription backlog and the STDIO output buffer.
        for (let index = 0; index < 128; index++) {
          yield* server.notifications["notifications/tools/list_changed"]({})
          yield* Effect.yieldNow
        }
        yield* Deferred.succeed(releaseBlockedWrite, undefined)

        let cancellation = yield* read()
        while (cancellation.method !== "notifications/cancelled") {
          cancellation = yield* read()
        }
        assert.strictEqual(cancellation.method, "notifications/cancelled")
        assert.strictEqual(cancellation.params.requestId, "slow-subscription")

        yield* write({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/list",
          params: { _meta: metadata }
        })
        const tools = yield* read()
        assert.strictEqual(tools.id, 1)
        assert.isArray(tools.result.tools)
      }))
  })
})
