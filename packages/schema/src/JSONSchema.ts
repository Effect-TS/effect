/**
 * @since 1.0.0
 */

import * as Chunk from "effect/Chunk"
import * as Effect from "effect/Effect"
import * as Function from "effect/Function"
import * as Match from "effect/Match"
import * as Option from "effect/Option"
import * as Predicate from "effect/Predicate"
import * as ReadonlyArray from "effect/ReadonlyArray"
import * as ReadonlyRecord from "effect/ReadonlyRecord"
import * as Stream from "effect/Stream"
import * as AST from "./AST.js"
import * as Parser from "./Parser.js"
import * as Schema from "./Schema.js"

/**
 * @category model
 * @since 1.0.0
 */
export interface JsonSchema7Any {
  $id: "/schemas/any"
}

/**
 * @category guards
 * @since 1.0.0
 */
export const isJsonSchema7Any = (schema: JsonSchema7): schema is JsonSchema7Any =>
  (schema as unknown as Record<string, unknown>).$id === "/schemas/any"

/**
 * @category model
 * @since 1.0.0
 */
export interface JsonSchema7Unknown {
  $id: "/schemas/unknown"
}

/**
 * @category guards
 * @since 1.0.0
 */
export const isJsonSchema7Unknown = (schema: JsonSchema7): schema is JsonSchema7Unknown =>
  (schema as unknown as Record<string, unknown>).$id === "/schemas/unknown"

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
export const isJsonSchema7object = (schema: JsonSchema7): schema is JsonSchema7object =>
  (schema as unknown as Record<string, unknown>).$id === "/schemas/object"

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
export const isJsonSchema7Empty = (schema: JsonSchema7): schema is JsonSchema7empty =>
  (schema as unknown as Record<string, unknown>).$id === "/schemas/{}"

/**
 * @category model
 * @since 1.0.0
 */
export interface JsonSchema7Ref {
  $ref: string
}

/**
 * @category guards
 * @since 1.0.0
 */
export const isJsonSchema7Ref = (schema: JsonSchema7): schema is JsonSchema7Ref =>
  (schema as unknown as Record<string, unknown>).$ref !== undefined

/**
 * @category model
 * @since 1.0.0
 */
export interface JsonSchema7Const {
  const: AST.LiteralValue
}

/**
 * @category guards
 * @since 1.0.0
 */
export const isJsonSchema7Const = (schema: JsonSchema7): schema is JsonSchema7Const =>
  (schema as unknown as Record<string, unknown>).const !== undefined

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
 * @category guards
 * @since 1.0.0
 */
export const isJsonSchema7String = (schema: JsonSchema7): schema is JsonSchema7String =>
  (schema as unknown as Record<string, unknown>).type === "string"

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
 * @category guards
 * @since 1.0.0
 */
export const isJsonSchema7Number = (schema: JsonSchema7): schema is JsonSchema7Number =>
  (schema as unknown as Record<string, unknown>).type === "number"

/**
 * @category model
 * @since 1.0.0
 */
export interface JsonSchema7Integer extends JsonSchema7Numeric {
  type: "integer"
}

/**
 * @category guards
 * @since 1.0.0
 */
export const isJsonSchema7Integer = (schema: JsonSchema7): schema is JsonSchema7Integer =>
  (schema as unknown as Record<string, unknown>).type === "integer"

/**
 * @category model
 * @since 1.0.0
 */
export interface JsonSchema7Boolean {
  type: "boolean"
}

/**
 * @category guards
 * @since 1.0.0
 */
export const isJsonSchema7Boolean = (schema: JsonSchema7): schema is JsonSchema7Boolean =>
  (schema as unknown as Record<string, unknown>).type === "boolean"

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
 * @category guards
 * @since 1.0.0
 */
export const isJsonSchema7Array = (schema: JsonSchema7): schema is JsonSchema7Array =>
  (schema as unknown as Record<string, unknown>).type === "array"

/**
 * @category model
 * @since 1.0.0
 */
export interface JsonSchema7OneOf {
  oneOf: Array<JsonSchema7>
}

