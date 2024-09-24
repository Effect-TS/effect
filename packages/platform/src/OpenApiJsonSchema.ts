/**
 * @since 1.0.0
 */
import * as AST from "@effect/schema/AST"
import type * as ParseResult from "@effect/schema/ParseResult"
import type * as Schema from "@effect/schema/Schema"
import * as Arr from "effect/Array"
import * as Option from "effect/Option"
import * as Predicate from "effect/Predicate"
import * as Record from "effect/Record"

/**
 * @category model
 * @since 1.0.0
 */
export interface Annotations {
  title?: string
  description?: string
  default?: unknown
  examples?: globalThis.Array<unknown>
}

/**
 * @category model
 * @since 1.0.0
 */
export interface Any extends Annotations {
  $id: "/schemas/any"
}

/**
 * @category model
 * @since 1.0.0
 */
export interface Unknown extends Annotations {
  $id: "/schemas/unknown"
}

/**
 * @category model
 * @since 0.69.0
 */
export interface Void extends Annotations {
  $id: "/schemas/void"
}

/**
 * @category model
 * @since 0.71.0
 */
export interface AnyObject extends Annotations {
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
export interface Empty extends Annotations {
  $id: "/schemas/{}"
  anyOf: [
    { type: "object" },
    { type: "array" }
  ]
}

/**
 * @category model
 * @since 1.0.0
 */
export interface Ref extends Annotations {
  $ref: string
}

/**
 * @category model
 * @since 1.0.0
 */
export interface String extends Annotations {
  type: "string"
  minLength?: number
  maxLength?: number
  pattern?: string
  contentEncoding?: string
  contentMediaType?: string
  contentSchema?: JsonSchema
}

/**
 * @category model
 * @since 1.0.0
 */
export interface Numeric extends Annotations {
  minimum?: number
  exclusiveMinimum?: number
  maximum?: number
  exclusiveMaximum?: number
}

/**
 * @category model
 * @since 1.0.0
 */
export interface Number extends Numeric {
  type: "number"
}

/**
 * @category model
 * @since 1.0.0
 */
export interface Integer extends Numeric {
  type: "integer"
}

/**
 * @category model
 * @since 1.0.0
 */
export interface Boolean extends Annotations {
  type: "boolean"
}

/**
 * @category model
 * @since 1.0.0
 */
export interface Array extends Annotations {
  type: "array"
  items?: JsonSchema | globalThis.Array<JsonSchema>
  minItems?: number
  maxItems?: number
  additionalItems?: JsonSchema | boolean
}

/**
 * @category model
 * @since 1.0.0
 */
export interface Enum extends Annotations {
  enum: globalThis.Array<AST.LiteralValue>
}

/**
 * @category model
 * @since 0.71.0
 */
export interface Enums extends Annotations {
  $comment: "/schemas/enums"
  anyOf: globalThis.Array<{
    title: string
    enum: [string | number]
  }>
}

/**
 * @category model
 * @since 1.0.0
 */
export interface AnyOf extends Annotations {
  anyOf: globalThis.Array<JsonSchema>
}

/**
 * @category model
 * @since 1.0.0
 */
export interface Object extends Annotations {
  type: "object"
  required: globalThis.Array<string>
  properties: Record<string, JsonSchema>
  additionalProperties?: boolean | JsonSchema
  patternProperties?: Record<string, JsonSchema>
  propertyNames?: JsonSchema
}

/**
 * @category model
 * @since 0.71.0
 */
export type JsonSchema =
  | Any
  | Unknown
  | Void
  | AnyObject
  | Empty
  | Ref
  | String
  | Number
  | Integer
  | Boolean
  | Array
  | Enum
  | Enums
  | AnyOf
  | Object

/**
 * @category model
 * @since 1.0.0
 */
export type Root = JsonSchema & {
  $defs?: Record<string, JsonSchema>
}

/**
 * @category encoding
 * @since 1.0.0
 */
export const make = <A, I, R>(schema: Schema.Schema<A, I, R>): Root => {
  const $defs: Record<string, any> = {}
  const out = go(schema.ast, $defs, true, []) as Root
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

const constAny: JsonSchema = { $id: "/schemas/any" }

const constUnknown: JsonSchema = { $id: "/schemas/unknown" }

const constVoid: JsonSchema = { $id: "/schemas/void" }

const constAnyObject: JsonSchema = {
  "$id": "/schemas/object",
  "anyOf": [
    { "type": "object" },
    { "type": "array" }
  ]
}

const constEmpty: JsonSchema = {
  "$id": "/schemas/{}",
  "anyOf": [
    { "type": "object" },
    { "type": "array" }
  ]
}

const getJsonSchemaAnnotations = (annotated: AST.Annotated): Annotations =>
  Record.getSomes({
    description: AST.getDescriptionAnnotation(annotated),
    title: AST.getTitleAnnotation(annotated),
    examples: AST.getExamplesAnnotation(annotated),
    default: AST.getDefaultAnnotation(annotated)
  })

const pruneUndefinedKeyword = (ps: AST.PropertySignature): AST.AST | undefined => {
  const type = ps.type
  if (AST.isUnion(type) && Option.isNone(AST.getJSONSchemaAnnotation(type))) {
    const types = type.types.filter((type) => !AST.isUndefinedKeyword(type))
    if (types.length < type.types.length) {
      return AST.Union.make(types, type.annotations)
    }
  }
}

const DEFINITION_PREFIX = "#/$defs/"

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

const isParseJsonTransformation = (ast: AST.AST): boolean => ast.annotations[AST.TypeAnnotationId] === ParseJsonTypeId

const isOverrideAnnotation = (jsonSchema: JsonSchema): boolean => {
  return ("type" in jsonSchema) || ("oneOf" in jsonSchema) || ("anyOf" in jsonSchema) || ("const" in jsonSchema) ||
    ("enum" in jsonSchema) || ("$ref" in jsonSchema)
}

const go = (
  ast: AST.AST,
  $defs: Record<string, JsonSchema>,
  handleIdentifier: boolean,
  path: ReadonlyArray<PropertyKey>
): JsonSchema => {
  const hook = AST.getJSONSchemaAnnotation(ast)
  if (Option.isSome(hook)) {
    const handler = hook.value as JsonSchema
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
        return {
          ...go(t, $defs, true, path),
          ...getJsonSchemaAnnotations(ast)
        }
      }
    }
    return handler
  }
  const surrogate = getSurrogateAnnotation(ast)
  if (Option.isSome(surrogate)) {
    return {
      ...(ast._tag === "Transformation" ? getJsonSchemaAnnotations(ast.to) : {}),
      ...go(surrogate.value, $defs, handleIdentifier, path),
      ...getJsonSchemaAnnotations(ast)
    }
  }
  if (handleIdentifier && !AST.isTransformation(ast)) {
    const identifier = getJSONIdentifier(ast)
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
      throw new Error(getJSONSchemaMissingAnnotationErrorMessage(path, ast))
    case "Literal": {
      const literal = ast.literal
      if (literal === null) {
        return {
          enum: [null],
          ...getJsonSchemaAnnotations(ast)
        }
      } else if (Predicate.isString(literal) || Predicate.isNumber(literal) || Predicate.isBoolean(literal)) {
        return {
          enum: [literal],
          ...getJsonSchemaAnnotations(ast)
        }
      }
      throw new Error(getJSONSchemaMissingAnnotationErrorMessage(path, ast))
    }
    case "UniqueSymbol":
      throw new Error(getJSONSchemaMissingAnnotationErrorMessage(path, ast))
    case "UndefinedKeyword":
      throw new Error(getJSONSchemaMissingAnnotationErrorMessage(path, ast))
    case "VoidKeyword":
      return {
        ...constVoid,
        ...getJsonSchemaAnnotations(ast)
      }
    case "NeverKeyword":
      throw new Error(getJSONSchemaMissingAnnotationErrorMessage(path, ast))
    case "UnknownKeyword":
      return {
        ...constUnknown,
        ...getJsonSchemaAnnotations(ast)
      }

    case "AnyKeyword":
      return {
        ...constAny,
        ...getJsonSchemaAnnotations(ast)
      }
    case "ObjectKeyword":
      return {
        ...constAnyObject,
        ...getJsonSchemaAnnotations(ast)
      }
    case "StringKeyword": {
      return ast === AST.stringKeyword ? { type: "string" } : {
        type: "string",
        ...getJsonSchemaAnnotations(ast)
      }
    }
    case "NumberKeyword": {
      return ast === AST.numberKeyword ? { type: "number" } : {
        type: "number",
        ...getJsonSchemaAnnotations(ast)
      }
    }
    case "BooleanKeyword": {
      return ast === AST.booleanKeyword ? { type: "boolean" } : {
        type: "boolean",
        ...getJsonSchemaAnnotations(ast)
      }
    }
    case "BigIntKeyword":
      throw new Error(getJSONSchemaMissingAnnotationErrorMessage(path, ast))
    case "SymbolKeyword":
      throw new Error(getJSONSchemaMissingAnnotationErrorMessage(path, ast))
    case "TupleType": {
      const elements = ast.elements.map((e, i) => ({
        ...go(e.type, $defs, true, path.concat(i)),
        ...getJsonSchemaAnnotations(e)
      }))
      const rest = ast.rest.map((annotatedAST) => ({
        ...go(annotatedAST.type, $defs, true, path),
        ...getJsonSchemaAnnotations(annotatedAST)
      }))
      const output: Array = { type: "array" }
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
          throw new Error(getJSONSchemaUnsupportedPostRestElementsErrorMessage(path))
        }
      } else {
        if (len > 0) {
          output.additionalItems = false
        } else {
          output.maxItems = 0
        }
      }

