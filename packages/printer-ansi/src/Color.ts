/**
 * @since 1.0.0
 */

import * as C from "@effect/printer-ansi/internal/Color"

// -----------------------------------------------------------------------------
// Models
// -----------------------------------------------------------------------------

/**
 * @category model
 * @since 1.0.0
 * @tsplus type effect/printer-ansi/Color
 */
export type Color = Black | Red | Green | Yellow | Blue | Magenta | Cyan | White

/**
 * @category model
 * @since 1.0.0
 * @tsplus type effect/printer-ansi/Color.Ops
 */
export interface ColorOps {}
/**
 * @category instances
 * @since 1.0.0
 */
export const Color: ColorOps = {}

/**
 * @category model
 * @since 1.0.0
 */
export interface Black {
  readonly _tag: "Black"
}

/**
 * @category model
 * @since 1.0.0
 */
export interface Red {
  readonly _tag: "Red"
}

/**
 * @category model
 * @since 1.0.0
 */
export interface Green {
  readonly _tag: "Green"
}

/**
 * @category model
 * @since 1.0.0
 */
export interface Yellow {
  readonly _tag: "Yellow"
}

/**
 * @category model
 * @since 1.0.0
 */
export interface Blue {
  readonly _tag: "Blue"
}

/**
 * @category model
 * @since 1.0.0
 */
export interface Magenta {
  readonly _tag: "Magenta"
}

/**
 * @category model
 * @since 1.0.0
 */
export interface Cyan {
  readonly _tag: "Cyan"
}

/**
 * @category model
 * @since 1.0.0
 */
export interface White {
  readonly _tag: "White"
}

// -----------------------------------------------------------------------------
// Constructors
// -----------------------------------------------------------------------------

/**
 * @category constructors
 * @since 1.0.0
 * @tsplus static effect/printer-ansi/Color.Ops Black
 */
export const Black: Color = {
  _tag: "Black"
}

/**
 * @category constructors
 * @since 1.0.0
 * @tsplus static effect/printer-ansi/Color.Ops Red
 */
export const Red: Color = {
  _tag: "Red"
}

/**
 * @category constructors
 * @since 1.0.0
 * @tsplus static effect/printer-ansi/Color.Ops Green
 */
export const Green: Color = {
  _tag: "Green"
}

/**
 * @category constructors
 * @since 1.0.0
 * @tsplus static effect/printer-ansi/Color.Ops Yellow
 */
export const Yellow: Color = {
  _tag: "Yellow"
}

/**
 * @category constructors
 * @since 1.0.0
 * @tsplus static effect/printer-ansi/Color.Ops Blue
 */
export const Blue: Color = {
  _tag: "Blue"
}

/**
 * @category constructors
 * @since 1.0.0
 * @tsplus static effect/printer-ansi/Color.Ops Magenta
 */
export const Magenta: Color = {
  _tag: "Magenta"
}

/**
 * @category constructors
 * @since 1.0.0
 * @tsplus static effect/printer-ansi/Color.Ops Cyan
 */
export const Cyan: Color = {
  _tag: "Cyan"
}

/**
 * @category constructors
 * @since 1.0.0
 * @tsplus static effect/printer-ansi/Color.Ops White
 */
export const White: Color = {
  _tag: "White"
}

// -----------------------------------------------------------------------------
// Destructors
// -----------------------------------------------------------------------------

/**
 * @tsplus static effect/printer-ansi/Color.Ops toCode
 * @tsplus getter effect/printer-ansi/Color toCode
 */
export const toCode: (color: Color) => number = C.toCode
