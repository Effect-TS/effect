import { constant } from "@effect-ts/core/Function"
import * as fc from "fast-check"

import * as D from "../src/Core/Doc"

export const arbEmpty: fc.Arbitrary<D.Doc<number>> = fc.constant(D.empty)

export const arbChar: fc.Arbitrary<D.Doc<number>> = fc.char().map(D.char)

export const arbText: fc.Arbitrary<D.Doc<number>> = fc.string().map(D.text)

export const arbLine: fc.Arbitrary<D.Doc<number>> = fc.constant(D.hardLine)

export const arbFlatAlt: fc.Arbitrary<D.Doc<number>> = fc
  .tuple(fc.oneof(arbChar, arbText), fc.oneof(arbChar, arbText))
  .map(([d1, d2]) => D.flatAlt_(d1, d2))

export const arbCat: fc.Arbitrary<D.Doc<number>> = fc
  .tuple(fc.oneof(arbChar, arbText), fc.oneof(arbChar, arbText))
  .map(([d1, d2]) => D.cat_(d1, d2))

export const arbNest: fc.Arbitrary<D.Doc<number>> = fc
  .tuple(fc.oneof(arbChar, arbText), fc.integer())
  .map(([d, i]) => D.nest_(d, i))

export const arbUnion: fc.Arbitrary<D.Doc<number>> = fc
  .tuple(fc.oneof(arbChar, arbText), fc.oneof(arbChar, arbText))
  .map(([d1, d2]) => D.union_(d1, d2))

export const arbColumn: fc.Arbitrary<D.Doc<number>> = fc
  .oneof(arbChar, arbText)
  .map((d) => D.column(constant(d)))

export const arbWithPageWidth: fc.Arbitrary<D.Doc<number>> = fc
  .oneof(arbChar, arbText)
  .map((d) => D.withPageWidth(constant(d)))

export const arbNesting: fc.Arbitrary<D.Doc<number>> = fc
  .oneof(arbChar, arbText)
  .map((d) => D.nesting(constant(d)))

export const arbAnnotated: fc.Arbitrary<D.Doc<number>> = fc
  .tuple(fc.oneof(arbChar, arbText), fc.integer())
  .map(([d, n]) => D.annotate_(d, n))

export const arbDoc: fc.Arbitrary<D.Doc<number>> = fc.oneof(
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
