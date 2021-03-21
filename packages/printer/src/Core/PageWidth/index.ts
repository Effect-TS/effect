// tracing: off

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

export function availablePerLine(lineWidth: number, ribbonFraction: number): PageWidth {
  return PageWidth.as.AvailablePerLine({ lineWidth, ribbonFraction })
}

export const unbounded: PageWidth = PageWidth.as.Unbounded({})

export const defaultPageWidth = availablePerLine(80, 1)

// -------------------------------------------------------------------------------------
// destructors
// -------------------------------------------------------------------------------------

export function match_<R>(
  pageWidth: PageWidth,
  patterns: {
    readonly AvailablePerLine: (lineWidth: number, ribbonFraction: number) => R
    readonly Unbounded: () => R
  }
): R {
  switch (pageWidth._tag) {
    case "AvailablePerLine":
      return patterns.AvailablePerLine(pageWidth.lineWidth, pageWidth.ribbonFraction)
    case "Unbounded":
      return patterns.Unbounded()
  }
}

/**
 * @dataFirst match_
 */
export function match<R>(patterns: {
  readonly AvailablePerLine: (lineWidth: number, ribbonFraction: number) => R
  readonly Unbounded: () => R
}) {
  return (pageWidth: PageWidth): R => match_(pageWidth, patterns)
}

// -------------------------------------------------------------------------------------
// operations
// -------------------------------------------------------------------------------------

/**
 * Calculates the remaining width on the current line.
 */
export function remainingWidth(
  lineLength: number,
  ribbonFraction: number,
  lineIndent: number,
  currentColumn: number
): number {
  const columnsLeftInLine = lineLength - currentColumn
  const ribbonWidth = Math.max(
    0,
    Math.min(lineLength, Math.floor(lineLength * ribbonFraction))
  )
  const columnsLeftInRibbon = lineIndent + ribbonWidth - currentColumn
  return Math.min(columnsLeftInLine, columnsLeftInRibbon)
}
