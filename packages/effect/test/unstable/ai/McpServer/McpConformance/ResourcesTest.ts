import { describe, it } from "@effect/vitest"
import type * as McpProtocol from "effect/unstable/ai/McpProtocol"
import type { TestLayer } from "./McpConformanceTest.ts"

export const suite = (protocol: McpProtocol.ProtocolAdapter, layer: TestLayer) =>
  it.layer(layer)(`Mcp Conformance (${protocol.protocolVersion})`, (it) => {
    describe("Resources", () => {
      // https://modelcontextprotocol.io/specification/2025-06-18/server/resources
      describe("Capabilities", () => {
        it.skip("MUST advertises resources when resources or templates are registered", () => {})
        it.skip("MUST does not advertise resources when no resources or templates are registered", () => {})
        it.skip("MUST advertises subscribe only when resource subscriptions are supported", () => {})
        it.skip("MUST advertises listChanged only when resource list change notifications are supported", () => {})
      })

      describe("Listing Resources", () => {
        it.skip("MUST lists every resource visible to the initialized client", () => {})
        it.skip("MUST returns an empty list when no resources are registered", () => {})
        it.skip("SCHEMA preserves resource URI, name, title, description, MIME type, size, annotations, and metadata", () => {})
      })

      describe("Reading Resources", () => {
        it.skip("MUST reads text resource contents", () => {})
        it.skip("MUST reads binary resource contents as base64", () => {})
        it.skip("SCHEMA preserves the resource URI and MIME type in returned contents", () => {})
        it.skip("MUST returns multiple resource contents in order", () => {})
        it.skip("MUST returns the specified error for an unknown resource URI", () => {})
        it.skip("MUST does not return an empty contents array for a missing resource", () => {})
      })

      describe("Resource Templates", () => {
        it.skip("MUST lists every registered resource template", () => {})
        it.skip("SCHEMA preserves template URI, name, title, description, MIME type and annotations", () => {})
        it.skip("MUST matches a concrete URI against its resource template", () => {})
        it.skip("MUST decodes template parameters before invoking the handler", () => {})
        it.skip("MUST does not invoke the handler when template parameter decoding fails", () => {})
      })

      describe("List Changed Notification", () => {
        it.skip("SHOULD sends a resource list changed notification when the advertised list changes", () => {})
        it.skip("SHOULD does not send resource list changed notifications when listChanged is not advertised", () => {})
      })

      describe("Subscriptions", () => {
        it.skip("MUST subscribes to updates for a resource URI when subscriptions are advertised", () => {})
        it.skip("MUST sends resource updated notifications only for subscribed resources", () => {})
        it.skip("MUST includes the updated resource URI in each notification", () => {})
        it.skip("MUST unsubscribes from updates for a resource URI", () => {})
        it.skip("MUST does not send updates after a resource is unsubscribed", () => {})
        it.skip("MUST rejects resource subscriptions when subscribe is not advertised", () => {})
      })
    })
  })
