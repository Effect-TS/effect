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

describe("Patches", () => {
  it("turns the map-of-empty-objects idiom into a map of empty objects, and flattens allOf compositions", () => {
    const ops = Patches.emptyObjectEnums(document({
      ContainerConfig: {
        type: "object",
        properties: {
          ExposedPorts: { type: "object", additionalProperties: { type: "object", enum: [{}] } }
        }
      }
    }))
    assert.deepStrictEqual(ops, [{
      op: "replace",
      path: "/components/schemas/ContainerConfig/properties/ExposedPorts/additionalProperties",
      value: { type: "object", additionalProperties: false }
    }])
    const patched = applyStanding(document({
      Base: { type: "object", required: ["Id"], properties: { Id: { type: "string" } } },
      Derived: {
        description: "d",
        allOf: [{ $ref: "#/components/schemas/Base" }],
        properties: { Extra: { type: "string" } }
      }
    })) as any
    assert.deepStrictEqual(patched.components.schemas.Derived, {
      description: "d",
      type: "object",
      properties: { Id: { type: "string" }, Extra: { type: "string" } },
      required: ["Id"]
    })
  })

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

describe("Generate", () => {
  it("generates lenient enums, with the JSDoc the public API checks require", () => {
    const doc = applyStanding(document({
      Summary: {
        type: "object",
        properties: { State: { type: "string", enum: ["created", "running"], example: "running" } }
      }
    }))
    const source = Generate.generate(doc, config)
    // each Schema, then its type
    assert.include(
      source,
      [
        "/**",
        " * The Engine API's `Summary` definition.",
        " *",
        " * @stability unstable",
        " * @category schemas",
        " * @since 4.0.6",
        " */",
        "export const Summary = Schema.Struct({"
      ].join("\n")
    )
    assert.include(source, "export type Summary = typeof Summary.Type")
    assert.include(source, `Schema.Union([Schema.Literals(["created", "running"]), LenientString])`)
    assert.notInclude(source, "__DockerSchemaRoot")
    assert.notInclude(source, "export type LenientString")
  })
})
