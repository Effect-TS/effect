import type * as PW from "@effect/printer/PageWidth"
import * as Equal from "@fp-ts/data/Equal"
import { pipe } from "@fp-ts/data/Function"

// -----------------------------------------------------------------------------
// Models
// -----------------------------------------------------------------------------

const PageWidthSymbolKey = "@effect/printer/PageWidth"
/** @internal */
export const PageWidthTypeId: PW.TypeId = Symbol.for(PageWidthSymbolKey) as PW.TypeId

class AvailablePerLine implements PW.AvailablePerLine {
  readonly _tag = "AvailablePerLine"
  readonly _id: PW.TypeId = PageWidthTypeId
  constructor(readonly lineWidth: number, readonly ribbonFraction: number) {}
  [Equal.symbolHash](): number {
    return pipe(
      Equal.hash("@effect/printer/PageWidth/AvailablePerLine"),
      Equal.hashCombine(Equal.hash(PageWidthSymbolKey)),
      Equal.hashCombine(Equal.hash(this.lineWidth)),
      Equal.hashCombine(Equal.hash(this.ribbonFraction))
    )
  }
  [Equal.symbolEqual](that: unknown): boolean {
    return isPageWidth(that) &&
      that._tag === "AvailablePerLine" &&
      this.lineWidth === that.lineWidth &&
      this.ribbonFraction === that.ribbonFraction
  }
}

class Unbounded implements PW.Unbounded {
  readonly _tag = "Unbounded"
  readonly _id: PW.TypeId = PageWidthTypeId;
  [Equal.symbolHash](): number {
    return pipe(
      Equal.hash("@effect/printer/PageWidth/Unbounded"),
      Equal.hashCombine(Equal.hash(PageWidthSymbolKey))
    )
  }
  [Equal.symbolEqual](that: unknown): boolean {
    return isPageWidth(that) && that._tag === "Unbounded"
  }
}

// -----------------------------------------------------------------------------
// Refinements
// -----------------------------------------------------------------------------

/** @internal */
export function isPageWidth(u: unknown): u is PageWidth {
  return typeof u === "object" && u != null && "_id" in u && u["_id"] === PageWidthTypeId
}

/** @internal */
export function isAvailablePerLine(self: PageWidth): self is AvailablePerLine {
  return self._tag === "AvailablePerLine"
}

/** @internal */
export function isUnbounded(self: PageWidth): self is Unbounded {
  return self._tag === "AvailablePerLine"
}

// -----------------------------------------------------------------------------
// Constructors
// -----------------------------------------------------------------------------

/** @internal */
export function availablePerLine(lineWidth: number, ribbonFraction: number): PageWidth {
  return new AvailablePerLine(lineWidth, ribbonFraction)
}

/** @internal */
export const unbounded: PageWidth = new Unbounded()

// -----------------------------------------------------------------------------
// Utilities
// -----------------------------------------------------------------------------

/** @internal */
export function remainingWidth(
  lineLength: number,
  ribbonFraction: number,
  lineIndent: number,
  currentColumn: number
) {
  const columnsLeftInLine = lineLength - currentColumn
  const ribbonWidth = Math.max(
    0,
    Math.min(lineLength, Math.floor(lineLength * ribbonFraction))
  )
  const columnsLeftInRibbon = lineIndent + ribbonWidth - currentColumn
  return Math.min(columnsLeftInLine, columnsLeftInRibbon)
}
