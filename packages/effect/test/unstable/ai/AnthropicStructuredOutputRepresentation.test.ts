import { assert, describe, it } from "@effect/vitest"
import { Schema } from "effect"
import { toCodecAnthropic } from "effect/unstable/ai/AnthropicStructuredOutput"

describe("AnthropicStructuredOutput representation v2", () => {
  it("projects the encoded side before JSON Schema generation", () => {
    assert.strictEqual(toCodecAnthropic(Schema.FiniteFromString).jsonSchema.type, "string")
  })

  it("uses custom JSON Schema compiler annotations", () => {
    const schema = Schema.String.check(Schema.makeFilter<string>((value) => value.length >= 2, {
      representation: {
        id: "test/ai/anthropic/minTwoCharacters",
        payload: null
      },
      toJsonSchema: () => ({ minLength: 2 })
    }))

    assert.deepStrictEqual(toCodecAnthropic(schema).jsonSchema, {
      type: "string",
      allOf: [{ minLength: 2 }]
    })
  })
})
