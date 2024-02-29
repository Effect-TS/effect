/**
 * @since 1.0.0
 */

import * as internal from "./internal/ansiColor256.js"

// -----------------------------------------------------------------------------
// Models
// -----------------------------------------------------------------------------

/**
 * @since 1.0.0
 * @category model
 */
export interface AnsiColor256 {
  readonly _tag: "AnsiColor256"
  readonly index: number
}

// -----------------------------------------------------------------------------
// Constructors
// -----------------------------------------------------------------------------

/**
 * @since 1.0.0
 * @category constructors
 */
export const ansiColor256 = (index: number): AnsiColor256 => internal.ansiColor256(index)

// -----------------------------------------------------------------------------
// Destructors
// -----------------------------------------------------------------------------

/**
 * @since 1.0.0
 * @category destructors
 */
export const toCode: (color: AnsiColor256) => number = internal.toCode
