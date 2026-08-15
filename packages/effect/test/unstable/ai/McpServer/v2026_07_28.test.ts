import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Encoding from "effect/Encoding"
import * as Schema from "effect/Schema"
import * as McpProtocol from "effect/unstable/ai/McpProtocol"
import * as McpSchema from "effect/unstable/ai/McpSchema"
import * as CompletionTest from "./McpConformance/CompletionTest.ts"
import { layer as makeMcpConformanceLayer, McpConformance } from "./McpConformance/McpConformance.ts"
import * as MultiRoundTripTest from "./McpConformance/MultiRoundTripTest.ts"
import * as PromptsTest from "./McpConformance/PromptsTest.ts"
import * as ResourcesTest from "./McpConformance/ResourcesTest.ts"
import * as SubscriptionsTest from "./McpConformance/SubscriptionsTest.ts"
import * as ToolsTest from "./McpConformance/ToolsTest.ts"
import { makeMcpStdioHarness } from "./TestUtils/McpStdioHarness.ts"

const protocol = McpProtocol.v2026_07_28
const testLayer = makeMcpConformanceLayer(protocol)

const metadata = {
  "io.modelcontextprotocol/protocolVersion": "2026-07-28",
  "io.modelcontextprotocol/clientCapabilities": {},
  "io.modelcontextprotocol/clientInfo": { name: "McpConformanceClient", version: "1.0.0" }
} as const

const request = (
  id: string | number,
  method: string,
  params: Record<string, unknown> = {}
) => ({
  jsonrpc: "2.0",
  id,
  method,
  params: { ...params, _meta: metadata }
})

const headers = (method: string, name?: string): HeadersInit => ({
  "MCP-Protocol-Version": protocol.protocolVersion,
  "Mcp-Method": method,
  ...(name === undefined ? {} : { "Mcp-Name": name })
})

const decodeError = (response: Response) =>
  Effect.promise<unknown>(() => response.json()).pipe(
    Effect.flatMap(Schema.decodeUnknownEffect(Schema.Struct({
      id: Schema.NullOr(Schema.Union([Schema.String, Schema.Number])),
      error: McpSchema.McpError
    })))
  )

ToolsTest.suite(protocol, testLayer)
ToolsTest.statelessModernSuite(protocol, testLayer)
ResourcesTest.suite(protocol, testLayer)
PromptsTest.suite(protocol, testLayer)
CompletionTest.suite(protocol, testLayer)
MultiRoundTripTest.suite(protocol, testLayer)
SubscriptionsTest.suite(protocol, testLayer)

