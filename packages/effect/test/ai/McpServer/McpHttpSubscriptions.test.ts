import { assert, describe, it } from "@effect/vitest"
import * as McpProtocol from "effect/ai/McpProtocol"
import * as McpSchema from "effect/ai/McpSchema"
import * as McpServer from "effect/ai/McpServer"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { makeHttpHarness } from "./TestUtils/McpHttpHarness.ts"
import { makeMcpSseReader, readMcpHttpResponse } from "./TestUtils/McpHttpResponse.ts"

const makeFixture = Effect.fnUntraced(function*(options: { readonly allowSubscriptions?: boolean } = {}) {
  const harness = yield* makeHttpHarness(
    Layer.effectDiscard(Effect.gen(function*() {
      const server = yield* McpServer.McpServer
      yield* server.addTool({
        tool: new McpSchema.Tool({ name: "Emit", inputSchema: { type: "object" } }),
        annotations: Context.empty(),
        handle: () =>
          Effect.gen(function*() {
            yield* server.notifications["notifications/message"]({ level: "info", data: "filtered" })
            yield* server.notifications["notifications/message"]({ level: "error", data: "delivered" })
            yield* server.notifications["notifications/progress"]({ progressToken: "token", progress: 1 })
            return new McpSchema.CallToolResult({ content: [] })
          })
      })
    })).pipe(Layer.provideMerge(McpServer.layerHttp({
      name: "SubscriptionsTest",
      version: "1.0.0",
      path: "/mcp",
      protocols: [McpProtocol.v2026_07_28],
      ...options
    })))
  )
  const post = (method: string, params: Record<string, unknown> = {}) =>
    harness.post({
      jsonrpc: "2.0",
      id: 1,
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
  return { post }
})

describe("HTTP MCP subscriptions", () => {
  it.effect("advertises listChanged false when subscriptions are disabled", () =>
    Effect.gen(function*() {
      const fixture = yield* makeFixture({ allowSubscriptions: false })
      const response = yield* fixture.post("server/discover")
      assert.deepNestedPropertyVal(yield* readMcpHttpResponse(response), "result.capabilities", {
        tools: { listChanged: false },
        logging: {},
        completions: {}
      })
    }))

  it.effect("rejects subscriptions/listen with Method not found when subscriptions are disabled", () =>
    Effect.gen(function*() {
      const fixture = yield* makeFixture({ allowSubscriptions: false })
      const response = yield* fixture.post("subscriptions/listen", { notifications: { toolsListChanged: true } })
      // Read only the first frame so an unexpected live subscription fails without waiting for EOF.
      if (response.headers.get("content-type")?.includes("text/event-stream")) {
        const reader = makeMcpSseReader(response)
        yield* Effect.addFinalizer(() => reader.cancel)
        const message = yield* reader.take()
        assert.strictEqual(message.id, 1)
        assert.deepInclude(message.error, { code: -32601 })
      } else {
        const message = yield* readMcpHttpResponse(response)
        assert.propertyVal(message, "id", 1)
        assert.nestedPropertyVal(message, "error.code", -32601)
      }
    }))

  it.effect("preserves request-scoped progress and filtered logs when subscriptions are disabled", () =>
    Effect.gen(function*() {
      const fixture = yield* makeFixture({ allowSubscriptions: false })
      const reader = makeMcpSseReader(yield* fixture.post("tools/call", { name: "Emit" }))
      yield* Effect.addFinalizer(() => reader.cancel)
      const messages = yield* reader.drain()
      assert.deepStrictEqual(messages.map((message) => message.method ?? message.id), [
        "notifications/message",
        "notifications/progress",
        1
      ])
      assert.deepInclude(messages[0], { params: { level: "error", data: "delivered" } })
      assert.deepInclude(messages[1], { params: { progressToken: "token", progress: 1 } })
      assert.strictEqual(messages[2].id, 1)
      assert.deepInclude(messages[2].result, { content: [] })
    }))

  it.effect("advertises and accepts subscriptions by default", () =>
    Effect.gen(function*() {
      const fixture = yield* makeFixture()
      assert.nestedPropertyVal(
        yield* readMcpHttpResponse(yield* fixture.post("server/discover")),
        "result.capabilities.tools.listChanged",
        true
      )
      const reader = makeMcpSseReader(
        yield* fixture.post("subscriptions/listen", { notifications: { toolsListChanged: true } })
      )
      yield* Effect.addFinalizer(() => reader.cancel)
      assert.strictEqual((yield* reader.take()).method, "notifications/subscriptions/acknowledged")
    }))
})
