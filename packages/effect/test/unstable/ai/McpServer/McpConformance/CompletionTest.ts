import { describe, it } from "@effect/vitest"
import type * as McpProtocol from "effect/unstable/ai/McpProtocol"
import type { TestLayer } from "./McpConformanceTest.ts"

export const suite = (protocol: McpProtocol.ProtocolAdapter, layer: TestLayer) =>
  it.layer(layer)(`Mcp Conformance (${protocol.protocolVersion})`, (it) => {
    describe("Completion", () => {
      // https://modelcontextprotocol.io/specification/2025-06-18/server/utilities/completion
      describe("Capabilities", () => {
        it.skip("MUST advertises completions when argument completion is supported", () => {})
        it.skip("MUST does not advertise completions when argument completion is unsupported", () => {})
      })

      describe("Requesting Completions", () => {
        it.skip("MUST completes a prompt argument", () => {})
        it.skip("MUST completes a resource template argument", () => {})
        it.skip("MUST passes previously resolved argument context to the completion handler", () => {})
        it.skip("MUST rejects an unknown prompt reference", () => {})
        it.skip("MUST rejects an unknown resource template reference", () => {})
        it.skip("MUST rejects an unknown argument name", () => {})
        it.skip("MUST returns completion values in order", () => {})
        it.skip("MUST returns the total number of available completion values", () => {})
        it.skip("MUST reports when additional completion values are available", () => {})
        it.skip("MUST returns at most one hundred completion values", () => {})
      })
    })
  })
