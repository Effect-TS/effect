import { describe, it } from "@effect/vitest"
import type * as McpProtocol from "effect/unstable/ai/McpProtocol"
import type { TestLayer } from "./McpConformanceTest.ts"

export const suite = (protocol: McpProtocol.ProtocolAdapter, layer: TestLayer) =>
  it.layer(layer)(`Mcp Conformance (${protocol.protocolVersion})`, (it) => {
    describe("Prompts", () => {
      // https://modelcontextprotocol.io/specification/2025-06-18/server/prompts
      describe("Capabilities", () => {
        it.skip("MUST advertises prompts when prompts are registered", () => {})
        it.skip("MUST does not advertise prompts when no prompts are registered", () => {})
        it.skip("MUST advertises listChanged only when prompt list change notifications are supported", () => {})
      })

      describe("Listing Prompts", () => {
        it.skip("MUST lists every prompt visible to the initialized client", () => {})
        it.skip("MUST returns an empty list when no prompts are registered", () => {})
        it.skip("SCHEMA preserves prompt names, titles, descriptions, arguments, and metadata", () => {})
        it.skip("MUST marks required and optional prompt arguments correctly", () => {})
      })

      describe("Getting Prompts", () => {
        it.skip("MUST gets a registered prompt without arguments", () => {})
        it.skip("MUST gets a registered prompt with valid arguments", () => {})
        it.skip("MUST rejects an unknown prompt name", () => {})
        it.skip("MUST rejects missing required prompt arguments", () => {})
        it.skip("MUST rejects prompt arguments with invalid values", () => {})
        it.skip("MUST does not invoke the prompt handler when argument validation fails", () => {})
        it.skip("SCHEMA preserves the prompt description and message order", () => {})
        it.skip("MUST returns text message content", () => {})
        it.skip("MUST returns image message content", () => {})
        it.skip("MUST returns audio message content", () => {})
        it.skip("MUST returns embedded resource message content", () => {})
      })

      describe("List Changed Notification", () => {
        it.skip("SHOULD sends a prompt list changed notification when the advertised list changes", () => {})
        it.skip("SHOULD does not send prompt list changed notifications when listChanged is not advertised", () => {})
      })
    })
  })
