import { pipe } from "@fp-ts/data/Function"
import * as O from "@fp-ts/data/Option"
import { getJSONSchemaAnnotation } from "@fp-ts/schema/annotation/JSONSchemaAnnotation"
import * as A from "@fp-ts/schema/Arbitrary"
import * as AST from "@fp-ts/schema/AST"
import * as DataInt from "@fp-ts/schema/data/filter/Int"
import * as G from "@fp-ts/schema/Guard"
import { isJson } from "@fp-ts/schema/internal/common"
import type { Schema } from "@fp-ts/schema/Schema"
import * as S from "@fp-ts/schema/Schema"
import Ajv from "ajv"
import * as fc from "fast-check"

type StringJSONSchema = {
  type: "string"
  minLength?: number
  maxLength?: number
}

type NumberJSONSchema = {
  type: "number"
  exclusiveMaximum?: number
  exclusiveMinimum?: number
  maximum?: number
  minimum?: number
}

type BooleanJSONSchema = {
  type: "boolean"
}

type ArrayJSONSchema = {
  type: "array"
  items?: JSONSchema | Array<JSONSchema>
  minItems?: number
  maxItems?: number
  additionalItems?: JSONSchema
}

type EnumJSONSchema = {
  "enum": Array<string | number | boolean | null>
}

type OneOfJSONSchema = {
  "oneOf": ReadonlyArray<JSONSchema>
}

type ObjectJSONSchema = {
  type: "object"
  required: Array<string>
  properties: { [x: string]: JSONSchema }
  additionalProperties?: JSONSchema
}

type JSONSchema =
  | StringJSONSchema
  | NumberJSONSchema
  | BooleanJSONSchema
  | ArrayJSONSchema
  | EnumJSONSchema
  | OneOfJSONSchema
  | ObjectJSONSchema

const jsonSchemaFor = <A>(schema: Schema<A>): JSONSchema => {
  const go = (ast: AST.AST): JSONSchema => {
    switch (ast._tag) {
      case "TypeAliasDeclaration":
        return pipe(
          getJSONSchemaAnnotation(ast),
          O.match(
            () => go(ast.type),
            ({ schema }) => ({ ...go(ast.type), ...schema })
          )
        )
      case "LiteralType":
        return _of(ast.literal)
      case "UndefinedKeyword":
        throw new Error("cannot build JSON Schema for `undefined`")
      case "StringKeyword":
        return { type: "string" }
      case "NumberKeyword":
        return { type: "number" }
      case "BooleanKeyword":
        return { type: "boolean" }
      case "Tuple":
        return _tuple(
          ast,
          ast.elements.map((e) => go(e.type)),
          pipe(ast.rest, O.map(([head]) => go(head))) // TODO: handle tail
        )
      case "Struct": {
        const indexSignatures = ast.indexSignatures.filter((is) => is.key === "string")
        if (AST.indexSignature.length < ast.indexSignatures.length) {
          throw new Error("unsupported index signatures")
        }
        return _struct(
          ast,
          ast.fields.map((f) => go(f.value)),
          indexSignatures.map((is) => go(is.value))
        )
      }
      case "Union":
        return _union(ast.members.map(go))
      case "Refinement": {
        const annotation = getJSONSchemaAnnotation(ast)
        if (O.isSome(annotation)) {
          const { schema } = annotation.value
          return { ...go(ast.from), ...schema }
        }
        return go(ast.from)
      }
    }
    throw new Error(`Unhandled ${ast._tag}`)
  }

  return go(schema.ast)
}

export const _of = (
  value: unknown
): JSONSchema => {
  if (
    typeof value === "string" || typeof value === "number" || typeof value === "boolean" ||
    value === null
  ) {
    return { enum: [value] }
  }
  throw new Error(`Cannot encode ${value} to a JSON schema`)
}

const _tuple = (
  ast: AST.Tuple,
  elements: ReadonlyArray<JSONSchema>,
  oRest: O.Option<JSONSchema>
): JSONSchema => {
  const output: ArrayJSONSchema = { type: "array" }
  let i = 0
  // ---------------------------------------------
  // handle elements
  // ---------------------------------------------
  for (; i < elements.length; i++) {
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
      output.items.push(elements[i])
    } else if (Array.isArray(output.items)) {
      output.items.push(elements[i])
    }
  }
  // ---------------------------------------------
  // handle rest element
  // ---------------------------------------------
  if (O.isSome(oRest)) {
    if (output.items) {
      output.additionalItems = oRest.value
    } else {
      output.items = oRest.value
    }
  }

  return output
}

const _struct = (
  ast: AST.Struct,
  fields: ReadonlyArray<JSONSchema>,
  indexSignatures: ReadonlyArray<JSONSchema>
): JSONSchema => {
  const output: ObjectJSONSchema = { type: "object", required: [], properties: {} }
  // ---------------------------------------------
  // handle fields
  // ---------------------------------------------
  for (let i = 0; i < fields.length; i++) {
    const key = ast.fields[i].key
    if (typeof key === "string") {
      output.properties[key] = fields[i]
      // ---------------------------------------------
      // handle optional fields
      // ---------------------------------------------
      if (!ast.fields[i].isOptional) {
        output.required.push(key)
      }
    } else {
      throw new Error(`Cannot encode ${String(key)} to a JSON schema`)
    }
  }
  // ---------------------------------------------
  // handle index signatures
  // ---------------------------------------------
  if (indexSignatures.length > 0) {
    output.additionalProperties = { oneOf: indexSignatures }
  }

  return output
}

