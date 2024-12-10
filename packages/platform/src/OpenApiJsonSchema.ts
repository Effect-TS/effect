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
  format?: string
  contentMediaType?: string
  contentSchema?: JsonSchema
  allOf?: globalThis.Array<{
    minLength?: number
    maxLength?: number
    pattern?: string
  }>
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

/**
 * Creates a schema with additional options and definitions.
 *
 * - `defs`: A record of definitions that are included in the schema.
 * - `defsPath`: The path to the definitions within the schema (defaults to "#/$defs/").
 * - `topLevelReferenceStrategy`: Controls the handling of the top-level reference. Possible values are:
 *   - `"keep"`: Keep the top-level reference (default behavior).
 *   - `"skip"`: Skip the top-level reference.
 *
 * @category encoding
 * @since 1.0.0
 */
export const makeWithDefs = <A, I, R>(schema: Schema.Schema<A, I, R>, options: {
  readonly defs: Record<string, JsonSchema>
  readonly defsPath?: string
  readonly topLevelReferenceStrategy?: "skip" | "keep"
}): JsonSchema => {
  return JSONSchema.fromAST(schema.ast, {
    definitions: options.defs,
    definitionPath: options.defsPath ?? "#/components/schemas/",
    target: "openApi3.1",
    topLevelReferenceStrategy: options.topLevelReferenceStrategy ?? "keep"
  })
}
