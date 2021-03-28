// tracing: off

import { constant } from "@effect-ts/core/Function"
import * as MO from "@effect-ts/morphic"

// -------------------------------------------------------------------------------------
// definition
// -------------------------------------------------------------------------------------

const Black_ = MO.make((F) =>
  F.interface({ _tag: F.stringLiteral("Black") }, { name: "Black" })
)

export interface Black extends MO.AType<typeof Black_> {}
export interface BlackE extends MO.EType<typeof Black_> {}
const Black = MO.opaque<BlackE, Black>()(Black_)

const Red_ = MO.make((F) =>
  F.interface({ _tag: F.stringLiteral("Red") }, { name: "Red" })
)

export interface Red extends MO.AType<typeof Red_> {}
export interface RedE extends MO.EType<typeof Red_> {}
const Red = MO.opaque<RedE, Red>()(Red_)

const Green_ = MO.make((F) =>
  F.interface({ _tag: F.stringLiteral("Green") }, { name: "Green" })
)

export interface Green extends MO.AType<typeof Green_> {}
export interface GreenE extends MO.EType<typeof Green_> {}
const Green = MO.opaque<GreenE, Green>()(Green_)

const Yellow_ = MO.make((F) =>
  F.interface({ _tag: F.stringLiteral("Yellow") }, { name: "Yellow" })
)

export interface Yellow extends MO.AType<typeof Yellow_> {}
export interface YellowE extends MO.EType<typeof Yellow_> {}
const Yellow = MO.opaque<YellowE, Yellow>()(Yellow_)

const Blue_ = MO.make((F) =>
  F.interface({ _tag: F.stringLiteral("Blue") }, { name: "Blue" })
)

export interface Blue extends MO.AType<typeof Blue_> {}
export interface BlueE extends MO.EType<typeof Blue_> {}
const Blue = MO.opaque<BlueE, Blue>()(Blue_)

const Magenta_ = MO.make((F) =>
  F.interface({ _tag: F.stringLiteral("Magenta") }, { name: "Magenta" })
)

export interface Magenta extends MO.AType<typeof Magenta_> {}
export interface MagentaE extends MO.EType<typeof Magenta_> {}
const Magenta = MO.opaque<MagentaE, Magenta>()(Magenta_)

const Cyan_ = MO.make((F) =>
  F.interface({ _tag: F.stringLiteral("Cyan") }, { name: "Cyan" })
)

export interface Cyan extends MO.AType<typeof Cyan_> {}
export interface CyanE extends MO.EType<typeof Cyan_> {}
const Cyan = MO.opaque<CyanE, Cyan>()(Cyan_)

const White_ = MO.make((F) =>
  F.interface({ _tag: F.stringLiteral("White") }, { name: "White" })
)

export interface White extends MO.AType<typeof White_> {}
export interface WhiteE extends MO.EType<typeof White_> {}
const White = MO.opaque<WhiteE, White>()(White_)

export const Color = MO.makeADT("_tag")({
  Black,
  Red,
  Green,
  Yellow,
  Blue,
  Magenta,
  Cyan,
  White
})
export type Color = MO.AType<typeof Color>

// -------------------------------------------------------------------------------------
// constructors
// -------------------------------------------------------------------------------------

export const black: Color = Color.as.Black({})

export const red: Color = Color.as.Red({})

export const green: Color = Color.as.Green({})

export const yellow: Color = Color.as.Yellow({})

export const blue: Color = Color.as.Blue({})

export const magenta: Color = Color.as.Magenta({})

export const cyan: Color = Color.as.Cyan({})

export const white: Color = Color.as.White({})

// -------------------------------------------------------------------------------------
// operations
// -------------------------------------------------------------------------------------

export const colorToCode: (color: Color) => number = Color.matchStrict({
  Black: constant(0),
  Red: constant(1),
  Green: constant(2),
  Yellow: constant(3),
  Blue: constant(4),
  Magenta: constant(5),
  Cyan: constant(6),
  White: constant(7)
})
