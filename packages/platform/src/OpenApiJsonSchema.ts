/**
 * @since 1.0.0
 */
import * as JSONSchema from "effect/JSONSchema"
import * as Record from "effect/Record"
import type * as Schema from "effect/Schema"
import type * as AST from "effect/SchemaAST"

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
export interface Never extends Annotations {
  $id: "/schemas/never"
  not: {}
  nullable?: boolean
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
  nullable?: boolean
}

/**
 * @category model
 * @since 0.71.0
 */
export interface Empty extends Annotations {
  $id: "/schemas/%7B%7D"
  anyOf: [
    { type: "object" },
    { type: "array" }
  ]
  nullable?: boolean
}

/**
 * @category model
 * @since 1.0.0
 */
export interface Ref extends Annotations {
  $ref: string
  nullable?: boolean
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
  format?: string
  contentMediaType?: string
  contentSchema?: JsonSchema
  allOf?: globalThis.Array<{
    minLength?: number
    maxLength?: number
    pattern?: string
  }>
  nullable?: boolean
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
  multipleOf?: number
  format?: string
  allOf?: globalThis.Array<{
    minimum?: number
    exclusiveMinimum?: number
    maximum?: number
    exclusiveMaximum?: number
    multipleOf?: number
  }>
  nullable?: boolean
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
  nullable?: boolean
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
  nullable?: boolean
}

/**
 * @category model
 * @since 1.0.0
 */
export interface Enum extends Annotations {
  type?: "string" | "number" | "boolean"
  enum: globalThis.Array<string | number | boolean | null>
  nullable?: boolean
}

/**
 * @category model
 * @since 0.71.0
 */
export interface Enums extends Annotations {
  $comment: "/schemas/enums"
  anyOf: globalThis.Array<{
    type: "string" | "number"
    title: string
    enum: [string | number]
  }>
  nullable?: boolean
}

/**
 * @category model
 * @since 1.0.0
 */
export interface AnyOf extends Annotations {
  anyOf: globalThis.Array<JsonSchema>
  nullable?: boolean
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
  nullable?: boolean
}

/**
 * @category model
 * @since 0.71.0
 */
export type JsonSchema =
  | Never
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
  const defs: Record<string, JsonSchema> = {}
  const out: Root = makeWithDefs(schema, { defs })
  if (!Record.isEmptyRecord(defs)) {
    out.$defs = defs
  }
  return out
}

type TopLevelReferenceStrategy = "skip" | "keep"

type AdditionalPropertiesStrategy = "allow" | "strict"

/**
 * Creates a schema with additional options and definitions.
 *
 * **Options**
 *
 * - `defs`: A record of definitions that are included in the schema.
 * - `defsPath`: The path to the definitions within the schema (defaults to "#/$defs/").
 * - `topLevelReferenceStrategy`: Controls the handling of the top-level reference. Possible values are:
 *   - `"keep"`: Keep the top-level reference (default behavior).
 *   - `"skip"`: Skip the top-level reference.
 * - `additionalPropertiesStrategy`: Controls the handling of additional properties. Possible values are:
 *   - `"strict"`: Disallow additional properties (default behavior).
 *   - `"allow"`: Allow additional properties.
 *
 * @category encoding
 * @since 1.0.0
 */
export const makeWithDefs = <A, I, R>(schema: Schema.Schema<A, I, R>, options: {
  readonly defs: Record<string, any>
  readonly defsPath?: string | undefined
  readonly topLevelReferenceStrategy?: TopLevelReferenceStrategy | undefined
  readonly additionalPropertiesStrategy?: AdditionalPropertiesStrategy | undefined
}): JsonSchema => fromAST(schema.ast, options)

/** @internal */
export const fromAST = (ast: AST.AST, options: {
  readonly defs: Record<string, any>
  readonly defsPath?: string | undefined
  readonly topLevelReferenceStrategy?: TopLevelReferenceStrategy | undefined
  readonly additionalPropertiesStrategy?: AdditionalPropertiesStrategy | undefined
}): JsonSchema => {
  const jsonSchema = JSONSchema.fromAST(ast, {
    definitions: options.defs,
    definitionPath: options.defsPath ?? "#/components/schemas/",
    target: "openApi3.1",
    topLevelReferenceStrategy: options.topLevelReferenceStrategy,
    additionalPropertiesStrategy: options.additionalPropertiesStrategy
  })
  return jsonSchema as JsonSchema
}
