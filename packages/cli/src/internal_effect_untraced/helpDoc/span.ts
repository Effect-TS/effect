import type * as Span from "@effect/cli/HelpDoc/Span"
import { dual } from "@effect/data/Function"
import * as RA from "@effect/data/ReadonlyArray"
import type * as AnsiDoc from "@effect/printer-ansi/AnsiDoc"
import * as AnsiStyle from "@effect/printer-ansi/AnsiStyle"
import * as Color from "@effect/printer-ansi/Color"
import * as Doc from "@effect/printer/Doc"

/** @internal */
export const text = (value: string): Span.Span => ({
  _tag: "Text",
  value
})

/** @internal */
export const empty: Span.Span = text("")

/** @internal */
export const space: Span.Span = text(" ")

/** @internal */
export const code = (value: string): Span.Span => ({
  _tag: "Code",
  value
})

/** @internal */
export const error = (value: Span.Span | string): Span.Span => ({
  _tag: "Error",
  value: typeof value === "string" ? text(value) : value
})

/** @internal */
export const weak = (value: Span.Span | string): Span.Span => ({
  _tag: "Weak",
  value: typeof value === "string" ? text(value) : value
})

/** @internal */
export const strong = (value: Span.Span | string): Span.Span => ({
  _tag: "Strong",
  value: typeof value === "string" ? text(value) : value
})

/** @internal */
export const uri = (value: string): Span.Span => ({
  _tag: "URI",
  value
})

/** @internal */
export const concat = dual<
  (that: Span.Span) => (self: Span.Span) => Span.Span,
  (self: Span.Span, that: Span.Span) => Span.Span
>(2, (self, that): Span.Span => ({
  _tag: "Sequence",
  left: self,
  right: that
}))

/** @internal */
export const spans = (spans: Iterable<Span.Span>): Span.Span => {
  const elements = RA.fromIterable(spans)
  if (RA.isNonEmptyReadonlyArray(elements)) {
    return elements.slice(1).reduce(concat, elements[0])
  }
  return empty
}

/** @internal */
export const isEmpty = (self: Span.Span): boolean => size(self) === 0

const sizeMap: {
  [K in Span.Span["_tag"]]: (self: Extract<Span.Span, { _tag: K }>) => number
} = {
  Code: (self) => self.value.length,
  Text: (self) => self.value.length,
  Error: (self) => sizeMap[self.value._tag](self.value as any),
  Weak: (self) => sizeMap[self.value._tag](self.value as any),
  Strong: (self) => sizeMap[self.value._tag](self.value as any),
  URI: (self) => self.value.length,
  Sequence: (self) => {
    const left = sizeMap[self.left._tag](self.left as any)
    const right = sizeMap[self.right._tag](self.right as any)
    return left + right
  }
}

/** @internal */
export const size = (self: Span.Span): number => sizeMap[self._tag](self as any)

const spanToAnsiDoc: {
  [K in Span.Span["_tag"]]: (self: Extract<Span.Span, { _tag: K }>) => AnsiDoc.AnsiDoc
} = {
  Text: (self) => Doc.text(self.value),
  Code: (self) => Doc.annotate(Doc.text(self.value), AnsiStyle.color(Color.white)),
  Error: (self) => Doc.annotate(spanToAnsiDoc[self.value._tag](self.value as any), AnsiStyle.color(Color.red)),
  Weak: (self) => Doc.annotate(spanToAnsiDoc[self.value._tag](self.value as any), AnsiStyle.dullColor(Color.black)),
  Strong: (self) => Doc.annotate(spanToAnsiDoc[self.value._tag](self.value as any), AnsiStyle.bold),
  URI: (self) => Doc.annotate(Doc.text(self.value), AnsiStyle.underlined),
  Sequence: (self) =>
    Doc.cat(
      spanToAnsiDoc[self.left._tag](self.left as any),
      spanToAnsiDoc[self.right._tag](self.right as any)
    )
}

/** @internal */
export const toAnsiDoc = (self: Span.Span): AnsiDoc.AnsiDoc => spanToAnsiDoc[self._tag](self as any)
