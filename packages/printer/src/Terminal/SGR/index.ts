// tracing: off

import type { Array } from "@effect-ts/core/Array"
import * as A from "@effect-ts/core/Array"
import { constant } from "@effect-ts/core/Function"
import * as Show from "@effect-ts/core/Show"
import * as MO from "@effect-ts/morphic"

import { Color, colorToCode } from "../Color"
import { Layer } from "../Layer"

// -------------------------------------------------------------------------------------
// definition
// -------------------------------------------------------------------------------------

const Reset_ = MO.make((F) =>
  F.interface({ _tag: F.stringLiteral("Reset") }, { name: "Reset" })
)

export interface Reset extends MO.AType<typeof Reset_> {}
export interface ResetE extends MO.EType<typeof Reset_> {}
export const Reset = MO.opaque<ResetE, Reset>()(Reset_)

const SetBold_ = MO.make((F) =>
  F.interface(
    { _tag: F.stringLiteral("SetBold"), bold: F.boolean() },
    { name: "SetBold" }
  )
)

export interface SetBold extends MO.AType<typeof SetBold_> {}
export interface SetBoldE extends MO.EType<typeof SetBold_> {}
export const SetBold = MO.opaque<SetBoldE, SetBold>()(SetBold_)

const SetItalicized_ = MO.make((F) =>
  F.interface(
    { _tag: F.stringLiteral("SetItalicized"), italicized: F.boolean() },
    { name: "SetItalicized" }
  )
)

export interface SetItalicized extends MO.AType<typeof SetItalicized_> {}
export interface SetItalicizedE extends MO.EType<typeof SetItalicized_> {}
export const SetItalicized = MO.opaque<SetItalicizedE, SetItalicized>()(SetItalicized_)

const SetUnderlined_ = MO.make((F) =>
  F.interface(
    { _tag: F.stringLiteral("SetUnderlined"), underlined: F.boolean() },
    { name: "SetUnderlined" }
  )
)

export interface SetUnderlined extends MO.AType<typeof SetUnderlined_> {}
export interface SetUnderlinedE extends MO.EType<typeof SetUnderlined_> {}
export const SetUnderlined = MO.opaque<SetUnderlinedE, SetUnderlined>()(SetUnderlined_)

const SetColor_ = MO.make((F) =>
  F.interface(
    {
      _tag: F.stringLiteral("SetColor"),
      color: Color(F),
      vivid: F.boolean(),
      layer: Layer(F)
    },
    { name: "SetColor" }
  )
)

export interface SetColor extends MO.AType<typeof SetColor_> {}
export interface SetColorE extends MO.EType<typeof SetColor_> {}
export const SetColor = MO.opaque<SetColorE, SetColor>()(SetColor_)

export const SGR = MO.makeADT("_tag")({
  Reset,
  SetBold,
  SetItalicized,
  SetUnderlined,
  SetColor
})
export type SGR = MO.AType<typeof SGR>

// -------------------------------------------------------------------------------------
// operations
// -------------------------------------------------------------------------------------

export function csi(controlFunction: string, controlParameters: Array<number>): string {
  const params = A.map_(controlParameters, Show.number.show).join(";")
  return `\u001b[${params}${controlFunction}`
}

export const sgrToCode: (sgr: SGR) => Array<number> = SGR.matchStrict({
  Reset: constant(A.single(0)),
  SetBold: ({ bold }) => (bold ? A.single(1) : A.single(22)),
  SetItalicized: ({ italicized }) => (italicized ? A.single(3) : A.single(23)),
  SetUnderlined: ({ underlined }) => (underlined ? A.single(4) : A.single(24)),
  SetColor: ({ color, layer, vivid }) =>
    Layer.matchStrict({
      Foreground: () =>
        vivid ? A.single(90 + colorToCode(color)) : A.single(30 + colorToCode(color)),
      Background: () =>
        vivid ? A.single(10 + colorToCode(color)) : A.single(40 + colorToCode(color))
    })(layer)
})

export const setSGRCode = (sgrs: Array<SGR>): string =>
  csi("m", A.chain_(sgrs, sgrToCode))
