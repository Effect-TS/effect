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
})
