/**
 * @since 1.0.0
 */
import type * as C from "@fp-ts/data/Context"
import type { Option } from "@fp-ts/data/Option"

/**
 * A sum type representing features of the TypeScript language we are interested in.
 *
 * @since 1.0.0
 */
export type Meta =
  | Declare
  | String
  | Number
  | Boolean
  | Equal
  | Array
  | Struct
  | IndexSignature
  | Tuple
  | Union

/**
 * @since 1.0.0
 */
export interface Declare {
  readonly _tag: "Declare"
  readonly tag: C.Tag<any>
  readonly metas: ReadonlyArray<Meta>
}

/**
 * @since 1.0.0
 */
export const declare = (tag: C.Tag<any>, metas: ReadonlyArray<Meta>): Declare => ({
  _tag: "Declare",
  tag,
  metas
})

/**
 * @since 1.0.0
 */
export interface String {
  readonly _tag: "String"
  readonly minLength?: number
  readonly maxLength?: number
}

/**
 * @since 1.0.0
 */
export const string = (
  options: {
    readonly minLength?: number
    readonly maxLength?: number
  }
): String => ({ _tag: "String", ...options })

/**
 * @since 1.0.0
 */
export interface Number {
  readonly _tag: "Number"
  readonly exclusiveMaximum?: number
  readonly exclusiveMinimum?: number
  readonly maximum?: number
  readonly minimum?: number
  readonly multipleOf?: number
}

/**
 * @since 1.0.0
 */
export const number = (
  options: {
    readonly exclusiveMaximum?: number
    readonly exclusiveMinimum?: number
    readonly maximum?: number
    readonly minimum?: number
    readonly multipleOf?: number
  }
): Number => ({ _tag: "Number", ...options })

/**
 * @since 1.0.0
 */
export interface Boolean {
  readonly _tag: "Boolean"
}

/**
 * @since 1.0.0
 */
export const boolean: Boolean = { _tag: "Boolean" }

/**
 * @since 1.0.0
 */
export interface Equal {
  readonly _tag: "Equal"
  readonly value: unknown
}

/**
 * @since 1.0.0
 */
export const equal = (value: unknown): Equal => ({
  _tag: "Equal",
  value
})

/**
 * @since 1.0.0
 */
export interface Array {
  readonly _tag: "Array"
  readonly item: Meta
  readonly readonly: boolean
}

/**
 * @since 1.0.0
 */
export const array = (item: Meta, readonly: boolean): Array => ({
  _tag: "Array",
  item,
  readonly
})

/**
 * @since 1.0.0
 */
export interface FieldDSL {
  readonly key: PropertyKey
  readonly value: Meta
  readonly optional: boolean
  readonly readonly: boolean
}

/**
 * @since 1.0.0
 */
export const field = (
  key: PropertyKey,
  value: Meta,
  optional: boolean,
  readonly: boolean
): FieldDSL => ({ key, value, optional, readonly })

/**
 * @since 1.0.0
 */
export interface Struct {
  readonly _tag: "Struct"
  readonly fields: ReadonlyArray<FieldDSL>
}

/**
 * @since 1.0.0
 */
export const struct = (
  fields: ReadonlyArray<FieldDSL>
): Struct => ({ _tag: "Struct", fields })

/**
 * @since 1.0.0
 */
export interface IndexSignature {
  readonly _tag: "IndexSignature"
  readonly key: "string" | "number" | "symbol"
  readonly value: Meta
  readonly readonly: boolean
}

/**
 * @since 1.0.0
 */
export const indexSignature = (
  key: "string" | "number" | "symbol",
  value: Meta,
  readonly: boolean
): IndexSignature => ({
  _tag: "IndexSignature",
  key,
  value,
  readonly
})

/**
 * @since 1.0.0
 */
export interface Tuple {
  readonly _tag: "Tuple"
  readonly components: ReadonlyArray<Meta>
  readonly restElement: Option<Meta>
  readonly readonly: boolean
}

/**
 * @since 1.0.0
 */
export const tuple = (
  components: ReadonlyArray<Meta>,
  restElement: Option<Meta>,
  readonly: boolean
): Tuple => ({
  _tag: "Tuple",
  components,
  restElement,
  readonly
})

/**
 * @since 1.0.0
 */
export interface Union {
  readonly _tag: "Union"
  readonly members: ReadonlyArray<Meta>
}

/**
 * @since 1.0.0
 */
export const union = (members: ReadonlyArray<Meta>): Union => ({
  _tag: "Union",
  members
})