/**
 * @category guards
 * @since 1.0.0
 */
export const isJsonSchema7OneOf = (schema: JsonSchema7): schema is JsonSchema7OneOf =>
  (schema as unknown as Record<string, unknown>).oneOf !== undefined

/**
 * @category model
 * @since 1.0.0
 */
export interface JsonSchema7Enum {
  enum: Array<AST.LiteralValue>
}

/**
 * @category guards
 * @since 1.0.0
 */
export const isJsonSchema7Enum = (schema: JsonSchema7): schema is JsonSchema7Enum =>
  (schema as unknown as Record<string, unknown>).enum !== undefined

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
 * @category guards
 * @since 1.0.0
 */
export const isJsonSchema7Enums = (schema: JsonSchema7): schema is JsonSchema7Enums =>
  (schema as unknown as Record<string, unknown>).$comment === "/schemas/enums"

/**
 * @category model
 * @since 1.0.0
 */
export interface JsonSchema7AnyOf {
  anyOf: Array<JsonSchema7>
}

/**
 * @category guards
 * @since 1.0.0
 */
export const isJsonSchema7AnyOf = (schema: JsonSchema7): schema is JsonSchema7AnyOf =>
  (schema as unknown as Record<string, unknown>).anyOf !== undefined

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
 * @category guards
 * @since 1.0.0
 */
export const isJsonSchema7Object = (schema: JsonSchema7): schema is JsonSchema7Object =>
  (schema as unknown as Record<string, unknown>).type === "object"

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
 * @category guards
 * @since 1.0.0
 */
export const isJsonSchema7Root = (schema: JsonSchema7 | JsonSchema7Root): schema is JsonSchema7Root =>
  (schema as unknown as Record<string, unknown>).$defs !== undefined

/**
 * @category encoding
 * @since 1.0.0
 */
export const to = <I, A>(schema: Schema.Schema<I, A>): JsonSchema7Root => goRoot(AST.to(schema.ast))

/**
 * @category encoding
 * @since 1.0.0
 */
export const from = <I, A>(schema: Schema.Schema<I, A>): JsonSchema7Root => goRoot(AST.from(schema.ast))

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
      return { type: Option.getOrElse(AST.getAnnotation(ast, AST.TypeAnnotationId), () => "number") as "number" }
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
            output.required.sort((a, b) => a.length - b.length)
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

// Deocding utility types
type UnknownSchema = Schema.Schema<unknown, unknown>
type UnknownSchemaIdentity = (_: UnknownSchema) => UnknownSchema

/** @internal */
export const traverse = (json: JsonSchema7 | JsonSchema7Root): Stream.Stream<never, Error, JsonSchema7> =>
  Function.pipe(
    Match.value(json),
    Match.whenOr(
      isJsonSchema7Any,
      isJsonSchema7object,
      isJsonSchema7Unknown,
      isJsonSchema7Boolean,
      isJsonSchema7Empty,
      isJsonSchema7Const,
      isJsonSchema7Enum,
      isJsonSchema7Enums,
      isJsonSchema7Number,
      isJsonSchema7Integer,
      isJsonSchema7String,
      isJsonSchema7Ref,
      () => {
        return Stream.fromIterable([json])
      }
    ),
    Match.when(
      isJsonSchema7AnyOf,
      ({ anyOf }) =>
        Stream.mergeAll([Stream.fromIterable([json]), ...anyOf.map(traverse)], { "concurrency": "unbounded" })
    ),
    Match.when(
      isJsonSchema7OneOf,
      ({ oneOf }) =>
        Stream.mergeAll([Stream.fromIterable([json]), ...oneOf.map(traverse)], { "concurrency": "unbounded" })
    ),
    Match.when(isJsonSchema7Object, ({ additionalProperties, patternProperties, properties }) => {
      const propertiesStream = Stream.mergeAll(Object.values(properties).map(traverse), { concurrency: "unbounded" })

      const additionalPropertiesStream =
        !Predicate.isBoolean(additionalProperties) && Predicate.isNotUndefined(additionalProperties)
          ? traverse(additionalProperties)
          : Stream.empty

      const patternPropertiesStream = patternProperties && Object.keys(patternProperties).length
        ? Stream.mergeAll(Object.values(patternProperties).map(traverse), { "concurrency": "unbounded" })
        : Stream.empty

      return Stream.mergeAll([
        Stream.fromIterable([json]),
        additionalPropertiesStream,
        patternPropertiesStream,
        propertiesStream
      ], { concurrency: "unbounded" })
    }),
    Match.when(isJsonSchema7Array, ({ additionalItems, items }) => {
      const additionalItemsStream = !Predicate.isBoolean(additionalItems) && Predicate.isNotUndefined(additionalItems)
        ? traverse(additionalItems)
        : Stream.empty

      const itemsStream = Array.isArray(items)
        ? Stream.mergeAll(items.map(traverse), { concurrency: "unbounded" })
        : Predicate.isNotUndefined(items)
        ? traverse(items)
        : Stream.empty

      return Stream.mergeAll([Stream.fromIterable([json]), additionalItemsStream, itemsStream], {
        concurrency: "unbounded"
      })
    }),
    Match.orElse(() => Stream.fail(new Error(`Cannot traverse ${JSON.stringify(json)}`)))
  )

