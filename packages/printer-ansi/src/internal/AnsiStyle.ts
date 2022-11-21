import * as monoid from "@fp-ts/core/typeclass/Monoid"
import * as semigroup from "@fp-ts/core/typeclass/Semigroup"
import { pipe } from "@fp-ts/data/Function"
import * as Option from "@fp-ts/data/Option"
import * as ReadonlyArray from "@fp-ts/data/ReadonlyArray"

// -----------------------------------------------------------------------------
// Instances
// -----------------------------------------------------------------------------

const semigroupOrElse = semigroup.fromCombine<Option.Option<SGR>>(Option.orElse)

/** @internal */
export const Semigroup: semigroup.Semigroup<AnsiStyle> = semigroup.struct({
  foreground: semigroupOrElse,
  background: semigroupOrElse,
  bold: semigroupOrElse,
  italicized: semigroupOrElse,
  underlined: semigroupOrElse
})

const monoidOrElse = monoid.fromSemigroup(semigroupOrElse, Option.none)

/** @internal */
export const Monoid: monoid.Monoid<AnsiStyle> = monoid.struct({
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
export const bold: AnsiStyle = {
  ...Monoid.empty,
  bold: Option.some(SGR.SetBold(true))
}

/** @internal */
export const italicized: AnsiStyle = {
  ...Monoid.empty,
  italicized: Option.some(SGR.SetItalicized(true))
}

/** @internal */
export const underlined: AnsiStyle = {
  ...Monoid.empty,
  underlined: Option.some(SGR.SetUnderlined(true))
}

/** @internal */
export function color(color: Color): AnsiStyle {
  return {
    ...Monoid.empty,
    foreground: Option.some(SGR.SetColor(color, true, Layer.Foreground))
  }
}

/** @internal */
export function dullColor(color: Color): AnsiStyle {
  return {
    ...Monoid.empty,
    foreground: Option.some(SGR.SetColor(color, false, Layer.Foreground))
  }
}

/** @internal */
export function backgroundColor(color: Color): AnsiStyle {
  return {
    ...Monoid.empty,
    background: Option.some(SGR.SetColor(color, true, Layer.Background))
  }
}

/** @internal */
export function dullBackgroundColor(color: Color): AnsiStyle {
  return {
    ...Monoid.empty,
    background: Option.some(SGR.SetColor(color, false, Layer.Background))
  }
}

// -----------------------------------------------------------------------------
// Destructors
// -----------------------------------------------------------------------------

/** @internal */
export function stringify(self: AnsiStyle): string {
  return pipe(
    [
      Option.some(SGR.Reset),
      self.foreground,
      self.background,
      self.bold,
      self.italicized,
      self.underlined
    ],
    ReadonlyArray.compact,
    SGR.toEscapeSequence
  )
}
