/**
 * @since 3.10.0
 */

import * as errors_ from "./internal/schema/errors.js"
import * as Option from "./Option.js"
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
  $id: "/schemas/{}"
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
 * @since 3.10.0
 */
export interface JsonSchema7String extends JsonSchemaAnnotations {
  type: "string"
  minLength?: number
  maxLength?: number
  pattern?: string
  format?: string
  contentMediaType?: string
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
  enum: Array<AST.LiteralValue>
}

/**
 * @category model
 * @since 3.10.0
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
  const out: JsonSchema7Root = fromAST(ast, {
    definitions
  })
  out.$schema = $schema
  if (!Record.isEmptyRecord(definitions)) {
    out.$defs = definitions
  }
  return out
}

type Target = "jsonSchema7" | "jsonSchema2019-09" | "openApi3.1"

type TopLevelReferenceStrategy = "skip" | "keep"

/**
 * Returns a JSON Schema with additional options and definitions.
 *
 * **Warning**
 *
 * This function is experimental and subject to change.
 *
 * **Details**
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
 *
 * @category encoding
 * @since 3.11.5
 * @experimental
 */
export const fromAST = (ast: AST.AST, options: {
  readonly definitions: Record<string, JsonSchema7>
  readonly definitionPath?: string
  readonly target?: Target
  readonly topLevelReferenceStrategy?: TopLevelReferenceStrategy
}): JsonSchema7 => {
  const definitionPath = options.definitionPath ?? "#/$defs/"
  const getRef = (id: string) => definitionPath + id
  const target: Target = options.target ?? "jsonSchema7"
  const handleIdentifier = options.topLevelReferenceStrategy !== "skip"
  return go(ast, options.definitions, handleIdentifier, [], {
    getRef,
    target
  })
}

const constAny: JsonSchema7 = { $id: "/schemas/any" }

const constUnknown: JsonSchema7 = { $id: "/schemas/unknown" }

const constVoid: JsonSchema7 = { $id: "/schemas/void" }

const constAnyObject: JsonSchema7 = {
  "$id": "/schemas/object",
  "anyOf": [
    { "type": "object" },
    { "type": "array" }
  ]
}

const constEmpty: JsonSchema7 = {
  "$id": "/schemas/{}",
  "anyOf": [
    { "type": "object" },
    { "type": "array" }
  ]
}

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

const pruneUndefinedFromPropertySignature = (ast: AST.AST): AST.AST | undefined => {
  if (Option.isNone(AST.getJSONSchemaAnnotation(ast))) {
    switch (ast._tag) {
      case "UndefinedKeyword":
        return AST.neverKeyword
      case "Union": {
        const types: Array<AST.AST> = []
        let hasUndefined = false
        for (const type of ast.types) {
          const pruned = pruneUndefinedFromPropertySignature(type)
          if (pruned) {
            hasUndefined = true
            if (!AST.isNeverKeyword(pruned)) {
              types.push(pruned)
            }
          } else {
            types.push(type)
          }
        }
        if (hasUndefined) {
          return AST.Union.make(types)
        }
        break
      }
      case "Suspend":
        return pruneUndefinedFromPropertySignature(ast.f())
      case "Transformation":
        return pruneUndefinedFromPropertySignature(ast.from)
    }
  }
}

const isParseJsonTransformation = (ast: AST.AST): boolean =>
  ast.annotations[AST.SchemaIdAnnotationId] === AST.ParseJsonSchemaId

const isOverrideAnnotation = (jsonSchema: JsonSchema7): boolean => {
  return ("type" in jsonSchema) || ("oneOf" in jsonSchema) || ("anyOf" in jsonSchema) || ("const" in jsonSchema) ||
    ("enum" in jsonSchema) || ("$ref" in jsonSchema)
}

// Returns true if the schema is an enum with no other properties.
// This is used to merge enums together.
const isEnumOnly = (schema: JsonSchema7): schema is JsonSchema7Enum =>
  "enum" in schema && Object.keys(schema).length === 1

const go = (
  ast: AST.AST,
  $defs: Record<string, JsonSchema7>,
  handleIdentifier: boolean,
  path: ReadonlyArray<PropertyKey>,
  options: {
    readonly getRef: (id: string) => string
    readonly target: Target
  }
): JsonSchema7 => {
  if (handleIdentifier) {
    const identifier = AST.getJSONIdentifier(ast)
    if (Option.isSome(identifier)) {
      const id = identifier.value
      const out = { $ref: options.getRef(id) }
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
        return {
          ...go(ast.from, $defs, handleIdentifier, path, options),
          ...getJsonSchemaAnnotations(ast),
          ...handler
        }
      } else if (!isOverrideAnnotation(handler)) {
        return go(t, $defs, handleIdentifier, path, options)
      }
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
        return { enum: [null], ...getJsonSchemaAnnotations(ast) }
      } else if (Predicate.isString(literal) || Predicate.isNumber(literal) || Predicate.isBoolean(literal)) {
        return { enum: [literal], ...getJsonSchemaAnnotations(ast) }
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
      return { enum: [], ...getJsonSchemaAnnotations(ast) }
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
        ...getJsonSchemaAnnotations(e)
      }))
      const rest = ast.rest.map((annotatedAST) => ({
        ...go(annotatedAST.type, $defs, true, path, options),
        ...getJsonSchemaAnnotations(annotatedAST)
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
      let patternProperties: JsonSchema7 | undefined = undefined
      let propertyNames: JsonSchema7 | undefined = undefined
      for (const is of ast.indexSignatures) {
        const parameter = is.parameter
        switch (parameter._tag) {
          case "StringKeyword": {
            patternProperties = go(is.type, $defs, true, path, options)
            break
          }
          case "TemplateLiteral": {
            patternProperties = go(is.type, $defs, true, path, options)
            propertyNames = {
              type: "string",
              pattern: AST.getTemplateLiteralRegExp(parameter).source
            }
            break
          }
          case "Refinement": {
            patternProperties = go(is.type, $defs, true, path, options)
            propertyNames = go(parameter, $defs, true, path, options)
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
          const pruned = pruneUndefinedFromPropertySignature(ps.type)
          output.properties[name] = {
            ...go(pruned ?? ps.type, $defs, true, path.concat(ps.name), options),
            ...getJsonSchemaAnnotations(ps)
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
      const anyOf: Array<JsonSchema7> = []
      for (const type of ast.types) {
        const schema = go(type, $defs, true, path, options)
        if ("enum" in schema) {
          if (Object.keys(schema).length > 1) {
            anyOf.push(schema)
          } else {
            const last = anyOf[anyOf.length - 1]
            if (last !== undefined && isEnumOnly(last)) {
              for (const e of schema.enum) {
                last.enum.push(e)
              }
            } else {
              anyOf.push(schema)
            }
          }
        } else {
          anyOf.push(schema)
        }
      }
      if (anyOf.length === 1 && isEnumOnly(anyOf[0])) {
        return { enum: anyOf[0].enum, ...getJsonSchemaAnnotations(ast) }
      } else {
        return { anyOf, ...getJsonSchemaAnnotations(ast) }
      }
    }
    case "Enums": {
      return {
        $comment: "/schemas/enums",
        anyOf: ast.enums.map((e) => ({ title: e[0], enum: [e[1]] })),
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
        if (options.target !== "jsonSchema7") {
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
