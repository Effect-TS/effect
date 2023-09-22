import { pipe } from "@effect/data/Function"
import * as O from "@effect/data/Option"
import { isRecord } from "@effect/data/Predicate"
import * as RA from "@effect/data/ReadonlyArray"
import * as A from "@effect/schema/Arbitrary"
import * as AST from "@effect/schema/AST"
import * as P from "@effect/schema/Parser"
import type { Schema } from "@effect/schema/Schema"
import * as S from "@effect/schema/Schema"
import Ajv from "ajv"
import * as fc from "fast-check"

export type JsonSchema7AnyType = {}

export type JsonSchema7NullType = {
  type: "null"
}

export type JsonSchema7StringType = {
  type: "string"
  minLength?: number
  maxLength?: number
}

export type JsonSchema7NumberType = {
  type: "number" | "integer"
  minimum?: number
  exclusiveMinimum?: number
  maximum?: number
  exclusiveMaximum?: number
}

export type JsonSchema7BooleanType = {
  type: "boolean"
}

export type JsonSchema7ConstType = {
  const: string | number | boolean
}

export type JsonSchema7ArrayType = {
  type: "array"
  items?: JsonSchema7Type | Array<JsonSchema7Type>
  minItems?: number
  maxItems?: number
  additionalItems?: JsonSchema7Type
}

export type JsonSchema7EnumType = {
  "enum": Array<string | number>
}

export type JsonSchema7AnyOfType = {
  anyOf: ReadonlyArray<JsonSchema7Type>
}

export type JsonSchema7AllOfType = {
  allOf: Array<JsonSchema7Type>
}

export type JsonSchema7ObjectType = {
  type: "object"
  required: Array<string>
  properties: { [x: string]: JsonSchema7Type }
  additionalProperties: boolean | JsonSchema7Type
}

export type JsonSchema7Type =
  | JsonSchema7AnyType
  | JsonSchema7NullType
  | JsonSchema7StringType
  | JsonSchema7NumberType
  | JsonSchema7BooleanType
  | JsonSchema7ConstType
  | JsonSchema7ArrayType
  | JsonSchema7EnumType
  | JsonSchema7AnyOfType
  | JsonSchema7AllOfType
  | JsonSchema7ObjectType

type JsonArray = ReadonlyArray<Json>

type JsonObject = { readonly [key: string]: Json }

type Json =
  | null
  | boolean
  | number
  | string
  | JsonArray
  | JsonObject

const isJsonArray = (u: unknown): u is JsonArray => Array.isArray(u) && u.every(isJson)

const isJsonObject = (u: unknown): u is JsonObject =>
  isRecord(u) && Object.keys(u).every((key) => isJson(u[key]))

export const isJson = (u: unknown): u is Json =>
  u === null || typeof u === "string" || (typeof u === "number" && !isNaN(u) && isFinite(u)) ||
  typeof u === "boolean" ||
  isJsonArray(u) ||
  isJsonObject(u)

const getJSONSchemaAnnotation = AST.getAnnotation<AST.JSONSchemaAnnotation>(
  AST.JSONSchemaAnnotationId
)

