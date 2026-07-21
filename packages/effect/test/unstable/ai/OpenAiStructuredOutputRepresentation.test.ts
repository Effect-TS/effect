import { assert, describe, it } from "@effect/vitest"
import { Schema } from "effect"
import { toCodecOpenAI } from "effect/unstable/ai/OpenAiStructuredOutput"

describe("OpenAiStructuredOutput representation v2", () => {
  it("projects the encoded side before JSON Schema generation", () => {
    assert.strictEqual(toCodecOpenAI(Schema.FiniteFromString).jsonSchema.type, "string")
  })

  it("keeps supported custom JSON Schema filters with a description", () => {
    const schema = Schema.String.check(Schema.makeFilter<string>((value) => value.startsWith("a"), {
      description: "starts with a",
      representation: {
        id: "test/ai/openai/startsWithA",
        payload: null
      },
      toJsonSchema: () => ({ pattern: "^a" })
    }))

    assert.deepStrictEqual(toCodecOpenAI(schema).jsonSchema, {
      type: "string",
      description: "starts with a",
      pattern: "^a"
    })
  })

  it("drops unsupported custom JSON Schema filters with a description", () => {
    const schema = Schema.String.check(Schema.makeFilter<string>((value) => value.length >= 2, {
      description: "at least two characters",
      representation: {
        id: "test/ai/openai/minTwoCharactersWithDescription",
        payload: null
      },
      toJsonSchema: () => ({ minLength: 2 })
    }))

    assert.deepStrictEqual(toCodecOpenAI(schema).jsonSchema, {
      type: "string",
      description: "at least two characters"
    })
  })

  it("keeps supported custom JSON Schema filters without a description", () => {
    const schema = Schema.String.check(Schema.makeFilter<string>((value) => value.startsWith("a"), {
      representation: {
        id: "test/ai/openai/startsWithAWithoutDescription",
        payload: null
      },
      toJsonSchema: () => ({ pattern: "^a" })
    }))

    assert.deepStrictEqual(toCodecOpenAI(schema).jsonSchema, {
      type: "string",
      pattern: "^a"
    })
  })

  it.todo("drops unsupported custom JSON Schema filters without a description", () => {
    const schema = Schema.String.check(Schema.makeFilter<string>((value) => value.length >= 2, {
      representation: {
        id: "test/ai/openai/minTwoCharactersWithoutDescription",
        payload: null
      },
      toJsonSchema: () => ({ minLength: 2 })
    }))

    assert.deepStrictEqual(toCodecOpenAI(schema).jsonSchema, {
      type: "string"
    })
  })
})
