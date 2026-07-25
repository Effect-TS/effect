import { assert, describe, it } from "@effect/vitest"
import { assertTrue, strictEqual } from "@effect/vitest/utils"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Queue from "effect/Queue"
import * as Schema from "effect/Schema"
import * as Sink from "effect/Sink"
import * as Stdio from "effect/Stdio"
import * as Stream from "effect/Stream"
import * as AiError from "effect/unstable/ai/AiError"
import * as InternalMcpProtocol from "effect/unstable/ai/internal/mcpProtocol"
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
import { makeServerLayer, makeWebHandler } from "./McpServer/utils.ts"

const OptionalStringTool = Tool.make("OptionalStringTool", {
  parameters: Schema.Struct({ signature: Schema.optional(Schema.String) }),
  success: Schema.String
})

const PublicFailureTool = Tool.make("PublicFailureTool", {
  success: Schema.String,
  failure: Schema.Error()
})

const InternalAiErrorTool = Tool.make("InternalAiErrorTool", {
  success: Schema.String
})

const DefectTool = Tool.make("DefectTool", {
  success: Schema.String
})

const TestToolkit = Toolkit.make(OptionalStringTool, PublicFailureTool, InternalAiErrorTool, DefectTool)
type TestToolkitHandlers = Toolkit.HandlersFrom<Toolkit.Tools<typeof TestToolkit>>

const testToolkitHandlers = TestToolkit.of({
  OptionalStringTool: ({ signature }) => Effect.succeed(signature ?? "omitted"),
  PublicFailureTool: () => Effect.fail(new Error("Public failure")),
  InternalAiErrorTool: () => Effect.fail(new AiError.RateLimitError({})),
  DefectTool: () => Effect.die("private defect details")
})

const INTERNAL_TOOL_ERROR_MESSAGE = "Tool execution failed due to an internal server error."

const TestServerLayer = makeServerLayer({ name: "TestServer" })

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

const makeTestClientWith = Effect.fnUntraced(function*<A>(
  serverLayer: Layer.Layer<A, never, HttpRouter.HttpRouter>,
  options?: {
    readonly routerLayer?: Layer.Layer<never, never, HttpRouter.HttpRouter> | undefined
  } | undefined
) {
  const responses: Array<Response> = []
  const handler = yield* makeWebHandler(serverLayer, options)

  let sessionId: string | null = null
  const customFetch: typeof fetch = async (input, init) => {
    const request = input instanceof Request ? input : new Request(input, init)
    if (sessionId) {
      request.headers.set("Mcp-Session-Id", sessionId)
    }
    const response = await handler(request)
    sessionId = response.headers.get("Mcp-Session-Id") ?? sessionId
    responses.push(response.clone())
    return response
  }

  const clientLayer = RpcClient.layerProtocolHttp({ url: "http://localhost/mcp" }).pipe(
    Layer.provideMerge([FetchHttpClient.layer, RpcSerialization.layerJsonRpc()]),
    Layer.provide(Layer.succeed(FetchHttpClient.Fetch, customFetch))
  )
  const client = yield* RpcClient.make(McpSchema.ClientRpcs).pipe(
    Effect.provide(clientLayer)
  )

  const httpClient = yield* HttpClient.HttpClient.pipe(
    Effect.provide(clientLayer)
  )

  return { client, responses, httpClient }
})

const makeTestClient = makeTestClientWith(TestServerLayer)

const makeRouterTestClient = (
  router: Layer.Layer<never, never, HttpRouter.HttpRouter>
) => makeTestClientWith(TestServerLayer, { routerLayer: router })

