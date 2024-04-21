/**
 * @since 1.0.0
 */

import * as Option from "effect/Option"
import * as Predicate from "effect/Predicate"
import * as Record from "effect/Record"
import * as AST from "./AST.js"
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
export const make = <A, I, R>(schema: Schema.Schema<A, I, R>): JsonSchema7Root => {
  const $defs: Record<string, any> = {}
  const jsonSchema = go(schema.ast, $defs)
  const out: JsonSchema7Root = {
    $schema,
    ...jsonSchema
  }
  // clean up self-referencing entries
  for (const id in $defs) {
    if ($defs[id]["$ref"] === get$ref(id)) {
      delete $defs[id]
    }
  }
  if (!Record.isEmptyRecord($defs)) {
    out.$defs = $defs
  }
  return out
}

const anyJsonSchema: JsonSchema7 = { $id: "/schemas/any" }

const unknownJsonSchema: JsonSchema7 = { $id: "/schemas/unknown" }

const objectJsonSchema: JsonSchema7 = {
  "$id": "/schemas/object",
  "oneOf": [
    { "type": "object" },
    { "type": "array" }
  ]
}

const empty = (): JsonSchema7 => ({
  "$id": "/schemas/{}",
  "oneOf": [
    { "type": "object" },
    { "type": "array" }
  ]
})

const $schema = "http://json-schema.org/draft-07/schema#"

const getMeta = (annotated: AST.Annotated) =>
  Record.getSomes({
    description: AST.getDescriptionAnnotation(annotated),
    title: AST.getTitleAnnotation(annotated),
    examples: AST.getExamplesAnnotation(annotated),
    default: AST.getDefaultAnnotation(annotated)
  })

const pruneUndefinedKeyword = (ps: AST.PropertySignature): AST.AST => {
  const type = ps.type
  if (ps.isOptional && AST.isUnion(type) && Option.isNone(AST.getJSONSchemaAnnotation(type))) {
    return AST.Union.make(type.types.filter((type) => !AST.isUndefinedKeyword(type)), type.annotations)
  }
  return type
}

const getMissingAnnotationError = (name: string) => {
  const out = new Error(`cannot build a JSON Schema for ${name} without a JSON Schema annotation`)
  out.name = "MissingAnnotation"
  return out
}

const getUnsupportedIndexSignatureParameterErrorMessage = (parameter: AST.AST): string =>
  `Unsupported index signature parameter (${parameter})`

/** @internal */
export const DEFINITION_PREFIX = "#/$defs/"

const get$ref = (id: string): string => `${DEFINITION_PREFIX}${id}`

