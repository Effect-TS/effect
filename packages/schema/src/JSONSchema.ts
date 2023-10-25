/**
 * @since 1.0.0
 */

import * as AST from "@effect/schema/AST"
import * as Parser from "@effect/schema/Parser"
import type * as Schema from "@effect/schema/Schema"
import * as Option from "effect/Option"
import * as ReadonlyArray from "effect/ReadonlyArray"
import * as ReadonlyRecord from "effect/ReadonlyRecord"

interface JsonSchema7Ref {
  $ref: string
}

interface JsonSchema7Null {
  type: "null"
}

interface JsonSchema7String {
  type: "string"
  const?: string
  enum?: Array<string>
  minLength?: number
  maxLength?: number
  pattern?: string
  description?: string
}

interface JsonSchema7Number {
  type: "number" | "integer"
  const?: number
  enum?: Array<number>
  minimum?: number
  exclusiveMinimum?: number
  maximum?: number
  exclusiveMaximum?: number
}

interface JsonSchema7Boolean {
  type: "boolean"
  const?: boolean
}

interface JsonSchema7Const {
  const: string | number | boolean
}

interface JsonSchema7Array {
  type: "array"
  items?: JsonSchema7 | Array<JsonSchema7>
  minItems?: number
  maxItems?: number
  additionalItems?: JsonSchema7 | boolean
}

interface JsonSchema7Enum {
  type: ["string", "number"]
  enum: Array<string | number>
}

interface JsonSchema7AnyOf {
  anyOf: ReadonlyArray<JsonSchema7>
}

interface JsonSchema7AllOf {
  allOf: Array<JsonSchema7>
}

interface JsonSchema7Object {
  type: "object"
  required: Array<string>
  properties: Record<string, JsonSchema7>
  additionalProperties?: boolean | JsonSchema7
  patternProperties?: Record<string, JsonSchema7>
}

type JsonSchema7 =
  | JsonSchema7Ref
  | JsonSchema7Null
  | JsonSchema7String
  | JsonSchema7Number
  | JsonSchema7Boolean
  | JsonSchema7Const
  | JsonSchema7Array
  | JsonSchema7Enum
  | JsonSchema7AnyOf
  | JsonSchema7AllOf
  | JsonSchema7Object

type JsonSchema7Top = JsonSchema7 & {
  $schema?: string
  definitions?: Record<string, JsonSchema7>
}

/**
 * @category JSON Schema
 * @since 1.0.0
 */
export const to = <I, A>(schema: Schema.Schema<I, A>): JsonSchema7Top => goTop(AST.to(schema.ast))

/**
 * @category JSON Schema
 * @since 1.0.0
 */
export const from = <I, A>(schema: Schema.Schema<I, A>): JsonSchema7Top =>
  goTop(AST.from(schema.ast))

const emptyObjectJsonSchema: JsonSchema7 = {
  "anyOf": [
    {
      "type": "object",
      "properties": {},
      "required": []
    },
    { "type": "array" }
  ]
}

const anyJsonSchema: JsonSchema7 = {} as any

const $schema = "http://json-schema.org/draft-07/schema#"

/** @internal */
export const goTop = (ast: AST.AST): JsonSchema7Top => {
  const definitions = {}
  const jsonSchema = goWithMetaData(ast, definitions)
  const out: JsonSchema7Top = {
    $schema,
    ...jsonSchema
  }
  if (!ReadonlyRecord.isEmptyRecord(definitions)) {
    out.definitions = definitions
  }
  return out
}

const goWithIdentifier = (ast: AST.AST, definitions: Record<string, JsonSchema7>): JsonSchema7 => {
  const identifier = AST.getIdentifierAnnotation(ast)
  return Option.match(identifier, {
    onNone: () => goWithMetaData(ast, definitions),
    onSome: (id) => {
      if (!ReadonlyRecord.has(definitions, id)) {
        const jsonSchema = goWithMetaData(ast, definitions)
        if (!ReadonlyRecord.has(definitions, id)) {
          definitions[id] = jsonSchema
        }
      }
      return { $ref: `#/definitions/${id}` }
    }
  })
}

const getMetaData = (annotated: AST.Annotated) => {
  return ReadonlyRecord.compact<unknown>({
    description: AST.getDescriptionAnnotation(annotated),
    title: AST.getTitleAnnotation(annotated),
    examples: AST.getExamplesAnnotation(annotated)
  })
}

const goWithMetaData = (ast: AST.AST, definitions: Record<string, JsonSchema7>): JsonSchema7 => {
  const jsonSchema = go(ast, definitions)
  return {
    ...jsonSchema,
    ...getMetaData(ast)
  }
}

