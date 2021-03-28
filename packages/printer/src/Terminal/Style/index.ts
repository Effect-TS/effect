// tracing: off

import * as A from "@effect-ts/core/Array"
import * as Assoc from "@effect-ts/core/Associative"
import * as Ident from "@effect-ts/core/Identity"
import * as O from "@effect-ts/core/Option"
import * as S from "@effect-ts/core/Show"
import * as MO from "@effect-ts/morphic"

import type { Color } from "../Color"
import * as Layer from "../Layer"
import { setSGRCode, SGR } from "../SGR"

// -------------------------------------------------------------------------------------
// definition
// -------------------------------------------------------------------------------------

const Style_ = MO.make((F) =>
  F.interface(
    {
      foreground: F.option(SGR(F)),
      background: F.option(SGR(F)),
      bold: F.option(SGR(F)),
      italicized: F.option(SGR(F)),
      underlined: F.option(SGR(F))
    },
    { name: "Style" }
  )
)

export interface Style extends MO.AType<typeof Style_> {}
export interface StyleE extends MO.EType<typeof Style_> {}
export const Style = MO.opaque<StyleE, Style>()(Style_)

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

export const color = (color: Color): Style =>
  Style.build({
    ...Identity.identity,
    foreground: O.some(SGR.as.SetColor({ color, layer: Layer.foreground, vivid: true }))
  })

export const bgColor = (color: Color): Style =>
  Style.build({
    ...Identity.identity,
    background: O.some(SGR.as.SetColor({ color, layer: Layer.background, vivid: true }))
  })

export const colorDull = (color: Color): Style =>
  Style.build({
    ...Identity.identity,
    foreground: O.some(
      SGR.as.SetColor({ color, layer: Layer.foreground, vivid: false })
    )
  })

export const bgColorDull = (color: Color): Style =>
  Style.build({
    ...Identity.identity,
    background: O.some(
      SGR.as.SetColor({ color, layer: Layer.background, vivid: false })
    )
  })

export const bold: Style = Style.build({
  ...Identity.identity,
  bold: O.some(SGR.as.SetBold({ bold: true }))
})

export const italicized: Style = Style.build({
  ...Identity.identity,
  italicized: O.some(SGR.as.SetItalicized({ italicized: true }))
})

export const underlined: Style = Style.build({
  ...Identity.identity,
  underlined: O.some(SGR.as.SetUnderlined({ underlined: true }))
})

// -------------------------------------------------------------------------------------
// instances
// -------------------------------------------------------------------------------------

export const Show = S.makeShow<Style>((style) =>
  setSGRCode(
    A.compact([
      O.some(SGR.as.Reset({})),
      style.foreground,
      style.background,
      style.bold,
      style.italicized,
      style.underlined
    ])
  )
)