      return {
        ...output,
        ...getJsonSchemaAnnotations(ast)
      }
    }
    case "TypeLiteral": {
      if (ast.propertySignatures.length === 0 && ast.indexSignatures.length === 0) {
        return {
          ...constEmpty,
          ...getJsonSchemaAnnotations(ast)
        }
      }
      let patternProperties: JsonSchema | undefined = undefined
      let propertyNames: JsonSchema | undefined = undefined
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
            throw new Error(getJSONSchemaUnsupportedParameterErrorMessage(path, parameter))
        }
      }
      const output: Object = {
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
          output.properties[name] = {
            ...go(pruned ? pruned : ps.type, $defs, true, path.concat(ps.name)),
            ...getJsonSchemaAnnotations(ps)
          }
          // ---------------------------------------------
          // handle optional property signatures
          // ---------------------------------------------
          if (!ps.isOptional && pruned === undefined) {
            output.required.push(name)
          }
        } else {
          throw new Error(getJSONSchemaUnsupportedKeyErrorMessage(name, path))
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

      return {
        ...output,
        ...getJsonSchemaAnnotations(ast)
      }
    }
    case "Union": {
      const enums: globalThis.Array<AST.LiteralValue> = []
      const anyOf: globalThis.Array<JsonSchema> = []
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
        return { enum: enums, ...getJsonSchemaAnnotations(ast) }
      } else {
        if (enums.length >= 1) {
          anyOf.push({ enum: enums })
        }
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
      throw new Error(getJSONSchemaMissingAnnotationErrorMessage(path, ast))
    }
    case "TemplateLiteral": {
      const regex = AST.getTemplateLiteralRegExp(ast)
      return {
        type: "string",
        description: "a template literal",
        pattern: regex.source,
        ...getJsonSchemaAnnotations(ast)
      }
    }
    case "Suspend": {
      const identifier = Option.orElse(getJSONIdentifier(ast), () => getJSONIdentifier(ast.f()))
      if (Option.isNone(identifier)) {
        throw new Error(getJSONSchemaMissingIdentifierAnnotationErrorMessage(path, ast))
      }
      return {
        ...go(ast.f(), $defs, true, path),
        ...getJsonSchemaAnnotations(ast)
      }
    }
    case "Transformation": {
      // Properly handle S.parseJson transformations by focusing on
      // the 'to' side of the AST. This approach prevents the generation of useless schemas
      // derived from the 'from' side (type: string), ensuring the output matches the intended
      // complex schema type.
      if (isParseJsonTransformation(ast.from)) {
        return {
          type: "string",
          contentMediaType: "application/json",
          contentSchema: go(ast.to, $defs, true, path),
          ...getJsonSchemaAnnotations(ast)
        }
      }
      return {
        ...getJsonSchemaAnnotations(ast.to),
        ...go(ast.from, $defs, true, path),
        ...getJsonSchemaAnnotations(ast)
      }
    }
  }
}

