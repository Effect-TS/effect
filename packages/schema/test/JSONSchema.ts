import type { AST } from "@fp-ts/codec/AST"
import type { Schema } from "@fp-ts/codec/Schema"
import * as S from "@fp-ts/codec/Schema"
import type { Support } from "@fp-ts/codec/Support"
import { empty, findHandler, Semigroup } from "@fp-ts/codec/Support"
import { pipe } from "@fp-ts/data/Function"
import * as O from "@fp-ts/data/Option"
import Ajv from "ajv"

type StringJSONSchema = {
  readonly type: "string"
  minLength?: number
  maxLength?: number
}

type JSONSchema =
  | StringJSONSchema
  | {
    readonly type: "number"
    readonly exclusiveMaximum?: number
    readonly exclusiveMinimum?: number
    readonly maximum?: number
    readonly minimum?: number
  }
  | { readonly type: "boolean" }

export const JSONSchemaInterpreterId: unique symbol = Symbol.for(
  "@fp-ts/codec/interpreter/JSONSchemaInterpreter"
)

export type JSONSchemaInterpreterId = typeof JSONSchemaInterpreterId

/**
 * @since 1.0.0
 */
export interface JSONSchemaSupport {
  (...jsonSchemas: ReadonlyArray<JSONSchema>): JSONSchema
}

export const unsafeJsonSchemaFor = (
  support: Support
) =>
  <A>(schema: Schema<A>): JSONSchema => {
    const go = (ast: AST): JSONSchema => {
      switch (ast._tag) {
        case "Declaration": {
          const merge = Semigroup.combine(support)(ast.support)
          const handler: O.Option<JSONSchemaSupport> = findHandler(
            merge,
            JSONSchemaInterpreterId,
            ast.id
          )
          if (O.isSome(handler)) {
            return handler.value(...ast.nodes.map(go))
          }
          throw new Error(
            `Missing support for JSONSchema interpreter, data type ${String(ast.id.description)}`
          )
        }
        case "String":
          return {
            type: "string",
            minLength: ast.minLength,
            maxLength: ast.maxLength
          }
        case "Number":
          return {
            type: "number",
            minimum: ast.minimum,
            maximum: ast.maximum,
            exclusiveMinimum: ast.exclusiveMinimum,
            exclusiveMaximum: ast.exclusiveMaximum
          }
        case "Boolean":
          return { type: "boolean" }
      }
      throw new Error(`Unhandled ${ast._tag}`)
    }

    return go(schema.ast)
  }

describe("unsafeJsonSchemaFor", () => {
  const unsafeJsonSchemaFor_ = unsafeJsonSchemaFor(empty)

  it("string", () => {
    const schema = S.string
    const validate = new Ajv().compile(unsafeJsonSchemaFor_(schema))
    expect(validate("a")).toEqual(true)
    expect(validate(1)).toEqual(false)
  })

  it("boolean", () => {
    const schema = S.boolean
    const validate = new Ajv().compile(unsafeJsonSchemaFor_(schema))
    expect(validate(true)).toEqual(true)
    expect(validate(false)).toEqual(true)
    expect(validate(1)).toEqual(false)
  })

  it("minLength", () => {
    const schema = pipe(S.string, S.minLength(1))
    const jsonSchema = unsafeJsonSchemaFor_(schema)
    expect(jsonSchema).toEqual({ type: "string", minLength: 1 })
  })

  it("maxLength", () => {
    const schema = pipe(S.string, S.maxLength(1))
    const validate = new Ajv().compile(unsafeJsonSchemaFor_(schema))
    expect(validate("")).toEqual(true)
    expect(validate("a")).toEqual(true)

    expect(validate("aa")).toEqual(false)
  })

  it("minimum", () => {
    const schema = pipe(S.number, S.minimum(1))
    const validate = new Ajv().compile(unsafeJsonSchemaFor_(schema))
    expect(validate(1)).toEqual(true)
    expect(validate(2)).toEqual(true)

    expect(validate(0)).toEqual(false)
  })

  it("maximum", () => {
    const schema = pipe(S.number, S.maximum(1))
    const validate = new Ajv().compile(unsafeJsonSchemaFor_(schema))
    expect(validate(0)).toEqual(true)
    expect(validate(1)).toEqual(true)

    expect(validate(2)).toEqual(false)
  })
})
