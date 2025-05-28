/**
 * @since 3.10.0
 */

import * as Arr from "./Array.js"
import * as errors_ from "./internal/schema/errors.js"
import * as Option from "./Option.js"
import * as ParseResult from "./ParseResult.js"
import * as Predicate from "./Predicate.js"
import * as Record from "./Record.js"
import type * as Schema from "./Schema.js"
import * as AST from "./SchemaAST.js"

/**
 * @category model
 * @since 3.10.0
 */
export interface JsonSchemaAnnotations {
  title?: string
  description?: string
  default?: unknown
  examples?: Array<unknown>
}

/**
 * @category model
 * @since 3.11.5
 */
export interface JsonSchema7Never extends JsonSchemaAnnotations {
  $id: "/schemas/never"
  not: {}
}

/**
 * @category model
 * @since 3.10.0
 */
export interface JsonSchema7Any extends JsonSchemaAnnotations {
  $id: "/schemas/any"
}

/**
 * @category model
 * @since 3.10.0
 */
export interface JsonSchema7Unknown extends JsonSchemaAnnotations {
  $id: "/schemas/unknown"
}

/**
 * @category model
 * @since 3.10.0
 */
export interface JsonSchema7Void extends JsonSchemaAnnotations {
  $id: "/schemas/void"
}

/**
 * @category model
 * @since 3.10.0
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
 * @since 3.10.0
 */
export interface JsonSchema7empty extends JsonSchemaAnnotations {
  $id: "/schemas/%7B%7D"
  anyOf: [
    { type: "object" },
    { type: "array" }
  ]
}

/**
 * @category model
 * @since 3.10.0
 */
export interface JsonSchema7Ref extends JsonSchemaAnnotations {
  $ref: string
}

/**
 * @category model
 * @since 3.11.7
 */
export interface JsonSchema7Null extends JsonSchemaAnnotations {
  type: "null"
}

/**
 * @category model
 * @since 3.10.0
 */
export interface JsonSchema7String extends JsonSchemaAnnotations {
  type: "string"
  minLength?: number
  maxLength?: number
  pattern?: string
  format?: string
  contentMediaType?: string
  allOf?: Array<{
    minLength?: number
    maxLength?: number
    pattern?: string
  }>
}

/**
 * @category model
 * @since 3.10.0
 */
export interface JsonSchema7Numeric extends JsonSchemaAnnotations {
  minimum?: number
  exclusiveMinimum?: number
  maximum?: number
  exclusiveMaximum?: number
  multipleOf?: number
  allOf?: Array<{
    minimum?: number
    exclusiveMinimum?: number
    maximum?: number
    exclusiveMaximum?: number
    multipleOf?: number
  }>
}

/**
 * @category model
 * @since 3.10.0
 */
export interface JsonSchema7Number extends JsonSchema7Numeric {
  type: "number"
}

/**
 * @category model
 * @since 3.10.0
 */
export interface JsonSchema7Integer extends JsonSchema7Numeric {
  type: "integer"
}

/**
 * @category model
 * @since 3.10.0
 */
export interface JsonSchema7Boolean extends JsonSchemaAnnotations {
  type: "boolean"
}

/**
 * @category model
 * @since 3.10.0
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
 * @since 3.10.0
 */
export interface JsonSchema7Enum extends JsonSchemaAnnotations {
  type?: "string" | "number" | "boolean"
  enum: Array<string | number | boolean>
}

/**
 * @category model
 * @since 3.10.0
 */
export interface JsonSchema7Enums extends JsonSchemaAnnotations {
  $comment: "/schemas/enums"
  anyOf: Array<{
    type: "string" | "number"
    title: string
    enum: [string | number]
  }>
}

/**
 * @category model
 * @since 3.10.0
 */
export interface JsonSchema7AnyOf extends JsonSchemaAnnotations {
  anyOf: Array<JsonSchema7>
}

/**
 * @category model
 * @since 3.10.0
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
 * @since 3.10.0
 */
export type JsonSchema7 =
  | JsonSchema7Never
  | JsonSchema7Any
  | JsonSchema7Unknown
  | JsonSchema7Void
  | JsonSchema7object
  | JsonSchema7empty
  | JsonSchema7Ref
  | JsonSchema7Null
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
 * @since 3.10.0
 */
