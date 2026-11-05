import { assert, describe, it } from "@effect/vitest"
import * as McpApps from "effect/ai/McpApps"
import * as McpProtocol from "effect/ai/McpProtocol"
import * as McpServer from "effect/ai/McpServer"
import * as McpTest from "effect/ai/McpTest"
import * as Tool from "effect/ai/Tool"
import * as Toolkit from "effect/ai/Toolkit"
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import { makeHttpHarness } from "./TestUtils/McpHttpHarness.ts"
import { readMcpHttpResponse } from "./TestUtils/McpHttpResponse.ts"
import { makeServerLayer } from "./TestUtils/McpServerLayer.ts"

// https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/2026-01-26/apps.mdx

const modern = McpProtocol.v2026_07_28

const metadata = {
  "io.modelcontextprotocol/protocolVersion": modern.protocolVersion,
  "io.modelcontextprotocol/clientCapabilities": {},
  "io.modelcontextprotocol/clientInfo": { name: "AppsClient", version: "1.0.0" }
} as const

const resourceMeta = { ui: { prefersBorder: true, csp: { connectDomains: ["https://api.example.com"] } } }

const Dashboard = McpApps.resource({
  uri: "ui://dashboard/view.html",
  name: "Dashboard",
  meta: resourceMeta.ui,
  content: Effect.succeed("<html></html>")
})

const initialize = (protocolVersion: string) => ({
  jsonrpc: "2.0",
  id: "initialize",
  method: "initialize",
  params: { protocolVersion, capabilities: {}, clientInfo: { name: "AppsClient", version: "1.0.0" } }
})

