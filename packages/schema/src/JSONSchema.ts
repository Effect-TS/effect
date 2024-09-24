/**
 * @since 0.67.0
 */

import * as Option from "effect/Option"
import * as Predicate from "effect/Predicate"
import * as Record from "effect/Record"
import * as AST from "./AST.js"
import * as errors_ from "./internal/errors.js"
import * as filters_ from "./internal/filters.js"
import type * as Schema from "./Schema.js"

/**
 * @category model
 * @since 0.67.0
 */
export interface JsonSchemaAnnotations {
  title?: string
  description?: string
  default?: unknown
  examples?: Array<unknown>
}

/**
 * @category model
 * @since 0.67.0
 */
export interface JsonSchema7Any extends JsonSchemaAnnotations {
  $id: "/schemas/any"
}

/**
 * @category model
 * @since 0.67.0
 */
export interface JsonSchema7Unknown extends JsonSchemaAnnotations {
  $id: "/schemas/unknown"
}

/**
 * @category model
 * @since 0.69.0
 */
export interface JsonSchema7Void extends JsonSchemaAnnotations {
  $id: "/schemas/void"
}

/**
 * @category model
 * @since 0.71.0
 */
export interface JsonSchema7object extends JsonSchemaAnnotations {
  $id: "/schemas/object"
  anyOf: [
    { type: "object" },
    { type: "array" }
  ]
}

/**
 * @category model
 * @since 0.71.0
 */
export interface JsonSchema7empty extends JsonSchemaAnnotations {
  $id: "/schemas/{}"
  anyOf: [
    { type: "object" },
    { type: "array" }
  ]
}

/**
 * @category model
 * @since 0.67.0
 */
export interface JsonSchema7Ref extends JsonSchemaAnnotations {
  $ref: string
}

/**
 * @category model
 * @since 0.67.0
 */
export interface JsonSchema7String extends JsonSchemaAnnotations {
  type: "string"
  minLength?: number
  maxLength?: number
  pattern?: string
}

/**
 * @category model
 * @since 0.67.0
 */
export interface JsonSchema7Numeric extends JsonSchemaAnnotations {
  minimum?: number
  exclusiveMinimum?: number
  maximum?: number
  exclusiveMaximum?: number
}

/**
 * @category model
 * @since 0.67.0
 */
export interface JsonSchema7Number extends JsonSchema7Numeric {
  type: "number"
}

/**
 * @category model
 * @since 0.67.0
 */
export interface JsonSchema7Integer extends JsonSchema7Numeric {
  type: "integer"
}

/**
 * @category model
 * @since 0.67.0
 */
export interface JsonSchema7Boolean extends JsonSchemaAnnotations {
  type: "boolean"
}

/**
 * @category model
 * @since 0.67.0
 */
export interface JsonSchema7Array extends JsonSchemaAnnotations {
  type: "array"
  items?: JsonSchema7 | Array<JsonSchema7>
  minItems?: number
  maxItems?: number
  additionalItems?: JsonSchema7 | boolean
}

/**
 * @category model
 * @since 0.67.0
 */
export interface JsonSchema7Enum extends JsonSchemaAnnotations {
  enum: Array<AST.LiteralValue>
}

/**
 * @category model
 * @since 0.71.0
 */
export interface JsonSchema7Enums extends JsonSchemaAnnotations {
  $comment: "/schemas/enums"
  anyOf: Array<{
    title: string
    enum: [string | number]
  }>
}

/**
 * @category model
 * @since 0.67.0
 */
export interface JsonSchema7AnyOf extends JsonSchemaAnnotations {
  anyOf: Array<JsonSchema7>
}

/**
 * @category model
 * @since 0.67.0
 */
export interface JsonSchema7Object extends JsonSchemaAnnotations {
  type: "object"
  required: Array<string>
  properties: Record<string, JsonSchema7>
  additionalProperties?: boolean | JsonSchema7
  patternProperties?: Record<string, JsonSchema7>
  propertyNames?: JsonSchema7
}

/**
 * @category model
 * @since 0.71.0
 */
export type JsonSchema7 =
  | JsonSchema7Any
  | JsonSchema7Unknown
  | JsonSchema7Void
  | JsonSchema7object
  | JsonSchema7empty
  | JsonSchema7Ref
  | JsonSchema7String
  | JsonSchema7Number
  | JsonSchema7Integer
  | JsonSchema7Boolean
  | JsonSchema7Array
  | JsonSchema7Enum
  | JsonSchema7Enums
  | JsonSchema7AnyOf
  | JsonSchema7Object

/**
 * @category model
 * @since 0.67.0
 */
