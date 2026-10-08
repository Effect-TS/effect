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
