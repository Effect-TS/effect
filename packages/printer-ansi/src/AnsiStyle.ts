/**
 * @since 1.0.0
 */

import * as AS from "@effect/printer-ansi/internal/AnsiStyle"
import type { Monoid as _Monoid } from "@fp-ts/core/typeclass/Monoid"
import type { Semigroup as _Semigroup } from "@fp-ts/core/typeclass/Semigroup"
import type { Option } from "@fp-ts/data/Option"

// -----------------------------------------------------------------------------
// Models
// -----------------------------------------------------------------------------

/**
 * @category model
 * @since 1.0.0
 * @tsplus type effect/printer-ansi/AnsiStyle
 */
export interface AnsiStyle {
  readonly foreground: Option<SGR>
  readonly background: Option<SGR>
  readonly bold: Option<SGR>
  readonly italicized: Option<SGR>
  readonly underlined: Option<SGR>
}

/**
 * @category model
 * @since 1.0.0
 * @tsplus type effect/printer-ansi/AnsiStyle.Ops
 */
export interface AnsiStyleOps {}
/**
 * @category instances
 * @since 1.0.0
 */
export const AnsiStyle: AnsiStyleOps = {}

// -----------------------------------------------------------------------------
// Constructors
// -----------------------------------------------------------------------------

/**
 * @category constructors
 * @since 1.0.0
 * @tsplus static effect/printer-ansi/AnsiStyle.Ops bold
 */
export const bold: AnsiStyle = AS.bold

/**
 * @category constructors
 * @since 1.0.0
 * @tsplus static effect/printer-ansi/AnsiStyle.Ops italicized
 */
export const italicized: AnsiStyle = AS.italicized

/**
 * @category constructors
 * @since 1.0.0
 * @tsplus static effect/printer-ansi/AnsiStyle.Ops underlined
 */
export const underlined: AnsiStyle = AS.underlined

/**
 * @category constructors
 * @since 1.0.0
 * @tsplus static effect/printer-ansi/AnsiStyle.Ops color
 */
export const color: (color: Color) => AnsiStyle = AS.color

/**
 * @category constructors
 * @since 1.0.0
 * @tsplus static effect/printer-ansi/AnsiStyle.Ops dullColor
 */
export const dullColor: (color: Color) => AnsiStyle = AS.dullColor

/**
 * @category constructors
 * @since 1.0.0
 * @tsplus static effect/printer-ansi/AnsiStyle.Ops backgroundColor
 */
export const backgroundColor: (color: Color) => AnsiStyle = AS.backgroundColor

/**
 * @category constructors
 * @since 1.0.0
 * @tsplus static effect/printer-ansi/AnsiStyle.Ops dullBackgroundColor
 */
export const dullBackgroundColor: (color: Color) => AnsiStyle = AS.dullBackgroundColor

// -----------------------------------------------------------------------------
// Destructors
// -----------------------------------------------------------------------------

/**
 * @category destructors
 * @since 1.0.0
 * @tsplus static effect/printer-ansi/AnsiStyle.Ops stringify
 * @tsplus getter effect/printer-ansi/AnsiStyle stringify
 */
export const stringify: (self: AnsiStyle) => string = AS.stringify

// -----------------------------------------------------------------------------
// Instances
// -----------------------------------------------------------------------------

/**
 * @category instances
 * @since 1.0.0
 * @tsplus static effect/printer-ansi/AnsiStyle.Ops Semigroup
 */
export const Semigroup: _Semigroup<AnsiStyle> = AS.Semigroup

/**
 * @category instances
 * @since 1.0.0
 * @tsplus static effect/printer-ansi/AnsiStyle.Ops Monoid
 */
export const Monoid: _Monoid<AnsiStyle> = AS.Monoid
