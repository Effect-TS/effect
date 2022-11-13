/**
 * @since 1.0.0
 */

export type DecodeError =
  | Custom
  | NotType
  | NotEqual
  | NaN
  | MinLength
  | MaxLength
  | Minimum
  | Maximum

/**
 * @since 1.0.0
 */
export interface Custom {
  readonly _tag: "Custom"
  readonly meta: unknown
  readonly actual: unknown
}

/**
 * @since 1.0.0
 */
export const custom = (meta: unknown, actual: unknown): Custom => ({
  _tag: "Custom",
  meta,
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
export interface Minimum {
  readonly _tag: "Minimum"
  readonly minimum: number
}

/**
 * @since 1.0.0
 */
export const minimum = (minimum: number): Minimum => ({
  _tag: "Minimum",
  minimum
})

/**
 * @since 1.0.0
 */
export interface Maximum {
  readonly _tag: "Maximum"
  readonly maximum: number
}

/**
 * @since 1.0.0
 */
export const maximum = (maximum: number): Maximum => ({
  _tag: "Maximum",
  maximum
})
