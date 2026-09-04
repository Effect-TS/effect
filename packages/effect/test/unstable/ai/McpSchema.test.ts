import { assert, describe, it } from "@effect/vitest"
import { Schema } from "effect"
import * as McpSchema from "effect/unstable/ai/McpSchema"

describe("McpSchema", () => {
  const decodeCreateMessage = Schema.decodeUnknownSync(McpSchema.CreateMessage.payloadSchema)

  it("allows create-message metadata to be omitted", () => {
    assert.doesNotThrow(() => decodeCreateMessage({ messages: [], maxTokens: 1 }))
  })

  it("requires create-message metadata to be an object", () => {
    assert.throws(() => decodeCreateMessage({ messages: [], maxTokens: 1, metadata: "invalid" }))
  })

  // SEP-1330: https://modelcontextprotocol.io/seps/1330-elicitation-enum-schema-improvements-and-standards
  // Conformance: elicitation-sep1330-enums
  it("should preserve every November elicitation enum form when decoding a form request", () => {
    const decoded = Schema.decodeUnknownSync(McpSchema.ElicitRequestFormParams)({
      mode: "form",
      message: "Choose values",
      requestedSchema: {
        type: "object",
        properties: {
          untitled: { type: "string", enum: ["one", "two"] },
          titled: { type: "string", oneOf: [{ const: "one", title: "One" }] },
          legacy: { type: "string", enum: ["one"], enumNames: ["One"] }
        }
      }
    })

    assert.deepStrictEqual(JSON.parse(JSON.stringify(decoded.requestedSchema.properties)), {
      untitled: { type: "string", enum: ["one", "two"] },
      titled: { type: "string", oneOf: [{ const: "one", title: "One" }] },
      legacy: { type: "string", enum: ["one"], enumNames: ["One"] }
    })
  })
})
