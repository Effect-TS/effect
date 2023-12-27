/**
 * @since 1.0.0
 */

import * as Option from "effect/Option"
import * as Predicate from "effect/Predicate"
import * as ReadonlyArray from "effect/ReadonlyArray"
import * as ReadonlyRecord from "effect/ReadonlyRecord"
import * as AST from "./AST.js"
import * as Parser from "./Parser.js"
import type * as Schema from "./Schema.js"

/**
 * @category model
 * @since 1.0.0
 */
export interface JsonSchema7Any {
  $id: "/schemas/any"
}

/**
 * @category model
 * @since 1.0.0
 */
export interface JsonSchema7Unknown {
  $id: "/schemas/unknown"
}

/**
 * @category model
 * @since 1.0.0
 */
export interface JsonSchema7object {
  $id: "/schemas/object"
  oneOf: [
    { type: "object" },
    { type: "array" }
  ]
}

/**
 * @category model
 * @since 1.0.0
 */
export interface JsonSchema7empty {
  $id: "/schemas/{}"
  oneOf: [
    { type: "object" },
    { type: "array" }
  ]
}

/**
 * @category model
 * @since 1.0.0
 */
export interface JsonSchema7Ref {
  $ref: string
}

/**
 * @category model
 * @since 1.0.0
 */
export interface JsonSchema7Const {
  const: AST.LiteralValue
}

/**
 * @category model
 * @since 1.0.0
 */
export interface JsonSchema7String {
  type: "string"
  minLength?: number
  maxLength?: number
  pattern?: string
  description?: string
}

/**
 * @category model
 * @since 1.0.0
 */
export interface JsonSchema7Numeric {
  minimum?: number
  exclusiveMinimum?: number
  maximum?: number
  exclusiveMaximum?: number
}

/**
 * @category model
 * @since 1.0.0
 */
export interface JsonSchema7Number extends JsonSchema7Numeric {
  type: "number"
}

/**
 * @category model
 * @since 1.0.0
 */
export interface JsonSchema7Integer extends JsonSchema7Numeric {
  type: "integer"
}

/**
 * @category model
 * @since 1.0.0
 */
export interface JsonSchema7Boolean {
  type: "boolean"
}

/**
 * @category model
 * @since 1.0.0
 */
export interface JsonSchema7Array {
  type: "array"
  items?: JsonSchema7 | Array<JsonSchema7>
  minItems?: number
  maxItems?: number
  additionalItems?: JsonSchema7 | boolean
}

/**
 * @category model
 * @since 1.0.0
 */
export interface JsonSchema7OneOf {
  oneOf: Array<JsonSchema7>
}

/**
 * @category model
 * @since 1.0.0
 */
export interface JsonSchema7Enum {
  enum: Array<AST.LiteralValue>
}

/**
 * @category model
 * @since 1.0.0
 */
export interface JsonSchema7Enums {
  $comment: "/schemas/enums"
  oneOf: Array<{
    title: string
    const: string | number
  }>
}

/**
 * @category model
 * @since 1.0.0
 */
export interface JsonSchema7AnyOf {
  anyOf: Array<JsonSchema7>
}

/**
 * @category model
 * @since 1.0.0
 */
export interface JsonSchema7Object {
  type: "object"
  required: Array<string>
  properties: Record<string, JsonSchema7>
  additionalProperties?: boolean | JsonSchema7
  patternProperties?: Record<string, JsonSchema7>
}

/**
 * @category model
 * @since 1.0.0
 */
export type JsonSchema7 =
  | JsonSchema7Any
  | JsonSchema7Unknown
  | JsonSchema7object
  | JsonSchema7empty
  | JsonSchema7Ref
  | JsonSchema7Const
  | JsonSchema7String
  | JsonSchema7Number
  | JsonSchema7Integer
  | JsonSchema7Boolean
  | JsonSchema7Array
  | JsonSchema7OneOf
  | JsonSchema7Enum
  | JsonSchema7Enums
  | JsonSchema7AnyOf
  | JsonSchema7Object

/**
 * @category model
 * @since 1.0.0
 */
export type JsonSchema7Root = JsonSchema7 & {
  $schema?: string
  $defs?: Record<string, JsonSchema7>
}

/**
 * @category encoding
 * @since 1.0.0
 */
export const to = <I, A>(schema: Schema.Schema<I, A>): JsonSchema7Root => goRoot(AST.to(schema.ast))

/**
 * @category encoding
 * @since 1.0.0
 */
export const from = <I, A>(schema: Schema.Schema<I, A>): JsonSchema7Root =>
  goRoot(AST.from(schema.ast))

const anyJsonSchema: JsonSchema7 = { $id: "/schemas/any" }

const unknownJsonSchema: JsonSchema7 = { $id: "/schemas/unknown" }

const objectJsonSchema: JsonSchema7 = {
  "$id": "/schemas/object",
  "oneOf": [
    { "type": "object" },
    { "type": "array" }
  ]
}

const emptyJsonSchema: JsonSchema7 = {
  "$id": "/schemas/{}",
  "oneOf": [
    { "type": "object" },
    { "type": "array" }
  ]
}

const $schema = "http://json-schema.org/draft-07/schema#"

/** @internal */
export const goRoot = (ast: AST.AST): JsonSchema7Root => {
  const $defs = {}
  const jsonSchema = goWithMetaData(ast, $defs)
  const out: JsonSchema7Root = {
    $schema,
    ...jsonSchema
  }
  if (!ReadonlyRecord.isEmptyRecord($defs)) {
    out.$defs = $defs
  }
  return out
}

