import { describe, it } from "@effect/vitest"
import type * as McpProtocol from "effect/unstable/ai/McpProtocol"
import type { TestLayer } from "./McpConformanceTest.ts"

export const suite = (protocol: McpProtocol.ProtocolAdapter, layer: TestLayer) =>
  it.layer(layer)(`Mcp Conformance (${protocol.protocolVersion})`, (it) => {
    describe("Transports", () => {
      // https://modelcontextprotocol.io/specification/2025-06-18/basic/transports
      describe("stdio", () => {
        it.skip("MUST reads UTF-8 JSON-RPC messages from stdin", () => {})
        it.skip("MUST writes UTF-8 JSON-RPC messages to stdout", () => {})
        it.skip("MUST delimits messages with newlines", () => {})
        it.skip("MUST does not emit embedded newlines inside a message", () => {})
        it.skip("MUST does not write non-MCP output to stdout", () => {})
        it.skip("MAY may write diagnostic output to stderr without corrupting the protocol stream", () => {})
        it.skip("SCENARIO processes consecutive messages independently", () => {})
        it.skip("MUST shuts down when the client closes stdin", () => {})
      })

      describe("Streamable HTTP", () => {
        describe("Sending Messages to the Server", () => {
          it.skip("MUST accepts JSON-RPC requests through POST on the MCP endpoint", () => {})
          it.skip("MUST accepts JSON-RPC notifications through POST on the MCP endpoint", () => {})
          it.skip("MUST accepts JSON-RPC responses through POST on the MCP endpoint", () => {})
          it.skip("MUST requires the application/json content type for POST requests", () => {})
          it.skip("MUST requires clients to accept application/json and text/event-stream", () => {})
          it.skip("MUST returns application/json for a single JSON-RPC response", () => {})
          it.skip("MUST returns text/event-stream when streaming multiple messages", () => {})
          it.skip("MUST returns an empty 202 response for accepted notifications and responses", () => {})
          it.skip("MUST rejects unsupported HTTP methods with method not allowed", () => {})
        })

        describe("Listening for Messages from the Server", () => {
          it.skip("MAY allows a client to open an SSE stream with GET", () => {})
          it.skip("MUST returns method not allowed for GET when the server does not offer an SSE stream", () => {})
          it.skip("MUST sends only JSON-RPC requests and notifications on the SSE stream", () => {})
          it.skip("MAY allows a client to close an SSE stream without closing its session", () => {})
        })

        describe("Multiple Connections", () => {
          it.skip("MAY supports multiple simultaneous SSE streams for one session", () => {})
          it.skip("SCENARIO routes each server message to only one connected stream", () => {})
          it.skip("SCENARIO keeps messages from different sessions isolated", () => {})
        })

        describe("Resumability and Redelivery", () => {
          it.skip("MAY assigns an event identifier to resumable SSE events", () => {})
          it.skip("MAY resumes after the last received event identifier", () => {})
          it.skip("MUST does not replay messages from a different stream", () => {})
        })

        describe("Session Management", () => {
          it.skip("MUST returns an MCP session identifier during initialization", () => {})
          it.skip("MUST uses a globally unique and cryptographically secure session identifier", () => {})
          it.skip("MUST requires the session identifier on subsequent HTTP requests", () => {})
          it.skip("MUST rejects an unknown session identifier with not found", () => {})
          it.skip("MUST allows the client to terminate a session with DELETE", () => {})
          it.skip("MUST rejects requests for a terminated session", () => {})
        })

        describe("Protocol Version Header", () => {
          it.skip("MUST requires the negotiated protocol version on subsequent HTTP requests", () => {})
          it.skip("MUST accepts a protocol version supported by the negotiated session", () => {})
          it.skip("MUST rejects an unsupported protocol version with bad request", () => {})
          it.skip("MUST returns the negotiated protocol version on responses", () => {})
        })

        describe("Security", () => {
          it.skip("MUST validates the Origin header to prevent DNS rebinding attacks", () => {})
          it.skip("SHOULD binds local servers to localhost instead of all network interfaces by default", () => {})
        })
      })
    })
  })
