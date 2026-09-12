import { Schema, SchemaAST } from "effect"
import * as SchemaAOTCompiler from "effect/unstable/schema/SchemaAOTCompiler"
import { describe, expect, it } from "tstyche"

describe("SchemaAOTCompiler", () => {
  it("compiles ASTs to module source", () => {
    expect(SchemaAOTCompiler.compile([Schema.String.ast])).type.toBe<string>()
    expect(SchemaAOTCompiler.compile).type.toBeCallableWith([SchemaAST.string, SchemaAST.number] as const)
    expect(SchemaAOTCompiler.compile).type.toBeCallableWith([])
    expect(SchemaAOTCompiler.compile).type.not.toBeCallableWith(SchemaAST.string)
    expect(SchemaAOTCompiler.compile).type.not.toBeCallableWith(Schema.String)
    expect(SchemaAOTCompiler.compile).type.not.toBeCallableWith([Schema.String])
  })
})
