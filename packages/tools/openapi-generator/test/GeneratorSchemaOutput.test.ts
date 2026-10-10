import * as JsonSchemaGenerator from "@effect/openapi-generator/JsonSchemaGenerator"
import * as OpenApiGenerator from "@effect/openapi-generator/OpenApiGenerator"
import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import type { OpenAPISpec } from "effect/http-api/OpenApi"
import * as Schema from "effect/Schema"
import { transformSync } from "rolldown/utils"

const redundantTypeQuery = /typeof \w+\.Type/

const spec: OpenAPISpec = {
  openapi: "3.1.0",
  info: { title: "Schema output", version: "1.0.0" },
  components: {
    securitySchemes: {},
    schemas: {
      Value: { type: "object", properties: { amount: { type: "number", minimum: 0 } }, required: ["amount"] },
      Problem: { type: "object", properties: { message: { type: "string" } }, required: ["message"] }
    }
  },
  security: [],
  tags: [],
  paths: {
    "/value": {
      post: {
        operationId: "createValue",
        parameters: [],
        tags: ["Values"],
        security: [],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/Value" } } }
        },
        responses: {
          "200": {
            description: "Value",
            content: {
              "application/json": { schema: { oneOf: [{ $ref: "#/components/schemas/Value" }, { type: "string" }] } }
            }
          },
          "400": {
            description: "Problem",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Problem" } } }
          }
        }
      }
    },
    "/events": {
      get: {
        operationId: "readEvents",
        parameters: [],
        tags: ["Values"],
        security: [],
        responses: {
          "200": {
            description: "Events",
            content: { "text/event-stream": { schema: { $ref: "#/components/schemas/Value" } } }
          }
        }
      }
    }
  }
}

describe("generator schema output", () => {
  it.effect("uses response aliases without changing encoded request types", () =>
    Effect.gen(function*() {
      const generator = yield* OpenApiGenerator.OpenApiGenerator
      const source = yield* generator.generate(spec, { name: "OutputClient", format: "httpclient" })
      assert.notMatch(source, redundantTypeQuery)
      assert.include(source, "typeof CreateValueRequestJson.Encoded")
      assert.include(source, "WithOptionalResponse<CreateValue200,")
      assert.include(source, "OutputClientError<\"CreateValue400\", CreateValue400>")
      assert.include(
        source,
        `readonly "readEventsSse": () => Stream.Stream<{ readonly event: string; readonly id: string | undefined; readonly data: ReadEvents200Sse }, HttpClientError.HttpClientError | SchemaError | Sse.Retry | Sse.SseError, typeof ReadEvents200Sse.DecodingServices>`
      )
    }).pipe(Effect.provide(OpenApiGenerator.layerTransformerSchema)))

  it("emits finite numbers while retaining constraints and example objects", () => {
    const generator = JsonSchemaGenerator.make()
    generator.addSchema("Amount", { type: "number", minimum: 0, description: "Schema.Number is text" })
    generator.addSchema("BareAmount", { type: "number", minimum: 0 })
    generator.addSchema("Example", { type: "object", examples: [{ _tag: "Number", checks: [] }] })
    const source = generator.generate("openapi-3.1", {}, false)
    assert.include(source, "export const BareAmount = Schema.Finite")
    assert.include(source, `export const Amount = Schema.Number.annotate({ "description": "Schema.Number is text" })`)
    assert.include(source, "\"description\": \"Schema.Number is text\"")
    assert.include(source, "\"_tag\": \"Number\"")
    assert.include(source, "Schema.isGreaterThanOrEqualTo(0)")
    const compiled = transformSync("schemas.ts", source, { lang: "ts" })
    assert.deepStrictEqual(compiled.errors, [])
    const schemas = new Function("Schema", `${compiled.code.replaceAll("export ", "")}; return [Amount, BareAmount];`)(
      Schema
    ) as ReadonlyArray<Schema.Codec<number>>
    for (const schema of schemas) {
      const isAmount = Schema.is(schema)
      assert.isTrue(isAmount(0))
      assert.isTrue(isAmount(Number.MAX_VALUE))
      for (const value of [NaN, Infinity, -Infinity, -1]) assert.isFalse(isAmount(value))
    }
  })
})
