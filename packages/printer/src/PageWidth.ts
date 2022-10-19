/**
 * @since 1.0.0
 */

import * as PW from "@effect/printer/internal/PageWidth"
import type * as Equal from "@fp-ts/data/Equal"

// -----------------------------------------------------------------------------
// Models
// -----------------------------------------------------------------------------

const TypeId: unique symbol = PW.PageWidthTypeId as TypeId

/**
 * @category symbol
 * @since 1.0.0
 */
export type TypeId = typeof TypeId

/**
 * Represents the maximum number of characters that fit onto a single line in a
 * document. The layout algorithms will try to avoid exceeding the set character
 * limit by inserting line breaks where appropriate (e.g., via `softLine`).
 *
 * @category model
 * @since 1.0.0
 * @tsplus type effect/printer/PageWidth
 */
export type PageWidth = AvailablePerLine | Unbounded

/**
 * Represents a `PageWidth` setting that informs the layout algorithms to avoid
 * exceeding the specified space per line.
 *
 * @category model
 * @since 1.0.0
 */
export interface AvailablePerLine extends Equal.Equal {
  readonly _tag: "AvailablePerLine"
  readonly _id: TypeId
  /**
   * The number of characters, including whitespace, that can fit on a single
   * line.
   */
  readonly lineWidth: number
  /**
   * The fraction of the total page width that can be printed on. This allows
   * limiting the length of printable text per line. Values must be between
   * `0` and `1` (`0.4` to `1` is typical).
   */
  readonly ribbonFraction: number
}

/**
 * Represents a `PageWidth` setting that informs the layout algorithms to avoid
 * introducing line breaks into a document.
 *
 * @category model
 * @since 1.0.0
 */
export interface Unbounded extends Equal.Equal {
  readonly _tag: "Unbounded"
  readonly _id: TypeId
}

/**
 * @category model
 * @since 1.0.0
 * @tsplus type effect/printer/PageWidth.Ops
 */
export interface PageWidthOps {}
export const PageWidth: PageWidthOps = {}

/**
 * @category model
 * @since 1.0.0
 * @tsplus type effect/printer/PageWidth/Aspects
 */
export interface PageWidthAspects {}

// -----------------------------------------------------------------------------
// Refinements
// -----------------------------------------------------------------------------

/**
 * Returns `true` if the specified value is a `PageWidth`, `false` otherwise.
 *
 * @category refinements
 * @since 1.0.0
 * @tsplus static effect/printer/PageWidth.Ops isPageWidth
 */
export const isPageWidth: (u: unknown) => u is PageWidth = PW.isPageWidth

/**
 * Returns `true` if the specified `PageWidth` is an `AvailablePerLine`, `false`
 * otherwise.
 *
 * @category refinements
 * @since 1.0.0
 * @tsplus fluent effect/printer/PageWidth isAvailablePerLine
 */
export const isAvailablePerLine: (self: PageWidth) => self is AvailablePerLine = PW.isAvailablePerLine

/**
 * Returns `true` if the specified `PageWidth` is an `Unbounded`, `false`
 * otherwise.
 *
 * @category refinements
 * @since 1.0.0
 * @tsplus fluent effect/printer/PageWidth isUnbounded
 */
export const isUnbounded: (self: PageWidth) => self is Unbounded = PW.isUnbounded

// -----------------------------------------------------------------------------
// Constructors
// -----------------------------------------------------------------------------

/**
 * @category constructors
 * @since 1.0.0
 * @tsplus static effect/printer/PageWidth.Ops AvailablePerLine
 */
export const availablePerLine: (
  lineWidth: number,
  ribbonFraction: number
) => PageWidth = PW.availablePerLine

/**
 * @category constructors
 * @since 1.0.0
 * @tsplus static effect/printer/PageWidth.Ops Unbounded
 */
export const unbounded: PageWidth = PW.unbounded

/**
 * @category constructors
 * @since 1.0.0
 * @tsplus static effect/printer/PageWidth.Ops default
 */
export const defaultPageWidth = PW.availablePerLine(80, 1)

// -----------------------------------------------------------------------------
// Utilities
// -----------------------------------------------------------------------------

/**
 * Calculates the remaining width on the current line.
 *
 * @category utilities
 * @since 1.0.0
 * @tsplus static effect/printer/PageWidth.Ops remainingWidth
 */
export const remainingWidth: (
  lineLength: number,
  ribbonFraction: number,
  lineIndent: number,
  currentColumn: number
) => number = PW.remainingWidth
