/**
 * @since 1.0.0
 */
import type { Option } from "@fp-ts/data/Option"

/**
 * @since 1.0.0
 */
export interface Declaration {
  readonly [_: string]: Function
}

/**
 * @since 1.0.0
 */
export interface Declarations extends ReadonlyMap<symbol, Declaration> {}

/**
 * @since 1.0.0
 */
export type Meta =
  | Apply
  | Never
  | Unknown
  | Any
  | String
  | Number
  | Boolean
  | Of
  | Array
  | Struct
  | IndexSignature
  | Tuple
  | Union
  | Lazy

/**
 * @since 1.0.0
 */
export interface Apply {
  readonly _tag: "Apply"
  readonly symbol: symbol
  readonly config: Option<unknown>
  readonly declaration: Declaration
  readonly metas: ReadonlyArray<Meta>
}

/**
 * @since 1.0.0
 */
export const apply = (
  symbol: symbol,
  config: Option<unknown>,
  declaration: Declaration,
  metas: ReadonlyArray<Meta>
): Apply => ({
  _tag: "Apply",
  symbol,
  config,
  declaration,
  metas
})

/**
 * @since 1.0.0
 */
export interface Never {
  readonly _tag: "Never"
}

/**
 * @since 1.0.0
 */
export const never: Never = { _tag: "Never" }

/**
 * @since 1.0.0
 */
export interface Unknown {
  readonly _tag: "Unknown"
}

/**
 * @since 1.0.0
 */
export const unknown: Unknown = { _tag: "Unknown" }

/**
 * @since 1.0.0
 */
export interface Any {
  readonly _tag: "Any"
}

/**
 * @since 1.0.0
 */
export const any: Any = { _tag: "Any" }

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
export const isString = (meta: Meta): meta is String => meta._tag === "String"

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
export const isNumber = (meta: Meta): meta is Number => meta._tag === "Number"

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
export interface Of {
  readonly _tag: "Of"
  readonly value: unknown
}

/**
 * @since 1.0.0
 */
export const of = (value: unknown): Of => ({
  _tag: "Of",
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
export interface Field {
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
): Field => ({ key, value, optional, readonly })

/**
 * @since 1.0.0
 */
export interface Struct {
  readonly _tag: "Struct"
  readonly fields: ReadonlyArray<Field>
}

/**
 * @since 1.0.0
 */
export const struct = (fields: ReadonlyArray<Field>): Struct => ({ _tag: "Struct", fields })

/**
 * @since 1.0.0
 */
export const isStruct = (meta: Meta): meta is Struct => meta._tag === "Struct"

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

/**
 * @since 1.0.0
 */
export interface Lazy {
  readonly _tag: "Lazy"
  readonly symbol: symbol
  readonly f: () => Meta
}

/**
 * @since 1.0.0
 */
export const lazy = (symbol: symbol, f: () => Meta): Lazy => ({
  _tag: "Lazy",
  symbol,
  f
})

/**
 * @since 1.0.0
 */
export const isLazy = (meta: Meta): meta is Lazy => meta._tag === "Lazy"