export type JsonSchema7Root = JsonSchema7 & {
  $schema?: string
  $defs?: Record<string, JsonSchema7>
}

/**
 * @category encoding
 * @since 0.67.0
 */
export const make = <A, I, R>(schema: Schema.Schema<A, I, R>): JsonSchema7Root => {
  const $defs: Record<string, any> = {}
  const jsonSchema = go(schema.ast, $defs, true, [])
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

const voidJsonSchema: JsonSchema7 = { $id: "/schemas/void" }

const objectJsonSchema: JsonSchema7 = {
  "$id": "/schemas/object",
  "anyOf": [
    { "type": "object" },
    { "type": "array" }
  ]
}

const empty = (): JsonSchema7 => ({
  "$id": "/schemas/{}",
  "anyOf": [
    { "type": "object" },
    { "type": "array" }
  ]
})

const $schema = "http://json-schema.org/draft-07/schema#"

const getJsonSchemaAnnotations = (annotated: AST.Annotated): JsonSchemaAnnotations =>
  Record.getSomes({
    description: AST.getDescriptionAnnotation(annotated),
    title: AST.getTitleAnnotation(annotated),
    examples: AST.getExamplesAnnotation(annotated),
    default: AST.getDefaultAnnotation(annotated)
  })

const removeDefaultJsonSchemaAnnotations = (
  jsonSchemaAnnotations: JsonSchemaAnnotations,
  ast: AST.AST
): JsonSchemaAnnotations => {
  if (jsonSchemaAnnotations["title"] === ast.annotations[AST.TitleAnnotationId]) {
    delete jsonSchemaAnnotations["title"]
  }
  if (jsonSchemaAnnotations["description"] === ast.annotations[AST.DescriptionAnnotationId]) {
    delete jsonSchemaAnnotations["description"]
  }
  return jsonSchemaAnnotations
}

const getASTJsonSchemaAnnotations = (ast: AST.AST): JsonSchemaAnnotations => {
  const jsonSchemaAnnotations = getJsonSchemaAnnotations(ast)
  switch (ast._tag) {
    case "StringKeyword":
      return removeDefaultJsonSchemaAnnotations(jsonSchemaAnnotations, AST.stringKeyword)
    case "NumberKeyword":
      return removeDefaultJsonSchemaAnnotations(jsonSchemaAnnotations, AST.numberKeyword)
    case "BooleanKeyword":
      return removeDefaultJsonSchemaAnnotations(jsonSchemaAnnotations, AST.booleanKeyword)
    default:
      return jsonSchemaAnnotations
  }
}

const pruneUndefinedKeyword = (ps: AST.PropertySignature): AST.AST | undefined => {
  const type = ps.type
  if (AST.isUnion(type) && Option.isNone(AST.getJSONSchemaAnnotation(type))) {
    const types = type.types.filter((type) => !AST.isUndefinedKeyword(type))
    if (types.length < type.types.length) {
      return AST.Union.make(types, type.annotations)
    }
  }
}

/** @internal */
export const DEFINITION_PREFIX = "#/$defs/"

const get$ref = (id: string): string => `${DEFINITION_PREFIX}${id}`

const getRefinementInnerTransformation = (ast: AST.Refinement): AST.AST | undefined => {
  switch (ast.from._tag) {
    case "Transformation":
      return ast.from
    case "Refinement":
      return getRefinementInnerTransformation(ast.from)
    case "Suspend": {
      const from = ast.from.f()
      if (AST.isRefinement(from)) {
        return getRefinementInnerTransformation(from)
      }
    }
  }
}

const isParseJsonTransformation = (ast: AST.AST): boolean =>
  ast.annotations[AST.TypeAnnotationId] === filters_.ParseJsonTypeId

function merge(a: JsonSchemaAnnotations, b: JsonSchema7): JsonSchema7
function merge(a: JsonSchema7, b: JsonSchemaAnnotations): JsonSchema7
function merge(a: JsonSchema7, b: JsonSchema7): JsonSchema7
function merge(a: object, b: object): object {
  return { ...a, ...b }
}

const isOverrideAnnotation = (jsonSchema: JsonSchema7): boolean => {
  return ("type" in jsonSchema) || ("oneOf" in jsonSchema) || ("anyOf" in jsonSchema) || ("const" in jsonSchema) ||
    ("enum" in jsonSchema) || ("$ref" in jsonSchema)
}

const go = (
  ast: AST.AST,
  $defs: Record<string, JsonSchema7>,
  handleIdentifier: boolean,
  path: ReadonlyArray<PropertyKey>
): JsonSchema7 => {
  const hook = AST.getJSONSchemaAnnotation(ast)
  if (Option.isSome(hook)) {
    const handler = hook.value as JsonSchema7
    if (AST.isRefinement(ast)) {
      const t = getRefinementInnerTransformation(ast)
      if (t === undefined) {
        try {
          return {
            ...go(ast.from, $defs, true, path),
            ...getJsonSchemaAnnotations(ast),
            ...handler
          }
        } catch (e) {
          return {
            ...getJsonSchemaAnnotations(ast),
            ...handler
          }
        }
      } else if (!isOverrideAnnotation(handler)) {
        return go(t, $defs, true, path)
      }
    }
    return handler
  }
  const surrogate = AST.getSurrogateAnnotation(ast)
  if (Option.isSome(surrogate)) {
    return go(surrogate.value, $defs, handleIdentifier, path)
  }
  if (handleIdentifier && !AST.isTransformation(ast) && !AST.isRefinement(ast)) {
    const identifier = AST.getJSONIdentifier(ast)
    if (Option.isSome(identifier)) {
      const id = identifier.value
      const out = { $ref: get$ref(id) }
      if (!Record.has($defs, id)) {
        $defs[id] = out
        $defs[id] = go(ast, $defs, false, path)
      }
      return out
    }
  }
  switch (ast._tag) {
    case "Declaration":
      throw new Error(errors_.getJSONSchemaMissingAnnotationErrorMessage(path, ast))
    case "Literal": {
      const literal = ast.literal
      if (literal === null) {
        return merge({ enum: [null] }, getJsonSchemaAnnotations(ast))
      } else if (Predicate.isString(literal) || Predicate.isNumber(literal) || Predicate.isBoolean(literal)) {
        return merge({ enum: [literal] }, getJsonSchemaAnnotations(ast))
      }
      throw new Error(errors_.getJSONSchemaMissingAnnotationErrorMessage(path, ast))
    }
    case "UniqueSymbol":
      throw new Error(errors_.getJSONSchemaMissingAnnotationErrorMessage(path, ast))
    case "UndefinedKeyword":
      throw new Error(errors_.getJSONSchemaMissingAnnotationErrorMessage(path, ast))
    case "VoidKeyword":
      return merge(voidJsonSchema, getJsonSchemaAnnotations(ast))
    case "NeverKeyword":
      throw new Error(errors_.getJSONSchemaMissingAnnotationErrorMessage(path, ast))
    case "UnknownKeyword":
      return merge(unknownJsonSchema, getJsonSchemaAnnotations(ast))
    case "AnyKeyword":
      return merge(anyJsonSchema, getJsonSchemaAnnotations(ast))
    case "ObjectKeyword":
      return merge(objectJsonSchema, getJsonSchemaAnnotations(ast))
    case "StringKeyword":
      return { type: "string", ...getASTJsonSchemaAnnotations(ast) }
    case "NumberKeyword":
      return { type: "number", ...getASTJsonSchemaAnnotations(ast) }
    case "BooleanKeyword":
      return { type: "boolean", ...getASTJsonSchemaAnnotations(ast) }
    case "BigIntKeyword":
      throw new Error(errors_.getJSONSchemaMissingAnnotationErrorMessage(path, ast))
    case "SymbolKeyword":
      throw new Error(errors_.getJSONSchemaMissingAnnotationErrorMessage(path, ast))
    case "TupleType": {
      const elements = ast.elements.map((e, i) =>
        merge(
          go(e.type, $defs, true, path.concat(i)),
          getJsonSchemaAnnotations(e)
        )
      )
      const rest = ast.rest.map((annotatedAST) =>
        merge(
          go(annotatedAST.type, $defs, true, path),
          getJsonSchemaAnnotations(annotatedAST)
        )
      )
      const output: JsonSchema7Array = { type: "array" }
      // ---------------------------------------------
      // handle elements
      // ---------------------------------------------
      const len = ast.elements.length
      if (len > 0) {
        output.minItems = len - ast.elements.filter((element) => element.isOptional).length
        output.items = elements
      }
      // ---------------------------------------------
      // handle rest element
      // ---------------------------------------------
      const restLength = rest.length
      if (restLength > 0) {
        const head = rest[0]
        const isHomogeneous = restLength === 1 && ast.elements.every((e) => e.type === ast.rest[0].type)
        if (isHomogeneous) {
          output.items = head
        } else {
          output.additionalItems = head
        }

        // ---------------------------------------------
        // handle post rest elements
        // ---------------------------------------------
        if (restLength > 1) {
          throw new Error(errors_.getJSONSchemaUnsupportedPostRestElementsErrorMessage(path))
        }
      } else {
        if (len > 0) {
          output.additionalItems = false
        } else {
          output.maxItems = 0
        }
      }

      return merge(output, getJsonSchemaAnnotations(ast))
    }
    case "TypeLiteral": {
      if (ast.propertySignatures.length === 0 && ast.indexSignatures.length === 0) {
        return merge(empty(), getJsonSchemaAnnotations(ast))
      }
      let patternProperties: JsonSchema7 | undefined = undefined
      let propertyNames: JsonSchema7 | undefined = undefined
      for (const is of ast.indexSignatures) {
        const parameter = is.parameter
        switch (parameter._tag) {
          case "StringKeyword": {
            patternProperties = go(is.type, $defs, true, path)
            break
          }
          case "TemplateLiteral": {
            patternProperties = go(is.type, $defs, true, path)
            propertyNames = {
              type: "string",
              pattern: AST.getTemplateLiteralRegExp(parameter).source
            }
            break
          }
          case "Refinement": {
            patternProperties = go(is.type, $defs, true, path)
            propertyNames = go(parameter, $defs, true, path)
            break
          }
          case "SymbolKeyword":
            throw new Error(errors_.getJSONSchemaUnsupportedParameterErrorMessage(path, parameter))
        }
      }
      const output: JsonSchema7Object = {
        type: "object",
        required: [],
        properties: {},
        additionalProperties: false
      }
      // ---------------------------------------------
      // handle property signatures
      // ---------------------------------------------
      for (let i = 0; i < ast.propertySignatures.length; i++) {
        const ps = ast.propertySignatures[i]
        const name = ps.name
        if (Predicate.isString(name)) {
          const pruned = pruneUndefinedKeyword(ps)
          output.properties[name] = merge(
            go(pruned ? pruned : ps.type, $defs, true, path.concat(ps.name)),
            getJsonSchemaAnnotations(ps)
          )
          // ---------------------------------------------
          // handle optional property signatures
          // ---------------------------------------------
          if (!ps.isOptional && pruned === undefined) {
            output.required.push(name)
          }
        } else {
          throw new Error(errors_.getJSONSchemaUnsupportedKeyErrorMessage(name, path))
        }
      }
      // ---------------------------------------------
      // handle index signatures
      // ---------------------------------------------
      if (patternProperties !== undefined) {
        delete output.additionalProperties
        output.patternProperties = { "": patternProperties }
      }
      if (propertyNames !== undefined) {
        output.propertyNames = propertyNames
      }

      return merge(output, getJsonSchemaAnnotations(ast))
    }
    case "Union": {
      const enums: Array<AST.LiteralValue> = []
      const anyOf: Array<JsonSchema7> = []
      for (const type of ast.types) {
        const schema = go(type, $defs, true, path)
        if ("enum" in schema) {
          if (Object.keys(schema).length > 1) {
            anyOf.push(schema)
          } else {
            for (const e of schema.enum) {
              enums.push(e)
            }
          }
        } else {
          anyOf.push(schema)
        }
      }
      if (anyOf.length === 0) {
        return merge({ enum: enums }, getJsonSchemaAnnotations(ast))
      } else {
        if (enums.length >= 1) {
          anyOf.push({ enum: enums })
        }
        return merge({ anyOf }, getJsonSchemaAnnotations(ast))
      }
    }
    case "Enums": {
      return merge({
        $comment: "/schemas/enums",
        anyOf: ast.enums.map((e) => ({ title: e[0], enum: [e[1]] }))
      }, getJsonSchemaAnnotations(ast))
    }
    case "Refinement": {
      if (AST.encodedBoundAST(ast) === ast) {
        throw new Error(errors_.getJSONSchemaMissingAnnotationErrorMessage(path, ast))
      }
      return go(ast.from, $defs, true, path)
    }
    case "TemplateLiteral": {
      const regex = AST.getTemplateLiteralRegExp(ast)
      return merge({
        type: "string",
        description: "a template literal",
        pattern: regex.source
      }, getJsonSchemaAnnotations(ast))
    }
    case "Suspend": {
      const identifier = Option.orElse(AST.getJSONIdentifier(ast), () => AST.getJSONIdentifier(ast.f()))
      if (Option.isNone(identifier)) {
        throw new Error(errors_.getJSONSchemaMissingIdentifierAnnotationErrorMessage(path, ast))
      }
      return go(ast.f(), $defs, true, path)
    }
    case "Transformation": {
      // Properly handle S.parseJson transformations by focusing on
      // the 'to' side of the AST. This approach prevents the generation of useless schemas
      // derived from the 'from' side (type: string), ensuring the output matches the intended
      // complex schema type.
      const next = isParseJsonTransformation(ast.from) ? ast.to : ast.from
      return go(next, $defs, true, path)
    }
  }
}
