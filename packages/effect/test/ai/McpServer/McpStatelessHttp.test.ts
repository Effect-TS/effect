import { assert, describe, it } from "@effect/vitest"
import * as McpProtocol from "effect/ai/McpProtocol"
import * as McpSchema from "effect/ai/McpSchema"
import * as McpServer from "effect/ai/McpServer"
import * as Tool from "effect/ai/Tool"
import * as Toolkit from "effect/ai/Toolkit"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import * as Scope from "effect/Scope"
import { makeHttpHarness } from "./TestUtils/McpHttpHarness.ts"
import { readMcpHttpResponse } from "./TestUtils/McpHttpResponse.ts"

const protocols = [
  McpProtocol.v2025_11_25,
  McpProtocol.v2025_06_18,
  McpProtocol.v2025_03_26,
  McpProtocol.v2024_11_05,
  McpProtocol.v2026_07_28
] as const

const toolkit = Toolkit.make(Tool.make("inspect", {
  parameters: Schema.Struct({ label: Schema.String }),
  success: Schema.Struct({
    label: Schema.String,
    version: Schema.String,
    client: Schema.String,
    canSample: Schema.Boolean
  }),
  dependencies: [McpSchema.McpRequestContext]
}))

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
  })
})

const serverLayer = (sessionMode?: "stateful" | "stateless", allowSessionTermination = false) =>
  Layer.effectDiscard(McpServer.registerToolkit(toolkit)).pipe(
    Layer.provide(McpServer.McpServer.layer),
    Layer.provide(handlers),
    Layer.provide(McpServer.layerHttp({
      name: "stateless-test",
      version: "1",
      path: "/mcp",
      protocols,
      sessionMode,
      allowSessionTermination
    }))
  )

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