export type JsonSchema7Root = JsonSchema7 & {
  $schema?: string
  $defs?: Record<string, JsonSchema7>
}

/**
 * @category encoding
 * @since 3.10.0
 */
export const make = <A, I, R>(schema: Schema.Schema<A, I, R>): JsonSchema7Root => {
  const definitions: Record<string, any> = {}
  const ast = AST.isTransformation(schema.ast) && isParseJsonTransformation(schema.ast.from)
    // Special case top level `parseJson` transformations
    ? schema.ast.to
    : schema.ast
  const jsonSchema = fromAST(ast, {
    definitions
  })
  const out: JsonSchema7Root = {
    $schema,
    $defs: {},
    ...jsonSchema
  }
  if (Record.isEmptyRecord(definitions)) {
    delete out.$defs
  } else {
    out.$defs = definitions
  }
  return out
}

type Target = "jsonSchema7" | "jsonSchema2019-09" | "openApi3.1"

type TopLevelReferenceStrategy = "skip" | "keep"

type AdditionalPropertiesStrategy = "allow" | "strict"

/**
 * Returns a JSON Schema with additional options and definitions.
 *
 * **Warning**
 *
 * This function is experimental and subject to change.
 *
 * **Options**
 *
 * - `definitions`: A record of definitions that are included in the schema.
 * - `definitionPath`: The path to the definitions within the schema (defaults
 *   to "#/$defs/").
 * - `target`: Which spec to target. Possible values are:
 *   - `'jsonSchema7'`: JSON Schema draft-07 (default behavior).
 *   - `'jsonSchema2019-09'`: JSON Schema draft-2019-09.
 *   - `'openApi3.1'`: OpenAPI 3.1.
 * - `topLevelReferenceStrategy`: Controls the handling of the top-level
 *   reference. Possible values are:
 *   - `"keep"`: Keep the top-level reference (default behavior).
 *   - `"skip"`: Skip the top-level reference.
 * - `additionalPropertiesStrategy`: Controls the handling of additional properties. Possible values are:
 *   - `"strict"`: Disallow additional properties (default behavior).
 *   - `"allow"`: Allow additional properties.
 *
 * @category encoding
 * @since 3.11.5
 * @experimental
 */
export const fromAST = (ast: AST.AST, options: {
  readonly definitions: Record<string, JsonSchema7>
  readonly definitionPath?: string | undefined
  readonly target?: Target | undefined
  readonly topLevelReferenceStrategy?: TopLevelReferenceStrategy | undefined
  readonly additionalPropertiesStrategy?: AdditionalPropertiesStrategy | undefined
}): JsonSchema7 => {
  const definitionPath = options.definitionPath ?? "#/$defs/"
  const getRef = (id: string) => definitionPath + id
  const target = options.target ?? "jsonSchema7"
  const handleIdentifier = options.topLevelReferenceStrategy !== "skip"
  const additionalPropertiesStrategy = options.additionalPropertiesStrategy ?? "strict"
  return go(ast, options.definitions, handleIdentifier, [], {
    getRef,
    target,
    additionalPropertiesStrategy
  })
}

const constNever: JsonSchema7 = {
  "$id": "/schemas/never",
  "not": {}
}

const constAny: JsonSchema7 = {
  "$id": "/schemas/any"
}

const constUnknown: JsonSchema7 = {
  "$id": "/schemas/unknown"
}

const constVoid: JsonSchema7 = {
  "$id": "/schemas/void"
}

const constAnyObject: JsonSchema7 = {
  "$id": "/schemas/object",
  "anyOf": [
    { "type": "object" },
    { "type": "array" }
  ]
}

const constEmpty: JsonSchema7 = {
  "$id": "/schemas/%7B%7D",
  "anyOf": [
    { "type": "object" },
    { "type": "array" }
  ]
}

const $schema = "http://json-schema.org/draft-07/schema#"

const getJsonSchemaAnnotations = (ast: AST.AST, annotated?: AST.Annotated): JsonSchemaAnnotations => {
  annotated ??= ast
  const out: JsonSchemaAnnotations = Record.getSomes({
    description: AST.getDescriptionAnnotation(annotated),
    title: AST.getTitleAnnotation(annotated),
    default: AST.getDefaultAnnotation(annotated)
  })
  const oexamples = AST.getExamplesAnnotation(annotated)
  if (Option.isSome(oexamples) && oexamples.value.length > 0) {
    const getOption = ParseResult.getOption(ast, false)
    const examples = Arr.filterMap(oexamples.value, (e) => getOption(e))
    if (examples.length > 0) {
      out.examples = examples
    }
  }
  return out
}

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

