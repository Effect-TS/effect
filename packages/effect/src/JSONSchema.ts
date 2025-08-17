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

const constNever: JsonSchema7Never = {
  $id: "/schemas/never",
  not: {}
}

const constAny: JsonSchema7Any = {
  $id: "/schemas/any"
}

const constUnknown: JsonSchema7Unknown = {
  $id: "/schemas/unknown"
}

const constVoid: JsonSchema7Void = {
  $id: "/schemas/void"
}

const constObject: JsonSchema7object = {
  $id: "/schemas/object",
  "anyOf": [
    { "type": "object" },
    { "type": "array" }
  ]
}

const constEmptyStruct: JsonSchema7empty = {
  $id: "/schemas/%7B%7D",
  "anyOf": [
    { "type": "object" },
    { "type": "array" }
  ]
}

const $schema = "http://json-schema.org/draft-07/schema#"

function getRawDescription(annotated: AST.Annotated | undefined): string | undefined {
  if (annotated !== undefined) return Option.getOrUndefined(AST.getDescriptionAnnotation(annotated))
}

function getRawTitle(annotated: AST.Annotated | undefined): string | undefined {
  if (annotated !== undefined) return Option.getOrUndefined(AST.getTitleAnnotation(annotated))
}

function getRawDefault(annotated: AST.Annotated | undefined): Option.Option<unknown> {
  if (annotated !== undefined) return AST.getDefaultAnnotation(annotated)
  return Option.none()
}

function getRawExamples(annotated: AST.Annotated | undefined): ReadonlyArray<unknown> | undefined {
  if (annotated !== undefined) return Option.getOrUndefined(AST.getExamplesAnnotation(annotated))
}

function encodeExamples(ast: AST.AST, examples: ReadonlyArray<unknown>): Array<unknown> | undefined {
  const getOption = ParseResult.getOption(ast, false)
  const out = Arr.filterMap(examples, (e) => getOption(e))
  return out.length > 0 ? out : undefined
}

function filterBuiltIn(ast: AST.AST, annotation: string | undefined, key: symbol): string | undefined {
  if (annotation !== undefined) {
    switch (ast._tag) {
      case "StringKeyword":
        return annotation !== AST.stringKeyword.annotations[key] ? annotation : undefined
      case "NumberKeyword":
        return annotation !== AST.numberKeyword.annotations[key] ? annotation : undefined
      case "BooleanKeyword":
        return annotation !== AST.booleanKeyword.annotations[key] ? annotation : undefined
    }
  }
  return annotation
}

function pruneJsonSchemaAnnotations(
  ast: AST.AST,
  description: string | undefined,
  title: string | undefined,
  def: Option.Option<unknown>,
  examples: ReadonlyArray<unknown> | undefined
): JsonSchemaAnnotations | undefined {
  const out: JsonSchemaAnnotations = {}
  if (description !== undefined) out.description = description
  if (title !== undefined) out.title = title
  if (Option.isSome(def)) out.default = def.value
  if (examples !== undefined) {
    const encodedExamples = encodeExamples(ast, examples)
    if (encodedExamples !== undefined) {
      out.examples = encodedExamples
    }
  }
  if (Object.keys(out).length === 0) {
    return undefined
  }
  return out
}

function getContextJsonSchemaAnnotations(ast: AST.AST, annotated: AST.Annotated): JsonSchemaAnnotations | undefined {
  return pruneJsonSchemaAnnotations(
    ast,
    getRawDescription(annotated),
    getRawTitle(annotated),
    getRawDefault(annotated),
    getRawExamples(annotated)
  )
}

function getJsonSchemaAnnotations(ast: AST.AST): JsonSchemaAnnotations | undefined {
  return pruneJsonSchemaAnnotations(
    ast,
    filterBuiltIn(ast, getRawDescription(ast), AST.DescriptionAnnotationId),
    filterBuiltIn(ast, getRawTitle(ast), AST.TitleAnnotationId),
    getRawDefault(ast),
    getRawExamples(ast)
  )
}

