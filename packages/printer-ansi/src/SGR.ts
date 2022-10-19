/**
 * @since 1.0.0
 */

import * as SG from "@effect/printer-ansi/internal/SGR"

// -----------------------------------------------------------------------------
// Models
// -----------------------------------------------------------------------------

/**
 * @category model
 * @since 1.0.0
 * @tsplus type effect/printer-ansi/SGR
 */
export type SGR = Reset | SetBold | SetItalicized | SetUnderlined | SetColor

/**
 * @category model
 * @since 1.0.0
 * @tsplus type effect/printer-ansi/SGR.Ops
 */
export interface SGROps {}
/**
 * @category instances
 * @since 1.0.0
 */
export const SGR: SGROps = {}

/**
 * @category model
 * @since 1.0.0
 */
export interface Reset {
  readonly _tag: "Reset"
}

/**
 * @category model
 * @since 1.0.0
 */
export interface SetBold {
  readonly _tag: "SetBold"
  readonly bold: boolean
}

/**
 * @category model
 * @since 1.0.0
 */
export interface SetItalicized {
  readonly _tag: "SetItalicized"
  readonly italicized: boolean
}

/**
 * @category model
 * @since 1.0.0
 */
export interface SetUnderlined {
  readonly _tag: "SetUnderlined"
  readonly underlined: boolean
}

/**
 * @category model
 * @since 1.0.0
 */
export interface SetColor {
  readonly _tag: "SetColor"
  readonly color: Color
  readonly vivid: boolean
  readonly layer: Layer
}

// -----------------------------------------------------------------------------
// Constructors
// -----------------------------------------------------------------------------

/**
 * @category constructors
 * @since 1.0.0
 * @tsplus static effect/printer-ansi/SGR.Ops Reset
 */
export const reset: SGR = { _tag: "Reset" }

/**
 * @category constructors
 * @since 1.0.0
 * @tsplus static effect/printer-ansi/SGR.Ops SetBold
 */
export function setBold(bold: boolean): SGR {
  return { _tag: "SetBold", bold }
}

/**
 *  * @category constructors
 * @since 1.0.0
 * @tsplus static effect/printer-ansi/SGR.Ops SetItalicized
 */
export function setItalicized(italicized: boolean): SGR {
  return { _tag: "SetItalicized", italicized }
}

/**
 * @category constructors
 * @since 1.0.0
 * @tsplus static effect/printer-ansi/SGR.Ops SetUnderlined
 */
export function setUnderlined(underlined: boolean): SGR {
  return { _tag: "SetUnderlined", underlined }
}

/**
 * @category constructors
 * @since 1.0.0
 * @tsplus static effect/printer-ansi/SGR.Ops SetColor
 */
export function setColor(color: Color, vivid: boolean, layer: Layer): SGR {
  return { _tag: "SetColor", color, vivid, layer }
}

// -----------------------------------------------------------------------------
// Destructors
// -----------------------------------------------------------------------------

/**
 * @category destructors
 * @since 1.0.0
 * @tsplus static effect/printer-ansi/SGR.Ops toCode
 * @tsplus getter effect/printer-ansi/SGR toCode
 */
export const toCode: (self: SGR) => number = SG.toCode

/**
 * @category destructors
 * @since 1.0.0
 * @tsplus static effect/printer-ansi/SGR.Ops toEscapeSequence
 */
export const toEscapeSequence: (sgrs: Iterable<SGR>) => string = SG.toEscapeSequence
