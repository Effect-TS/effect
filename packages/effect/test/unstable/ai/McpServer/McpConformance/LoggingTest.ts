import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import type * as McpProtocol from "effect/unstable/ai/McpProtocol"
import * as McpSchema from "effect/unstable/ai/McpSchema"
import { McpConformanceTest, type TestLayer } from "./McpConformanceTest.ts"

const levels = ["debug", "info", "notice", "warning", "error", "critical", "alert", "emergency"] as const

const setLevel = (level: string) =>
  Effect.gen(function*() {
    const test = yield* McpConformanceTest
    const initialized = yield* test.initialize({ server: "features" })
    yield* test.notifyInitialized(initialized)
    const response = yield* test.send(initialized, {
      jsonrpc: "2.0",
      id: 2,
      method: "logging/setLevel",
      params: { level }
    })
    return { initialized, response, test }
  })

export const suite = (protocol: McpProtocol.ProtocolAdapter, layer: TestLayer) =>
  it.layer(layer)(`Mcp Conformance (${protocol.protocolVersion})`, (it) => {
    describe("Logging", () => {
      // Logging has the same protocol surface in all three dated specifications.
      describe("Capabilities", () => {
        // DECISION: The fixture can accept `logging/setLevel` but does not emit
        // log notifications. Decide whether logging needs explicit registration
        // or should always be advertised.
        it.effect.skip("MUST advertise logging when log notifications are supported", () =>
          Effect.gen(function*() {
            const test = yield* McpConformanceTest
            const initialized = yield* test.initialize({ server: "features" })
            assert.property(initialized.message.result.capabilities, "logging")
          }))
      })

      describe("Setting Log Level", () => {
        // FIX: logging/setLevel currently serializes its successful result as
        // null, whereas MCP JSON-RPC results must be objects.
        it.effect.skip("MUST accept every specified log level", () =>
          Effect.forEach(levels, (level) =>
            Effect.gen(function*() {
              const { response, test } = yield* setLevel(level)
              const result = yield* test.decodeResult(response)
              assert.deepStrictEqual(result.result, {})
            }), { concurrency: 1 }))
        // FIX: Schema rejection for an unknown level currently uses error code 0
        // instead of JSON-RPC Invalid Params (-32602).
        it.effect.skip("MUST reject an unknown log level", () =>
          Effect.gen(function*() {
            const { response, test } = yield* setLevel("verbose")
            const error = yield* test.decodeError(response)
            assert.strictEqual(error.error.code, McpSchema.INVALID_PARAMS_ERROR_CODE)
          }))
        it.effect("SHOULD update the minimum level for subsequent operations", () =>
          Effect.gen(function*() {
            const { initialized, test } = yield* setLevel("debug")
            const response = yield* test.send(initialized, {
              jsonrpc: "2.0",
              id: 3,
              method: "tools/call",
              params: { name: "LogLevelTool", arguments: {} }
            })
            const result = yield* test.decodeResult(response).pipe(
              Effect.flatMap((message) => Schema.decodeUnknownEffect(McpSchema.CallToolResult)(message.result))
            )
            assert.deepStrictEqual(result.content, [{ type: "text", text: JSON.stringify("Debug") }])
          }))
        // HARNESS: Requires a log-emitting operation and an observable outbound
        // notification stream.
        it.skip("SHOULD send notifications at the selected level and higher", () => {})
        it.skip("MUST not send notifications below the selected level", () => {})
      })

      describe("Log Message Notifications", () => {
        it.effect("SCHEMA preserves the log level, logger name, and data", () =>
          Effect.gen(function*() {
            const payload = yield* Schema.decodeUnknownEffect(
              McpSchema.LoggingMessageNotification.payloadSchema
            )({
              level: "warning",
              logger: "database",
              data: {
                message: "slow query",
                durationMs: 120
              }
            })

            assert.deepStrictEqual(payload, {
              level: "warning",
              logger: "database",
              data: {
                message: "slow query",
                durationMs: 120
              }
            })
          }))
        it.effect("MUST allow arbitrary JSON-compatible log data", () =>
          Effect.forEach([
            "message",
            42,
            true,
            null,
            ["one", { nested: "two" }],
            { nested: { value: 1 } }
          ], (data) =>
            Schema.decodeUnknownEffect(
              McpSchema.LoggingMessageNotification.payloadSchema
            )({
              level: "info",
              data
            }).pipe(
              Effect.map((payload) => assert.deepStrictEqual(payload.data, data))
            )))
        // HARNESS: `notifications/message` is server-to-client and must be
        // inspected on an outbound protocol stream.
        it.skip("MUST emit log messages as notifications without an identifier", () => {})
        // HARNESS: Requires separate protocol stdout and diagnostic stderr
        // observation from the stdio fixture.
        it.skip("SCENARIO does not corrupt the stdio protocol stream with log output", () => {})
      })
    })
  })
