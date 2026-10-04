import { assert, describe, it } from "@effect/vitest"
import { Schema } from "effect"
import * as McpSchema2024_11_05 from "effect/ai/internal/mcpSchema/v2024_11_05"
import * as McpSchema from "effect/ai/McpSchema"

describe("McpSchema", () => {
  it("should preserve custom metadata when a request is decoded and encoded", () => {
    const decode = Schema.decodeUnknownSync(McpSchema.RequestMeta)
    const encode = Schema.encodeSync(McpSchema.RequestMeta)
    for (const progress of [{}, { progressToken: "progress-1" }, { progressToken: 1 }]) {
      const request = {
        _meta: { ...progress, marker: "request", custom: { values: [null, true, 42, "value"] } }
      }
      assert.deepStrictEqual(encode(decode(request)), request)
    }
  })

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

  // SEP-973: icons on implementations, tools, prompts and resources
  it("should encode optional fields whose schema decodes to a class", () => {
    const icon = { src: "https://example.com/icon.png", mimeType: "image/png", sizes: ["48x48"] }

    const implementation = { name: "server", version: "1.0.0", icons: [icon] }
    assert.deepStrictEqual(
      Schema.encodeSync(McpSchema.Implementation)(Schema.decodeUnknownSync(McpSchema.Implementation)(implementation)),
      implementation
    )

    const tool = { name: "tool", inputSchema: { type: "object" }, icons: [icon] }
    assert.deepStrictEqual(
      Schema.encodeSync(McpSchema.Tool)(Schema.decodeUnknownSync(McpSchema.Tool)(tool)).icons,
      [icon]
    )
  })

  it("should encode a versioned optional field whose schema decodes to a class", () => {
    const Holder = Schema.Struct({ icons: McpSchema2024_11_05.optional(Schema.Array(McpSchema.Icon)) })
    const holder = { icons: [{ src: "https://example.com/icon.png" }] }
    assert.deepStrictEqual(Schema.encodeSync(Holder)(Schema.decodeUnknownSync(Holder)(holder)), holder)
  })
})
