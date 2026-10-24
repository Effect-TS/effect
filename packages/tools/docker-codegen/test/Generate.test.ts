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
  it("turns the map-of-empty-objects idiom into a map of empty objects", () => {
    const doc = document({
      ContainerConfig: {
        type: "object",
        properties: {
          ExposedPorts: { type: "object", additionalProperties: { type: "object", enum: [{}] } }
        }
      }
    })
    const ops = Patches.emptyObjectEnums(doc)
    assert.deepStrictEqual(ops, [{
      op: "replace",
      path: "/components/schemas/ContainerConfig/properties/ExposedPorts/additionalProperties",
      value: { type: "object", additionalProperties: false }
    }])
  })

  it("drops nullable object definitions' mark, and makes their required references optional", () => {
    const doc = applyStanding(document({
      Platform: { type: "object", nullable: true, properties: { os: { type: "string" } } },
      Manifest: {
        type: "object",
        required: ["Platform", "Digest"],
        properties: { Platform: { $ref: "#/components/schemas/Platform" }, Digest: { type: "string" } }
      }
    }))
    const source = Generate.generate(doc, config)
    assert.include(source, `export const Platform = Schema.Struct({`)
    assert.include(source, `"Platform": Schema.optionalKey(Platform)`)
    assert.include(source, `"Digest": Schema.String`)
  })

  it("drops every nullable mark, and makes required fields that can be null optional unless slices or maps", () => {
    const doc = applyStanding(document({
      A: {
        type: "object",
        required: ["Required", "List", "Map"],
        properties: {
          List: { type: "array", nullable: true, items: { type: "string" } },
          Map: { type: "object", nullable: true, additionalProperties: { type: "string" } },
          Values: { type: "object", additionalProperties: { type: "integer", nullable: true } },
          Optional: { type: "string", nullable: true },
          Required: { type: "string", nullable: true }
        }
      }
    }))
    const source = Generate.generate(doc, config)
    assert.include(source, `"List": Schema.Array(Schema.String)`)
    assert.include(source, `"Map": Schema.Record(Schema.String, Schema.String)`)
    assert.include(source, `"Values": Schema.optionalKey(Schema.Record(Schema.String, Schema.Finite))`)
    assert.include(source, `"Optional": Schema.optionalKey(Schema.String)`)
    assert.include(source, `"Required": Schema.optionalKey(Schema.String)`)
    assert.notInclude(source, "Schema.Null")
  })

  it("makes string enums lenient", () => {
    const doc = document({ State: { type: "string", description: "d", enum: ["a", "b"] } })
    const patched = applyStanding(doc) as any
    assert.deepStrictEqual(patched.components.schemas.State, {
      description: "d",
      anyOf: [{ type: "string", enum: ["a", "b"] }, { $ref: "#/components/schemas/LenientString" }]
    })
  })

  it("flattens allOf compositions of objects", () => {
    const doc = document({
      Base: { type: "object", required: ["Id"], properties: { Id: { type: "string" } } },
      Derived: {
        description: "d",
        allOf: [{ $ref: "#/components/schemas/Base" }],
        properties: { Extra: { type: "string" } }
      }
    })
    const patched = applyStanding(doc) as any
    assert.deepStrictEqual(patched.components.schemas.Derived, {
      description: "d",
      type: "object",
      properties: { Id: { type: "string" }, Extra: { type: "string" } },
      required: ["Id"]
    })
  })
})

describe("Generate", () => {
  it("generates lenient enums, and slices without null", () => {
    const doc = applyStanding(document({
      Summary: {
        type: "object",
        required: ["Names"],
        properties: {
          Names: { type: "array", items: { type: "string" } },
          State: { type: "string", enum: ["created", "running"], example: "running" }
        }
      }
    }))
    const source = Generate.generate(doc, config)
    // each Schema, then its type, with the JSDoc the public API checks require
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
    assert.include(
      source,
      [
        "/**",
        " * The Engine API's `Summary` definition, as decoded.",
        " *",
        " * @stability unstable",
        " * @category models",
        " * @since 4.0.6",
        " */",
        "export type Summary = typeof Summary.Type"
      ].join("\n")
    )
    assert.include(source, `"Names": Schema.Array(Schema.String)`)
    assert.include(source, `Schema.Union([Schema.Literals(["created", "running"]), LenientString])`)
    assert.notInclude(source, "__DockerSchemaRoot")
    assert.notInclude(source, "export type LenientString")
  })
})