const pruneUndefined = (ast: AST.AST): AST.AST | undefined => {
  if (Option.isNone(AST.getJSONSchemaAnnotation(ast))) {
    return AST.pruneUndefined(ast, pruneUndefined, (ast) => pruneUndefined(ast.from))
  }
}

const isParseJsonTransformation = (ast: AST.AST): boolean =>
  ast.annotations[AST.SchemaIdAnnotationId] === AST.ParseJsonSchemaId

const isOverrideAnnotation = (jsonSchema: JsonSchema7): boolean => {
  return ("type" in jsonSchema) || ("oneOf" in jsonSchema) || ("anyOf" in jsonSchema) || ("const" in jsonSchema) ||
    ("enum" in jsonSchema) || ("$ref" in jsonSchema)
}

// Returns true if the schema is an enum with no other properties other than the
// optional "type". This is used to merge enums together.
const isMergeableEnum = (jsonSchema: JsonSchema7): jsonSchema is JsonSchema7Enum => {
  const len = Object.keys(jsonSchema).length
  return "enum" in jsonSchema && (len === 1 || ("type" in jsonSchema && len === 2))
}

// Some validators do not support enums without a type keyword. This function
// adds a type keyword to the schema if it is missing and the enum values are
// homogeneous.
const addEnumType = (jsonSchema: JsonSchema7): JsonSchema7 => {
  if ("enum" in jsonSchema && !("type" in jsonSchema)) {
    const type: "string" | "number" | "boolean" | undefined = jsonSchema.enum.every(Predicate.isString) ?
      "string" :
      jsonSchema.enum.every(Predicate.isNumber) ?
      "number" :
      jsonSchema.enum.every(Predicate.isBoolean) ?
      "boolean" :
      undefined
    if (type !== undefined) {
      return { type, ...jsonSchema }
    }
  }
  return jsonSchema
}

const mergeRefinements = (from: any, jsonSchema: any, annotations: any): any => {
  const out: any = { ...from, ...annotations, ...jsonSchema }
  out.allOf ??= []

  const handle = (name: string, filter: (i: any) => boolean) => {
    if (name in jsonSchema && name in from) {
      out.allOf.unshift({ [name]: from[name] })
      out.allOf = out.allOf.filter(filter)
    }
  }

  handle("minLength", (i) => i.minLength > jsonSchema.minLength)
  handle("maxLength", (i) => i.maxLength < jsonSchema.maxLength)
  handle("pattern", (i) => i.pattern !== jsonSchema.pattern)
  handle("minItems", (i) => i.minItems > jsonSchema.minItems)
  handle("maxItems", (i) => i.maxItems < jsonSchema.maxItems)
  handle("minimum", (i) => i.minimum > jsonSchema.minimum)
  handle("maximum", (i) => i.maximum < jsonSchema.maximum)
  handle("exclusiveMinimum", (i) => i.exclusiveMinimum > jsonSchema.exclusiveMinimum)
  handle("exclusiveMaximum", (i) => i.exclusiveMaximum < jsonSchema.exclusiveMaximum)
  handle("multipleOf", (i) => i.multipleOf !== jsonSchema.multipleOf)

  if (out.allOf.length === 0) {
    delete out.allOf
  }
  return out
}

type GoOptions = {
  readonly getRef: (id: string) => string
  readonly target: Target
  readonly additionalPropertiesStrategy: AdditionalPropertiesStrategy
}

function isContentSchemaSupported(options: GoOptions): boolean {
  switch (options.target) {
    case "jsonSchema7":
      return false
    case "jsonSchema2019-09":
    case "openApi3.1":
      return true
  }
}

function isNullTypeKeywordSupported(options: GoOptions): boolean {
  switch (options.target) {
    case "jsonSchema7":
    case "jsonSchema2019-09":
      return true
    case "openApi3.1":
      return false
  }
}

