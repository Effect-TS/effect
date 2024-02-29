/**
 * @since 1.0.0
 */

import * as internal from "./internal/trueColor.js"

// -----------------------------------------------------------------------------
// Models
// -----------------------------------------------------------------------------

/**
 * @since 1.0.0
 * @category model
 */
export interface TrueColor {
  readonly _tag: "TrueColor"
  readonly value: [number] | [number, number, number]
}

// -----------------------------------------------------------------------------
// Constructors
// -----------------------------------------------------------------------------

/**
 * @since 1.0.0
 * @category constructors
 */
export const trueColor = (...value: TrueColor["value"]): TrueColor => internal.trueColor(value)

// -----------------------------------------------------------------------------
// Destructors
// -----------------------------------------------------------------------------

/**
 * @since 1.0.0
 * @category destructors
 */
export const toCode: (color: TrueColor) => Readonly<[number, number, number]> = internal.toCode