const jsonSchemaFor = <A>(schema: Schema<A>): JsonSchema7Type => {
  const go = (ast: AST.AST): JsonSchema7Type => {
    switch (ast._tag) {
      case "Declaration":
        return pipe(
          getJSONSchemaAnnotation(ast),
          O.match({
            onNone: () => go(ast.type),
            onSome: (schema) => ({ ...go(ast.type), ...schema })
          })
        )
      case "Literal": {
        if (typeof ast.literal === "bigint") {
          return {} as any
        } else if (ast.literal === null) {
          return { type: "null" }
        }
        return { const: ast.literal }
      }
      case "UniqueSymbol":
        throw new Error("cannot convert a unique symbol to JSON Schema")
      case "UndefinedKeyword":
        throw new Error("cannot convert `undefined` to JSON Schema")
      case "VoidKeyword":
        throw new Error("cannot convert `void` to JSON Schema")
      case "NeverKeyword":
        throw new Error("cannot convert `never` to JSON Schema")
      case "UnknownKeyword":
      case "AnyKeyword":
        return {}
      case "StringKeyword":
        return { type: "string" }
      case "NumberKeyword":
        return { type: "number" }
      case "BooleanKeyword":
        return { type: "boolean" }
      case "BigIntKeyword":
        throw new Error("cannot convert `bigint` to JSON Schema")
      case "SymbolKeyword":
        throw new Error("cannot convert `symbol` to JSON Schema")
      case "ObjectKeyword":
        return {}
      case "Tuple": {
        const elements = ast.elements.map((e) => go(e.type))
        const rest = pipe(ast.rest, O.map(RA.mapNonEmpty(go)))
        const output: JsonSchema7ArrayType = { type: "array" }
        let i = 0
        // ---------------------------------------------
        // handle elements
        // ---------------------------------------------
        for (; i < ast.elements.length; i++) {
          if (output.minItems === undefined) {
            output.minItems = 0
          }
          if (output.maxItems === undefined) {
            output.maxItems = 0
          }
          // ---------------------------------------------
          // handle optional elements
          // ---------------------------------------------
          if (!ast.elements[i].isOptional) {
            output.minItems = output.minItems + 1
            output.maxItems = output.maxItems + 1
          }
          if (output.items === undefined) {
            output.items = []
          }
          if (Array.isArray(output.items)) {
            output.items.push(elements[i])
          }
        }
        // ---------------------------------------------
        // handle rest element
        // ---------------------------------------------
        if (O.isSome(rest)) {
          const head = RA.headNonEmpty(rest.value)
          if (output.items !== undefined) {
            delete output.maxItems
            output.additionalItems = head
          } else {
            output.items = head
          }
          // ---------------------------------------------
          // handle post rest elements
          // ---------------------------------------------
          // const tail = RA.tailNonEmpty(rest.value)
        }

        return output
      }
      case "TypeLiteral": {
        if (
          ast.indexSignatures.length <
            ast.indexSignatures.filter((is) => is.parameter._tag === "StringKeyword").length
        ) {
          throw new Error(`Cannot encode some index signature to JSON Schema`)
        }
        const propertySignatures = ast.propertySignatures.map((ps) => go(ps.type))
        const indexSignatures = ast.indexSignatures.map((is) => go(is.type))
        const output: JsonSchema7ObjectType = {
          type: "object",
          required: [],
          properties: {},
          additionalProperties: false
        }
        // ---------------------------------------------
        // handle property signatures
        // ---------------------------------------------
        for (let i = 0; i < propertySignatures.length; i++) {
          const name = ast.propertySignatures[i].name
          if (typeof name === "string") {
            output.properties[name] = propertySignatures[i]
            // ---------------------------------------------
            // handle optional property signatures
            // ---------------------------------------------
            if (!ast.propertySignatures[i].isOptional) {
              output.required.push(name)
            }
          } else {
            throw new Error(`Cannot encode ${String(name)} key to JSON Schema`)
          }
        }
        // ---------------------------------------------
        // handle index signatures
        // ---------------------------------------------
        if (indexSignatures.length > 0) {
          output.additionalProperties = { allOf: indexSignatures }
        }

        return output
      }
      case "Union":
        return { "anyOf": ast.types.map(go) }
      case "Enums":
        return { anyOf: ast.enums.map(([_, value]) => ({ const: value })) }
      case "Refinement": {
        const from = go(ast.from)
        return pipe(
          getJSONSchemaAnnotation(ast),
          O.match({
            onNone: () => from,
            onSome: (schema) => ({ ...from, ...schema })
          })
        )
      }
    }
    throw new Error(`unhandled ${ast._tag}`)
  }

  return go(schema.ast)
}

const property = <A>(schema: Schema<A>) => {
  const arbitrary = A.to(schema)
  const is = P.is(schema)
  const validate = new Ajv({ strict: false }).compile(jsonSchemaFor(schema))
  const arb = arbitrary(fc).filter(isJson)
  // console.log(fc.sample(arb, 2))
  fc.assert(fc.property(arb, (a) => {
    return is(a) && validate(a)
  }))
}

const ajv = new Ajv({ strict: false })

export const assertTrue = <A>(schema: Schema<A>, input: unknown) => {
  const is = P.is(schema)
  const jsonschema = jsonSchemaFor(schema)
  const validate = ajv.compile(jsonschema)
  expect(is(input)).toEqual(validate(input))
  expect(validate(input)).toEqual(true)
}

export const assertFalse = <A>(schema: Schema<A>, input: unknown) => {
  const is = P.is(schema)
  const jsonschema = jsonSchemaFor(schema)
  const validate = ajv.compile(jsonschema)
  expect(is(input)).toEqual(validate(input))
  expect(validate(input)).toEqual(false)
}

