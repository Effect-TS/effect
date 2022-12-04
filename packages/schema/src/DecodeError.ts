/**
 * @since 1.0.0
 */

import type { NonEmptyReadonlyArray } from "@fp-ts/data/ReadonlyArray"

/**
 * @since 1.0.0
 */
export type DecodeError =
  | Custom
  | NotType
  | NotEqual
  | NaN
  | NotFinite
  | MinLength
  | MaxLength
  | Min
  | Max
  | Index
  | Key
  | UnexpectedKey
  | UnexpectedIndex
  | Member

/**
 * @since 1.0.0
 */
export interface Custom {
  readonly _tag: "Custom"
  readonly config: unknown
  readonly actual: unknown
}

/**
 * @since 1.0.0
 */
export const custom = (config: unknown, actual: unknown): Custom => ({
  _tag: "Custom",
  config,
  actual
})

/**
 * @since 1.0.0
 */
export interface NotType {
  readonly _tag: "NotType"
  readonly expected: string
  readonly actual: unknown
}

/**
 * @since 1.0.0
 */
export const notType = (expected: string, actual: unknown): NotType => ({
  _tag: "NotType",
  expected,
  actual
})

/**
 * @since 1.0.0
 */
export interface NotEqual {
  readonly _tag: "NotEqual"
  readonly expected: unknown
  readonly actual: unknown
}

/**
 * @since 1.0.0
 */
export const notEqual = (
  expected: unknown,
  actual: unknown
): NotEqual => ({ _tag: "NotEqual", expected, actual })

/**
 * @since 1.0.0
 */
export interface NaN {
  readonly _tag: "NaN"
}

/**
 * @since 1.0.0
 */
export const nan: NaN = { _tag: "NaN" }

/**
 * @since 1.0.0
 */
export interface NotFinite {
  readonly _tag: "NotFinite"
}

/**
 * @since 1.0.0
 */
export const notFinite: NotFinite = { _tag: "NotFinite" }

/**
 * @since 1.0.0
 */
export interface MinLength {
  readonly _tag: "MinLength"
  readonly minLength: number
  readonly actual: unknown
}

/**
 * @since 1.0.0
 */
export const minLength = (minLength: number, actual: unknown): MinLength => ({
  _tag: "MinLength",
  minLength,
  actual
})

/**
 * @since 1.0.0
 */
export interface MaxLength {
  readonly _tag: "MaxLength"
  readonly maxLength: number
  readonly actual: unknown
}

/**
 * @since 1.0.0
 */
export const maxLength = (maxLength: number, actual: unknown): MaxLength => ({
  _tag: "MaxLength",
  maxLength,
  actual
})

/**
 * @since 1.0.0
 */
export interface Min {
  readonly _tag: "Min"
  readonly min: number
  readonly actual: unknown
}

/**
 * @since 1.0.0
 */
export const min = (min: number, actual: unknown): Min => ({
  _tag: "Min",
  min,
  actual
})

/**
 * @since 1.0.0
 */
export interface Max {
  readonly _tag: "Max"
  readonly max: number
  readonly actual: unknown
}

/**
 * @since 1.0.0
 */
export const max = (max: number, actual: unknown): Max => ({
  _tag: "Max",
  max,
  actual
})

/**
 * @since 1.0.0
 */
export interface Index {
  readonly _tag: "Index"
  readonly index: number
  readonly errors: NonEmptyReadonlyArray<DecodeError>
}

/**
 * @since 1.0.0
 */
export const index = (
  index: number,
  errors: NonEmptyReadonlyArray<DecodeError>
): Index => ({
  _tag: "Index",
  index,
  errors
})

/**
 * @since 1.0.0
 */
export interface Key {
  readonly _tag: "Key"
  readonly key: PropertyKey
  readonly errors: NonEmptyReadonlyArray<DecodeError>
}

/**
 * @since 1.0.0
 */
export const key = (
  key: PropertyKey,
  errors: NonEmptyReadonlyArray<DecodeError>
): Key => ({
  _tag: "Key",
  key,
  errors
})

/**
 * @since 1.0.0
 */
export interface UnexpectedKey {
  readonly _tag: "UnexpectedKey"
  readonly key: PropertyKey
}

/**
 * @since 1.0.0
 */
export const unexpectedKey = (
  key: PropertyKey
): UnexpectedKey => ({
  _tag: "UnexpectedKey",
  key
})

/**
 * @since 1.0.0
 */
export interface UnexpectedIndex {
  readonly _tag: "UnexpectedIndex"
  readonly index: number
}

/**
 * @since 1.0.0
 */
export const unexpectedIndex = (
  index: number
): UnexpectedIndex => ({
  _tag: "UnexpectedIndex",
  index
})

/**
 * @since 1.0.0
 */
export interface Member {
  readonly _tag: "Member"
  readonly index: number
  readonly errors: NonEmptyReadonlyArray<DecodeError>
}

/**
 * @since 1.0.0
 */
export const member = (
  index: number,
  errors: NonEmptyReadonlyArray<DecodeError>
): Member => ({
  _tag: "Member",
  index,
  errors
})
