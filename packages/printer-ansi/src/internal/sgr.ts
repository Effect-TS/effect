/**
 * This module contains the definition of a data structure meant to represent
 * the control sequence introducer `CSI n m`, also known as the Select Graphic
 * Rendition (SGR), where `n` is used to control terminal display attributes.
 *
 * Several SGR display attributes can be set in the same CSI sequence, separated
 * by semicolons.
 *
 * Each display attribute remains in effect in the terminal until a following
 * occurrence of SGR resets it.
 *
 * The SGR display attributes available in this module are **not** meant to be
 * exhaustive but instead are meant to provide the most common and
 * well-supported SGR display attributes (with a few exceptions).
 */
import type * as Color from "../Color.js"
import * as color from "./color.js"

// -----------------------------------------------------------------------------
// Models
// -----------------------------------------------------------------------------

/**
 * Represents the the control sequence introducer `CSI n m`, also called the
 * Select Graphic Rendition (SGR), which controls terminal display attributes.
 *
 * @internal
 */
export type SGR =
  | Reset
  | SetBold
  | SetColor
  | SetItalicized
  | SetStrikethrough
  | SetUnderlined

/**
 * Resets all SGR attributes to their default values.
 *
 * @internal
 */
export interface Reset {
  readonly _tag: "Reset"
}

/**
 * Controls whether the text displayed in the terminal is bold.
 *
 * @internal
 */
export interface SetBold {
  readonly _tag: "SetBold"
  readonly bold: boolean
}

/**
 * Controls the color of the text displayed in the terminal.
 *
 * @internal
 */
export interface SetColor {
  readonly _tag: "SetColor"
  readonly color: Color.Color
  readonly vivid: boolean
  readonly layer: SGR.Layer
}

/**
 * Controls whether the text displayed in the terminal is italicized.
 *
 * **NOTE**: not widely supported.
 *
 * @internal
 */
export interface SetItalicized {
  readonly _tag: "SetItalicized"
  readonly italicized: boolean
}

/**
 * Controls whether the text displayed in the terminal has a strikethrough.
 *
 * @internal
 */
export interface SetStrikethrough {
  readonly _tag: "SetStrikethrough"
  readonly strikethrough: boolean
}

/**
 * Controls whether the text displayed in the terminal is underlined.
 *
 * @internal
 */
export interface SetUnderlined {
  readonly _tag: "SetUnderlined"
  readonly underlined: boolean
}

/** @internal */
export declare namespace SGR {
  /** @internal */
  export type Layer = "foreground" | "background"
}

// -----------------------------------------------------------------------------
// Constructors
// -----------------------------------------------------------------------------

/** @internal */
export const reset: SGR = { _tag: "Reset" }

/** @internal */
export const setBold = (bold: boolean): SGR => ({
  _tag: "SetBold",
  bold
})

/** @internal */
export const setColor = (color: Color.Color, vivid: boolean, layer: SGR.Layer): SGR => ({
  _tag: "SetColor",
  color,
  vivid,
  layer
})

/** @internal */
export const setItalicized = (italicized: boolean): SGR => ({
  _tag: "SetItalicized",
  italicized
})

/** @internal */
export const setStrikethrough = (strikethrough: boolean): SGR => ({
  _tag: "SetStrikethrough",
  strikethrough
})

/** @internal */
export const setUnderlined = (underlined: boolean): SGR => ({
  _tag: "SetUnderlined",
  underlined
})

// -----------------------------------------------------------------------------
// Destructors
// -----------------------------------------------------------------------------

/** @internal */
export const toCode = (self: SGR): number => {
  switch (self._tag) {
    case "Reset": {
      return 0
    }
    case "SetBold": {
      return self.bold ? 1 : 22
    }
    case "SetColor": {
      switch (self.layer) {
        case "foreground": {
          return self.vivid ? 90 + color.toCode(self.color) : 30 + color.toCode(self.color)
        }
        case "background": {
          return self.vivid ? 100 + color.toCode(self.color) : 40 + color.toCode(self.color)
        }
      }
    }
    case "SetItalicized": {
      return self.italicized ? 3 : 23
    }
    case "SetStrikethrough": {
      return self.strikethrough ? 9 : 29
    }
    case "SetUnderlined": {
      return self.underlined ? 4 : 24
    }
  }
}

/** @internal */
export const toEscapeSequence = (sgrs: Iterable<SGR>): string => csi("m", sgrs)

const csi = (controlFunction: string, sgrs: Iterable<SGR>): string => {
  const params = Array.from(sgrs).map((sgr) => `${toCode(sgr)}`).join(";")
  return `\u001b[${params}${controlFunction}`
}
