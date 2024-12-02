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
  format?: string
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
export type Root = JSONSchema.JsonSchema7 & {
  $defs?: Record<string, JSONSchema.JsonSchema7>
}

/**
 * @category encoding
 * @since 1.0.0
 */
export const make = <A, I, R>(schema: Schema.Schema<A, I, R>): Root => {
  const defs: Record<string, JSONSchema.JsonSchema7> = {}
  const out = makeWithDefs(schema, { defs })
  if (!Record.isEmptyRecord(defs)) {
    out.$defs = defs
  }
  return out
}

/**
 * @category encoding
 * @since 1.0.0
 */
export const makeWithDefs = <A, I, R>(schema: Schema.Schema<A, I, R>, options: {
  readonly defs: Record<string, JSONSchema.JsonSchema7>
  readonly defsPath?: string
}): Root => {
  const defsPath = options.defsPath ?? "#/$defs/"
  const getRef = (id: string) => `${defsPath}${id}`
  return JSONSchema.makeWithOptions(schema, {
    defs: options.defs,
    defsPath,
    getRef
  })
}