const go = (ast: AST.AST, definitions: Record<string, JsonSchema7>): JsonSchema7 => {
  switch (ast._tag) {
    case "Declaration": {
      const annotation = AST.getJSONSchemaAnnotation(ast)
      if (Option.isSome(annotation)) {
        return annotation.value as any
      }
      throw new Error(
        "cannot build a JSON Schema for declarations without a JSON Schema annotation"
      )
    }
    case "Literal": {
      const type = typeof ast.literal
      if (type === "bigint") {
        throw new Error("cannot convert `bigint` to JSON Schema")
      } else if (ast.literal === null) {
        return { type: "null" }
      }
      return { type, const: ast.literal } as any
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
      return anyJsonSchema
    case "ObjectKeyword":
      return emptyObjectJsonSchema
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
    case "Tuple": {
      const elements = ast.elements.map((e) => goWithIdentifier(e.type, definitions))
      const rest = Option.map(
        ast.rest,
        ReadonlyArray.map((ast) => goWithIdentifier(ast, definitions))
      )
      const output: JsonSchema7Array = { type: "array" }
      // ---------------------------------------------
      // handle elements
      // ---------------------------------------------
      const len = elements.length
      if (len > 0) {
        output.minItems = len - ast.elements.filter((element) => element.isOptional).length
        output.items = elements
      }
      // ---------------------------------------------
      // handle rest element
      // ---------------------------------------------
      if (Option.isSome(rest)) {
        const head = rest.value[0]
        if (len > 0) {
          output.additionalItems = head
        } else {
          output.items = head
        }

        // ---------------------------------------------
        // handle post rest elements
        // ---------------------------------------------
        if (rest.value.length > 1) {
          throw new Error(
            "Generating a JSON Schema for post-rest elements is not currently supported. You're welcome to contribute by submitting a Pull Request."
          )
        }
      } else {
        if (len > 0) {
          output.additionalItems = false
        } else {
          output.maxItems = 0
        }
      }

      return output
    }
    case "TypeLiteral": {
      if (ast.propertySignatures.length === 0 && ast.indexSignatures.length === 0) {
        return emptyObjectJsonSchema
      }
      let additionalProperties: JsonSchema7 | undefined = undefined
      let patternProperties: Record<string, JsonSchema7> | undefined = undefined
      for (const is of ast.indexSignatures) {
        const parameter = is.parameter
        switch (parameter._tag) {
          case "StringKeyword":
            additionalProperties = goWithIdentifier(is.type, definitions)
            break
          case "TemplateLiteral":
            patternProperties = {
              [Parser.getTemplateLiteralRegex(parameter).source]: goWithIdentifier(
                is.type,
                definitions
              )
            }
            break
          case "SymbolKeyword":
          case "Refinement":
            throw new Error(`Unsupported index signature parameter ${parameter._tag}`)
        }
      }
      const propertySignatures = ast.propertySignatures.map((ps) => {
        return { ...goWithIdentifier(ps.type, definitions), ...getMetaData(ps) }
      })
      const output: JsonSchema7Object = {
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
      if (additionalProperties !== undefined) {
        output.additionalProperties = additionalProperties
      }
      if (patternProperties !== undefined) {
        output.patternProperties = patternProperties
      }

      return output
    }
    case "Union":
      return { "anyOf": ast.types.map((ast) => goWithIdentifier(ast, definitions)) }
    case "Enums": {
      const enums: Array<any> = []
      const types = {
        string: false,
        number: false
      }
      for (const [_, value] of ast.enums) {
        if (typeof value === "string") {
          types.string = true
        } else {
          types.number = true
        }
        enums.push(value)
      }
      if (types.string && types.number) {
        return { type: ["string", "number"], enum: enums }
      } else if (types.string) {
        return { type: "string", enum: enums }
      } else {
        return { type: "number", enum: enums }
      }
    }
    case "Refinement": {
      const from = goWithIdentifier(ast.from, definitions)
      const annotation = AST.getJSONSchemaAnnotation(ast)
      if (Option.isSome(annotation)) {
        return { ...from, ...annotation.value }
      }
      throw new Error(
        "cannot build a JSON Schema for refinements without a JSON Schema annotation"
      )
    }
    case "TemplateLiteral": {
      const regex = Parser.getTemplateLiteralRegex(ast)
      return {
        type: "string",
        description: "a template literal",
        pattern: regex.source
      }
    }
    case "Lazy": {
      const identifier = AST.getIdentifierAnnotation(ast)
      if (Option.isNone(identifier)) {
        throw new Error(
          "Generating a JSON Schema for lazy schemas requires an identifier annotation"
        )
      }
      const id = identifier.value
      if (!ReadonlyRecord.has(definitions, id)) {
        definitions[id] = anyJsonSchema
        const jsonSchema = goWithIdentifier(ast.f(), definitions)
        definitions[id] = jsonSchema
      }
      return { $ref: `#/definitions/${id}` }
    }
    case "Transform":
      throw new Error("cannot build a JSON Schema for transformations")
  }
}
