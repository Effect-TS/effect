import { describe, it } from "@effect/vitest"
import type * as McpProtocol from "effect/unstable/ai/McpProtocol"
import type { TestLayer } from "./McpConformanceTest.ts"

export const suite = (protocol: McpProtocol.ProtocolAdapter, layer: TestLayer) =>
  it.layer(layer)(`Mcp Conformance (${protocol.protocolVersion})`, (it) => {
    describe("Utilities", () => {
      describe("Ping", () => {
        // https://modelcontextprotocol.io/specification/2025-06-18/basic/utilities/ping
        it.skip("MUST responds to a client ping with an empty result", () => {})
        it.skip("MAY can send a ping to an initialized client", () => {})
        it.skip("SCENARIO keeps ping failures isolated to the unresponsive peer", () => {})
      })

      describe("Cancellation", () => {
        // https://modelcontextprotocol.io/specification/2025-06-18/basic/utilities/cancellation
        it.skip("MUST accepts a cancellation notification for an in-flight request", () => {})
        it.skip("MUST uses the original request identifier in a cancellation notification", () => {})
        it.skip("MUST does not send a response to a cancellation notification", () => {})
        it.skip("SHOULD stops work on the cancelled request", () => {})
        it.skip("MUST does not return a successful response after cancellation", () => {})
        it.skip("MUST ignores cancellation for an unknown request identifier", () => {})
        it.skip("MUST ignores cancellation for an already completed request", () => {})
        it.skip("SCENARIO does not cancel unrelated concurrent requests", () => {})
        it.skip("MUST does not send cancellation notifications for initialize", () => {})
      })

      describe("Progress", () => {
        // https://modelcontextprotocol.io/specification/2025-06-18/basic/utilities/progress
        it.skip("MUST accepts string progress tokens", () => {})
        it.skip("MUST accepts numeric progress tokens", () => {})
        it.skip("MUST echoes the requested token in progress notifications", () => {})
        it.skip("MUST associates progress notifications with only the originating request", () => {})
        it.skip("MUST does not emit progress when the request omitted a progress token", () => {})
        it.skip("MUST reports non-decreasing progress values", () => {})
        it.skip("SCHEMA preserves the optional total and message", () => {})
        it.skip("MUST does not reuse an active progress token for another request", () => {})
      })
    })
  })
