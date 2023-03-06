import * as Option from "@effect/data/Option"
import * as ReadonlyArray from "@effect/data/ReadonlyArray"
import * as monoid from "@effect/data/typeclass/Monoid"
import * as semigroup from "@effect/data/typeclass/Semigroup"
import type * as AnsiStyle from "@effect/printer-ansi/AnsiStyle"
import type * as Color from "@effect/printer-ansi/Color"
import * as renderLayer from "@effect/printer-ansi/internal_effect_untraced/renderLayer"
import * as sgr from "@effect/printer-ansi/internal_effect_untraced/sgr"
import type * as SGR from "@effect/printer-ansi/SGR"

// -----------------------------------------------------------------------------
// Instances
// -----------------------------------------------------------------------------

const getFirstSomeSemigroup = Option.getFirstSomeSemigroup<SGR.SGR>()

/** @internal */
export const Semigroup: semigroup.Semigroup<AnsiStyle.AnsiStyle> = semigroup.struct({
  foreground: getFirstSomeSemigroup,
  background: getFirstSomeSemigroup,
  bold: getFirstSomeSemigroup,
  italicized: getFirstSomeSemigroup,
  underlined: getFirstSomeSemigroup
})

const monoidOrElse = monoid.fromSemigroup(getFirstSomeSemigroup, Option.none())

/** @internal */
export const Monoid: monoid.Monoid<AnsiStyle.AnsiStyle> = monoid.struct({
  foreground: monoidOrElse,
  background: monoidOrElse,
  bold: monoidOrElse,
  italicized: monoidOrElse,
  underlined: monoidOrElse
})

// -----------------------------------------------------------------------------
// Constructors
// -----------------------------------------------------------------------------

/** @internal */
export const bold: AnsiStyle.AnsiStyle = {
  ...Monoid.empty,
  bold: Option.some(sgr.setBold(true))
}

/** @internal */
export const italicized: AnsiStyle.AnsiStyle = {
  ...Monoid.empty,
  italicized: Option.some(sgr.setItalicized(true))
}

/** @internal */
export const underlined: AnsiStyle.AnsiStyle = {
  ...Monoid.empty,
  underlined: Option.some(sgr.setUnderlined(true))
}

/** @internal */
export const color = (color: Color.Color): AnsiStyle.AnsiStyle => ({
  ...Monoid.empty,
  foreground: Option.some(sgr.setColor(color, true, renderLayer.foreground))
})

/** @internal */
export const dullColor = (color: Color.Color): AnsiStyle.AnsiStyle => ({
  ...Monoid.empty,
  foreground: Option.some(sgr.setColor(color, false, renderLayer.foreground))
})

/** @internal */
export const backgroundColor = (color: Color.Color): AnsiStyle.AnsiStyle => ({
  ...Monoid.empty,
  background: Option.some(sgr.setColor(color, true, renderLayer.background))
})

/** @internal */
export const dullBackgroundColor = (color: Color.Color): AnsiStyle.AnsiStyle => ({
  ...Monoid.empty,
  background: Option.some(sgr.setColor(color, false, renderLayer.background))
})

// -----------------------------------------------------------------------------
// Destructors
// -----------------------------------------------------------------------------

/** @internal */
export const stringify = (self: AnsiStyle.AnsiStyle): string =>
  sgr.toEscapeSequence(
    ReadonlyArray.compact([
      Option.some(sgr.reset),
      self.foreground,
      self.background,
      self.bold,
      self.italicized,
      self.underlined
    ])
  )
