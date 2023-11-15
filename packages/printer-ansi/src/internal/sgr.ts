import type * as Color from "../Color.js"
import type * as RenderLayer from "../RenderLayer.js"
import type * as SGR from "../SGR.js"
import * as color from "./color.js"

// -----------------------------------------------------------------------------
// Destructors
// -----------------------------------------------------------------------------

/** @internal */
export const reset: SGR.SGR = { _tag: "Reset" }

/** @internal */
export const setBold = (bold: boolean): SGR.SGR => ({
  _tag: "SetBold",
  bold
})

/** @internal */
export const setItalicized = (italicized: boolean): SGR.SGR => ({
  _tag: "SetItalicized",
  italicized
})

/** @internal */
export const setUnderlined = (underlined: boolean): SGR.SGR => ({
  _tag: "SetUnderlined",
  underlined
})

/** @internal */
export const setColor = (color: Color.Color, vivid: boolean, layer: RenderLayer.RenderLayer): SGR.SGR => ({
  _tag: "SetColor",
  color,
  vivid,
  layer
})

// -----------------------------------------------------------------------------
// Destructors
// -----------------------------------------------------------------------------

/** @internal */
export const toCode = (self: SGR.SGR): number => {
  switch (self._tag) {
    case "Reset": {
      return 0
    }
    case "SetBold": {
      return self.bold ? 1 : 22
    }
    case "SetItalicized": {
      return self.italicized ? 3 : 23
    }
    case "SetUnderlined": {
      return self.underlined ? 4 : 24
    }
    case "SetColor": {
      switch (self.layer._tag) {
        case "Foreground": {
          return self.vivid ? 90 + color.toCode(self.color) : 30 + color.toCode(self.color)
        }
        case "Background": {
          return self.vivid ? 100 + color.toCode(self.color) : 40 + color.toCode(self.color)
        }
      }
    }
  }
}

/** @internal */
export const toEscapeSequence = (sgrs: Iterable<SGR.SGR>): string => csi("m", sgrs)

const csi = (controlFunction: string, sgrs: Iterable<SGR.SGR>): string => {
  const params = Array.from(sgrs).map((sgr) => toCode(sgr).toString()).join(";")
  return `\u001b[${params}${controlFunction}`
}