const go = (ast: AST.AST, $defs: Record<string, JsonSchema7>, handleIdentifier: boolean = true): JsonSchema7 => {
  const hook = AST.getJSONSchemaAnnotation(ast)
  if (Option.isSome(hook)) {
    const handler = hook.value as JsonSchema7
    switch (ast._tag) {
      case "Refinement":
        try {
          return { ...go(ast.from, $defs), ...getMeta(ast), ...handler }
        } catch (e) {
          if (e instanceof Error && e.name === "MissingAnnotation") {
            return { ...getMeta(ast), ...handler }
          }
          throw e
        }
    }
    return handler
  }
  const surrogate = AST.getSurrogateAnnotation(ast)
  if (Option.isSome(surrogate)) {
    return go(surrogate.value, $defs, handleIdentifier)
  }
  if (handleIdentifier) {
    const identifier = AST.getJSONIdentifier(ast)
    if (Option.isSome(identifier)) {
      const id = identifier.value
      const out = { $ref: get$ref(id) }
      if (!Record.has($defs, id)) {
        $defs[id] = out
        $defs[id] = go(ast, $defs, false)
      }
      return out
    }
  }
  switch (ast._tag) {
    case "Declaration":
      throw getMissingAnnotationError("a declaration")
    case "Literal": {
      const literal = ast.literal
      if (literal === null) {
        return { const: null, ...getMeta(ast) }
      } else if (Predicate.isString(literal)) {
        return { const: literal, ...getMeta(ast) }
      } else if (Predicate.isNumber(literal)) {
        return { const: literal, ...getMeta(ast) }
      } else if (Predicate.isBoolean(literal)) {
        return { const: literal, ...getMeta(ast) }
      }
      throw getMissingAnnotationError("a bigint literal")
    }
    case "UniqueSymbol":
      throw getMissingAnnotationError("a unique symbol")
    case "UndefinedKeyword":
      throw getMissingAnnotationError("`undefined`")
    case "VoidKeyword":
      throw getMissingAnnotationError("`void`")
    case "NeverKeyword":
      throw getMissingAnnotationError("`never`")
    case "UnknownKeyword":
      return { ...unknownJsonSchema, ...getMeta(ast) }
    case "AnyKeyword":
      return { ...anyJsonSchema, ...getMeta(ast) }
    case "ObjectKeyword":
      return { ...objectJsonSchema, ...getMeta(ast) }
    case "StringKeyword":
      return { type: "string", ...getMeta(ast) }
    case "NumberKeyword":
      return { type: "number", ...getMeta(ast) }
    case "BooleanKeyword":
      return { type: "boolean", ...getMeta(ast) }
    case "BigIntKeyword":
      throw getMissingAnnotationError("`bigint`")
    case "SymbolKeyword":
      throw getMissingAnnotationError("`symbol`")
    case "TupleType": {
      const elements = ast.elements.map((e) => go(e.type, $defs))
      const rest = ast.rest.map((ast) => go(ast, $defs))
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
      if (rest.length > 0) {
        const head = rest[0]
        if (len > 0) {
          output.additionalItems = head
        } else {
          output.items = head
        }

        // ---------------------------------------------
        // handle post rest elements
        // ---------------------------------------------
        if (rest.length > 1) {
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

      return { ...output, ...getMeta(ast) }
    }
    case "TypeLiteral": {
      if (ast.propertySignatures.length === 0 && ast.indexSignatures.length === 0) {
        return { ...empty(), ...getMeta(ast) }
      }
      let additionalProperties: JsonSchema7 | undefined = undefined
      let patternProperties: Record<string, JsonSchema7> | undefined = undefined
      for (const is of ast.indexSignatures) {
        const parameter = is.parameter
        switch (parameter._tag) {
          case "StringKeyword": {
            additionalProperties = go(is.type, $defs)
            break
          }
          case "TemplateLiteral": {
            patternProperties = {
              [AST.getTemplateLiteralRegExp(parameter).source]: go(
                is.type,
                $defs
              )
            }
            break
          }
          case "Refinement": {
            const hook = AST.getJSONSchemaAnnotation(parameter)
            if (
              Option.isSome(hook) && "pattern" in hook.value &&
              Predicate.isString(hook.value.pattern)
            ) {
              patternProperties = {
                [hook.value.pattern]: go(
                  is.type,
                  $defs
                )
              }
              break
            }
            throw new Error(getUnsupportedIndexSignatureParameterErrorMessage(parameter))
          }
          case "SymbolKeyword":
            throw new Error(getUnsupportedIndexSignatureParameterErrorMessage(parameter))
        }
      }
      const propertySignatures = ast.propertySignatures.map((ps) => {
        return { ...go(pruneUndefinedKeyword(ps), $defs), ...getMeta(ps) }
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
        if (Predicate.isString(name)) {
          output.properties[name] = propertySignatures[i]
          // ---------------------------------------------
          // handle optional property signatures
          // ---------------------------------------------
          if (!ast.propertySignatures[i].isOptional) {
            output.required.push(name)
          }
        } else {
          throw new Error(`cannot encode ${String(name)} key to JSON Schema`)
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

      return { ...output, ...getMeta(ast) }
    }
    case "Union": {
      const enums: Array<AST.LiteralValue> = []
      const anyOf: Array<JsonSchema7> = []
      for (const type of ast.types) {
        const schema = go(type, $defs)
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
          return { const: enums[0], ...getMeta(ast) }
        } else {
          return { enum: enums, ...getMeta(ast) }
        }
      } else {
        if (enums.length === 1) {
          anyOf.push({ const: enums[0] })
        } else if (enums.length > 1) {
          anyOf.push({ enum: enums })
        }
        return { anyOf, ...getMeta(ast) }
      }
    }
    case "Enums": {
      return {
        $comment: "/schemas/enums",
        oneOf: ast.enums.map((e) => ({ title: e[0], const: e[1] })),
        ...getMeta(ast)
      }
    }
    case "Refinement": {
      throw new Error("cannot build a JSON Schema for a refinement without a JSON Schema annotation")
    }
    case "TemplateLiteral": {
      const regex = AST.getTemplateLiteralRegExp(ast)
      return {
        type: "string",
        description: "a template literal",
        pattern: regex.source,
        ...getMeta(ast)
      }
    }
    case "Suspend": {
      const identifier = Option.orElse(AST.getJSONIdentifier(ast), () => AST.getJSONIdentifier(ast.f()))
      if (Option.isNone(identifier)) {
        throw new Error(
          "Generating a JSON Schema for suspended schemas requires an identifier annotation"
        )
      }
      return go(ast.f(), $defs)
    }
    case "Transformation":
      return go(ast.to, $defs)
  }
}
