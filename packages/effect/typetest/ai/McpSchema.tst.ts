import type * as McpSchema from "effect/ai/McpSchema"
import { describe, expect, it } from "tstyche"

// Boolean subschemas are valid JSON Schema; compiler acceptance is separate from runtime decoding.
// https://json-schema.org/draft/2020-12/json-schema-core#section-4.3.2
describe("McpSchema tool input schemas", () => {
  it("should accept object and boolean properties when assigning tool schemas", () => {
    expect<{
      type: "object"
      properties: { forbidden: false; anything: true; text: { type: "string" } }
    }>().type.toBeAssignableTo<McpSchema.ToolJson>()
    expect<{ type: "object"; properties: { invalid: null } }>().type.not.toBeAssignableTo<McpSchema.ToolJson>()
  })
})

// Responses have one outcome; notifications have no ID. MCP request/success IDs are non-null.
// https://www.jsonrpc.org/specification
// https://modelcontextprotocol.io/specification/2026-07-28/basic/index
describe("McpSchema JSON-RPC envelopes", () => {
  it("should require one response outcome and a success ID when assigning JSON-RPC response types", () => {
    expect<{ jsonrpc: "2.0"; id: number; result: {} }>().type.toBeAssignableTo<McpSchema.JsonRpcResponse>()
    expect<{ jsonrpc: "2.0"; id: null; error: { code: number; message: string } }>().type.toBeAssignableTo<
      McpSchema.JsonRpcResponse
    >()
    expect<{ jsonrpc: "2.0"; id: number }>().type.not.toBeAssignableTo<McpSchema.JsonRpcResponse>()
    expect<{ jsonrpc: "2.0"; id: number; result: {}; error: { code: number; message: string } }>().type.not
      .toBeAssignableTo<McpSchema.JsonRpcResponse>()
    expect<{ jsonrpc: "2.0"; id: null; result: {} }>().type.not.toBeAssignableTo<McpSchema.JsonRpcResponse>()
  })
  it("should reject request IDs when assigning a JSON-RPC notification type", () => {
    expect<{ jsonrpc: "2.0"; id: number; method: string }>().type.not.toBeAssignableTo<
      McpSchema.JsonRpcNotification
    >()
  })
})
