// tracing: off

import type { Array } from "@effect-ts/core/Collections/Immutable/Array"
import * as A from "@effect-ts/core/Collections/Immutable/Array"
import { constant } from "@effect-ts/core/Function"
import * as Show from "@effect-ts/core/Show"
import { matchTag } from "@effect-ts/core/Utils"

import type { Color } from "../Color"
import { colorToCode } from "../Color"
import type { Layer } from "../Layer"

// -------------------------------------------------------------------------------------
// definition
// -------------------------------------------------------------------------------------

export class Reset {
  readonly _tag = "Reset"
}

export class SetBold {
  readonly _tag = "SetBold"
  constructor(readonly bold: boolean) {}
}

export class SetItalicized {
  readonly _tag = "SetItalicized"
  constructor(readonly italicized: boolean) {}
}

export class SetUnderlined {
  readonly _tag = "SetUnderlined"
  constructor(readonly underlined: boolean) {}
}

export class SetColor {
  readonly _tag = "SetColor"
  constructor(readonly color: Color, readonly vivid: boolean, readonly layer: Layer) {}
}

export type SGR = Reset | SetBold | SetItalicized | SetUnderlined | SetColor

// -------------------------------------------------------------------------------------
// operations
// -------------------------------------------------------------------------------------

export function csi(controlFunction: string, controlParameters: Array<number>): string {
  const params = A.map_(controlParameters, Show.number.show).join(";")
  return `\u001b[${params}${controlFunction}`
}

export function sgrToCode(sgr: SGR): Array<number> {
  return sgr["|>"](
    matchTag({
      Reset: constant(A.single(0)),
      SetBold: ({ bold }) => (bold ? A.single(1) : A.single(22)),
      SetItalicized: ({ italicized }) => (italicized ? A.single(3) : A.single(23)),
      SetUnderlined: ({ underlined }) => (underlined ? A.single(4) : A.single(24)),
      SetColor: ({ color, layer, vivid }) =>
        layer["|>"](
          matchTag({
            Foreground: () =>
              vivid
                ? A.single(90 + colorToCode(color))
                : A.single(30 + colorToCode(color)),
            Background: () =>
              vivid
                ? A.single(100 + colorToCode(color))
                : A.single(40 + colorToCode(color))
          })
        )
    })
  )
}

export const setSGRCode = (sgrs: Array<SGR>): string =>
  csi("m", A.chain_(sgrs, sgrToCode))
