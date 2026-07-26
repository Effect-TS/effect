import { describe, it } from "@effect/vitest"
import type * as McpProtocol from "effect/unstable/ai/McpProtocol"
import type { TestLayer } from "./McpConformanceTest.ts"

export const suite = (protocol: McpProtocol.ProtocolAdapter, layer: TestLayer) =>
  it.layer(layer)(`Mcp Conformance (${protocol.protocolVersion})`, (it) => {
    describe("Logging", () => {
      // https://modelcontextprotocol.io/specification/2025-06-18/server/utilities/logging
      describe("Capabilities", () => {
        it.skip("MUST advertises logging when log notifications are supported", () => {})
        it.skip("MUST does not advertise logging when log notifications are unsupported", () => {})
      })

      describe("Setting Log Level", () => {
        it.skip("MUST accepts every specified log level", () => {})
        it.skip("MUST rejects an unknown log level", () => {})
        it.skip("SHOULD updates the minimum level for subsequent log notifications", () => {})
        it.skip("SHOULD sends notifications at the selected level and higher", () => {})
        it.skip("MUST does not send notifications below the selected level", () => {})
      })

      describe("Log Message Notifications", () => {
        it.skip("SCHEMA preserves the log level, logger name, and data", () => {})
        it.skip("MUST allows arbitrary JSON-compatible log data", () => {})
        it.skip("MUST does not send a response for a log message notification", () => {})
        it.skip("SCENARIO does not corrupt the stdio protocol stream with log output", () => {})
      })
    })
  })
