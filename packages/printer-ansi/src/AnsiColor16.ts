/**
 * @since 1.0.0
 */

import * as internal from "./internal/ansiColor16.js"

// -----------------------------------------------------------------------------
// Models
// -----------------------------------------------------------------------------

/**
 * @since 1.0.0
 * @category model
 */
export type AnsiColor16 = Standard | Bright

/**
 * @since 1.0.0
 * @category model
 */
export interface Standard {
  readonly _tag: "Standard"
  readonly name: AnsiColor16.Name
}

/**
 * @since 1.0.0
 * @category model
 */
export interface Bright {
  readonly _tag: "Bright"
  readonly name: AnsiColor16.Name
}

/** @internal */
export declare namespace AnsiColor16 {
  /** @internal */
  export type Name = "Black" | "Red" | "Green" | "Yellow" | "Blue" | "Magenta" | "Cyan" | "White"
}

// -----------------------------------------------------------------------------
// Constructors
// -----------------------------------------------------------------------------

/**
 * @since 1.0.0
 * @category constructors
 */
export const standard = (name: AnsiColor16.Name): AnsiColor16 => internal.standard(name)

/**
 * @since 1.0.0
 * @category constructors
 */
export const bright = (name: AnsiColor16.Name): AnsiColor16 => internal.bright(name)

// -----------------------------------------------------------------------------
// Destructors
// -----------------------------------------------------------------------------

/**
 * @since 1.0.0
 * @category destructors
 */
export const toCode: (color: AnsiColor16) => number = internal.toCode