const getJSONSchemaMissingAnnotationErrorMessage = (
  path: ReadonlyArray<PropertyKey>,
  ast: AST.AST
) =>
  getMissingAnnotationErrorMessage(
    `Generating a JSON Schema for this schema requires a "jsonSchema" annotation`,
    path,
    ast
  )

const getJSONSchemaMissingIdentifierAnnotationErrorMessage = (
  path: ReadonlyArray<PropertyKey>,
  ast: AST.AST
) =>
  getMissingAnnotationErrorMessage(
    `Generating a JSON Schema for this schema requires an "identifier" annotation`,
    path,
    ast
  )

const getJSONSchemaUnsupportedParameterErrorMessage = (
  path: ReadonlyArray<PropertyKey>,
  parameter: AST.AST
): string => getErrorMessage("Unsupported index signature parameter", undefined, path, parameter)

const getJSONSchemaUnsupportedPostRestElementsErrorMessage = (path: ReadonlyArray<PropertyKey>): string =>
  getErrorMessage(
    "Generating a JSON Schema for post-rest elements is not currently supported. You're welcome to contribute by submitting a Pull Request",
    undefined,
    path
  )

const getJSONSchemaUnsupportedKeyErrorMessage = (key: PropertyKey, path: ReadonlyArray<PropertyKey>): string =>
  getErrorMessage("Unsupported key", `Cannot encode ${formatPropertyKey(key)} key to JSON Schema`, path)

