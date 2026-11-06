import { assert, describe, it } from "@effect/vitest"
import * as McpProtocol from "effect/ai/McpProtocol"
import * as McpSchema from "effect/ai/McpSchema"
import * as McpServer from "effect/ai/McpServer"
import * as Tool from "effect/ai/Tool"
import * as Toolkit from "effect/ai/Toolkit"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import { initializeHttpSession, makeHttpHarness } from "./TestUtils/McpHttpHarness.ts"
import { readMcpHttpResponse } from "./TestUtils/McpHttpResponse.ts"
import { makeMcpStdioHarness } from "./TestUtils/McpStdioHarness.ts"

const modern = McpProtocol.v2026_07_28
const legacy = McpProtocol.v2025_11_25
const metadata = {
  "io.modelcontextprotocol/protocolVersion": modern.protocolVersion,
  "io.modelcontextprotocol/clientCapabilities": {}
}
const request = (id: string, method: string, params: Record<string, unknown> = {}) => ({
  jsonrpc: "2.0",
  id,
  method,
  params: { ...params, _meta: metadata }
})
const headers = (method: string, name?: string) => ({
  "Mcp-Protocol-Version": modern.protocolVersion,
  "Mcp-Method": method,
  ...(name === undefined ? {} : { "Mcp-Name": name })
})
const decodeResult = Schema.decodeUnknownSync(Schema.Struct({ result: Schema.JsonObject }))
const decodeError = Schema.decodeUnknownSync(Schema.Struct({
  error: Schema.Struct({
    code: Schema.Number,
    message: Schema.String,
    data: Schema.optional(Schema.Unknown)
  })
}))

const makeModernLayer = (mode: "server" | "request", options?: {
  readonly title?: string | undefined
  readonly cacheHints?: McpServer.CacheHints | undefined
}) => {
  const serverOptions = {
    name: "MetadataServer",
    version: "1.0.0",
    path: "/mcp" as const,
    protocols: [modern] as const,
    ...options
  }
  return mode === "server"
    ? McpServer.layerHttp(serverOptions)
    : McpServer.layerHttpRequestScoped(serverOptions)
}

const resource = (uri: string, hints: Readonly<Record<string, unknown>> = {}) =>
  McpServer.resource({
    uri,
    name: uri,
    content: Effect.succeed({
      ...McpSchema.ReadResourceResult.make({
        contents: [McpSchema.TextResourceContents.make({ uri, text: "resource content" })]
      }),
      ...hints
    })
  })

const icons = [new McpSchema.Icon({ src: "https://example.com/tool.png", mimeType: "image/png", sizes: ["48x48"] })]
const IconTool = Tool.make("IconTool", { success: Schema.String }).annotate(McpServer.ToolIcons, icons)
const PlainTool = Tool.make("PlainTool", { success: Schema.String })
const tools = Toolkit.make(IconTool, PlainTool)
const toolRegistrations = McpServer.toolkit(tools).pipe(
  Layer.provide(tools.toLayer({
    IconTool: () => Effect.succeed("icon"),
    PlainTool: () => Effect.succeed("plain")
  }))
)
const decodeTools = Schema.decodeUnknownSync(Schema.Struct({
  result: Schema.Struct({
    tools: Schema.Array(Schema.Struct({
      name: Schema.String,
      icons: Schema.optional(Schema.Array(McpSchema.Icon))
    }))
  })
}))
const assertToolIcons = (message: unknown) => {
  const listed = decodeTools(message).result.tools
  assert.deepStrictEqual(listed.find((tool) => tool.name === "IconTool")?.icons, icons)
  assert.notProperty(listed.find((tool) => tool.name === "PlainTool"), "icons")
}

