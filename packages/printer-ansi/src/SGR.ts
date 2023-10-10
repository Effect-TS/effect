/**
 * @since 1.0.0
 */

import type { Color } from "./Color"
import * as internal from "./internal/sgr"
import type { RenderLayer } from "./RenderLayer"

// -----------------------------------------------------------------------------
// Models
// -----------------------------------------------------------------------------

/**
 * @since 1.0.0
 * @category model
 */
export type SGR = Reset | SetBold | SetItalicized | SetUnderlined | SetColor

/**
 * @since 1.0.0
 * @category model
 */
export interface Reset {
  readonly _tag: "Reset"
}

/**
 * @since 1.0.0
 * @category model
 */
export interface SetBold {
  readonly _tag: "SetBold"
  readonly bold: boolean
}

/**
 * @since 1.0.0
 * @category model
 */
export interface SetItalicized {
  readonly _tag: "SetItalicized"
  readonly italicized: boolean
}

/**
 * @since 1.0.0
 * @category model
 */
export interface SetUnderlined {
  readonly _tag: "SetUnderlined"
  readonly underlined: boolean
}

/**
 * @since 1.0.0
 * @category model
 */
export interface SetColor {
  readonly _tag: "SetColor"
  readonly color: Color
  readonly vivid: boolean
  readonly layer: RenderLayer
}

// -----------------------------------------------------------------------------
// Constructors
// -----------------------------------------------------------------------------

/**
 * @since 1.0.0
 * @category constructors
 */
export const reset: SGR = internal.reset

/**
 * @since 1.0.0
 * @category constructors
 */
export const setBold: (bold: boolean) => SGR = internal.setBold

/**
 * @since 1.0.0
 * @category constructors
 */
export const setItalicized: (italicized: boolean) => SGR = internal.setItalicized

/**
 * @since 1.0.0
 * @category constructors
 */
export const setUnderlined: (underlined: boolean) => SGR = internal.setUnderlined

/**
 * @since 1.0.0
 * @category constructors
 */
export const setColor: (color: Color, vivid: boolean, layer: RenderLayer) => SGR = internal.setColor

// -----------------------------------------------------------------------------
// Destructors
// -----------------------------------------------------------------------------

/**
 * @since 1.0.0
 * @category destructors
 */
export const toCode: (self: SGR) => number = internal.toCode

/**
 * @since 1.0.0
 * @category destructors
 */
export const toEscapeSequence: (sgrs: Iterable<SGR>) => string = internal.toEscapeSequence
