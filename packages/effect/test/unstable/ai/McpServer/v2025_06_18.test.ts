import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import * as McpProtocol from "effect/unstable/ai/McpProtocol"
import * as McpSchema from "effect/unstable/ai/McpSchema"
import * as BaseProtocolTest from "./McpConformance/BaseProtocolTest.ts"
import * as CompletionTest from "./McpConformance/CompletionTest.ts"
import * as ElicitationTest from "./McpConformance/ElicitationTest.ts"
import * as LifecycleTest from "./McpConformance/LifecycleTest.ts"
import * as LoggingTest from "./McpConformance/LoggingTest.ts"
import { layer as makeMcpConformanceLayer, McpConformance } from "./McpConformance/McpConformance.ts"
import * as PromptsTest from "./McpConformance/PromptsTest.ts"
import * as ResourcesTest from "./McpConformance/ResourcesTest.ts"
import * as RootsTest from "./McpConformance/RootsTest.ts"
import * as SamplingTest from "./McpConformance/SamplingTest.ts"
import * as ToolsTest from "./McpConformance/ToolsTest.ts"
import * as TransportsTest from "./McpConformance/TransportsTest.ts"
import * as UtilitiesTest from "./McpConformance/UtilitiesTest.ts"

it("accepts tools/call without optional arguments", () => {
  const decoded = Schema.decodeUnknownExit(McpSchema.CallTool.payloadSchema)({ name: "ping" })
  assert.strictEqual(decoded._tag, "Success")
  if (decoded._tag === "Success") {
    assert.deepStrictEqual(decoded.value.arguments, {})
  }
})

const protocol = McpProtocol.v2025_06_18
const testLayer = makeMcpConformanceLayer(protocol)

LifecycleTest.suite(protocol, testLayer)
BaseProtocolTest.suite(protocol, testLayer)
TransportsTest.suite(protocol, testLayer)
UtilitiesTest.suite(protocol, testLayer)
ToolsTest.suite(protocol, testLayer)
ResourcesTest.suite(protocol, testLayer)
PromptsTest.suite(protocol, testLayer)
CompletionTest.suite(protocol, testLayer)
LoggingTest.suite(protocol, testLayer)
RootsTest.suite(protocol, testLayer)
SamplingTest.suite(protocol, testLayer)
ElicitationTest.suite(protocol, testLayer)

it.layer(testLayer)(`Mcp Conformance (${protocol.protocolVersion})`, (it) => {
  describe("Utilities", () => {
    describe("Progress", () => {
      // NOTE: Smoke test only. The client capability accepts this one-way notification,
      // but McpServer does not expose an observer for its decoded payload.
      it.effect("SCHEMA accepts the optional progress message", () =>
        Effect.gen(function*() {
          const test = yield* McpConformance
          const initialized = yield* test.initialize()
          yield* test.notifyInitialized(initialized)

          const response = yield* test.send(initialized, {
            jsonrpc: "2.0",
            method: "notifications/progress",
            params: {
              progressToken: "task-with-message",
              progress: 1,
              message: "Working"
            }
          })

          assert.strictEqual(response.status, 202)
          assert.strictEqual(yield* Effect.promise(() => response.text()), "")
        }))
    })
  })

  describe("Transport-specific behavior", () => {
    it.effect("MUST reject JSON-RPC batches", () =>
      Effect.gen(function*() {
        const test = yield* McpConformance
        const response = yield* test.post([test.initializeRequest()])

        assert.isAtLeast(response.status, 400)
      }))

    it.effect("MUST require the negotiated protocol-version header after initialization", () =>
      Effect.gen(function*() {
        const test = yield* McpConformance
        const initialized = yield* test.initialize()
        assert.isNotNull(initialized.sessionId)

        const missing = yield* test.ping(initialized, {
          includeProtocolVersion: false
        })
        const mismatched = yield* test.ping(initialized, {
          id: 3,
          protocolVersion: "2025-03-26"
        })

        assert.strictEqual(initialized.message.result.protocolVersion, protocol.protocolVersion)
        assert.isAtLeast(missing.status, 400)
        assert.isAtLeast(mismatched.status, 400)
      }))
  })
})