const getMissingAnnotationErrorMessage = (details?: string, path?: ReadonlyArray<PropertyKey>, ast?: AST.AST): string =>
  getErrorMessage("Missing annotation", details, path, ast)

const getErrorMessage = (
  reason: string,
  details?: string,
  path?: ReadonlyArray<PropertyKey>,
  ast?: AST.AST
): string => {
  let out = reason

  if (path && Arr.isNonEmptyReadonlyArray(path)) {
    out += `\nat path: ${formatPath(path)}`
  }

  if (details !== undefined) {
    out += `\ndetails: ${details}`
  }

  if (ast) {
    out += `\nschema (${ast._tag}): ${ast}`
  }

  return out
}

const formatPathKey = (key: PropertyKey): string => `[${formatPropertyKey(key)}]`

const formatPath = (path: ParseResult.Path): string =>
  isNonEmpty(path) ? path.map(formatPathKey).join("") : formatPathKey(path)

const isNonEmpty = <A>(x: ParseResult.SingleOrNonEmpty<A>): x is Arr.NonEmptyReadonlyArray<A> => Array.isArray(x)

const formatPropertyKey = (name: PropertyKey): string => typeof name === "string" ? JSON.stringify(name) : String(name)

const ParseJsonTypeId: unique symbol = Symbol.for("@effect/schema/TypeId/ParseJson")
const SurrogateAnnotationId = Symbol.for("@effect/schema/annotation/Surrogate")
const JSONIdentifierAnnotationId = Symbol.for("@effect/schema/annotation/JSONIdentifier")

const getSurrogateAnnotation = AST.getAnnotation<AST.AST>(SurrogateAnnotationId)
const getJSONIdentifierAnnotation = AST.getAnnotation<string>(JSONIdentifierAnnotationId)
const getJSONIdentifier = (annotated: AST.Annotated) =>
  Option.orElse(getJSONIdentifierAnnotation(annotated), () => AST.getIdentifierAnnotation(annotated))
