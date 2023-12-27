/**
 * @since 1.0.0
 */

import * as internal from "./internal/color.js"

// -----------------------------------------------------------------------------
// Models
// -----------------------------------------------------------------------------

/**
 * @since 1.0.0
 * @category model
 */
export type Color = Black | Red | Green | Yellow | Blue | Magenta | Cyan | White

/**
 * @since 1.0.0
 * @category model
 */
export interface Black {
  readonly _tag: "Black"
}

/**
 * @since 1.0.0
 * @category model
 */
export interface Red {
  readonly _tag: "Red"
}

/**
 * @since 1.0.0
 * @category model
 */
export interface Green {
  readonly _tag: "Green"
}

/**
 * @since 1.0.0
 * @category model
 */
export interface Yellow {
  readonly _tag: "Yellow"
}

/**
 * @since 1.0.0
 * @category model
 */
export interface Blue {
  readonly _tag: "Blue"
}

/**
 * @since 1.0.0
 * @category model
 */
export interface Magenta {
  readonly _tag: "Magenta"
}

/**
 * @since 1.0.0
 * @category model
 */
export interface Cyan {
  readonly _tag: "Cyan"
}

/**
 * @since 1.0.0
 * @category model
 */
export interface White {
  readonly _tag: "White"
}

// -----------------------------------------------------------------------------
// Constructors
// -----------------------------------------------------------------------------

/**
 * @since 1.0.0
 * @category constructors
 */
export const black: Color = internal.black

/**
 * @since 1.0.0
 * @category constructors
 */
export const red: Color = internal.red

/**
 * @since 1.0.0
 * @category constructors
 */
export const green: Color = internal.green

/**
 * @since 1.0.0
 * @category constructors
 */
export const yellow: Color = internal.yellow

/**
 * @since 1.0.0
 * @category constructors
 */
export const blue: Color = internal.blue

/**
 * @since 1.0.0
 * @category constructors
 */
export const magenta: Color = internal.magenta

/**
 * @since 1.0.0
 * @category constructors
 */
export const cyan: Color = internal.cyan

/**
 * @since 1.0.0
 * @category constructors
 */
export const white: Color = internal.white

// -----------------------------------------------------------------------------
// Destructors
// -----------------------------------------------------------------------------

/**
 * @since 1.0.0
 * @category destructors
 */
export const toCode: (color: Color) => number = internal.toCode