const makeToolkitTestClient = Effect.fnUntraced(function*(handlers: TestToolkitHandlers = testToolkitHandlers) {
  const serverLayer = McpServer.toolkit(TestToolkit).pipe(
    Layer.provideMerge(TestToolkit.toLayer(handlers)),
    Layer.provide(TestServerLayer)
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
  return client
})

const toolResultText = (result: McpSchema.CallToolResult): string => {
  const content = result.content[0]
  assertTrue(content?.type === "text", "Expected text tool-result content")
  return content.text
}

const makeTestProtocol = (protocolVersion: string, field: "a" | "b") => {
  const Ping = Rpc.make("ping", {
    payload: Schema.Struct({
      [field]: field === "a" ? Schema.String : Schema.Number
    }),
    success: Schema.Struct({})
  })
  return InternalMcpProtocol.make({
    protocolVersion,
    clientRpcs: McpSchema.ClientRpcs.omit("ping").add(Ping),
    clientNotificationRpcs: McpSchema.ClientNotificationRpcs,
    serverRequestRpcs: McpSchema.ServerRequestRpcs,
    serverNotificationRpcs: McpSchema.ServerNotificationRpcs
  })
}

const makeRawHttpServer = (
  protocols: ReadonlyArray<InternalMcpProtocol.AnyProtocolAdapter>
) =>
  Effect.gen(function*() {
    const serverLayer = McpServer.layerHttp({
      name: "TestServer",
      version: "1.0.0",
      path: "/mcp",
      protocols: protocols as unknown as [
        McpProtocol.ProtocolAdapter,
        ...Array<McpProtocol.ProtocolAdapter>
      ]
    })
    const { dispose, handler } = HttpRouter.toWebHandler(serverLayer, { disableLogger: true })
    yield* Effect.addFinalizer(() => Effect.promise(() => dispose()))

    const request = (
      body: unknown,
      sessionId?: string
    ) =>
      Effect.promise(() =>
        handler(
          new Request("http://localhost/mcp", {
            method: "POST",
            headers: {
              "content-type": "application/json",
              ...(sessionId ? { "mcp-session-id": sessionId } : {})
            },
            body: JSON.stringify(body)
          })
        )
      )

    const initialize = Effect.fnUntraced(function*(protocolVersion: string, id: number) {
      const response = yield* request({
        jsonrpc: "2.0",
        id,
        method: "initialize",
        params: {
          protocolVersion,
          capabilities: {},
          clientInfo: {
            name: "TestClient",
            version: "1.0.0"
          }
        }
      })
      const sessionId = response.headers.get("mcp-session-id")
      if (sessionId === null) {
        return yield* Effect.die("MCP initialize response did not include a session id")
      }
      return { response, sessionId }
    })

    return { initialize, request }
  })

describe("McpServer", () => {
  it.effect("should replay the negotiated protocol header when a session is initialized", () =>
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

  it.effect("should return 404 when a non-initialize request omits the MCP session id", () =>
    Effect.gen(function*() {
      const { httpClient } = yield* makeTestClient

      const response = yield* HttpClientRequest.post("http://localhost/mcp").pipe(
        HttpClientRequest.bodyJsonUnsafe({ jsonrpc: "2.0", method: "ping", params: {}, id: 0 }),
        httpClient.execute
      )

      strictEqual(response.status, 404)
    }))
  describe("registerToolkit", () => {
    it.effect("returns concise parameter-validation errors without invoking the handler", () =>
      Effect.gen(function*() {
        let handlerInvoked = false
        const client = yield* makeToolkitTestClient(TestToolkit.of({
          ...testToolkitHandlers,
          OptionalStringTool: ({ signature }) => {
            handlerInvoked = true
            return Effect.succeed(signature ?? "omitted")
          }
        }))

        const result = yield* client["tools/call"]({
          name: "OptionalStringTool",
          arguments: { signature: null }
        })

        assert.isFalse(handlerInvoked)
        assert.strictEqual(result.isError, true)

        const text = toolResultText(result)
        assert.match(text, /Invalid parameters for tool 'OptionalStringTool'/)
        assert.match(text, /Expected string \| undefined, got null/)
        assert.match(text, /at \["signature"\]/)
        assert.isFalse(/effect\/ai\//.test(text))
        assert.isFalse(/\[cause\]/.test(text))
        assert.isFalse(/\n {4}at /.test(text))
        assert.isFalse(/(?:file:\/\/)?\/(?:[^/\s]+\/)+[^/\s]+\.ts:\d+:\d+/.test(text))
      }))

    it.effect("preserves successful results when optional parameters are omitted", () =>
      Effect.gen(function*() {
        let handlerInvoked = false
        const client = yield* makeToolkitTestClient(TestToolkit.of({
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

    it.effect("returns schema-validated messages for declared handler failures", () =>
      Effect.gen(function*() {
        const client = yield* makeToolkitTestClient()

        const result = yield* client["tools/call"]({
          name: "PublicFailureTool",
          arguments: {}
        })

        assert.strictEqual(result.isError, true)
        const text = toolResultText(result)
        assert.strictEqual(text, "Public failure")
      }))

    it.effect("returns a generic message for non-validation AiError failures", () =>
      Effect.gen(function*() {
        const client = yield* makeToolkitTestClient()

        const result = yield* client["tools/call"]({
          name: "InternalAiErrorTool",
          arguments: {}
        })

        assert.strictEqual(result.isError, true)
        const text = toolResultText(result)
        assert.strictEqual(text, INTERNAL_TOOL_ERROR_MESSAGE)
      }))

    it.effect("returns a generic message for handler defects", () =>
      Effect.gen(function*() {
        const client = yield* makeToolkitTestClient()

        const result = yield* client["tools/call"]({
          name: "DefectTool",
          arguments: {}
        })

        assert.strictEqual(result.isError, true)
        const text = toolResultText(result)
        assert.strictEqual(text, INTERNAL_TOOL_ERROR_MESSAGE)
      }))

    it.effect("keeps unknown tools as protocol errors", () =>
      Effect.gen(function*() {
        const client = yield* makeToolkitTestClient()

        const error = yield* client["tools/call"]({
          name: "UnknownTool",
          arguments: {}
        }).pipe(Effect.flip)

        assert.instanceOf(error, McpSchema.InvalidParams)
        assert.strictEqual(error.code, McpSchema.INVALID_PARAMS_ERROR_CODE)
        assert.strictEqual(error.message, "Tool 'UnknownTool' not found")
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
        HttpClientRequest.bodyJsonUnsafe({ jsonrpc: "2.0", id: 1, result: {} }),
        httpClient.execute
      )
      strictEqual(responseOnly.status, 202)
      strictEqual(yield* responseOnly.text, "")

      const pingResponse = yield* HttpClientRequest.post("http://localhost/mcp").pipe(
        HttpClientRequest.bodyJsonUnsafe(pingBody),
        httpClient.execute
      )
      strictEqual(pingResponse.status, 200)
      const pingResponseBody = yield* pingResponse.text
      strictEqual(pingResponseBody.length > 0, true)
    }))

  it.effect("validates supplied protocol versions on POST", () =>
    Effect.gen(function*() {
      const { client, httpClient } = yield* makeRouterTestClient(HttpRouter.cors())

      yield* client.initialize(initializePayload)

      const unsupportedResponse = yield* HttpClientRequest.post("http://localhost/mcp").pipe(
        HttpClientRequest.bodyJsonUnsafe(pingBody),
        HttpClientRequest.setHeader("Mcp-Protocol-Version", "9999-01-01"),
        httpClient.execute
      )
      strictEqual(unsupportedResponse.status, 400)
      strictEqual(yield* unsupportedResponse.text, "")
      strictEqual(unsupportedResponse.headers["access-control-allow-origin"], "*")

      const responseOnly = yield* HttpClientRequest.post("http://localhost/mcp").pipe(
        HttpClientRequest.bodyJsonUnsafe({ jsonrpc: "2.0", id: 1, result: {} }),
        HttpClientRequest.setHeader("Mcp-Protocol-Version", "9999-01-01"),
        httpClient.execute
      )
      strictEqual(responseOnly.status, 400)
      strictEqual(yield* responseOnly.text, "")

      const absentVersionResponse = yield* HttpClientRequest.post("http://localhost/mcp").pipe(
        HttpClientRequest.bodyJsonUnsafe(pingBody),
        httpClient.execute
      )
      strictEqual(absentVersionResponse.status, 200)

      for (const protocolVersion of ["2025-03-26", "2024-11-05", "2024-10-07"]) {
        const response = yield* HttpClientRequest.post("http://localhost/mcp").pipe(
          HttpClientRequest.bodyJsonUnsafe(pingBody),
          HttpClientRequest.setHeader("Mcp-Protocol-Version", protocolVersion),
          httpClient.execute
        )
        strictEqual(response.status, 400)
      }

      const declaredVersionResponse = yield* HttpClientRequest.post("http://localhost/mcp").pipe(
        HttpClientRequest.bodyJsonUnsafe(pingBody),
        HttpClientRequest.setHeader("Mcp-Protocol-Version", "2025-06-18"),
        httpClient.execute
      )
      strictEqual(declaredVersionResponse.status, 200)
    }))
  describe("protocol selection", () => {
    for (const offeredVersion of ["2025-03-26", "2024-11-05", "2024-10-07"]) {
      it.effect(`should select June when ${offeredVersion} is offered`, () =>
        Effect.gen(function*() {
          const { client, responses } = yield* makeTestClient

          const result = yield* client.initialize({
            protocolVersion: offeredVersion,
            capabilities: {},
            clientInfo: {
              name: "TestClient",
              version: "1.0.0"
            }
          })

          strictEqual(result.protocolVersion, "2025-06-18")
          strictEqual(responses[0].headers.get("Mcp-Protocol-Version"), "2025-06-18")
        }))
    }

    it.effect("should decode with the pinned adapter when sessions use incompatible schemas", () =>
      Effect.gen(function*() {
        const protocolA = makeTestProtocol("test-a", "a")
        const protocolB = makeTestProtocol("test-b", "b")
        const { initialize, request } = yield* makeRawHttpServer([protocolA, protocolB])
        const sessionA = yield* initialize("test-a", 1)
        const sessionB = yield* initialize("test-b", 2)

        const wrongForA = yield* request({
          jsonrpc: "2.0",
          id: 3,
          method: "ping",
          params: { b: 1 }
        }, sessionA.sessionId)
        const validForA = yield* request({
          jsonrpc: "2.0",
          id: 4,
          method: "ping",
          params: { a: "selected" }
        }, sessionA.sessionId)
        const validForB = yield* request({
          jsonrpc: "2.0",
          id: 5,
          method: "ping",
          params: { b: 1 }
        }, sessionB.sessionId)

        const invalidBody = (yield* Effect.promise(() => wrongForA.json())) as Record<string, unknown>
        const validABody = (yield* Effect.promise(() => validForA.json())) as Record<string, unknown>
        const validBBody = (yield* Effect.promise(() => validForB.json())) as Record<string, unknown>
        assert.property(invalidBody, "error")
        assert.deepStrictEqual(validABody, { jsonrpc: "2.0", id: 4, result: {} })
        assert.deepStrictEqual(validBBody, { jsonrpc: "2.0", id: 5, result: {} })
      }))
  })

  describe("stdio", () => {
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
              completions: {}
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
  })
})
