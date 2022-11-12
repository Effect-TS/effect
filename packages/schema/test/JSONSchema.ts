import type { Meta } from "@fp-ts/codec/Meta"
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

export const jsonSchemaFor = <A>(schema: Schema<A>): JSONSchema => {
  const f = (meta: Meta): JSONSchema => {
    switch (meta._tag) {
      case "String": {
        return {
          type: "string",
          minLength: meta.minLength,
          maxLength: meta.maxLength
        }
      }
      case "Number":
        return {
          type: "number",
          minimum: meta.minimum,
          maximum: meta.maximum,
          exclusiveMinimum: meta.exclusiveMinimum,
          exclusiveMaximum: meta.exclusiveMaximum
        }
      case "Boolean":
        return { type: "boolean" }
    }
    throw new Error(`Unhandled ${meta._tag}`)
  }
  return f(schema)
}

describe("jsonSchemaFor", () => {
  it("string", () => {
    const schema = S.string
    const validate = new Ajv().compile(jsonSchemaFor(schema))
    expect(validate("a")).toEqual(true)
    expect(validate(1)).toEqual(false)
  })

  it("minLength", () => {
    const schema = pipe(S.string, S.minLength(1))
    const validate = new Ajv().compile(jsonSchemaFor(schema))
    expect(validate("a")).toEqual(true)
    expect(validate("aa")).toEqual(true)

    expect(validate("")).toEqual(false)
  })

  it("maxLength", () => {
    const schema = pipe(S.string, S.maxLength(1))
    const validate = new Ajv().compile(jsonSchemaFor(schema))
    expect(validate("")).toEqual(true)
    expect(validate("a")).toEqual(true)

    expect(validate("aa")).toEqual(false)
  })

  it("minimum", () => {
    const schema = pipe(S.number, S.minimum(1))
    const validate = new Ajv().compile(jsonSchemaFor(schema))
    expect(validate(1)).toEqual(true)
    expect(validate(2)).toEqual(true)

    expect(validate(0)).toEqual(false)
  })

  it("maximum", () => {
    const schema = pipe(S.number, S.maximum(1))
    const validate = new Ajv().compile(jsonSchemaFor(schema))
    expect(validate(0)).toEqual(true)
    expect(validate(1)).toEqual(true)

    expect(validate(2)).toEqual(false)
  })
})
