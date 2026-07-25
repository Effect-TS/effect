import { assert, describe, it } from "@effect/vitest"
import { assertTrue, strictEqual } from "@effect/vitest/utils"
import { Effect, Layer, Schema } from "effect"
import * as AiError from "effect/unstable/ai/AiError"
import * as McpSchema from "effect/unstable/ai/McpSchema"
import * as McpServer from "effect/unstable/ai/McpServer"
import * as Tool from "effect/unstable/ai/Tool"
import * as Toolkit from "effect/unstable/ai/Toolkit"
import * as FetchHttpClient from "effect/unstable/http/FetchHttpClient"
import * as HttpClient from "effect/unstable/http/HttpClient"
import * as HttpClientRequest from "effect/unstable/http/HttpClientRequest"
import * as HttpRouter from "effect/unstable/http/HttpRouter"
import { RpcSerialization } from "effect/unstable/rpc"
import * as RpcClient from "effect/unstable/rpc/RpcClient"

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

const TestServerLayer = McpServer.layerHttp({
  name: "TestServer",
  version: "1.0.0",
  path: "/mcp"
})

const makeTestClientWith = Effect.fnUntraced(function*<A>(
  serverLayer: Layer.Layer<A, never, HttpRouter.HttpRouter>
) {
  const responses: Array<Response> = []
  const { handler, dispose } = HttpRouter.toWebHandler(serverLayer, { disableLogger: true })
  yield* Effect.addFinalizer(() => Effect.promise(() => dispose()))

  let sessionId: string | null = null
  const customFetch: typeof fetch = async (input, init) => {
    const request = input instanceof Request ? input : new Request(input, init)
    if (sessionId) {
      request.headers.set("Mcp-Session-Id", sessionId)
    }
    const response = await handler(request)
    sessionId = response.headers.get("Mcp-Session-Id")
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

describe("McpServer", () => {
  it.effect("replays MCP session and negotiated protocol headers after initialize", () =>
    Effect.gen(function*() {
      const { client, responses } = yield* makeTestClient

      yield* client.initialize({
        protocolVersion: "9999-01-01",
        capabilities: {},
        clientInfo: {
          name: "TestClient",
          version: "1.0.0"
        }
      })

      yield* client.ping({})

      strictEqual(responses.length, 2)
      strictEqual(responses[0].headers.get("Mcp-Protocol-Version"), "2025-06-18")
    }))

  it.effect("returns 404 when a non-initialize request omits the MCP session id", () =>
    Effect.gen(function*() {
      const { httpClient } = yield* makeTestClient

      const response = yield* HttpClientRequest.post("http://locahost/mcp").pipe(
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
        assert.isFalse(/\n {4}at /.test(text))
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
        assert.isFalse(/RateLimitError/.test(text))
        assert.isFalse(/\n {4}at /.test(text))
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
        assert.isFalse(/private defect details/.test(text))
        assert.isFalse(/\n {4}at /.test(text))
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
})
