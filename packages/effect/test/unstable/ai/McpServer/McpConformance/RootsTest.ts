import { describe, it } from "@effect/vitest"
import type * as McpProtocol from "effect/unstable/ai/McpProtocol"
import type { TestLayer } from "./McpConformanceTest.ts"

export const suite = (protocol: McpProtocol.ProtocolAdapter, layer: TestLayer) =>
  it.layer(layer)(`Mcp Conformance (${protocol.protocolVersion})`, (it) => {
    describe("Roots", () => {
      // https://modelcontextprotocol.io/specification/2025-06-18/client/roots
      describe("Capabilities", () => {
        it.skip("MUST sends roots requests only when the client advertises roots", () => {})
        it.skip("MUST does not send roots requests when the client omits the roots capability", () => {})
        it.skip("MUST observes whether the client advertises roots list changes", () => {})
      })

      describe("Listing Roots", () => {
        it.skip("MUST requests the client's roots", () => {})
        it.skip("MUST accepts roots with file URIs", () => {})
        it.skip("MAY preserves optional root names", () => {})
        it.skip("MAY accepts an empty roots list", () => {})
        it.skip("MUST surfaces client errors returned by roots/list", () => {})
      })

      describe("Root List Changes", () => {
        it.skip("SHOULD accepts roots list changed notifications from capable clients", () => {})
        it.skip("SHOULD refreshes roots after a roots list changed notification", () => {})
        it.skip("MUST does not rely on roots as an authorization boundary", () => {})
      })
    })
  })
