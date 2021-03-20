// tracing: off

import type { Endomorphism } from "@effect-ts/core/Function"
import { absurd, pipe } from "@effect-ts/core/Function"
import * as Ord from "@effect-ts/core/Ord"
import * as MO from "@effect-ts/morphic"

// -------------------------------------------------------------------------------------
// definition
// -------------------------------------------------------------------------------------

/**
 * Represents a `PageWidth` setting that informs the layout
 * algorithms to avoid exceeding the specified space per line.
 */
const AvailablePerLine_ = MO.make((F) =>
  F.interface(
    {
      _tag: F.stringLiteral("AvailablePerLine"),
      /**
       * The number of characters, including whitespace, that can fit
       * on a single line.
       */
      lineWidth: F.number(),
      /**
       * The fraction of the total page width that can be printed on.
       * This allows limiting the length of printable text per line.
       * Values must be between `0` and `1` (`0.4` to `1` is typical).
       */
      ribbonFraction: F.constrained(F.number(), Ord.between(Ord.number)(0, 1))
    },
    { name: "AvailablePerLine" }
  )
)

export interface AvailablePerLine extends MO.AType<typeof AvailablePerLine_> {}
export interface AvailablePerLineE extends MO.EType<typeof AvailablePerLine_> {}
export const AvailablePerLine = MO.opaque<AvailablePerLineE, AvailablePerLine>()(
  AvailablePerLine_
)

/**
 * Represents a `PageWidth` setting that informs the layout
 * algorithms to avoid introducing line breaks into a document.
 */
const Unbounded_ = MO.make((F) =>
  F.interface(
    {
      _tag: F.stringLiteral("Unbounded")
    },
    { name: "Unbounded" }
  )
)

export interface Unbounded extends MO.AType<typeof Unbounded_> {}
export interface UnboundedE extends MO.EType<typeof Unbounded_> {}
export const Unbounded = MO.opaque<UnboundedE, Unbounded>()(Unbounded_)

/**
 * Represents the maximum number of characters that fit onto a
 * single line in a document. The layout algorithms will try to
 * avoid exceeding the set character limit by inserting line
 * breaks where appropriate (e.g., via `softLine`).
 */
export const PageWidth = MO.makeADT("_tag")({ AvailablePerLine, Unbounded })
export type PageWidth = MO.AType<typeof PageWidth>

// -------------------------------------------------------------------------------------
// constructors
// -------------------------------------------------------------------------------------

export const availablePerLine = (
  lineWidth: number,
  ribbonFraction: number
): PageWidth => PageWidth.as.AvailablePerLine({ lineWidth, ribbonFraction })

export const unbounded: PageWidth = PageWidth.as.Unbounded({})

export const defaultPageWidth = availablePerLine(80, 1)

// -------------------------------------------------------------------------------------
// destructors
// -------------------------------------------------------------------------------------

export const match = <R>(patterns: {
  readonly AvailablePerLine: (lineWidth: number, ribbonFraction: number) => R
  readonly Unbounded: () => R
}): ((pageWidth: PageWidth) => R) => {
  const f = (x: PageWidth): R => {
    switch (x._tag) {
      case "AvailablePerLine":
        return patterns.AvailablePerLine(x.lineWidth, x.ribbonFraction)
      case "Unbounded":
        return patterns.Unbounded()
      default:
        return absurd(x)
    }
  }
  return f
}

// -------------------------------------------------------------------------------------
// operations
// -------------------------------------------------------------------------------------

const min = (x: number) => (y: number): number => Ord.min(Ord.number)(x, y)
const max = (x: number) => (y: number): number => Ord.max(Ord.number)(x, y)
const floor: Endomorphism<number> = (x) => Math.floor(x)

/**
 * Calculates the remaining width on the current line.
 */
export const remainingWidth = (
  lineLength: number,
  ribbonFraction: number,
  lineIndent: number,
  currentColumn: number
): number => {
  const columnsLeftInLine = lineLength - currentColumn
  const ribbonWidth = pipe(lineLength * ribbonFraction, floor, min(lineLength), max(0))
  const columnsLeftInRibbon = lineIndent + ribbonWidth - currentColumn
  return min(columnsLeftInLine)(columnsLeftInRibbon)
}
