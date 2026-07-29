import * as JsonSchemaGenerator from "@effect/openapi-generator/JsonSchemaGenerator"
import { assert, describe, it } from "@effect/vitest"

describe("JsonSchemaGenerator representation", () => {
  it("emits only reachable definitions", () => {
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
export const Shared = Schema.String.annotate({ "identifier": "Shared" })
// schemas
export type Root = Shared
export const Root = Shared
`
    )
  })
})