function mergeJsonSchemaAnnotations(
  jsonSchema: JsonSchema7,
  jsonSchemaAnnotations: JsonSchemaAnnotations | undefined
): JsonSchema7 {
  if (jsonSchemaAnnotations) {
    if ("$ref" in jsonSchema) {
      return { allOf: [jsonSchema], ...jsonSchemaAnnotations } as any
    }
    return { ...jsonSchema, ...jsonSchemaAnnotations }
  }
  return jsonSchema
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

const mergeRefinements = (from: any, jsonSchema: any, ast: AST.AST): any => {
  const out: any = { ...from, ...getJsonSchemaAnnotations(ast), ...jsonSchema }
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

function getAdditionalProperties(options: GoOptions): boolean {
  switch (options.additionalPropertiesStrategy) {
    case "allow":
      return true
    case "strict":
      return false
  }
}

function addAnnotations(jsonSchema: JsonSchema7, ast: AST.AST): JsonSchema7 {
  const annotations = getJsonSchemaAnnotations(ast)
  if (annotations) {
    return { ...jsonSchema, ...annotations }
  }
  return jsonSchema
}

function getIdentifierAnnotation(ast: AST.AST): string | undefined {
  const identifier = Option.getOrUndefined(AST.getJSONIdentifier(ast))
  if (identifier === undefined) {
    if (AST.isSuspend(ast)) {
      return getIdentifierAnnotation(ast.f())
    }
    if (AST.isTransformation(ast) && AST.isTypeLiteral(ast.from) && AST.isDeclaration(ast.to)) {
      const to = ast.to
      const surrogate = AST.getSurrogateAnnotation(to)
      if (Option.isSome(surrogate)) {
        return getIdentifierAnnotation(to)
      }
    }
  }
  return identifier
}

const go = (
  ast: AST.AST,
  $defs: Record<string, JsonSchema7>,
  handleIdentifier: boolean,
  path: ReadonlyArray<PropertyKey>,
  options: GoOptions,
  handleAnnotation: boolean = true
): JsonSchema7 => {
  if (handleIdentifier) {
    const identifier = getIdentifierAnnotation(ast)
    if (identifier !== undefined) {
      const escapedId = identifier.replace(/~/ig, "~0").replace(/\//ig, "~1")
      const out = { $ref: options.getRef(escapedId) }
      if (!Record.has($defs, identifier)) {
        $defs[identifier] = out
        $defs[identifier] = go(ast, $defs, false, path, options)
      }
      return out
    }
  }
  if (handleAnnotation) {
    const hook = AST.getJSONSchemaAnnotation(ast)
    if (Option.isSome(hook)) {
      const handler = hook.value as JsonSchema7
      switch (ast._tag) {
        case "Declaration":
          return addAnnotations(handler, ast)
        case "Refinement": {
          const t = AST.getTransformationFrom(ast)
          if (t === undefined) {
            return mergeRefinements(
              go(ast.from, $defs, handleIdentifier, path, options),
              handler,
              ast
            )
          } else if (!isOverrideAnnotation(handler)) {
            return go(t, $defs, handleIdentifier, path, options)
          }
        }
      }
      if (!isOverrideAnnotation(handler)) {
        return {
          ...go(ast, $defs, handleIdentifier, path, options, false),
          ...handler
        } as any
      }
      return handler
    }
  }
  const surrogate = AST.getSurrogateAnnotation(ast)
  if (Option.isSome(surrogate)) {
    return go(surrogate.value, $defs, handleIdentifier, path, options)
  }
  switch (ast._tag) {
    // Unsupported
    case "Declaration":
    case "UndefinedKeyword":
    case "BigIntKeyword":
    case "UniqueSymbol":
    case "SymbolKeyword":
      throw new Error(errors_.getJSONSchemaMissingAnnotationErrorMessage(path, ast))
    case "Suspend": {
      if (handleIdentifier) {
        throw new Error(errors_.getJSONSchemaMissingIdentifierAnnotationErrorMessage(path, ast))
      }
      return go(ast.f(), $defs, false, path, options)
    }
    // Primitives
    case "NeverKeyword":
      return addAnnotations(constNever, ast)
    case "VoidKeyword":
      return addAnnotations(constVoid, ast)
    case "UnknownKeyword":
      return addAnnotations(constUnknown, ast)
    case "AnyKeyword":
      return addAnnotations(constAny, ast)
    case "ObjectKeyword":
      return addAnnotations(constObject, ast)
    case "StringKeyword":
      return addAnnotations({ type: "string" }, ast)
    case "NumberKeyword":
      return addAnnotations({ type: "number" }, ast)
    case "BooleanKeyword":
      return addAnnotations({ type: "boolean" }, ast)
    case "Literal": {
      const literal = ast.literal
      if (literal === null) {
        return addAnnotations({ type: "null" }, ast)
      } else if (Predicate.isString(literal)) {
        return addAnnotations({ type: "string", enum: [literal] }, ast)
      } else if (Predicate.isNumber(literal)) {
        return addAnnotations({ type: "number", enum: [literal] }, ast)
      } else if (Predicate.isBoolean(literal)) {
        return addAnnotations({ type: "boolean", enum: [literal] }, ast)
      }
      throw new Error(errors_.getJSONSchemaMissingAnnotationErrorMessage(path, ast))
    }
    case "Enums": {
      const anyOf = ast.enums.map((e) => {
        const type: "string" | "number" = Predicate.isNumber(e[1]) ? "number" : "string"
        return { type, title: e[0], enum: [e[1]] }
      })
      return anyOf.length >= 1 ?
        addAnnotations({
          $comment: "/schemas/enums",
          anyOf
        }, ast) :
        addAnnotations(constNever, ast)
    }
    case "TupleType": {
      const elements = ast.elements.map((e, i) =>
        mergeJsonSchemaAnnotations(
          go(e.type, $defs, true, path.concat(i), options),
          getContextJsonSchemaAnnotations(e.type, e)
        )
      )
      const rest = ast.rest.map((type) =>
        mergeJsonSchemaAnnotations(
          go(type.type, $defs, true, path, options),
          getContextJsonSchemaAnnotations(type.type, type)
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

      return addAnnotations(output, ast)
    }
    case "TypeLiteral": {
      if (ast.propertySignatures.length === 0 && ast.indexSignatures.length === 0) {
        return addAnnotations(constEmptyStruct, ast)
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
          output.properties[name] = mergeJsonSchemaAnnotations(
            go(type, $defs, true, path.concat(ps.name), options),
            getContextJsonSchemaAnnotations(type, ps)
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

      return addAnnotations(output, ast)
    }
    case "Union": {
      const members: Array<JsonSchema7> = ast.types.map((t) => go(t, $defs, true, path, options))
      const anyOf = compactUnion(members)
      switch (anyOf.length) {
        case 0:
          return constNever
        case 1:
          return addAnnotations(anyOf[0], ast)
        default:
          return addAnnotations({ anyOf }, ast)
      }
    }
    case "Refinement":
      return go(ast.from, $defs, handleIdentifier, path, options)
    case "TemplateLiteral": {
      const regex = AST.getTemplateLiteralRegExp(ast)
      return addAnnotations({
        type: "string",
        title: String(ast),
        description: "a template literal",
        pattern: regex.source
      }, ast)
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
      return addAnnotations(go(ast.from, $defs, handleIdentifier, path, options), ast)
    }
  }
}

function isJsonSchema7NeverWithoutCustomAnnotations(jsonSchema: JsonSchema7): boolean {
  return jsonSchema === constNever || (Predicate.hasProperty(jsonSchema, "$id") && jsonSchema.$id === constNever.$id &&
    Object.keys(jsonSchema).length === 3 && jsonSchema.title === AST.neverKeyword.annotations[AST.TitleAnnotationId])
}

function isCompactableLiteral(jsonSchema: JsonSchema7 | undefined): jsonSchema is JsonSchema7Enum {
  return Predicate.hasProperty(jsonSchema, "enum") && "type" in jsonSchema && Object.keys(jsonSchema).length === 2
}

function compactUnion(members: Array<JsonSchema7>): Array<JsonSchema7> {
  const out: Array<JsonSchema7> = []
  for (const m of members) {
    if (isJsonSchema7NeverWithoutCustomAnnotations(m)) continue
    if (isCompactableLiteral(m) && out.length > 0) {
      const last = out[out.length - 1]
      if (isCompactableLiteral(last) && last.type === m.type) {
        out[out.length - 1] = {
          type: last.type,
          enum: [...last.enum, ...m.enum]
        } as JsonSchema7Enum
        continue
      }
    }
    out.push(m)
  }
  return out
}