/** @internal */
const decodeWithReferences = (input: JsonSchema7, references: Record<string, UnknownSchema>): UnknownSchema =>
  Function.pipe(
    Match.value(input),
    // ---------------------------------------------
    // Trivial cases
    // ---------------------------------------------
    Match.when(isJsonSchema7Any, () => Schema.any),
    Match.when(isJsonSchema7object, () => Schema.object),
    Match.when(isJsonSchema7Unknown, () => Schema.unknown),
    Match.when(isJsonSchema7Boolean, () => Schema.boolean),
    Match.when(isJsonSchema7Empty, () => Schema.struct({})),
    Match.when(isJsonSchema7Const, ({ const: const_ }) => Schema.literal(const_)),
    // ---------------------------------------------
    // Handle enums
    // ---------------------------------------------
    Match.when(
      isJsonSchema7Enum,
      ({ enum: enum_ }) => Schema.union(...ReadonlyArray.map(enum_, (a) => Schema.literal(a)))
    ),
    Match.when(
      isJsonSchema7Enums,
      ({ oneOf }) => Schema.enums(Object.assign({}, ...oneOf.map(({ const: const_, title }) => ({ [title]: const_ }))))
    ),
    // ---------------------------------------------
    // Hndle numberic types
    // ---------------------------------------------
    Match.whenOr(
      isJsonSchema7Number,
      isJsonSchema7Integer,
      ({ exclusiveMaximum: exclusiveMax, exclusiveMinimum: exclusiveMin, maximum: max, minimum: min }) => {
        const number = isJsonSchema7Integer(input) ? Schema.int()(Schema.number) : Schema.number
        const lessThanOrEqualTo = Predicate.isNullable(min) ? Function.identity : Schema.greaterThanOrEqualTo(min)
        const greaterThanOrEqualTo = Predicate.isNullable(max) ? Function.identity : Schema.lessThanOrEqualTo(max)
        const lessThan = Predicate.isNullable(exclusiveMin) ? Function.identity : Schema.greaterThan(exclusiveMin)
        const greaterThan = Predicate.isNullable(exclusiveMax) ? Function.identity : Schema.lessThan(exclusiveMax)
        return Function.flow(lessThanOrEqualTo, greaterThanOrEqualTo, lessThan, greaterThan)(number)
      }
    ),
    // ---------------------------------------------
    // Handle string types
    // ---------------------------------------------
    Match.when(isJsonSchema7String, ({ description, maxLength, minLength, pattern }) => {
      const withMaxLength = Predicate.isNullable(maxLength) ? Function.identity : Schema.maxLength(maxLength)
      const withMinLength = Predicate.isNullable(minLength) ? Function.identity : Schema.minLength(minLength)
      const withPattern = Predicate.isNullable(pattern) ? Function.identity : Schema.pattern(new RegExp(pattern))
      const withDescription = Predicate.isNullable(description) ? Function.identity : Schema.description(description)
      return Function.flow(withMaxLength, withMinLength, withPattern, withDescription)(Schema.string)
    }),
    // ---------------------------------------------
    // Handle objects (will do recursive calls for the properties)
    // ---------------------------------------------
    Match.when(isJsonSchema7Object, ({ additionalProperties, patternProperties, properties, required }) => {
      const fields = Object.entries(properties).map(([name, property]) => {
        const isRequired = required.includes(name)
        const decodedProperty = decodeWithReferences(property, references)
        const withOptional = isRequired
          ? Schema.required(decodedProperty)
          : Schema.optional(decodedProperty, { exact: true }) // FIXME: How do I know if this is "exact" / will it always be "exact" here?
        return [name, withOptional] as const
      })

      const initialStruct = Schema.struct(Object.fromEntries(fields)) as UnknownSchema
      const hasPatternProperties = Predicate.isNotNullable(patternProperties) && Object.keys(patternProperties).length
      const hasUnknownAdditionalProperties = additionalProperties === true
      const hasKnownAdditionalProperties = Predicate.isNotUndefined(additionalProperties) &&
        !Predicate.isBoolean(additionalProperties) && Object.keys(additionalProperties).length

      const withPattern: UnknownSchemaIdentity = hasPatternProperties
        ? Schema.extend(
          Schema.record(
            Schema.string.pipe(Schema.pattern(new RegExp(Object.keys(patternProperties)[0]!))),
            decodeWithReferences(patternProperties[Object.keys(patternProperties)[0]!], references)
          )
        ) as UnknownSchemaIdentity
        : Function.identity as UnknownSchemaIdentity

      const withUnknownAdditional = hasUnknownAdditionalProperties
        ? Schema.extend(Schema.record(Schema.string, Schema.unknown)) as UnknownSchemaIdentity
        : Function.identity as UnknownSchemaIdentity

      const withKnownAdditional = hasKnownAdditionalProperties
        ? Schema.extend(
          Schema.record(Schema.string, decodeWithReferences(additionalProperties, references))
        ) as UnknownSchemaIdentity
        : Function.identity as UnknownSchemaIdentity

      return Function.flow(withPattern, withUnknownAdditional, withKnownAdditional)(initialStruct)
    }),
    // ---------------------------------------------
    // Handle arrays and tuples (will do recursive call for the inner type)
    // ---------------------------------------------
    Match.when(isJsonSchema7Array, ({ additionalItems, items, maxItems: _maxItems, minItems }) => {
      if (!items) {
        return Schema.tuple()
      }

      const itemsArray = Array.isArray(items) ? items : [items]
      if (Predicate.isUndefined(minItems)) {
        return Schema.array(decodeWithReferences(itemsArray[0], references))
      }

      const [elements, optionalElements] = Function.pipe(
        itemsArray,
        ReadonlyArray.map((a) => decodeWithReferences(a, references)),
        ReadonlyArray.splitAt(minItems ?? 0)
      )

      const applyOptionalElements = Stream.fromIterable(optionalElements).pipe(
        Stream.map(Schema.optionalElement),
        Stream.runFold(
          Function.identity as (_: Schema.Schema<any, any>) => Schema.Schema<any, any>,
          (state, a) => Function.compose(state, a)
        ),
        Effect.runSync
      )

      const applyRest: (_: Schema.Schema<any, any>) => Schema.Schema<any, any> = additionalItems === true
        ? Schema.rest(Schema.unknown)
        : additionalItems
        ? Schema.rest(decodeWithReferences(additionalItems, references))
        : Function.identity

      return Schema.tuple(...elements).pipe(applyOptionalElements).pipe(applyRest)
    }),
    // ---------------------------------------------
    // Handle unions (will do recursive calls for the inner types)
    // ---------------------------------------------
    Match.when(
      isJsonSchema7AnyOf,
      ({ anyOf }) => Schema.union(...anyOf.map((x) => decodeWithReferences(x, references)))
    ),
    Match.when(
      isJsonSchema7OneOf,
      ({ oneOf }) => Schema.union(...oneOf.map((x) => decodeWithReferences(x, references)))
    ),
    // ---------------------------------------------
    // Handle references
    // ---------------------------------------------
    Match.when(
      isJsonSchema7Ref,
      ({ $ref }) => {
        const reference = String($ref.replace(DEFINITION_PREFIX, ""))
        return Schema.identifier(reference)(Schema.suspend(() => references[reference]))
      }
    ),
    // ---------------------------------------------
    // Handle unknowns (malformed json schemas that can't be parsed)
    // ---------------------------------------------
    Match.orElse(() => {
      throw new Error(`Cannot convert ${JSON.stringify(input)} to Effect Schema`)
    }),
    // ---------------------------------------------
    // Add description and example annotations
    // ---------------------------------------------
    (schema) => {
      const record = input as unknown as Record<string, unknown>
      const withDescription = Predicate.isNotNullable(record.description) && Predicate.isString(record.description)
        ? Schema.description(record.description)
        : Function.identity
      const withExamples = Predicate.isNotNullable(record.examples) && Predicate.isString(record.examples)
        ? Schema.examples([record.examples])
        : Function.identity

      return Function.flow(withDescription, withExamples)(schema as UnknownSchema)
    }
  )

