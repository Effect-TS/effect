/**
 * @since 1.0.0
 */

import type * as monoid from "@effect/typeclass/Monoid"
import type * as semigroup from "@effect/typeclass/Semigroup"
import type { Option } from "effect/Option"
import type { Color } from "./Color.js"
import * as internal from "./internal/ansiStyle.js"
import type { SGR } from "./SGR.js"

// -----------------------------------------------------------------------------
// Models
// -----------------------------------------------------------------------------

/**
 * @since 1.0.0
 * @category model
 */
export interface AnsiStyle {
  readonly foreground: Option<SGR>
  readonly background: Option<SGR>
  readonly bold: Option<SGR>
  readonly italicized: Option<SGR>
  readonly underlined: Option<SGR>
}

// -----------------------------------------------------------------------------
// Constructors
// -----------------------------------------------------------------------------

/**
 * @since 1.0.0
 * @category constructors
 */
export const bold: AnsiStyle = internal.bold

/**
 * @since 1.0.0
 * @category constructors
 */
export const italicized: AnsiStyle = internal.italicized

/**
 * @since 1.0.0
 * @category constructors
 */
export const underlined: AnsiStyle = internal.underlined

/**
 * @since 1.0.0
 * @category constructors
 */
export const color: (color: Color) => AnsiStyle = internal.color

/**
 * @since 1.0.0
 * @category constructors
 */
export const dullColor: (color: Color) => AnsiStyle = internal.dullColor

/**
 * @since 1.0.0
 * @category constructors
 */
export const backgroundColor: (color: Color) => AnsiStyle = internal.backgroundColor

/**
 * @since 1.0.0
 * @category constructors
 */
export const dullBackgroundColor: (color: Color) => AnsiStyle = internal.dullBackgroundColor

// -----------------------------------------------------------------------------
// Destructors
// -----------------------------------------------------------------------------

/**
 * @since 1.0.0
 * @category destructors
 */
export const stringify: (self: AnsiStyle) => string = internal.stringify

// -----------------------------------------------------------------------------
// Instances
// -----------------------------------------------------------------------------

/**
 * @since 1.0.0
 * @category instances
 */
export const Semigroup: semigroup.Semigroup<AnsiStyle> = internal.Semigroup

/**
 * @since 1.0.0
 * @category instances
 */
export const Monoid: monoid.Monoid<AnsiStyle> = internal.Monoid

// -----------------------------------------------------------------------------
// Instances
// -----------------------------------------------------------------------------

/**
 * @since 1.0.0
 * @categrory combinators
 */
export const combine: (self: AnsiStyle, that: AnsiStyle) => AnsiStyle = Semigroup.combine
