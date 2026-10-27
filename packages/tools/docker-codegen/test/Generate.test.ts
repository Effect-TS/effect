import * as Generate from "@effect/docker-codegen/Generate"
import * as Patches from "@effect/docker-codegen/Patches"
import { assert, describe, it } from "@effect/vitest"
import * as JsonPatch from "effect/JsonPatch"
import type * as Schema from "effect/Schema"

const document = (schemas: Record<string, unknown>): Patches.Node => ({
  openapi: "3.0.0",
  components: { schemas }
})

const applyStanding = (doc: Patches.Node): Patches.Node => {
  let out = doc
  for (const family of Patches.standing) {
    out = JsonPatch.apply(family.make(out), out as Schema.Json) as Patches.Node
  }
  return out
}

const config = {
  spec: "",
  apiVersion: "1.56",
  output: "",
  manifest: "",
  header: "/** @since 4.0.6 */",
  since: "4.0.6",
  patches: [],
  excludeAnnotations: ["examples", "default"]
}

describe("Generate", () => {
  it("drops every nullable mark, and makes required fields that can be null optional unless slices or maps", () => {
    const doc = applyStanding(document({
      Platform: { type: "object", nullable: true, properties: { os: { type: "string" } } },
      A: {
        type: "object",
        required: ["Required", "List", "Map", "Platform"],
        properties: {
          List: { type: "array", nullable: true, items: { type: "string" } },
          Map: { type: "object", nullable: true, additionalProperties: { type: "string" } },
          Values: { type: "object", additionalProperties: { type: "integer", nullable: true } },
          Optional: { type: "string", nullable: true },
          Required: { type: "string", nullable: true },
          Platform: { $ref: "#/components/schemas/Platform" }
        }
      }
    }))
    const source = Generate.generate(doc, config)
    assert.include(source, `export const Platform = Schema.Struct({`)
    assert.include(source, `"Platform": Schema.optionalKey(Platform)`)
    assert.include(source, `"List": Schema.Array(Schema.String)`)
    assert.include(source, `"Map": Schema.Record(Schema.String, Schema.String)`)
    assert.include(source, `"Values": Schema.optionalKey(Schema.Record(Schema.String, Schema.Finite))`)
    assert.include(source, `"Optional": Schema.optionalKey(Schema.String)`)
    assert.include(source, `"Required": Schema.optionalKey(Schema.String)`)
    assert.notInclude(source, "Schema.Null")
  })
})
