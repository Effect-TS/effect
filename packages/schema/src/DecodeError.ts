/**
 * @since 1.0.0
 */

import type { LiteralValue } from "@fp-ts/codec/Meta"

/**
 * @since 1.0.0
 */
export interface Type {
  readonly _tag: "Type"
  readonly expected: string
  readonly actual: unknown
}

/**
 * @since 1.0.0
 */
export const type = (expected: string, actual: unknown): Type => ({
  _tag: "Type",
  expected,
  actual
})

/**
 * @since 1.0.0
 */
export interface Equal {
  readonly _tag: "Equal"
  readonly expected: LiteralValue
  readonly actual: unknown
}

/**
 * @since 1.0.0
 */
export const equal = (
  expected: LiteralValue,
  actual: unknown
): Equal => ({ _tag: "Equal", expected, actual })

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
export interface MinLength {
  readonly _tag: "MinLength"
  readonly minLength: number
}

/**
 * @since 1.0.0
 */
export const minLength = (minLength: number): MinLength => ({
  _tag: "MinLength",
  minLength
})

/**
 * @since 1.0.0
 */
export interface MaxLength {
  readonly _tag: "MaxLength"
  readonly maxLength: number
}

/**
 * @since 1.0.0
 */
export const maxLength = (maxLength: number): MaxLength => ({
  _tag: "MaxLength",
  maxLength
})

/**
 * @since 1.0.0
 */
export interface Min {
  readonly _tag: "Min"
  readonly min: number
}

/**
 * @since 1.0.0
 */
export const min = (min: number): Min => ({
  _tag: "Min",
  min
})
