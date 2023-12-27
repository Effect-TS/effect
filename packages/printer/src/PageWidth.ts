/**
 * @since 1.0.0
 */

import type { Equal } from "effect/Equal"
import * as internal from "./internal/pageWidth.js"

// -----------------------------------------------------------------------------
// Models
// -----------------------------------------------------------------------------

/**
 * @since 1.0.0
 * @category symbol
 */
export const PageWidthTypeId: unique symbol = internal.PageWidthTypeId as PageWidthTypeId

/**
 * @since 1.0.0
 * @category symbol
 */
export type PageWidthTypeId = typeof PageWidthTypeId

/**
 * Represents the maximum number of characters that fit onto a single line in a
 * document. The layout algorithms will try to avoid exceeding the set character
 * limit by inserting line breaks where appropriate (e.g., via `softLine`).
 *
 * @since 1.0.0
 * @category model
 */
export type PageWidth = AvailablePerLine | Unbounded

/**
 * @since 1.0.0
 */
export declare namespace PageWidth {
  /**
   * @since 1.0.0
   * @category model
   */
  export interface Proto extends Equal {
    readonly [PageWidthTypeId]: PageWidthTypeId
  }
}

/**
 * Represents a `PageWidth` setting that informs the layout algorithms to avoid
 * exceeding the specified space per line.
 *
 * @since 1.0.0
 * @category model
 */
export interface AvailablePerLine extends PageWidth.Proto {
  readonly _tag: "AvailablePerLine"
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
 * @since 1.0.0
 * @category model
 */
export interface Unbounded extends PageWidth.Proto {
  readonly _tag: "Unbounded"
}

// -----------------------------------------------------------------------------
// Refinements
// -----------------------------------------------------------------------------

/**
 * Returns `true` if the specified value is a `PageWidth`, `false` otherwise.
 *
 * @since 1.0.0
 * @category refinements
 */
export const isPageWidth: (u: unknown) => u is PageWidth = internal.isPageWidth

/**
 * Returns `true` if the specified `PageWidth` is an `AvailablePerLine`, `false`
 * otherwise.
 *
 * @since 1.0.0
 * @category refinements
 */
export const isAvailablePerLine: (self: PageWidth) => self is AvailablePerLine = internal.isAvailablePerLine

/**
 * Returns `true` if the specified `PageWidth` is an `Unbounded`, `false`
 * otherwise.
 *
 * @since 1.0.0
 * @category refinements
 */
export const isUnbounded: (self: PageWidth) => self is Unbounded = internal.isUnbounded

// -----------------------------------------------------------------------------
// Constructors
// -----------------------------------------------------------------------------

/**
 * @since 1.0.0
 * @category constructors
 */
export const availablePerLine: (lineWidth: number, ribbonFraction: number) => PageWidth = internal.availablePerLine

/**
 * @since 1.0.0
 * @category constructors
 */
export const unbounded: PageWidth = internal.unbounded

/**
 * @since 1.0.0
 * @category constructors
 */
export const defaultPageWidth: PageWidth = internal.defaultPageWidth

// -----------------------------------------------------------------------------
// Utilities
// -----------------------------------------------------------------------------

/**
 * Calculates the remaining width on the current line.
 *
 * @since 1.0.0
 * @category utilities
 */
export const remainingWidth: (
  lineLength: number,
  ribbonFraction: number,
  lineIndent: number,
  currentColumn: number
) => number = internal.remainingWidth
