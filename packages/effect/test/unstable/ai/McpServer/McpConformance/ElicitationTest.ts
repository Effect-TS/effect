import { describe, it } from "@effect/vitest"
import type * as McpProtocol from "effect/unstable/ai/McpProtocol"
import type { TestLayer } from "./McpConformanceTest.ts"

export const suite = (protocol: McpProtocol.ProtocolAdapter, layer: TestLayer) =>
  it.layer(layer)(`Mcp Conformance (${protocol.protocolVersion})`, (it) => {
    describe("Elicitation", () => {
      // https://modelcontextprotocol.io/specification/2025-06-18/client/elicitation
      describe("Capabilities", () => {
        it.skip("MUST sends elicitation requests only when the client advertises elicitation", () => {})
        it.skip("MUST does not send elicitation requests when the client omits the elicitation capability", () => {})
      })

      describe("Form Mode", () => {
        it.skip("MUST sends a message and requested schema", () => {})
        it.skip("SCHEMA limits requested schemas to supported primitive form fields", () => {})
        it.skip("MUST decodes accepted content against the requested schema", () => {})
        it.skip("MUST returns a typed failure when the user declines", () => {})
        it.skip("MUST interrupts the operation when the user cancels", () => {})
        it.skip("MUST rejects accepted content that does not match the requested schema", () => {})
      })

      describe("Security", () => {
        it.skip("MUST does not request sensitive information through form mode", () => {})
      })
    })
  })
