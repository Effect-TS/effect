/**
 * @since 1.0.0
 */
import * as internal from "@effect/cli/internal_effect_untraced/helpDoc/span"

/**
 * @since 1.0.0
 * @category models
 */
export type Span = Text | Code | Error | Weak | Strong | URI | Sequence

/**
 * @since 1.0.0
 * @category models
 */
export interface Text {
  readonly _tag: "Text"
  readonly value: string
}

/**
 * @since 1.0.0
 * @category models
 */
export interface Code {
  readonly _tag: "Code"
  readonly value: string
}

/**
 * @since 1.0.0
 * @category models
 */
export interface Error {
  readonly _tag: "Error"
  readonly value: Span
}

/**
 * @since 1.0.0
 * @category models
 */
export interface Weak {
  readonly _tag: "Weak"
  readonly value: Span
}

/**
 * @since 1.0.0
 * @category models
 */
export interface Strong {
  readonly _tag: "Strong"
  readonly value: Span
}

/**
 * @since 1.0.0
 * @category models
 */
export interface URI {
  readonly _tag: "URI"
  readonly value: string
}

/**
 * @since 1.0.0
 * @category models
 */
export interface Sequence {
  readonly _tag: "Sequence"
  readonly left: Span
  readonly right: Span
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const empty: Span = internal.empty

/**
 * @since 1.0.0
 * @category constructors
 */
export const space: Span = internal.space

/**
 * @since 1.0.0
 * @category constructors
 */
export const text: (value: string) => Span = internal.text

/**
 * @since 1.0.0
 * @category constructors
 */
export const code: (value: string) => Span = internal.code

/**
 * @since 1.0.0
 * @category constructors
 */
export const error: (value: string | Span) => Span = internal.error

/**
 * @since 1.0.0
 * @category constructors
 */
export const weak: (value: string | Span) => Span = internal.weak

/**
 * @since 1.0.0
 * @category constructors
 */
export const strong: (value: string | Span) => Span = internal.strong

/**
 * @since 1.0.0
 * @category constructors
 */
export const uri: (value: string) => Span = internal.uri

/**
 * @since 1.0.0
 * @category combinators
 */
export const concat: {
  (that: Span): (self: Span) => Span
  (self: Span, that: Span): Span
} = internal.concat

/**
 * @since 1.0.0
 * @category combinators
 */
export const spans: (spans: Iterable<Span>) => Span = internal.spans