/**
 * @category decoding
 * @since 1.0.0
 */
export const decodeSingleSchema = (schema: JsonSchema7Root | JsonSchema7): Schema.Schema<unknown, unknown> => {
  const a = isJsonSchema7Root(schema) ? (Object.values(schema.$defs || {}).map(traverse)) : [Stream.empty]
  const allReferences = Stream.mergeAll([traverse(schema), ...a], { "concurrency": "unbounded" }).pipe(
    Stream.filter(isJsonSchema7Ref),
    Stream.map((a) => a.$ref),
    Stream.runCollect,
    Effect.orDie,
    Effect.runSync,
    Chunk.map((ref) => ref.replace(DEFINITION_PREFIX, "")),
    Chunk.dedupe,
    Chunk.toArray
  )

  const initialReferences: Record<string, UnknownSchema> = Object.fromEntries(
    allReferences.map((name) => [name, Function.unsafeCoerce(undefined)])
  )

  // Trivial case when schema is not a root obejct (shouldn't contain any references since it's not a root schema)
  if (!isJsonSchema7Root(schema)) {
    if (allReferences.length > 0) {
      throw new Error("Cannot decode a single schema with references")
    }
    return decodeWithReferences(schema, {})
  }

  // Non trivial case when schema is a root object
  for (const [name, json] of Object.entries(schema.$defs ?? {}).reverse()) {
    initialReferences[name] = decodeWithReferences(json, initialReferences)
  }
  return decodeWithReferences(schema, initialReferences)
}

/**
 * @category decoding
 * @since 1.0.0
 */
export const decodeMultiSchema = (schema: JsonSchema7Root): Record<string, UnknownSchema> => {
  const a = isJsonSchema7Root(schema) ? (Object.values(schema.$defs || {}).map(traverse)) : [Stream.empty]
  const allReferences = Stream.mergeAll([traverse(schema), ...a], { "concurrency": "unbounded" }).pipe(
    Stream.filter(isJsonSchema7Ref),
    Stream.map((a) => a.$ref),
    Stream.runCollect,
    Effect.orDie,
    Effect.runSync,
    Chunk.map((ref) => ref.replace(DEFINITION_PREFIX, "")),
    Chunk.dedupe,
    Chunk.toArray
  )

  const initialReferences: Record<string, UnknownSchema> = Object.fromEntries(
    allReferences.map((name) => [name, Function.unsafeCoerce(undefined)])
  )

  for (const [name, json] of Object.entries(schema.$defs ?? {}).reverse()) {
    initialReferences[name] = decodeWithReferences(json, initialReferences)
  }

  return initialReferences
}
