import { Match, Number, pipe } from "effect"
import type { TrueColor } from "../TrueColor.js"

// -----------------------------------------------------------------------------
// Constructors
// -----------------------------------------------------------------------------

/** @internal */
export const trueColor = (hexNumber: number): TrueColor => ({
  _tag: "TrueColor",
  hexNumber
})

const hexToRgbTuple = (hexNumber: number): [number, number, number] => {
  const r = (hexNumber >> 16) & 0xFF
  const g = (hexNumber >> 8) & 0xFF
  const b = hexNumber & 0xFF
  return [r, g, b] as const
}

// -----------------------------------------------------------------------------
// Destructors
// -----------------------------------------------------------------------------

/** @internal */
export const toCode = (color: TrueColor): Readonly<[number, number, number]> =>
  Match.value(color).pipe(
    Match.when(Match.number, (hexNumber) =>
      pipe(Number.clamp(Math.floor(hexNumber), { minimum: 0x000000, maximum: 0xFFFFFF }), hexToRgbTuple)),
    Match.orElse(() =>
      [0, 0, 0] as const
    )
  )
