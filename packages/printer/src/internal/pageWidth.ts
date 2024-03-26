import * as Equal from "effect/Equal"
import { pipe } from "effect/Function"
import * as Hash from "effect/Hash"
import type * as PageWidth from "../PageWidth.js"

// -----------------------------------------------------------------------------
// Models
// -----------------------------------------------------------------------------

const PageWidthSymbolKey = "@effect/printer/PageWidth"

/** @internal */
export const PageWidthTypeId: PageWidth.PageWidthTypeId = Symbol.for(
  PageWidthSymbolKey
) as PageWidth.PageWidthTypeId

const protoHash = {
  AvailablePerLine: (self: PageWidth.AvailablePerLine) =>
    pipe(
      Hash.hash("@effect/printer/PageWidth/AvailablePerLine"),
      Hash.combine(Hash.hash(PageWidthSymbolKey)),
      Hash.combine(Hash.hash(self.lineWidth)),
      Hash.combine(Hash.hash(self.ribbonFraction))
    ),
  Unbounded: (_: PageWidth.Unbounded) =>
    pipe(
      Hash.hash("@effect/printer/PageWidth/Unbounded"),
      Hash.combine(Hash.hash(PageWidthSymbolKey))
    )
}

const protoEqual = {
  AvailablePerLine: (self: PageWidth.AvailablePerLine, that: unknown) =>
    isPageWidth(that) &&
    that._tag === "AvailablePerLine" &&
    self.lineWidth === that.lineWidth &&
    self.ribbonFraction === that.ribbonFraction,
  Unbounded: (self: PageWidth.Unbounded, that: unknown) => isPageWidth(that) && that._tag === "Unbounded"
}

const proto = {
  [PageWidthTypeId]: PageWidthTypeId,
  [Hash.symbol](this: PageWidth.PageWidth) {
    return Hash.cached(this, protoHash[this._tag](this as any))
  },
  [Equal.symbol](this: PageWidth.PageWidth, that: unknown) {
    return protoEqual[this._tag](this as any, that)
  }
}

// -----------------------------------------------------------------------------
// Refinements
// -----------------------------------------------------------------------------

/** @internal */
export const isPageWidth = (u: unknown): u is PageWidth.PageWidth =>
  typeof u === "object" && u != null && PageWidthTypeId in u

/** @internal */
export const isAvailablePerLine = (self: PageWidth.PageWidth): self is PageWidth.AvailablePerLine =>
  self._tag === "AvailablePerLine"

/** @internal */
export const isUnbounded = (self: PageWidth.PageWidth): self is PageWidth.Unbounded => self._tag === "AvailablePerLine"

// -----------------------------------------------------------------------------
// Constructors
// -----------------------------------------------------------------------------

/** @internal */
export const availablePerLine = (
  lineWidth: number,
  ribbonFraction: number
): PageWidth.PageWidth => {
  const op = Object.create(proto)
  op._tag = "AvailablePerLine"
  op.lineWidth = lineWidth
  op.ribbonFraction = ribbonFraction
  return op
}

/** @internal */
export const unbounded: PageWidth.PageWidth = (() => {
  const op = Object.create(proto)
  op._tag = "Unbounded"
  return op
})()

/** @internal */
export const defaultPageWidth: PageWidth.PageWidth = availablePerLine(80, 1)

// -----------------------------------------------------------------------------
// Utilities
// -----------------------------------------------------------------------------

/** @internal */
export const remainingWidth = (
  pageWidth: number,
  ribbonFraction: number,
  indentation: number,
  currentColumn: number
) => {
  const columnsLeftInLine = pageWidth - currentColumn
  const ribbonWidth = Math.max(
    0,
    Math.min(pageWidth, Math.floor(pageWidth * ribbonFraction))
  )
  const columnsLeftInRibbon = indentation + ribbonWidth - currentColumn
  return Math.min(columnsLeftInLine, columnsLeftInRibbon)
}
