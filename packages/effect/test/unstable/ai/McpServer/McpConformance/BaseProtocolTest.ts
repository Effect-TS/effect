import { describe, it } from "@effect/vitest"
import type * as McpProtocol from "effect/unstable/ai/McpProtocol"
import type { TestLayer } from "./McpConformanceTest.ts"

export const suite = (protocol: McpProtocol.ProtocolAdapter, layer: TestLayer) =>
  it.layer(layer)(`Mcp Conformance (${protocol.protocolVersion})`, (it) => {
    describe("Base Protocol", () => {
      // https://modelcontextprotocol.io/specification/2025-06-18/basic
      describe("Messages", () => {
        describe("Requests", () => {
          it.skip("SCHEMA accepts JSON-RPC 2.0 requests with string identifiers", () => {})
          it.skip("SCHEMA accepts JSON-RPC 2.0 requests with numeric identifiers", () => {})
          it.skip("MUST rejects requests with an invalid JSON-RPC version", () => {})
          it.skip("MUST rejects requests without an identifier", () => {})
          it.skip("MUST returns method not found for unknown request methods", () => {})
          it.skip("MUST returns invalid params for request payloads that do not match the method schema", () => {})
        })

        describe("Responses", () => {
          it.skip("MUST returns exactly one result response for a successful request", () => {})
          it.skip("MUST returns exactly one error response for a failed request", () => {})
          it.skip("SCHEMA preserves the request identifier in result responses", () => {})
          it.skip("SCHEMA preserves the request identifier in error responses", () => {})
          it.skip("MUST does not include both result and error in a response", () => {})
        })

        describe("Notifications", () => {
          it.skip("MUST accepts notifications without an identifier", () => {})
          it.skip("MUST does not send a JSON-RPC response for a notification", () => {})
          it.skip("MUST rejects notification messages that include an identifier", () => {})
        })

        it.skip("MUST does not accept JSON-RPC batch messages", () => {})
        it.skip("MUST returns a parse error for malformed JSON", () => {})
        it.skip("MUST returns an invalid request error for malformed JSON-RPC messages", () => {})
      })

      describe("General fields", () => {
        it.skip("SCHEMA preserves additional metadata fields", () => {})
      })
    })
  })
