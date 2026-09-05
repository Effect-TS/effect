import { Effect, Schema } from "effect"
import { SchemaCompiler, SchemaJITCompiler } from "effect/unstable/schema"
import { describe, expect, it } from "tstyche"

describe("SchemaCompiler", () => {
  it("set", () => {
    const decoder = {
      is: (input, _options) => typeof input === "string",
      validate: (input, _options) => typeof input === "string" ? input : SchemaCompiler.invalid,
      decode: (input, _options) => Effect.succeed(input)
    } satisfies SchemaCompiler.CompiledDecoder

    expect(SchemaCompiler.set(Schema.String.ast, decoder)).type.toBe<void>()
  })

  it("enable", () => {
    expect(SchemaJITCompiler.enable(Schema.String.ast)).type.toBe<void>()
    expect(SchemaJITCompiler.enable).type.not.toBeCallableWith(Schema.String)
  })
})
