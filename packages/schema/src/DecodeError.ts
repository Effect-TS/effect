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
  | NotEnums
  | NaN
  | NotFinite
  | MinLength
  | MaxLength
  | LessThan
  | GreaterThan
  | LessThanOrEqualTo
  | GreaterThanOrEqualTo
  | Index
  | Key
  | Missing
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
export interface NotEnums {
  readonly _tag: "NotEnums"
  readonly enums: ReadonlyArray<readonly [string, string | number]>
  readonly actual: unknown
}

/**
 * @since 1.0.0
 */
export const notEnums = (
  enums: ReadonlyArray<readonly [string, string | number]>,
  actual: unknown
): NotEnums => ({ _tag: "NotEnums", enums, actual })

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
export interface LessThan {
  readonly _tag: "LessThan"
  readonly max: number
  readonly actual: unknown
}

/**
 * @since 1.0.0
 */
export const lessThan = (max: number, actual: unknown): LessThan => ({
  _tag: "LessThan",
  max,
  actual
})

/**
 * @since 1.0.0
 */
export interface LessThanOrEqualTo {
  readonly _tag: "LessThanOrEqualTo"
  readonly max: number
  readonly actual: unknown
}

/**
 * @since 1.0.0
 */
export const lessThanOrEqualTo = (max: number, actual: unknown): LessThanOrEqualTo => ({
  _tag: "LessThanOrEqualTo",
  max,
  actual
})

/**
 * @since 1.0.0
 */
export interface GreaterThanOrEqualTo {
  readonly _tag: "GreaterThanOrEqualTo"
  readonly min: number
  readonly actual: unknown
}

/**
 * @since 1.0.0
 */
export const greaterThanOrEqualTo = (min: number, actual: unknown): GreaterThanOrEqualTo => ({
  _tag: "GreaterThanOrEqualTo",
  min,
  actual
})

/**
 * @since 1.0.0
 */
export interface GreaterThan {
  readonly _tag: "GreaterThan"
  readonly min: number
  readonly actual: unknown
}

/**
 * @since 1.0.0
 */
export const greaterThan = (min: number, actual: unknown): GreaterThan => ({
  _tag: "GreaterThan",
  min,
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
export interface Missing {
  readonly _tag: "Missing"
}

/**
 * @since 1.0.0
 */
export const missing: Missing = { _tag: "Missing" }

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
  readonly errors: NonEmptyReadonlyArray<DecodeError>
}

/**
 * @since 1.0.0
 */
export const member = (
  errors: NonEmptyReadonlyArray<DecodeError>
): Member => ({
  _tag: "Member",
  errors
})
