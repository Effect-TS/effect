import type { Annotations, AST } from "@fp-ts/codec/AST"
import * as S from "@fp-ts/codec/Schema"
import type { Schema } from "@fp-ts/codec/Schema"
import { pipe } from "@fp-ts/data/Function"
import Ajv from "ajv"

type JSONSchema =
  | {
    readonly type: "string"
    readonly minLength?: number
    readonly maxLength?: number
  }
  | {
    readonly type: "number"
    readonly exclusiveMaximum?: number
    readonly exclusiveMinimum?: number
    readonly maximum?: number
    readonly minimum?: number
  }
  | { readonly type: "boolean" }

export interface JSONSchemaAnnotation {
  readonly _tag: "JSONSchemaAnnotation"
  readonly jsonSchemaFor: (
    annotations: Annotations,
    ...jsonSchemas: ReadonlyArray<JSONSchema>
  ) => JSONSchema
}

export const isJSONSchemaAnnotation = (u: unknown): u is JSONSchemaAnnotation =>
  u !== null && typeof u === "object" && ("_tag" in u) && (u["_tag"] === "JSONSchemaAnnotation")

const go = S.memoize((ast: AST): JSONSchema => {
  switch (ast._tag) {
    case "Declaration": {
      const annotations = ast.annotations.filter(isJSONSchemaAnnotation)
      if (annotations.length > 0) {
        return annotations[0].jsonSchemaFor(ast.annotations, ...ast.nodes.map(go))
      }
      throw new Error(`Missing "JSONSchemaAnnotation" for ${ast.symbol.description}`)
    }
    case "String": {
      return {
        type: "string",
        minLength: ast.minLength,
        maxLength: ast.maxLength
      }
    }
    case "Number":
      return {
        type: "number",
        minimum: ast.minimum,
        maximum: ast.maximum,
        exclusiveMinimum: ast.exclusiveMinimum,
        exclusiveMaximum: ast.exclusiveMaximum
      }
    case "Boolean": {
      return {
        type: "boolean"
      }
    }
  }
  throw new Error(`Unhandled ${ast._tag}`)
})

export const unsafeJsonSchemaFor = S.memoize(<A>(schema: Schema<A>): JSONSchema => go(schema.ast))

describe("unsafeJsonSchemaFor", () => {
  const jsonSchemaFor_ = unsafeJsonSchemaFor

  it("string", () => {
    const schema = S.string
    const validate = new Ajv().compile(jsonSchemaFor_(schema))
    expect(validate("a")).toEqual(true)
    expect(validate(1)).toEqual(false)
  })

  it("boolean", () => {
    const schema = S.boolean
    const validate = new Ajv().compile(jsonSchemaFor_(schema))
    expect(validate(true)).toEqual(true)
    expect(validate(false)).toEqual(true)
    expect(validate(1)).toEqual(false)
  })

  it("minLength", () => {
    const schema = pipe(S.string, S.minLength(1))
    const validate = new Ajv().compile(jsonSchemaFor_(schema))
    expect(validate("a")).toEqual(true)
    expect(validate("aa")).toEqual(true)

    expect(validate("")).toEqual(false)
  })

  it("maxLength", () => {
    const schema = pipe(S.string, S.maxLength(1))
    const validate = new Ajv().compile(jsonSchemaFor_(schema))
    expect(validate("")).toEqual(true)
    expect(validate("a")).toEqual(true)

    expect(validate("aa")).toEqual(false)
  })

  it("minimum", () => {
    const schema = pipe(S.number, S.minimum(1))
    const validate = new Ajv().compile(jsonSchemaFor_(schema))
    expect(validate(1)).toEqual(true)
    expect(validate(2)).toEqual(true)

    expect(validate(0)).toEqual(false)
  })

  it("maximum", () => {
    const schema = pipe(S.number, S.maximum(1))
    const validate = new Ajv().compile(jsonSchemaFor_(schema))
    expect(validate(0)).toEqual(true)
    expect(validate(1)).toEqual(true)

    expect(validate(2)).toEqual(false)
  })
})
