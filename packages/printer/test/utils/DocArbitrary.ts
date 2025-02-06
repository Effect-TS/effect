import * as Doc from "@effect/printer/Doc"
import * as fc from "effect/FastCheck"
import { constant } from "effect/Function"

export const arbEmpty: fc.Arbitrary<Doc.Doc<number>> = fc.constant(Doc.empty)

export const arbChar: fc.Arbitrary<Doc.Doc<number>> = fc.char().map(Doc.char)

export const arbText: fc.Arbitrary<Doc.Doc<number>> = fc.string().map(Doc.text)

export const arbLine: fc.Arbitrary<Doc.Doc<number>> = fc.constant(Doc.hardLine)

export const arbFlatAlt: fc.Arbitrary<Doc.Doc<number>> = fc
  .tuple(fc.oneof(arbChar, arbText), fc.oneof(arbChar, arbText))
  .map(([d1, d2]) => Doc.flatAlt(d1, d2))

export const arbCat: fc.Arbitrary<Doc.Doc<number>> = fc
  .tuple(fc.oneof(arbChar, arbText), fc.oneof(arbChar, arbText))
  .map(([d1, d2]) => Doc.cat(d1, d2))

export const arbNest: fc.Arbitrary<Doc.Doc<number>> = fc
  .tuple(fc.oneof(arbChar, arbText), fc.integer())
  .map(([d, i]) => Doc.nest(d, i))

export const arbUnion: fc.Arbitrary<Doc.Doc<number>> = fc
  .tuple(fc.oneof(arbChar, arbText), fc.oneof(arbChar, arbText))
  .map(([d1, d2]) => Doc.union(d1, d2))

export const arbColumn: fc.Arbitrary<Doc.Doc<number>> = fc
  .oneof(arbChar, arbText)
  .map((d) => Doc.column(constant(d)))

export const arbWithPageWidth: fc.Arbitrary<Doc.Doc<number>> = fc
  .oneof(arbChar, arbText)
  .map((d) => Doc.pageWidth(constant(d)))

export const arbNesting: fc.Arbitrary<Doc.Doc<number>> = fc
  .oneof(arbChar, arbText)
  .map((d) => Doc.nesting(constant(d)))

export const arbAnnotated: fc.Arbitrary<Doc.Doc<number>> = fc
  .tuple(fc.oneof(arbChar, arbText), fc.integer())
  .map(([d, n]) => Doc.annotate(d, n))

export const arbDoc: fc.Arbitrary<Doc.Doc<number>> = fc.oneof(
  arbEmpty,
  arbChar,
  arbText,
  arbLine,
  arbFlatAlt,
  arbCat,
  arbNest,
  arbUnion,
  arbColumn,
  arbWithPageWidth,
  arbNesting,
  arbAnnotated
)