it.layer(testLayer)(`Mcp Conformance (${protocol.protocolVersion})`, (it) => {
  describe("Lifecycle", () => {
    // SEP-2575: https://modelcontextprotocol.io/seps/2575-stateless-mcp
    // https://modelcontextprotocol.io/specification/2026-07-28/server/discovery
    it.effect("should discover the server when no initialization or session exists", () =>
      Effect.gen(function*() {
        const test = yield* McpConformance
        const discovered = yield* test.initialize({ server: "features" })

        assert.strictEqual(discovered.response.status, 200)
        assert.isNull(discovered.sessionId)
        assert.strictEqual(discovered.message.result.protocolVersion, protocol.protocolVersion)
      }))

    it.effect("should serve independent requests when no discovery or session exists", () =>
      Effect.gen(function*() {
        const test = yield* McpConformance
        const first = yield* test.post(request(1, "tools/list"), headers("tools/list"))
        const second = yield* test.post(request(2, "tools/list"), {
          ...headers("tools/list"),
          "Mcp-Session-Id": "ignored-modern-session"
        })

        assert.strictEqual(first.status, 200)
        assert.strictEqual(second.status, 200)
        assert.isNull(first.headers.get("Mcp-Session-Id"))
      }))
  })

  describe("Transports", () => {
    // SEP-2567: https://modelcontextprotocol.io/seps/2567-remove-sessions
    it.effect("should exchange self-contained newline-delimited requests over stdio", () =>
      Effect.gen(function*() {
        const fixture = yield* makeMcpStdioHarness(protocol)
        const response = yield* fixture.sendRequest("server/discover", {})
        const result = Schema.decodeUnknownSync(Schema.Struct({
          supportedVersions: Schema.Array(Schema.String),
          capabilities: Schema.Record(Schema.String, Schema.Unknown),
          resultType: Schema.Literal("complete"),
          ttlMs: Schema.Number,
          cacheScope: Schema.Literal("private"),
          _meta: Schema.Struct({
            "io.modelcontextprotocol/serverInfo": Schema.Struct({
              name: Schema.String,
              version: Schema.String
            })
          })
        }))(response.result)

        assert.deepStrictEqual(result.supportedVersions, ["2026-07-28"])
        assert.deepStrictEqual(result.capabilities, { completions: {}, logging: {} })
        assert.strictEqual(result.ttlMs, 0)
        assert.deepStrictEqual(result._meta["io.modelcontextprotocol/serverInfo"], {
          name: "McpConformance",
          version: "1.0.0"
        })
      }))

    it.effect("should accept every required routing name when the header matches the request", () =>
      Effect.gen(function*() {
        const test = yield* McpConformance
        const cases = [
          ["tools/call", { name: "ConformanceTool", arguments: {} }, "ConformanceTool"],
          ["resources/read", { uri: "file:///conformance.txt" }, "file:///conformance.txt"],
          ["prompts/get", { name: "ConformancePrompt", arguments: {} }, "ConformancePrompt"]
        ] as const

        for (const [index, [method, params, name]] of cases.entries()) {
          const response = yield* test.post(request(index + 1, method, params), headers(method, name))
          assert.strictEqual(response.status, 200)
        }

        const encodedName = `=?base64?${Encoding.encodeBase64("file:///conformance.txt")}?=`
        const encoded = yield* test.post(
          request(4, "resources/read", { uri: "file:///conformance.txt" }),
          headers("resources/read", encodedName)
        )
        assert.strictEqual(encoded.status, 200)
      }))

    it.effect("should reject routing headers when they are missing, malformed, or mismatched", () =>
      Effect.gen(function*() {
        const test = yield* McpConformance
        const cases = [
          [request("missing", "tools/list"), { "MCP-Protocol-Version": protocol.protocolVersion }],
          [request("mismatch", "tools/list"), headers("tools/call")],
          [
            request("malformed", "resources/read", { uri: "file:///conformance.txt" }),
            headers("resources/read", "=?base64?not-valid!?=")
          ]
        ] as const

        // SEP-2243: https://modelcontextprotocol.io/seps/2243-http-standardization
        // The final specification assigns HeaderMismatch error code -32020.
        // https://modelcontextprotocol.io/specification/2026-07-28/basic/transports#request-metadata
        for (const [body, requestHeaders] of cases) {
          const response = yield* test.post(body, requestHeaders)
          const error = yield* decodeError(response)
          assert.strictEqual(response.status, 400)
          assert.strictEqual(error.id, body.id)
          assert.strictEqual(error.error.code, -32020)
        }
      }))

    it.effect("should reject an unsupported request version with the supported versions", () =>
      Effect.gen(function*() {
        const test = yield* McpConformance
        const body = {
          ...request(5, "tools/list"),
          params: {
            _meta: {
              ...metadata,
              "io.modelcontextprotocol/protocolVersion": "2099-01-01"
            }
          }
        }
        const response = yield* test.post(body, {
          "MCP-Protocol-Version": "2099-01-01",
          "Mcp-Method": "tools/list"
        })
        const error = yield* decodeError(response)

        assert.strictEqual(response.status, 400)
        assert.strictEqual(error.id, 5)
        assert.strictEqual(error.error.code, -32022)
        assert.deepStrictEqual(error.error.data, {
          supported: ["2026-07-28"],
          requested: "2099-01-01"
        })
      }))

    it.effect("should return method not found when a request method is unknown or unserved", () =>
      Effect.gen(function*() {
        const test = yield* McpConformance
        const response = yield* test.post(request(6, "unknown/method"), headers("unknown/method"))
        const error = yield* decodeError(response)
        assert.strictEqual(response.status, 404)
        assert.strictEqual(error.id, 6)
        assert.strictEqual(error.error.code, McpSchema.METHOD_NOT_FOUND_ERROR_CODE)
      }))
  })

  describe("Request metadata", () => {
    it.effect("should preserve caller metadata alongside authoritative protocol facts", () =>
      Effect.gen(function*() {
        const test = yield* McpConformance
        const discovered = yield* test.initialize({ server: "features" })
        const response = yield* test.send(discovered, {
          jsonrpc: "2.0",
          id: 8,
          method: "tools/call",
          params: {
            name: "RequestMetadataTool",
            arguments: {},
            _meta: { sentinel: "preserved" }
          }
        })
        const message = yield* test.decodeResult(response)
        const result = Schema.decodeUnknownSync(Schema.Struct({ structuredContent: Schema.String }))(message.result)
        const observed = Schema.decodeUnknownSync(Schema.Record(Schema.String, Schema.Unknown))(
          JSON.parse(result.structuredContent)
        )

        assert.strictEqual(observed.sentinel, "preserved")
        assert.strictEqual(observed["io.modelcontextprotocol/protocolVersion"], protocol.protocolVersion)
        assert.deepStrictEqual(observed["io.modelcontextprotocol/clientCapabilities"], {})
        assert.deepStrictEqual(observed["io.modelcontextprotocol/clientInfo"], {
          name: "McpConformanceClient",
          version: "1.0.0"
        })
      }))
  })
})
