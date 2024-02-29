import { Match, Number, pipe, Predicate } from "effect"
import type { TrueColor } from "../TrueColor.js"

// -----------------------------------------------------------------------------
// Constructors
// -----------------------------------------------------------------------------

/** @internal */
export const trueColor = (value: TrueColor["value"]): TrueColor => ({
  _tag: "TrueColor",
  value
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

export const isHexNumber = (input: unknown): input is [number] =>
  Array.isArray(input)
  && input.length === 1
  && input.every(Predicate.isNumber)

export const isRgbTuple = (input: unknown): input is [number, number, number] =>
  Array.isArray(input)
  && input.length === 3
  && input.every(Predicate.isNumber)

// TODO: Matching might be unnecessary, I thought of later accepting other color formats
/** @internal */
export const toCode = (color: TrueColor): Readonly<[number, number, number]> =>
  Match.value(color.value).pipe(
    Match.when(isHexNumber, ([hexNumber]) =>
      pipe(Number.clamp(Math.floor(hexNumber), { minimum: 0x000000, maximum: 0xFFFFFF }), hexToRgbTuple)),
    Match.when(isRgbTuple, (rgb) =>
      rgb.map((x) =>
        Number.clamp(Math.floor(x), { minimum: 0, maximum: 255 })
      ) as [number, number, number]),
    Match.exhaustive
  )
