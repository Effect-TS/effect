import * as JsonSchemaGenerator from "@effect/openapi-generator/JsonSchemaGenerator"
import { assert, describe, it } from "@effect/vitest"

describe("JsonSchemaGenerator representation v2", () => {
  it("keeps definitions out of roots and emits unreachable definitions", () => {
    const generator = JsonSchemaGenerator.make()
    generator.addSchema("Root", { $ref: "#/components/schemas/Shared" })

    const output = generator.generate("openapi-3.1", {
      Shared: { type: "string" },
      Unused: { type: "boolean" }
    }, false)

    assert.strictEqual(
      output,
      `// non-recursive definitions
export type Shared = string
export const Shared = Schema.String
export type Unused = boolean
export const Unused = Schema.Boolean
// schemas
export type Root = Shared
export const Root = Shared
`
    )
  })

  it("renders imports required by a shared application/json content schema", () => {
    const generator = JsonSchemaGenerator.make()
    generator.addSchema("Body", {
      type: "string",
      contentMediaType: "application/json",
      contentSchema: { $ref: "#/components/schemas/Payload" }
    })

    const output = generator.generate("openapi-3.1", {
      Payload: {
        type: "object",
        properties: { value: { type: "number" } },
        required: ["value"],
        additionalProperties: false
      }
    }, false)

    assert.isTrue(output.includes(`import * as SchemaAST from "effect/SchemaAST"`))
    assert.isTrue(output.includes(`import * as SchemaTransformation from "effect/SchemaTransformation"`))
    assert.isTrue(output.includes("SchemaTransformation.fromJsonString"))
    assert.isTrue(output.includes("SchemaAST.toEncoded(contentSchema.ast)"))
    assert.isFalse(output.includes("Payload1"))
  })
})
