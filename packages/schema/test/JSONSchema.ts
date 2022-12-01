import { pipe } from "@fp-ts/data/Function"
import * as O from "@fp-ts/data/Option"
import type { AST } from "@fp-ts/schema/AST"
import * as boolean_ from "@fp-ts/schema/data/_boolean"
import * as number_ from "@fp-ts/schema/data/_number"
import * as string_ from "@fp-ts/schema/data/_string"
import type { Provider } from "@fp-ts/schema/Provider"
import { empty, findHandler, Semigroup } from "@fp-ts/schema/Provider"
import type { Schema } from "@fp-ts/schema/Schema"
import * as S from "@fp-ts/schema/Schema"
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

const JSONSchemaId: unique symbol = Symbol.for(
  "@fp-ts/schema/interpreter/JSONSchemaInterpreter"
)

type JSONSchemaId = typeof JSONSchemaId

const provideJsonSchemaFor = (
  provider: Provider
) =>
  <A>(schema: Schema<A>): JSONSchema => {
    const go = (ast: AST): JSONSchema => {
      switch (ast._tag) {
        case "Declaration": {
          const handler = pipe(
            ast.provider,
            Semigroup.combine(provider),
            findHandler(JSONSchemaId, ast.id)
          )
          if (O.isSome(handler)) {
            return O.isSome(ast.config) ?
              handler.value(ast.config.value)(...ast.nodes.map(go)) :
              handler.value(...ast.nodes.map(go))
          }
          if (ast.id === string_.id) {
            return { type: "string" }
          }
          if (ast.id === number_.id) {
            return { type: "number" }
          }
          if (ast.id === boolean_.id) {
            return { type: "boolean" }
          }
          throw new Error(
            `Missing support for JSONSchema interpreter, data type ${String(ast.id.description)}`
          )
        }
      }
      throw new Error(`Unhandled ${ast._tag}`)
    }

    return go(schema.ast)
  }

const jsonSchemaFor: <A>(schema: Schema<A>) => JSONSchema = provideJsonSchemaFor(empty)

describe("jsonSchemaFor", () => {
  it("string", () => {
    const schema = S.string
    const validate = new Ajv().compile(jsonSchemaFor(schema))
    expect(validate("a")).toEqual(true)
    expect(validate(1)).toEqual(false)
  })

  it("boolean", () => {
    const schema = S.boolean
    const validate = new Ajv().compile(jsonSchemaFor(schema))
    expect(validate(true)).toEqual(true)
    expect(validate(false)).toEqual(true)
    expect(validate(1)).toEqual(false)
  })

  it.skip("minLength", () => {
    const schema = pipe(S.string, S.minLength(1))
    const jsonSchema = jsonSchemaFor(schema)
    expect(jsonSchema).toEqual({ type: "string", minLength: 1 })
  })

  it.skip("maxLength", () => {
    const schema = pipe(S.string, S.maxLength(1))
    const validate = new Ajv().compile(jsonSchemaFor(schema))
    expect(validate("")).toEqual(true)
    expect(validate("a")).toEqual(true)

    expect(validate("aa")).toEqual(false)
  })

  it.skip("min", () => {
    const schema = pipe(S.number, S.min(1))
    const validate = new Ajv().compile(jsonSchemaFor(schema))
    expect(validate(1)).toEqual(true)
    expect(validate(2)).toEqual(true)

    expect(validate(0)).toEqual(false)
  })

  it.skip("max", () => {
    const schema = pipe(S.number, S.max(1))
    const validate = new Ajv().compile(jsonSchemaFor(schema))
    expect(validate(0)).toEqual(true)
    expect(validate(1)).toEqual(true)

    expect(validate(2)).toEqual(false)
  })
})