// https://swagger.io/docs/specification/v3_0/data-models/data-types/#null
function isNullableKeywordSupported(options: GoOptions): boolean {
  switch (options.target) {
    case "jsonSchema7":
    case "jsonSchema2019-09":
      return false
    case "openApi3.1":
      return true
  }
}

function getAdditionalProperties(options: GoOptions): boolean {
  switch (options.additionalPropertiesStrategy) {
    case "allow":
      return true
    case "strict":
      return false
  }
}

const isNeverJSONSchema = (jsonSchema: JsonSchema7): jsonSchema is JsonSchema7Never =>
  "$id" in jsonSchema && jsonSchema.$id === "/schemas/never"

const isAnyJSONSchema = (jsonSchema: JsonSchema7): jsonSchema is JsonSchema7Any =>
  "$id" in jsonSchema && jsonSchema.$id === "/schemas/any"

const isUnknownJSONSchema = (jsonSchema: JsonSchema7): jsonSchema is JsonSchema7Unknown =>
  "$id" in jsonSchema && jsonSchema.$id === "/schemas/unknown"

const isVoidJSONSchema = (jsonSchema: JsonSchema7): jsonSchema is JsonSchema7Void =>
  "$id" in jsonSchema && jsonSchema.$id === "/schemas/void"

const shrink = (members: Array<JsonSchema7>): Array<JsonSchema7> => {
  let i = members.findIndex(isAnyJSONSchema)
  if (i !== -1) {
    members = [members[i]]
  }
  i = members.findIndex(isUnknownJSONSchema)
  if (i !== -1) {
    members = [members[i]]
  }
  i = members.findIndex(isVoidJSONSchema)
  if (i !== -1) {
    members = [members[i]]
  }
  return members
}

