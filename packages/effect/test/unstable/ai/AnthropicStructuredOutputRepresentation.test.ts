import { assert, describe, it } from "@effect/vitest"
import { Schema } from "effect"
import { toCodecAnthropic } from "effect/unstable/ai/AnthropicStructuredOutput"

describe("AnthropicStructuredOutput representation v2", () => {
  it("projects the encoded side before JSON Schema generation", () => {
    assert.strictEqual(toCodecAnthropic(Schema.FiniteFromString).jsonSchema.type, "string")
  })

  it("keeps supported custom JSON Schema filters with a description", () => {
    const schema = Schema.String.check(Schema.makeFilter<string>((value) => value.startsWith("a"), {
      description: "starts with a",
      representation: {
        id: "test/ai/anthropic/startsWithA",
        payload: null
      },
      toJsonSchema: () => ({ pattern: "^a" })
    }))

    assert.deepStrictEqual(toCodecAnthropic(schema).jsonSchema, {
      type: "string",
      description: "starts with a",
      allOf: [{ pattern: "^a" }]
    })
  })

  it("drops unsupported custom JSON Schema filters with a description", () => {
    const schema = Schema.String.check(Schema.makeFilter<string>((value) => value.length >= 2, {
      description: "at least two characters",
      representation: {
        id: "test/ai/anthropic/minTwoCharactersWithDescription",
        payload: null
      },
      toJsonSchema: () => ({ minLength: 2 })
    }))

    assert.deepStrictEqual(toCodecAnthropic(schema).jsonSchema, {
      type: "string",
      description: "at least two characters"
    })
  })

  it("keeps supported custom JSON Schema filters without a description", () => {
    const schema = Schema.String.check(Schema.makeFilter<string>((value) => value.startsWith("a"), {
      representation: {
        id: "test/ai/anthropic/startsWithAWithoutDescription",
        payload: null
      },
      toJsonSchema: () => ({ pattern: "^a" })
    }))

    assert.deepStrictEqual(toCodecAnthropic(schema).jsonSchema, {
      type: "string",
      allOf: [{ pattern: "^a" }]
    })
  })

  it.todo("drops unsupported custom JSON Schema filters without a description", () => {
    const schema = Schema.String.check(Schema.makeFilter<string>((value) => value.length >= 2, {
      representation: {
        id: "test/ai/anthropic/minTwoCharactersWithoutDescription",
        payload: null
      },
      toJsonSchema: () => ({ minLength: 2 })
    }))

    assert.deepStrictEqual(toCodecAnthropic(schema).jsonSchema, {
      type: "string"
    })
  })
})
