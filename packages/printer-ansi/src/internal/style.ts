import { Match, Predicate } from "effect"
import type { AnsiColor16 } from "../AnsiColor16.js"
import type { AnsiColor256 } from "../AnsiColor256.js"
import type { TrueColor } from "../TrueColor.js"
import * as ansiColor16 from "./ansiColor16.js"
import * as ansiColor256 from "./ansiColor256.js"
import * as trueColor from "./trueColor.js"

// -----------------------------------------------------------------------------
// Models
// -----------------------------------------------------------------------------

/**
 * Represents the Style also called the
 * Select Graphic Rendition (SGR),
 * the control sequence introducer `CSI n m`,
 * which controls terminal display attributes.
 *
 * @internal
 */
export type Style =
  | Reset
  | Faint
  | Invert
  | Foreground
  | Background

/**
 * Resets all style attributes to their default values.
 *
 * @internal
 */
export interface Reset {
  readonly _tag: "Reset"
}

/**
 * Controls whether the text displayed in is faint.
 *
 * @internal
 */
export interface Faint {
  readonly _tag: "Faint"
  readonly state: boolean
}

/**
 * Controls whether the text displayed in the terminal is inverted.
 *
 * @internal
 */
export interface Invert {
  readonly _tag: "Invert"
  readonly state: boolean
}

/**
 * Controls the foreground color of the text displayed in the terminal.
 *
 * @internal
 */
export interface Foreground {
  readonly _tag: "Foreground"
  readonly color: Style.Color
}

/**
 * Controls the background color of the text displayed in the terminal.
 *
 * @internal
 */
export interface Background {
  readonly _tag: "Background"
  readonly color: Style.Color
}

/** @internal */
export declare namespace Style {
  /** @internal */
  export type Color = AnsiColor16 | AnsiColor256 | TrueColor
}

// -----------------------------------------------------------------------------
// Constructors
// -----------------------------------------------------------------------------

/** @internal */
export const reset: Style = { _tag: "Reset" }

/** @internal */
export const faint = (state: boolean): Style => ({ _tag: "Faint", state })

/** @internal */
export const invert = (state: boolean): Style => ({ _tag: "Invert", state })

// TODO: Maybe only accept TrueColor and transform it depending whether its supported on the terminal?
/** @internal */
export const fg = (color: Style.Color): Style => ({ _tag: "Foreground", color })

export const bg = (color: Style.Color): Style => ({ _tag: "Background", color })

// -----------------------------------------------------------------------------
// Destructors
// -----------------------------------------------------------------------------

const toCodeNum = (self: Style): number | Array<number> =>
  Match.value(self).pipe(
    Match.tag("Reset", () => 0),
    Match.tag("Faint", (self) => self.state ? 2 : 22),
    Match.tag("Invert", (self) => self.state ? 7 : 27),
    Match.tag("Foreground", (self) =>
      Match.value(self.color).pipe(
        Match.tag("Standard", (self) => 30 + ansiColor16.toCode(self)),
        Match.tag("Bright", (self) => 90 + ansiColor16.toCode(self)),
        Match.tag("AnsiColor256", (self) => [38, 5, ansiColor256.toCode(self)]),
        Match.tag("TrueColor", (self) => [38, 2, ...trueColor.toCode(self)]),
        Match.exhaustive
      )),
    Match.tag("Background", (self) =>
      Match.value(self.color).pipe(
        Match.tag("Standard", (self) => 40 + ansiColor16.toCode(self)),
        Match.tag("Bright", (self) => 100 + ansiColor16.toCode(self)),
        Match.tag("AnsiColor256", (self) => [48, 5, ansiColor256.toCode(self)]),
        Match.tag("TrueColor", (self) => [48, 2, ...trueColor.toCode(self)]),
        Match.exhaustive
      )),
    Match.exhaustive
  )

const toCodeStr = (style: Style): string =>
  Match.value(toCodeNum(style)).pipe(
    Match.when(Predicate.isNumber, (v) => v.toString()),
    Match.orElse((v) => v.join(";"))
  )

// TODO: Maybe use non empty array?
/** @internal */
export const toCode = (styles: ReadonlyArray<Style>): string =>
  styles.length > 0
    ? styles.map(toCodeStr).join(";").concat("m")
    : ""
