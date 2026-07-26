import { describe, it } from "@effect/vitest"
import type * as McpProtocol from "effect/unstable/ai/McpProtocol"
import type { TestLayer } from "./McpConformanceTest.ts"

export const suite = (protocol: McpProtocol.ProtocolAdapter, layer: TestLayer) =>
  it.layer(layer)(`Mcp Conformance (${protocol.protocolVersion})`, (it) => {
    describe("Pagination", () => {
      // https://modelcontextprotocol.io/specification/2025-06-18/server/utilities/pagination
      describe("Pagination Model", () => {
        it.skip("MUST treats cursors as opaque strings", () => {})
        it.skip("MUST starts from the first page when the request omits a cursor", () => {})
        it.skip("MUST returns a next cursor when another page is available", () => {})
        it.skip("MUST uses the next cursor to retrieve the following page", () => {})
        it.skip("MUST omits the next cursor after the final page", () => {})
        it.skip("SCENARIO does not duplicate or omit items while traversing pages", () => {})
        it.skip("MUST returns an appropriate error for an invalid cursor", () => {})
      })

      describe("Paginated Operations", () => {
        it.skip("MUST paginates tools/list", () => {})
        it.skip("MUST paginates resources/list", () => {})
        it.skip("MUST paginates resources/templates/list", () => {})
        it.skip("MUST paginates prompts/list", () => {})
      })
    })
  })
