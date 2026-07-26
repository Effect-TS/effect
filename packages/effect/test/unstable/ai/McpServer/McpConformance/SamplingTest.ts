import { describe, it } from "@effect/vitest"
import type * as McpProtocol from "effect/unstable/ai/McpProtocol"
import type { TestLayer } from "./McpConformanceTest.ts"

export const suite = (protocol: McpProtocol.ProtocolAdapter, layer: TestLayer) =>
  it.layer(layer)(`Mcp Conformance (${protocol.protocolVersion})`, (it) => {
    describe("Sampling", () => {
      // https://modelcontextprotocol.io/specification/2025-06-18/client/sampling
      describe("Capabilities", () => {
        it.skip("MUST sends sampling requests only when the client advertises sampling", () => {})
        it.skip("MUST does not send sampling requests when the client omits the sampling capability", () => {})
      })

      describe("Creating Messages", () => {
        it.skip("MUST sends the requested message history in order", () => {})
        it.skip("SCHEMA preserves the system prompt and model preferences", () => {})
        it.skip("SCHEMA preserves maximum tokens, stop sequences, metadata, and context inclusion", () => {})
        it.skip("MUST accepts text sampling content", () => {})
        it.skip("MUST accepts image sampling content", () => {})
        it.skip("MUST accepts audio sampling content", () => {})
        it.skip("MUST decodes the selected model, role, content, and stop reason", () => {})
        it.skip("MUST surfaces sampling errors returned by the client", () => {})
      })
    })
  })
