// tracing: off

import * as Assoc from "@effect-ts/core/Associative"
import * as A from "@effect-ts/core/Collections/Immutable/Array"
import * as Ident from "@effect-ts/core/Identity"
import * as O from "@effect-ts/core/Option"
import * as S from "@effect-ts/core/Show"

import type { Color } from "../Color"
import * as Layer from "../Layer"
import * as SGR from "../SGR"

// -------------------------------------------------------------------------------------
// definition
// -------------------------------------------------------------------------------------

export interface Style {
  foreground: O.Option<SGR.SGR>
  background: O.Option<SGR.SGR>
  bold: O.Option<SGR.SGR>
  italicized: O.Option<SGR.SGR>
  underlined: O.Option<SGR.SGR>
}

// -------------------------------------------------------------------------------------
// instances
// -------------------------------------------------------------------------------------

export const Associative = Assoc.struct<Style>({
  foreground: O.getFirstAssociative(),
  background: O.getFirstAssociative(),
  bold: O.getFirstAssociative(),
  italicized: O.getFirstAssociative(),
  underlined: O.getFirstAssociative()
})

export const Identity = Ident.struct<Style>({
  foreground: O.getFirstIdentity(),
  background: O.getFirstIdentity(),
  bold: O.getFirstIdentity(),
  italicized: O.getFirstIdentity(),
  underlined: O.getFirstIdentity()
})

// -------------------------------------------------------------------------------------
// operations
// -------------------------------------------------------------------------------------

export function color(color: Color): Style {
  return {
    ...Identity.identity,
    foreground: O.some(new SGR.SetColor(color, true, Layer.foreground))
  }
}

export function bgColor(color: Color): Style {
  return {
    ...Identity.identity,
    background: O.some(new SGR.SetColor(color, true, Layer.background))
  }
}

export function colorDull(color: Color): Style {
  return {
    ...Identity.identity,
    foreground: O.some(new SGR.SetColor(color, false, Layer.foreground))
  }
}

export function bgColorDull(color: Color): Style {
  return {
    ...Identity.identity,
    background: O.some(new SGR.SetColor(color, false, Layer.background))
  }
}

export const bold: Style = {
  ...Identity.identity,
  bold: O.some(new SGR.SetBold(true))
}

export const italicized: Style = {
  ...Identity.identity,
  italicized: O.some(new SGR.SetItalicized(true))
}

export const underlined: Style = {
  ...Identity.identity,
  underlined: O.some(new SGR.SetUnderlined(true))
}

// -------------------------------------------------------------------------------------
// instances
// -------------------------------------------------------------------------------------

export const Show = S.makeShow<Style>((style) =>
  SGR.setSGRCode(
    A.compact([
      O.some(new SGR.Reset()),
      style.foreground,
      style.background,
      style.bold,
      style.italicized,
      style.underlined
    ])
  )
)