const _union = (
  members: Array<JSONSchema>
): JSONSchema => {
  return { "oneOf": members }
}

const property = <A>(schema: Schema<A>) => {
  const arbitrary = A.arbitraryFor(schema)
  const guard = G.guardFor(schema)
  const validate = new Ajv().compile(jsonSchemaFor(schema))
  fc.assert(fc.property(arbitrary.arbitrary(fc).filter(isJson), (a) => {
    return guard.is(a) && validate(a)
  }))
}

const assertTrue = <A>(schema: Schema<A>, input: unknown) => {
  const guard = G.guardFor(schema)
  const jsonschema = jsonSchemaFor(schema)
  const validate = new Ajv().compile(jsonschema)
  expect(guard.is(input)).toEqual(validate(input))
  expect(validate(input)).toEqual(true)
}

const assertFalse = <A>(schema: Schema<A>, input: unknown) => {
  const guard = G.guardFor(schema)
  const jsonschema = jsonSchemaFor(schema)
  const validate = new Ajv().compile(jsonschema)
  expect(guard.is(input)).toEqual(validate(input))
  expect(validate(input)).toEqual(false)
}

describe("jsonSchemaFor", () => {
  describe("string", () => {
    it("property tests", () => {
      const schema = S.string
      property(schema)
    })

    it("manual", () => {
      const schema = S.string
      assertTrue(schema, "a")
      assertFalse(schema, 1)
    })
  })

  describe("number", () => {
    it("property tests", () => {
      const schema = S.number
      property(schema)
    })

    it("manual", () => {
      const schema = S.number
      assertTrue(schema, 1)
      assertFalse(schema, "a")
    })
  })

  describe("boolean", () => {
    it("property tests", () => {
      const schema = S.boolean
      property(schema)
    })

    it("manual", () => {
      const schema = S.boolean
      assertTrue(schema, true)
      assertTrue(schema, false)
      assertFalse(schema, "a")
    })
  })

  it("literal", () => {
    const schema = S.literal(1)
    assertTrue(schema, 1)
    assertFalse(schema, "a")
  })

  it("integer", () => {
    const schema = DataInt.int(S.number)
    const jsonSchema = jsonSchemaFor(schema)
    expect(jsonSchema).toEqual({ type: "integer" })
  })

  it("union", () => {
    const schema = S.union(S.string, S.number)
    assertTrue(schema, 1)
    assertTrue(schema, "a")
    assertFalse(schema, null)
  })

  describe("array", () => {
    it("property tests", () => {
      const schema = S.array(S.number)
      property(schema)
    })

    it("manual", () => {
      const schema = S.array(S.number)
      assertTrue(schema, [])
      assertTrue(schema, [1])
      assertFalse(schema, ["a"])
    })
  })

  describe("tuple", () => {
    it("property tests", () => {
      const schema = S.tuple(S.string, S.number)
      property(schema)
    })

    it("manual", () => {
      const schema = S.tuple(S.string, S.number)
      assertTrue(schema, ["a", 1])
      assertFalse(schema, ["a"])
      assertFalse(schema, ["a", "b"])
    })
  })

  describe("struct", () => {
    it("baseline", () => {
      const schema = S.struct({ a: S.string, b: S.number })
      assertTrue(schema, { a: "a", b: 1 })
      assertFalse(schema, null)
      assertFalse(schema, { a: "a" })
      assertFalse(schema, { b: 1 })
      assertFalse(schema, { a: 1, b: 1 })
    })

    it("optional fields", () => {
      const schema = S.partial(S.struct({ a: S.string, b: S.number }))
      assertTrue(schema, {})
      assertTrue(schema, { a: "a" })
      assertTrue(schema, { b: 1 })
      assertFalse(schema, null)
      assertFalse(schema, { a: 1, b: 1 })
    })
  })

  it("record(string)", () => {
    const schema = S.record(S.string, S.string)
    assertFalse(schema, null)
    assertTrue(schema, {})
    assertTrue(schema, { a: "a" })
    assertFalse(schema, { a: 1 })
    assertTrue(schema, { a: "a", b: "b" })
    assertFalse(schema, { a: "a", b: 1 })
  })

  it("minLength", () => {
    const schema = pipe(S.string, S.minLength(1))
    const jsonSchema = jsonSchemaFor(schema)
    expect(jsonSchema).toEqual({ type: "string", minLength: 1 })
  })

  it("maxLength", () => {
    const schema = pipe(S.string, S.maxLength(1))
    const jsonSchema = jsonSchemaFor(schema)
    expect(jsonSchema).toEqual({ type: "string", maxLength: 1 })
  })

  it("min/max", () => {
    const schema = pipe(S.number, S.greaterThan(0), S.lessThanOrEqualTo(10))
    const jsonSchema = jsonSchemaFor(schema)
    expect(jsonSchema).toEqual({ type: "number", exclusiveMinimum: 0, maximum: 10 })
  })
})

type A = keyof any
