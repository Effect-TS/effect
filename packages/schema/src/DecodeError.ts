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