describe("jsonSchemaFor", () => {
  it("any", () => {
    property(S.any)
  })

  it("unknown", () => {
    property(S.unknown)
  })

  it("object", () => {
    property(S.object)
  })

  it("string", () => {
    property(S.string)
  })

  it("number", () => {
    property(S.number)
  })

  it("boolean", () => {
    property(S.boolean)
  })

  it("literal. null", () => {
    property(S.null)
  })

  it("literal. string", () => {
    property(S.literal("a"))
  })

  it("literal. number", () => {
    property(S.literal(1))
  })

  it("literal. boolean", () => {
    property(S.literal(true))
    property(S.literal(false))
  })

  it("literals", () => {
    property(S.literal(1, "a"))
  })

  it("Numeric enums", () => {
    enum Fruits {
      Apple,
      Banana
    }
    property(S.enums(Fruits))
  })

  it("String enums", () => {
    enum Fruits {
      Apple = "apple",
      Banana = "banana",
      Cantaloupe = 0
    }
    property(S.enums(Fruits))
  })

  it("Const enums", () => {
    const Fruits = {
      Apple: "apple",
      Banana: "banana",
      Cantaloupe: 3
    } as const
    property(S.enums(Fruits))
  })

  it("union", () => {
    property(S.union(S.string, S.number))
  })

  it("tuple. empty", () => {
    property(S.tuple())
  })

  it("tuple. required element", () => {
    const schema = S.tuple(S.number)
    property(schema)
  })

  it("tuple. optional element", () => {
    const schema = S.tuple().pipe(S.optionalElement(S.number))
    property(schema)
  })

  it("tuple. e + e?", () => {
    const schema = S.tuple(S.string).pipe(S.optionalElement(S.number))
    property(schema)
  })

  it("tuple. e + r", () => {
    const schema = S.tuple(S.string).pipe(S.rest(S.number))
    property(schema)
  })

  it("tuple. e? + r", () => {
    const schema = S.tuple().pipe(S.optionalElement(S.string), S.rest(S.number))
    property(schema)
  })

  it("tuple. r", () => {
    const schema = S.array(S.number)
    property(schema)
  })

  it("struct. empty", () => {
    const schema = S.struct({})
    property(schema)
  })

  it("struct", () => {
    property(S.struct({ a: S.string, b: S.number }))
  })

  it("struct. optional property signature", () => {
    property(S.struct({ a: S.string, b: S.optional(S.number) }))
  })

  it("record(string, string)", () => {
    property(S.record(S.string, S.string))
  })

  it("record('a' | 'b', number)", () => {
    const schema = S.record(S.union(S.literal("a"), S.literal("b")), S.number)
    property(schema)
  })

  it("minLength", () => {
    const schema = S.string.pipe(S.minLength(1))
    const jsonSchema = jsonSchemaFor(schema)
    expect(jsonSchema).toEqual({ type: "string", minLength: 1 })
    property(schema)
  })

  it("maxLength", () => {
    const schema = S.string.pipe(S.maxLength(1))
    const jsonSchema = jsonSchemaFor(schema)
    expect(jsonSchema).toEqual({ type: "string", maxLength: 1 })
    property(schema)
  })

  it("greaterThan", () => {
    const schema = S.number.pipe(S.greaterThan(1))
    const jsonSchema = jsonSchemaFor(schema)
    expect(jsonSchema).toEqual({ type: "number", exclusiveMinimum: 1 })
    property(schema)
  })

  it("greaterThanOrEqualTo", () => {
    const schema = S.number.pipe(S.greaterThanOrEqualTo(1))
    const jsonSchema = jsonSchemaFor(schema)
    expect(jsonSchema).toEqual({ type: "number", minimum: 1 })
    property(schema)
  })

  it("lessThan", () => {
    const schema = S.number.pipe(S.lessThan(1))
    const jsonSchema = jsonSchemaFor(schema)
    expect(jsonSchema).toEqual({ type: "number", exclusiveMaximum: 1 })
    property(schema)
  })

  it("lessThanOrEqualTo", () => {
    const schema = S.number.pipe(S.lessThanOrEqualTo(1))
    const jsonSchema = jsonSchemaFor(schema)
    expect(jsonSchema).toEqual({ type: "number", maximum: 1 })
    property(schema)
  })

  it("pattern", () => {
    const schema = S.string.pipe(S.pattern(/^abb+$/))
    const jsonSchema = jsonSchemaFor(schema)
    expect(jsonSchema).toEqual({ "pattern": "^abb+$", "type": "string" })
  })

  it("integer", () => {
    property(S.number.pipe(S.int()))
  })
})
