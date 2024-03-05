import { Match } from "effect"
import type { AnsiColor16 } from "../AnsiColor16.js"

// -----------------------------------------------------------------------------
// Constructors
// -----------------------------------------------------------------------------

/** @internal */
export const standard = (name: AnsiColor16.Name): AnsiColor16 => ({
  _tag: "Standard",
  name
})

/** @internal */
export const bright = (name: AnsiColor16.Name): AnsiColor16 => ({
  _tag: "Bright",
  name
})

/** @internal */
export const nameToCode = (color: AnsiColor16.Name): number =>
  Match.value(color).pipe(
    Match.when("black", () => 0),
    Match.when("red", () => 1),
    Match.when("green", () => 2),
    Match.when("yellow", () => 3),
    Match.when("blue", () => 4),
    Match.when("magenta", () => 5),
    Match.when("cyan", () => 6),
    Match.when("white", () => 7),
    Match.exhaustive
  )

// -----------------------------------------------------------------------------
// Destructors
// -----------------------------------------------------------------------------

/** @internal */
export const toCode = (color: AnsiColor16): number =>
  Match.value(color).pipe(
    Match.tag("Standard", ({ name }) => nameToCode(name)),
    Match.tag("Bright", ({ name }) => nameToCode(name)),
    Match.exhaustive
  )