const goWithIdentifier = (ast: AST.AST, $defs: Record<string, JsonSchema7>): JsonSchema7 => {
  const identifier = AST.getIdentifierAnnotation(ast)
  return Option.match(identifier, {
    onNone: () => goWithMetaData(ast, $defs),
    onSome: (id) => {
      if (!ReadonlyRecord.has($defs, id)) {
        const jsonSchema = goWithMetaData(ast, $defs)
        if (!ReadonlyRecord.has($defs, id)) {
          $defs[id] = jsonSchema
        }
      }
      return { $ref: `#/$defs/${id}` }
    }
  })
}

const getMetaData = (annotated: AST.Annotated) =>
  ReadonlyRecord.getSomes({
    description: AST.getDescriptionAnnotation(annotated),
    title: AST.getTitleAnnotation(annotated),
    examples: AST.getExamplesAnnotation(annotated),
    default: AST.getDefaultAnnotation(annotated)
  })

const goWithMetaData = (ast: AST.AST, $defs: Record<string, JsonSchema7>): JsonSchema7 => {
  const jsonSchema = go(ast, $defs)
  return {
    ...jsonSchema,
    ...getMetaData(ast)
  }
}

/** @internal */
export const DEFINITION_PREFIX = "#/$defs/"

const go = (ast: AST.AST, $defs: Record<string, JsonSchema7>): JsonSchema7 => {
  switch (ast._tag) {
    case "Declaration": {
      throw new Error("cannot convert a declaration to JSON Schema")
    }
    case "Literal": {
      const literal = ast.literal
      if (literal === null) {
        return { const: null }
      } else if (Predicate.isString(literal)) {
        return { const: literal }
      } else if (Predicate.isNumber(literal)) {
        return { const: literal }
      } else if (Predicate.isBoolean(literal)) {
        return { const: literal }
      }
      throw new Error("cannot convert `bigint` to JSON Schema")
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
      return { ...unknownJsonSchema }
    case "AnyKeyword":
      return { ...anyJsonSchema }
    case "ObjectKeyword":
      return { ...objectJsonSchema }
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
      const elements = ast.elements.map((e) => goWithIdentifier(e.type, $defs))
      const rest = Option.map(
        ast.rest,
        ReadonlyArray.map((ast) => goWithIdentifier(ast, $defs))
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
        return { ...emptyJsonSchema }
      }
      let additionalProperties: JsonSchema7 | undefined = undefined
      let patternProperties: Record<string, JsonSchema7> | undefined = undefined
      for (const is of ast.indexSignatures) {
        const parameter = is.parameter
        switch (parameter._tag) {
          case "StringKeyword": {
            additionalProperties = goWithIdentifier(is.type, $defs)
            break
          }
          case "TemplateLiteral": {
            patternProperties = {
              [Parser.getTemplateLiteralRegex(parameter).source]: goWithIdentifier(
                is.type,
                $defs
              )
            }
            break
          }
          case "Refinement": {
            const annotation = AST.getJSONSchemaAnnotation(parameter)
            if (
              Option.isSome(annotation) && "pattern" in annotation.value &&
              Predicate.isString(annotation.value.pattern)
            ) {
              patternProperties = {
                [annotation.value.pattern]: goWithIdentifier(
                  is.type,
                  $defs
                )
              }
              break
            }
            throw new Error(`Unsupported index signature parameter ${parameter._tag}`)
          }
          case "SymbolKeyword":
            throw new Error(`Unsupported index signature parameter ${parameter._tag}`)
        }
      }
      const propertySignatures = ast.propertySignatures.map((ps) => {
        return { ...goWithIdentifier(ps.type, $defs), ...getMetaData(ps) }
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
    case "Union": {
      const enums: Array<AST.LiteralValue> = []
      const anyOf: Array<JsonSchema7> = []
      for (const type of ast.types) {
        const schema = goWithIdentifier(type, $defs)
        if ("const" in schema) {
          if (Object.keys(schema).length > 1) {
            anyOf.push(schema)
          } else {
            enums.push(schema.const)
          }
        } else {
          anyOf.push(schema)
        }
      }
      if (anyOf.length === 0) {
        if (enums.length === 1) {
          return { const: enums[0] }
        } else {
          return { enum: enums }
        }
      } else {
        if (enums.length === 1) {
          anyOf.push({ const: enums[0] })
        } else if (enums.length > 1) {
          anyOf.push({ enum: enums })
        }
        return { anyOf }
      }
    }
    case "Enums": {
      return {
        $comment: "/schemas/enums",
        oneOf: ast.enums.map((e) => ({ title: e[0], const: e[1] }))
      }
    }
    case "Refinement": {
      const from = goWithIdentifier(ast.from, $defs)
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
    case "Suspend": {
      const identifier = AST.getIdentifierAnnotation(ast)
      if (Option.isNone(identifier)) {
        throw new Error(
          "Generating a JSON Schema for suspended schemas requires an identifier annotation"
        )
      }
      const id = identifier.value
      if (!ReadonlyRecord.has($defs, id)) {
        $defs[id] = anyJsonSchema
        const jsonSchema = goWithIdentifier(ast.f(), $defs)
        $defs[id] = jsonSchema
      }
      return { $ref: `${DEFINITION_PREFIX}${id}` }
    }
    case "Transform":
      throw new Error("cannot build a JSON Schema for transformations")
  }
}
