import { Match, Number } from "effect"
import type { AnsiColor256 } from "../AnsiColor256.js"

// -----------------------------------------------------------------------------
// Constructors
// -----------------------------------------------------------------------------

/** @internal */
export const ansiColor256 = (index: number): AnsiColor256 => ({
  _tag: "AnsiColor256",
  index
})

// -----------------------------------------------------------------------------
// Destructors
// -----------------------------------------------------------------------------

/** @internal */
export const toCode = (color: AnsiColor256): number =>
  Match.value(color).pipe(
    Match.when(Match.number, (index) => Number.clamp(Math.floor(index), { minimum: 0, maximum: 255 })),
    Match.orElse(() => 0)
  )
