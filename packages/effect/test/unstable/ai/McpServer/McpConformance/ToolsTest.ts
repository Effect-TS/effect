import { describe, it } from "@effect/vitest"
import type * as McpProtocol from "effect/unstable/ai/McpProtocol"
import type { TestLayer } from "./McpConformanceTest.ts"

export const suite = (protocol: McpProtocol.ProtocolAdapter, layer: TestLayer) =>
  it.layer(layer)(`Mcp Conformance (${protocol.protocolVersion})`, (it) => {
    describe("Tools", () => {
      // https://modelcontextprotocol.io/specification/2025-06-18/server/tools
      describe("Capabilities", () => {
        it.skip("MUST advertises the tools capability when tools are registered", () => {})
        it.skip("MUST does not advertise the tools capability when no tools are registered", () => {})
        it.skip("MUST advertises listChanged only when tool list change notifications are supported", () => {})
      })

      describe("Listing Tools", () => {
        it.skip("MUST lists every tool visible to the initialized client", () => {})
        it.skip("MUST returns an empty list when no tools are registered", () => {})
        it.skip("SCHEMA preserves tool names, titles, descriptions, annotations, and metadata", () => {})
        it.skip("MUST returns each tool input schema", () => {})
        it.skip("MUST returns each declared tool output schema", () => {})
      })

      describe("Calling Tools", () => {
        it.skip("MUST calls a registered tool with valid arguments", () => {})
        it.skip("MUST rejects an unknown tool name", () => {})
        it.skip("MUST rejects arguments that do not match the input schema", () => {})
        it.skip("MUST does not invoke a tool handler when argument validation fails", () => {})
        it.skip("SCHEMA returns text content", () => {})
        it.skip("SCHEMA returns image content", () => {})
        it.skip("SCHEMA returns audio content", () => {})
        it.skip("SCHEMA returns resource links", () => {})
        it.skip("SCHEMA returns embedded resources", () => {})
        it.skip("MUST returns multiple content items in order", () => {})
        it.skip("SCHEMA returns structured content", () => {})
        it.skip("SCHEMA validates structured content against the output schema", () => {})
        it.skip("MUST returns tool execution failures with isError", () => {})
        it.skip("MUST keeps tool execution errors distinct from protocol errors", () => {})
        it.skip("SHOULD does not expose defects or internal error details", () => {})
      })

      describe("List Changed Notification", () => {
        it.skip("SHOULD sends a tool list changed notification when the advertised list changes", () => {})
        it.skip("SHOULD does not send tool list changed notifications when listChanged is not advertised", () => {})
      })
    })
  })
