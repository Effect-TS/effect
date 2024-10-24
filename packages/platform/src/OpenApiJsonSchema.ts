/**
 * @since 1.0.0
 */
import * as Arr from "effect/Array"
import * as Option from "effect/Option"
import type * as ParseResult from "effect/ParseResult"
import * as Predicate from "effect/Predicate"
import * as Record from "effect/Record"
import type * as Schema from "effect/Schema"
import * as AST from "effect/SchemaAST"

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
  const out = makeWithDefs(schema, { defs: $defs })
  if (!Record.isEmptyRecord($defs)) {
    out.$defs = $defs
  }
  return out
}

/**
 * @category encoding
 * @since 1.0.0
 */
export const makeWithDefs = <A, I, R>(schema: Schema.Schema<A, I, R>, options: {
  readonly defs: Record<string, any>
  readonly defsPath?: string
}): Root => {
  const defsPath = options.defsPath ?? "#/$defs/"
  const getRef = (id: string) => `${defsPath}${id}`
  const out = go(schema.ast, options.defs, true, [], { getRef }) as Root
  for (const id in options.defs) {
    if (options.defs[id]["$ref"] === getRef(id)) {
      delete options.defs[id]
    }
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

const removeDefaultJsonSchemaAnnotations = (
  jsonSchemaAnnotations: Annotations,
  ast: AST.AST
): Annotations => {
  if (jsonSchemaAnnotations["title"] === ast.annotations[AST.TitleAnnotationId]) {
    delete jsonSchemaAnnotations["title"]
  }
  if (jsonSchemaAnnotations["description"] === ast.annotations[AST.DescriptionAnnotationId]) {
    delete jsonSchemaAnnotations["description"]
  }
  return jsonSchemaAnnotations
}

const getASTJsonSchemaAnnotations = (ast: AST.AST): Annotations => {
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
  ast._tag === "Transformation" &&
  ast.from.annotations[AST.SchemaIdAnnotationId] === AST.ParseJsonSchemaId

const isOverrideAnnotation = (jsonSchema: JsonSchema): boolean => {
  return ("type" in jsonSchema) || ("oneOf" in jsonSchema) || ("anyOf" in jsonSchema) || ("const" in jsonSchema) ||
    ("enum" in jsonSchema) || ("$ref" in jsonSchema)
}

const go = (
  ast: AST.AST,
  $defs: Record<string, JsonSchema>,
  handleIdentifier: boolean,
  path: ReadonlyArray<PropertyKey>,
  options: {
    readonly getRef: (id: string) => string
  }
): JsonSchema => {
  const hook = AST.getJSONSchemaAnnotation(ast)
  if (Option.isSome(hook)) {
    const handler = hook.value as JsonSchema
    if (AST.isRefinement(ast)) {
      const t = getRefinementInnerTransformation(ast)
      if (t === undefined) {
        try {
          return {
            ...go(ast.from, $defs, true, path, options),
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
          ...go(t, $defs, true, path, options),
          ...getJsonSchemaAnnotations(ast)
        }
      }
    }
    return handler
  }
  const surrogate = AST.getSurrogateAnnotation(ast)
  if (handleIdentifier && !AST.isRefinement(ast)) {
    const identifier = AST.getJSONIdentifier(
      Option.isSome(surrogate) ?
        {
          annotations: {
            ...(ast._tag === "Transformation" ? ast.to.annotations : {}),
            ...ast.annotations
          }
        } :
        ast
    )
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
  if (Option.isSome(surrogate)) {
    return {
      ...go(surrogate.value, $defs, handleIdentifier, path, options),
      ...(ast._tag === "Transformation" ? getJsonSchemaAnnotations(ast.to) : {}),
      ...getJsonSchemaAnnotations(ast)
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
    case "StringKeyword":
      return { type: "string", ...getASTJsonSchemaAnnotations(ast) }
    case "NumberKeyword":
      return { type: "number", ...getASTJsonSchemaAnnotations(ast) }
    case "BooleanKeyword":
      return { type: "boolean", ...getASTJsonSchemaAnnotations(ast) }
    case "BigIntKeyword":
      throw new Error(getJSONSchemaMissingAnnotationErrorMessage(path, ast))
    case "SymbolKeyword":
      throw new Error(getJSONSchemaMissingAnnotationErrorMessage(path, ast))
    case "TupleType": {
      const elements = ast.elements.map((e, i) => ({
        ...go(e.type, $defs, true, path.concat(i), options),
        ...getJsonSchemaAnnotations(e)
      }))
      const rest = ast.rest.map((annotatedAST) => ({
        ...go(annotatedAST.type, $defs, true, path, options),
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
            ...go(pruned ? pruned : ps.type, $defs, true, path.concat(ps.name), options),
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
        const schema = go(type, $defs, true, path, options)
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
      if (AST.encodedBoundAST(ast) === ast) {
        throw new Error(getJSONSchemaMissingAnnotationErrorMessage(path, ast))
      }
      return go(ast.from, $defs, true, path, options)
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
      const identifier = Option.orElse(AST.getJSONIdentifier(ast), () => AST.getJSONIdentifier(ast.f()))
      if (Option.isNone(identifier)) {
        throw new Error(getJSONSchemaMissingIdentifierAnnotationErrorMessage(path, ast))
      }
      return {
        ...go(ast.f(), $defs, true, path, options),
        ...getJsonSchemaAnnotations(ast)
      }
    }
    case "Transformation": {
      // Properly handle S.parseJson transformations by focusing on
      // the 'to' side of the AST. This approach prevents the generation of useless schemas
      // derived from the 'from' side (type: string), ensuring the output matches the intended
      // complex schema type.
      if (isParseJsonTransformation(ast)) {
        return {
          type: "string",
          contentMediaType: "application/json",
          contentSchema: go(ast.to, $defs, true, path, options),
          ...getJsonSchemaAnnotations(ast)
        }
      }
      return {
        ...getASTJsonSchemaAnnotations(ast.to),
        ...go(ast.from, $defs, true, path, options),
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
