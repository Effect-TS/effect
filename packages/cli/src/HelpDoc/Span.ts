/**
 * @since 1.0.0
 */
import type { Color } from "@effect/printer-ansi/Color"
import * as InternalSpan from "../internal/helpDoc/span.js"

/**
 * @since 1.0.0
 * @category models
 */
export type Span = Highlight | Sequence | Strong | Text | URI | Weak

/**
 * @since 1.0.0
 * @category models
 */
export interface Highlight {
  readonly _tag: "Highlight"
  readonly value: Span
  readonly color: Color
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
export interface Text {
  readonly _tag: "Text"
  readonly value: string
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
export interface Weak {
  readonly _tag: "Weak"
  readonly value: Span
}

/**
 * @since 1.0.0
 * @category refinements
 */
export const isSequence: (self: Span) => self is Sequence = InternalSpan.isSequence

/**
 * @since 1.0.0
 * @category refinements
 */
export const isStrong: (self: Span) => self is Strong = InternalSpan.isStrong

/**
 * @since 1.0.0
 * @category refinements
 */
export const isText: (self: Span) => self is Text = InternalSpan.isText

/**
 * @since 1.0.0
 * @category refinements
 */
export const isUri: (self: Span) => self is URI = InternalSpan.isUri

/**
 * @since 1.0.0
 * @category refinements
 */
export const isWeak: (self: Span) => self is Weak = InternalSpan.isWeak

/**
 * @since 1.0.0
 * @category constructors
 */
export const empty: Span = InternalSpan.empty

/**
 * @since 1.0.0
 * @category constructors
 */
export const space: Span = InternalSpan.space

/**
 * @since 1.0.0
 * @category constructors
 */
export const text: (value: string) => Span = InternalSpan.text

/**
 * @since 1.0.0
 * @category constructors
 */
export const code: (value: string | Span) => Span = InternalSpan.code

/**
 * @since 1.0.0
 * @category constructors
 */
export const error: (value: string | Span) => Span = InternalSpan.error

/**
 * @since 1.0.0
 * @category constructors
 */
export const weak: (value: string | Span) => Span = InternalSpan.weak

/**
 * @since 1.0.0
 * @category constructors
 */
export const strong: (value: string | Span) => Span = InternalSpan.strong

/**
 * @since 1.0.0
 * @category constructors
 */
export const uri: (value: string) => Span = InternalSpan.uri

/**
 * @since 1.0.0
 * @category combinators
 */
export const concat: {
  (that: Span): (self: Span) => Span
  (self: Span, that: Span): Span
} = InternalSpan.concat

/**
 * @since 1.0.0
 * @category combinators
 */
export const spans: (spans: Iterable<Span>) => Span = InternalSpan.spans
