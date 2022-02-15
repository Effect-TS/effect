// ets_tracing: off

// -------------------------------------------------------------------------------------
// definition
// -------------------------------------------------------------------------------------

/**
 * Represents a `PageWidth` setting that informs the layout
 * algorithms to avoid exceeding the specified space per line.
 */
export class AvailablePerLine {
  readonly _tag = "AvailablePerLine"
  constructor(
    /**
     * The number of characters, including whitespace, that can fit
     * on a single line.
     */
    readonly lineWidth: number,
    /**
     * The fraction of the total page width that can be printed on.
     * This allows limiting the length of printable text per line.
     * Values must be between `0` and `1` (`0.4` to `1` is typical).
     */
    readonly ribbonFraction: number
  ) {}
}

/**
 * Represents a `PageWidth` setting that informs the layout
 * algorithms to avoid introducing line breaks into a document.
 */
export class Unbounded {
  readonly _tag = "Unbounded"
}

/**
 * Represents the maximum number of characters that fit onto a
 * single line in a document. The layout algorithms will try to
 * avoid exceeding the set character limit by inserting line
 * breaks where appropriate (e.g., via `softLine`).
 */
export type PageWidth = AvailablePerLine | Unbounded

// -------------------------------------------------------------------------------------
// constructors
// -------------------------------------------------------------------------------------

export function availablePerLine(lineWidth: number, ribbonFraction: number): PageWidth {
  return new AvailablePerLine(lineWidth, ribbonFraction)
}

export const unbounded: PageWidth = new Unbounded()

export const defaultPageWidth = availablePerLine(80, 1)

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