describe("McpApps", () => {
  it.effect("serves an app resource and declares the extension on the stateless revision", () =>
    Effect.gen(function*() {
      // A full result must still be served as an App, keeping the item's own `_meta.ui` fields.
      const FullResult = McpApps.resource({
        uri: "ui://dashboard/full.html",
        name: "FullResult",
        meta: resourceMeta.ui,
        content: Effect.succeed({
          contents: [{
            uri: "ui://dashboard/full.html",
            mimeType: "text/html",
            text: "<html></html>",
            _meta: { ui: { prefersBorder: false } }
          }]
        })
      })
      const harness = yield* makeHttpHarness(
        Layer.mergeAll(Dashboard, FullResult).pipe(
          Layer.provideMerge(makeServerLayer({
            name: "AppsServer",
            protocols: [modern],
            extensions: { "example/other": {} }
          }))
        )
      )
      const send = Effect.fnUntraced(function*(method: string, params: Record<string, unknown> = {}) {
        const response = yield* harness.post(
          { jsonrpc: "2.0", id: 1, method, params: { ...params, _meta: metadata } },
          {
            "MCP-Protocol-Version": modern.protocolVersion,
            "Mcp-Method": method,
            ...(params.uri === undefined ? {} : { "Mcp-Name": String(params.uri) })
          }
        )
        return (yield* readMcpHttpResponse(response)) as any
      })

      const discovered = yield* send("server/discover")
      assert.deepStrictEqual(discovered.result.capabilities.extensions, {
        "example/other": {},
        "io.modelcontextprotocol/ui": {}
      })

      const listed = yield* send("resources/list")
      const resource = listed.result.resources.find((resource: any) => resource.uri === "ui://dashboard/view.html")
      assert.strictEqual(resource.uri, "ui://dashboard/view.html")
      assert.strictEqual(resource.mimeType, "text/html;profile=mcp-app")
      assert.deepStrictEqual(resource._meta, resourceMeta)

      const read = yield* send("resources/read", { uri: "ui://dashboard/view.html" })
      assert.deepStrictEqual(read.result.contents, [{
        uri: "ui://dashboard/view.html",
        mimeType: "text/html;profile=mcp-app",
        text: "<html></html>",
        _meta: resourceMeta
      }])

      const full = yield* send("resources/read", { uri: "ui://dashboard/full.html" })
      assert.deepStrictEqual(full.result.contents, [{
        uri: "ui://dashboard/full.html",
        mimeType: "text/html;profile=mcp-app",
        text: "<html></html>",
        _meta: { ui: { ...resourceMeta.ui, prefersBorder: false } }
      }])
    }))

  // Unlike Skills, Apps negotiates on every revision.
  it.effect("declares the extension when initializing a sessionful revision", () =>
    Effect.gen(function*() {
      for (
        const protocol of [
          McpProtocol.v2024_11_05,
          McpProtocol.v2025_03_26,
          McpProtocol.v2025_06_18,
          McpProtocol.v2025_11_25
        ]
      ) {
        const harness = yield* makeHttpHarness(Dashboard.pipe(Layer.provideMerge(makeServerLayer({
          name: "AppsServer",
          protocols: [protocol]
        }))))
        const initialized = (yield* readMcpHttpResponse(
          yield* harness.post(initialize(protocol.protocolVersion))
        )) as any
        assert.deepStrictEqual(
          initialized.result.capabilities.extensions,
          { "io.modelcontextprotocol/ui": {} },
          protocol.protocolVersion
        )
      }
    }))

  it.effect("merges the ToolUi annotation into the tool's _meta.ui", () =>
    Effect.gen(function*() {
      const ShowDashboard = Tool.make("ShowDashboard", { success: Schema.Struct({ count: Schema.Number }) })
        .annotate(Tool.Meta, { "example/owner": "dashboards" })
        .annotate(McpApps.ToolUi, { resourceUri: "ui://dashboard/view.html", visibility: ["model", "app"] })
      // App-only tools need no resource of their own.
      const Refresh = Tool.make("Refresh").annotate(McpApps.ToolUi, { visibility: ["app"] })
      const toolkit = Toolkit.make(ShowDashboard, Refresh)
      const client = yield* McpTest.makeClient(
        McpServer.toolkit(toolkit).pipe(Layer.provideMerge(toolkit.toLayer({
          ShowDashboard: () => Effect.succeed({ count: 1 }),
          Refresh: () => Effect.void
        }))),
        { protocols: [McpProtocol.v2025_06_18] }
      )

      const { tools } = yield* client.listTools({})
      // The deprecated flat `ui/resourceUri` key must not be emitted.
      assert.deepStrictEqual(tools.find((tool) => tool.name === "ShowDashboard")?._meta, {
        "example/owner": "dashboards",
        ui: { resourceUri: "ui://dashboard/view.html", visibility: ["model", "app"] }
      })
      assert.deepStrictEqual(tools.find((tool) => tool.name === "Refresh")?._meta, {
        ui: { visibility: ["app"] }
      })
    }))

  it.effect("dies on conflicting tool metadata and on resource URIs outside ui://", () =>
    Effect.gen(function*() {
      const registerTool = Effect.fnUntraced(function*(tool: Tool.Any) {
        const toolkit = Toolkit.make(tool)
        const server = yield* McpServer.McpServer.make
        const exit = yield* McpServer.registerToolkit(toolkit).pipe(
          Effect.provideService(McpServer.McpServer, server),
          Effect.provide(toolkit.toLayer({ [tool.name]: () => Effect.void } as any)),
          Effect.exit
        )
        assert.isTrue(exit._tag === "Failure" && Cause.hasDies(exit.cause), tool.name)
        assert.deepStrictEqual(server.tools, [], tool.name)
      })
      yield* registerTool(
        Tool.make("Collision")
          .annotate(Tool.Meta, { ui: { visibility: ["model"] } })
          .annotate(McpApps.ToolUi, { visibility: ["app"] })
      )
      yield* registerTool(
        Tool.make("ForeignUri").annotate(McpApps.ToolUi, { resourceUri: "https://example.com/view.html" as any })
      )

      const server = yield* McpServer.McpServer.make
      const exit = yield* McpApps.registerResource({
        uri: "https://example.com/view.html" as any,
        name: "Foreign",
        content: Effect.succeed("<html></html>")
      }).pipe(Effect.provideService(McpServer.McpServer, server), Effect.exit)
      assert.isTrue(exit._tag === "Failure" && Cause.isIllegalArgumentError(Cause.squash(exit.cause)))
    }))
})