const go = (
  ast: AST.AST,
  $defs: Record<string, JsonSchema7>,
  handleIdentifier: boolean,
  path: ReadonlyArray<PropertyKey>,
  options: GoOptions
): JsonSchema7 => {
  if (handleIdentifier) {
    const identifier = AST.getJSONIdentifier(ast)
    if (Option.isSome(identifier)) {
      const id = identifier.value
      const escapedId = id.replace(/~/ig, "~0").replace(/\//ig, "~1")
      const out = { $ref: options.getRef(escapedId) }
      if (!Record.has($defs, id)) {
        $defs[id] = out
        $defs[id] = go(ast, $defs, false, path, options)
      }
      return out
    }
  }
  const hook = AST.getJSONSchemaAnnotation(ast)
  if (Option.isSome(hook)) {
    const handler = hook.value as JsonSchema7
    if (AST.isRefinement(ast)) {
      const t = AST.getTransformationFrom(ast)
      if (t === undefined) {
        return mergeRefinements(
          go(ast.from, $defs, handleIdentifier, path, options),
          handler,
          getJsonSchemaAnnotations(ast)
        )
      } else if (!isOverrideAnnotation(handler)) {
        return go(t, $defs, handleIdentifier, path, options)
      }
    }
    if (AST.isDeclaration(ast)) {
      return { ...handler, ...getJsonSchemaAnnotations(ast) }
    }
    return handler
  }
  const surrogate = AST.getSurrogateAnnotation(ast)
  if (Option.isSome(surrogate)) {
    return go(surrogate.value, $defs, handleIdentifier, path, options)
  }
  switch (ast._tag) {
    case "Declaration":
      throw new Error(errors_.getJSONSchemaMissingAnnotationErrorMessage(path, ast))
    case "Literal": {
      const literal = ast.literal
      if (literal === null) {
        if (isNullTypeKeywordSupported(options)) {
          // https://json-schema.org/draft-07/draft-handrews-json-schema-validation-00.pdf
          // Section 6.1.1
          return { type: "null", ...getJsonSchemaAnnotations(ast) }
        } else {
          // OpenAPI 3.1 does not support the "null" type keyword
          // https://swagger.io/docs/specification/v3_0/data-models/data-types/#null
          return {
            // @ts-expect-error
            enum: [null],
            ...getJsonSchemaAnnotations(ast)
          }
        }
      } else if (Predicate.isString(literal)) {
        return { type: "string", enum: [literal], ...getJsonSchemaAnnotations(ast) }
      } else if (Predicate.isNumber(literal)) {
        return { type: "number", enum: [literal], ...getJsonSchemaAnnotations(ast) }
      } else if (Predicate.isBoolean(literal)) {
        return { type: "boolean", enum: [literal], ...getJsonSchemaAnnotations(ast) }
      }
      throw new Error(errors_.getJSONSchemaMissingAnnotationErrorMessage(path, ast))
    }
    case "UniqueSymbol":
      throw new Error(errors_.getJSONSchemaMissingAnnotationErrorMessage(path, ast))
    case "UndefinedKeyword":
      throw new Error(errors_.getJSONSchemaMissingAnnotationErrorMessage(path, ast))
    case "VoidKeyword":
      return { ...constVoid, ...getJsonSchemaAnnotations(ast) }
    case "NeverKeyword":
      return { ...constNever, ...getJsonSchemaAnnotations(ast) }
    case "UnknownKeyword":
      return { ...constUnknown, ...getJsonSchemaAnnotations(ast) }
    case "AnyKeyword":
      return { ...constAny, ...getJsonSchemaAnnotations(ast) }
    case "ObjectKeyword":
      return { ...constAnyObject, ...getJsonSchemaAnnotations(ast) }
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
      const elements = ast.elements.map((e, i) => ({
        ...go(e.type, $defs, true, path.concat(i), options),
        ...getJsonSchemaAnnotations(e.type, e)
      }))
      const rest = ast.rest.map((annotatedAST) => ({
        ...go(annotatedAST.type, $defs, true, path, options),
        ...getJsonSchemaAnnotations(annotatedAST.type, annotatedAST)
      }))
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

      return { ...output, ...getJsonSchemaAnnotations(ast) }
    }
    case "TypeLiteral": {
      if (ast.propertySignatures.length === 0 && ast.indexSignatures.length === 0) {
        return { ...constEmpty, ...getJsonSchemaAnnotations(ast) }
      }
      const output: JsonSchema7Object = {
        type: "object",
        required: [],
        properties: {},
        additionalProperties: getAdditionalProperties(options)
      }
      let patternProperties: JsonSchema7 | undefined = undefined
      let propertyNames: JsonSchema7 | undefined = undefined
      for (const is of ast.indexSignatures) {
        const pruned = pruneUndefined(is.type) ?? is.type
        const parameter = is.parameter
        switch (parameter._tag) {
          case "StringKeyword": {
            output.additionalProperties = go(pruned, $defs, true, path, options)
            break
          }
          case "TemplateLiteral": {
            patternProperties = go(pruned, $defs, true, path, options)
            propertyNames = {
              type: "string",
              pattern: AST.getTemplateLiteralRegExp(parameter).source
            }
            break
          }
          case "Refinement": {
            patternProperties = go(pruned, $defs, true, path, options)
            propertyNames = go(parameter, $defs, true, path, options)
            break
          }
          case "SymbolKeyword": {
            const indexSignaturePath = path.concat("[symbol]")
            output.additionalProperties = go(pruned, $defs, true, indexSignaturePath, options)
            propertyNames = go(parameter, $defs, true, indexSignaturePath, options)
            break
          }
        }
      }
      // ---------------------------------------------
      // handle property signatures
      // ---------------------------------------------
      for (let i = 0; i < ast.propertySignatures.length; i++) {
        const ps = ast.propertySignatures[i]
        const name = ps.name
        if (Predicate.isString(name)) {
          const pruned = pruneUndefined(ps.type)
          const type = pruned ?? ps.type
          output.properties[name] = {
            ...go(type, $defs, true, path.concat(ps.name), options),
            ...getJsonSchemaAnnotations(type, ps)
          }
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

      return { ...output, ...getJsonSchemaAnnotations(ast) }
    }
    case "Union": {
      const members: Array<JsonSchema7> = []
      for (const type of ast.types) {
        const jsonSchema = go(type, $defs, true, path, options)
        if (!isNeverJSONSchema(jsonSchema)) {
          const last = members[members.length - 1]
          if (isMergeableEnum(jsonSchema) && last !== undefined && isMergeableEnum(last)) {
            members[members.length - 1] = { enum: last.enum.concat(jsonSchema.enum) }
          } else {
            members.push(jsonSchema)
          }
        }
      }

      const anyOf = shrink(members)

      const finalize = (anyOf: Array<JsonSchema7>) => {
        switch (anyOf.length) {
          case 0:
            return {
              ...constNever,
              ...getJsonSchemaAnnotations(ast)
            }
          case 1: {
            return {
              ...addEnumType(anyOf[0]),
              ...getJsonSchemaAnnotations(ast)
            }
          }
          default:
            return {
              anyOf: anyOf.map(addEnumType),
              ...getJsonSchemaAnnotations(ast)
            }
        }
      }

      if (isNullableKeywordSupported(options)) {
        let nullable = false
        const nonNullables: Array<JsonSchema7> = []
        for (const s of anyOf) {
          if ("nullable" in s) {
            nullable = true
            const nn = { ...s }
            delete nn.nullable
            nonNullables.push(nn)
          } else if (isMergeableEnum(s)) {
            const nnes = s.enum.filter((e) => e !== null)
            if (nnes.length < s.enum.length) {
              nullable = true
              if (nnes.length === 0) {
                continue
              }
              const nn = { ...s }
              nn.enum = nnes
              nonNullables.push(nn)
            }
          } else {
            nonNullables.push(s)
          }
        }
        if (nullable) {
          const out = finalize(nonNullables)
          if (!isAnyJSONSchema(out) && !isUnknownJSONSchema(out)) {
            // @ts-expect-error
            out.nullable = nullable
          }
          return out
        }
      }

      return finalize(anyOf)
    }
    case "Enums": {
      const anyOf = ast.enums.map((e) => addEnumType({ title: e[0], enum: [e[1]] }))
      return anyOf.length >= 1 ?
        {
          $comment: "/schemas/enums",
          anyOf,
          ...getJsonSchemaAnnotations(ast)
        } :
        {
          ...constNever,
          ...getJsonSchemaAnnotations(ast)
        }
    }
    case "Refinement": {
      // The jsonSchema annotation is required only if the refinement does not have a transformation
      if (AST.getTransformationFrom(ast) === undefined) {
        throw new Error(errors_.getJSONSchemaMissingAnnotationErrorMessage(path, ast))
      }
      return go(ast.from, $defs, handleIdentifier, path, options)
    }
    case "TemplateLiteral": {
      const regex = AST.getTemplateLiteralRegExp(ast)
      return {
        type: "string",
        title: String(ast),
        description: "a template literal",
        pattern: regex.source,
        ...getJsonSchemaAnnotations(ast)
      }
    }
    case "Suspend": {
      const identifier = Option.orElse(AST.getJSONIdentifier(ast), () => AST.getJSONIdentifier(ast.f()))
      if (Option.isNone(identifier)) {
        throw new Error(errors_.getJSONSchemaMissingIdentifierAnnotationErrorMessage(path, ast))
      }
      return go(ast.f(), $defs, handleIdentifier, path, options)
    }
    case "Transformation": {
      if (isParseJsonTransformation(ast.from)) {
        const out: JsonSchema7String & { contentSchema?: JsonSchema7 } = {
          "type": "string",
          "contentMediaType": "application/json"
        }
        if (isContentSchemaSupported(options)) {
          out["contentSchema"] = go(ast.to, $defs, handleIdentifier, path, options)
        }
        return out
      }
      let next = ast.from
      if (AST.isTypeLiteralTransformation(ast.transformation)) {
        // Annotations from the transformation are applied unless there are user-defined annotations on the form side,
        // ensuring that the user's intended annotations are included in the generated schema.
        const identifier = AST.getIdentifierAnnotation(ast)
        if (Option.isSome(identifier) && Option.isNone(AST.getIdentifierAnnotation(next))) {
          next = AST.annotations(next, { [AST.IdentifierAnnotationId]: identifier.value })
        }
        const title = AST.getTitleAnnotation(ast)
        if (Option.isSome(title) && Option.isNone(AST.getTitleAnnotation(next))) {
          next = AST.annotations(next, { [AST.TitleAnnotationId]: title.value })
        }
        const description = AST.getDescriptionAnnotation(ast)
        if (Option.isSome(description) && Option.isNone(AST.getDescriptionAnnotation(next))) {
          next = AST.annotations(next, { [AST.DescriptionAnnotationId]: description.value })
        }
      }
      return go(next, $defs, handleIdentifier, path, options)
    }
  }
}