describe("MCP metadata", () => {
  // https://modelcontextprotocol.io/specification/2026-07-28/basic/versioning#backwards-compatibility
  it.effect("reports supported and requested versions for unversioned initialize on a modern-only stdio server", () =>
    Effect.gen(function*() {
      const harness = yield* makeMcpStdioHarness(legacy, [modern])
      const response = yield* harness.initialize()
      const { error } = decodeError(response)
      assert.strictEqual(error.code, McpSchema.UNSUPPORTED_PROTOCOL_VERSION_ERROR_CODE)
      assert.deepStrictEqual(error.data, {
        supported: [modern.protocolVersion],
        requested: legacy.protocolVersion
      })
    }))

  // UnsupportedProtocolVersionError requires a string requested version; malformed
  // initialize parameters are InvalidParams instead (basic#error-responses).
  it.effect("rejects malformed initialize versions before constructing an unsupported-version error", () =>
    Effect.gen(function*() {
      const harness = yield* makeMcpStdioHarness(legacy, [modern])
      for (const protocolVersion of [undefined, null, 1, {}]) {
        const response = yield* harness.sendRequest("initialize", {
          protocolVersion,
          capabilities: {},
          clientInfo: { name: "test", version: "1.0.0" }
        })
        const { error } = decodeError(response)
        assert.strictEqual(error.code, McpSchema.INVALID_PARAMS_ERROR_CODE)
        assert.notProperty(error, "data")
      }
    }))

  // https://modelcontextprotocol.io/specification/2025-11-25/basic#icons
  it.effect("emits Toolkit icon annotations in legacy tools/list", () =>
    Effect.gen(function*() {
      const harness = yield* makeMcpStdioHarness(legacy, [legacy], toolRegistrations)
      yield* harness.initialize()
      assertToolIcons(yield* harness.sendRequest("tools/list", {}))
    }))

  // https://modelcontextprotocol.io/specification/2025-11-25/schema#implementation
  it.effect("emits the configured server title in legacy initialize", () =>
    Effect.gen(function*() {
      const options = {
        name: "MetadataServer",
        title: "Metadata Server",
        version: "1.0.0",
        path: "/mcp" as const,
        protocols: [legacy] as const
      }
      const harness = yield* makeHttpHarness(McpServer.layerHttp(options))
      const response = yield* harness.post({
        jsonrpc: "2.0",
        id: "initialize",
        method: "initialize",
        params: {
          protocolVersion: legacy.protocolVersion,
          capabilities: {},
          clientInfo: { name: "test", version: "1.0.0" }
        }
      })
      const message = Schema.decodeUnknownSync(Schema.Struct({
        result: Schema.Struct({ serverInfo: McpSchema.Implementation })
      }))(yield* readMcpHttpResponse(response))
      assert.strictEqual(message.result.serverInfo.title, options.title)
    }))

  // https://modelcontextprotocol.io/specification/2025-11-25/server/resources#reading-resources
  it.effect("omits resource cache hints from legacy results", () =>
    Effect.gen(function*() {
      const uri = "file:///legacy-cache"
      const harness = yield* makeHttpHarness(
        resource(uri, { ttlMs: 60_000, cacheScope: "public" }).pipe(
          Layer.provideMerge(McpServer.layerHttp({
            name: "MetadataServer",
            version: "1.0.0",
            path: "/mcp",
            protocols: [legacy]
          }))
        )
      )
      const session = yield* initializeHttpSession(harness, legacy)
      const response = yield* harness.post({
        jsonrpc: "2.0",
        id: "read",
        method: "resources/read",
        params: { uri }
      }, session)
      const { result } = decodeResult(yield* readMcpHttpResponse(response))
      assert.notProperty(result, "ttlMs")
      assert.notProperty(result, "cacheScope")
      assert.deepStrictEqual(result.contents, [{ uri, text: "resource content" }])
    }))

  for (const mode of ["server", "request"] as const) {
    describe(`HTTP ${mode} scope`, () => {
      // https://modelcontextprotocol.io/specification/2026-07-28/basic#icons
      it.effect("emits Toolkit icon annotations in tools/list", () =>
        Effect.gen(function*() {
          const harness = yield* makeHttpHarness(toolRegistrations.pipe(Layer.provideMerge(makeModernLayer(mode))))
          const response = yield* harness.post(request("tools", "tools/list"), headers("tools/list"))
          assertToolIcons(yield* readMcpHttpResponse(response))
        }))

      // https://modelcontextprotocol.io/specification/2026-07-28/schema#implementation
      it.effect("emits the configured server title in discovery metadata", () =>
        Effect.gen(function*() {
          const harness = yield* makeHttpHarness(makeModernLayer(mode, { title: "Metadata Server" }))
          const response = yield* harness.post(request("discover", "server/discover"), headers("server/discover"))
          const message = Schema.decodeUnknownSync(Schema.Struct({
            result: Schema.Struct({
              _meta: Schema.Struct({ "io.modelcontextprotocol/serverInfo": McpSchema.Implementation })
            })
          }))(yield* readMcpHttpResponse(response))
          assert.strictEqual(message.result._meta["io.modelcontextprotocol/serverInfo"].title, "Metadata Server")
        }))

      // https://modelcontextprotocol.io/specification/2026-07-28/server/tools#listing-tools
      it.effect("advertises explicitly public list cache hints", () =>
        Effect.gen(function*() {
          const cacheHints: McpServer.CacheHints = { tools: { ttl: "1 minute", cacheScope: "public" } }
          const harness = yield* makeHttpHarness(makeModernLayer(mode, { cacheHints }))
          const response = yield* harness.post(request("tools", "tools/list"), headers("tools/list"))
          const { result } = decodeResult(yield* readMcpHttpResponse(response))
          assert.strictEqual(result.ttlMs, 60_000)
          assert.strictEqual(result.cacheScope, "public")
        }))

      // https://modelcontextprotocol.io/specification/2026-07-28/server/resources#reading-resources
      it.effect("projects per-resource cache hints and preserves defaults for omitted hints", () =>
        Effect.gen(function*() {
          const cases = [
            {
              uri: "file:///public",
              hints: { ttlMs: 60_000, cacheScope: "public" },
              ttlMs: 60_000,
              cacheScope: "public"
            },
            { uri: "file:///private", hints: { ttlMs: 10, cacheScope: "private" }, ttlMs: 10, cacheScope: "private" },
            { uri: "file:///ttl-only", hints: { ttlMs: 10 }, ttlMs: 10, cacheScope: "private" },
            { uri: "file:///scope-only", hints: { cacheScope: "public" }, ttlMs: 0, cacheScope: "public" },
            { uri: "file:///default", hints: {}, ttlMs: 0, cacheScope: "private" }
          ] as const
          const registrations = Layer.mergeAll(Layer.empty, ...cases.map(({ uri, hints }) => resource(uri, hints)))
          const harness = yield* makeHttpHarness(registrations.pipe(Layer.provideMerge(makeModernLayer(mode))))
          for (const { uri, ttlMs, cacheScope } of cases) {
            const response = yield* harness.post(
              request(uri, "resources/read", { uri }),
              headers("resources/read", uri)
            )
            const { result } = decodeResult(yield* readMcpHttpResponse(response))
            assert.deepStrictEqual({ ttlMs: result.ttlMs, cacheScope: result.cacheScope }, { ttlMs, cacheScope })
            assert.deepStrictEqual(result.contents, [{ uri, text: "resource content" }])
          }
        }))

      // https://modelcontextprotocol.io/specification/2026-07-28/schema#cacheableresult
      it.effect("sanitizes invalid resource cache hints as internal errors", () =>
        Effect.gen(function*() {
          const invalid = [
            { ttlMs: -1, cacheScope: "private" },
            { ttlMs: 1.5, cacheScope: "private" },
            { ttlMs: NaN, cacheScope: "private" },
            { ttlMs: Infinity, cacheScope: "private" },
            { ttlMs: 2 ** 53, cacheScope: "private" },
            { ttlMs: null, cacheScope: "private" },
            { ttlMs: 1, cacheScope: "shared" },
            { ttlMs: 1, cacheScope: null }
          ]
          const registrations = Layer.mergeAll(
            Layer.empty,
            ...invalid.map((hint, index) => resource(`file:///invalid-${index}`, hint))
          )
          const harness = yield* makeHttpHarness(registrations.pipe(Layer.provideMerge(makeModernLayer(mode))))
          for (let index = 0; index < invalid.length; index++) {
            const uri = `file:///invalid-${index}`
            const response = yield* harness.post(
              request(uri, "resources/read", { uri }),
              headers("resources/read", uri)
            )
            const { error } = decodeError(yield* readMcpHttpResponse(response))
            assert.deepStrictEqual(error, {
              code: McpSchema.INTERNAL_ERROR_CODE,
              message: "MCP feature handler failed"
            })
          }
        }))

      // https://modelcontextprotocol.io/specification/2026-07-28/basic/patterns/mrtr
      it.effect("keeps resource continuation results private and immediately stale", () =>
        Effect.gen(function*() {
          const uri = "file:///continuation"
          const harness = yield* makeHttpHarness(
            resource(uri, { ttlMs: 60_000, cacheScope: "public" }).pipe(
              Layer.provideMerge(makeModernLayer(mode))
            )
          )
          for (const continuation of [{ inputResponses: {} }, { requestState: "opaque-state" }]) {
            const response = yield* harness.post(
              request("retry", "resources/read", { uri, ...continuation }),
              headers("resources/read", uri)
            )
            const { result } = decodeResult(yield* readMcpHttpResponse(response))
            assert.deepStrictEqual({ ttlMs: result.ttlMs, cacheScope: result.cacheScope }, {
              ttlMs: 0,
              cacheScope: "private"
            })
          }
        }))
    })
  }
})
