/**
 * @since 1.0.0
 */

import type { LiteralValue } from "@fp-ts/codec/Meta"

/**
 * @since 1.0.0
 */
export interface NotEqual<A extends LiteralValue> {
  readonly _tag: "NotEqual"
  readonly literal: A
  readonly actual: unknown
}

/**
 * @since 1.0.0
 */
export const notEqual = <A extends LiteralValue>(
  literal: A,
  actual: unknown
): NotEqual<A> => ({ _tag: "NotEqual", literal, actual })

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
