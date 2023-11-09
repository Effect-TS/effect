import type * as AnsiDoc from "@effect/printer-ansi/AnsiDoc"
import * as AnsiStyle from "@effect/printer-ansi/AnsiStyle"
import * as Color from "@effect/printer-ansi/Color"
import * as Doc from "@effect/printer/Doc"
import { dual } from "effect/Function"
import * as ReadonlyArray from "effect/ReadonlyArray"
import type * as Span from "../../HelpDoc/Span.js"

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
export const isCode = (self: Span.Span): self is Span.Code => self._tag === "Code"

/** @internal */
export const isError = (self: Span.Span): self is Span.Error => self._tag === "Error"

/** @internal */
export const isSequence = (self: Span.Span): self is Span.Sequence => self._tag === "Sequence"

/** @internal */
export const isStrong = (self: Span.Span): self is Span.Strong => self._tag === "Strong"

/** @internal */
export const isText = (self: Span.Span): self is Span.Text => self._tag === "Text"

/** @internal */
export const isUri = (self: Span.Span): self is Span.URI => self._tag === "URI"

/** @internal */
export const isWeak = (self: Span.Span): self is Span.Weak => self._tag === "Weak"

/** @internal */
export const concat = dual<
  (that: Span.Span) => (self: Span.Span) => Span.Span,
  (self: Span.Span, that: Span.Span) => Span.Span
>(2, (self, that): Span.Span => ({
  _tag: "Sequence",
  left: self,
  right: that
}))

export const getText = (self: Span.Span): string => {
  switch (self._tag) {
    case "Text":
    case "Code":
    case "URI": {
      return self.value
    }
    case "Error":
    case "Weak":
    case "Strong": {
      return getText(self.value)
    }
    case "Sequence": {
      return getText(self.left) + getText(self.right)
    }
  }
}

/** @internal */
export const spans = (spans: Iterable<Span.Span>): Span.Span => {
  const elements = ReadonlyArray.fromIterable(spans)
  if (ReadonlyArray.isNonEmptyReadonlyArray(elements)) {
    return elements.slice(1).reduce(concat, elements[0])
  }
  return empty
}

/** @internal */
export const isEmpty = (self: Span.Span): boolean => size(self) === 0

/** @internal */
export const size = (self: Span.Span): number => {
  switch (self._tag) {
    case "Code":
    case "Text":
    case "URI": {
      return self.value.length
    }
    case "Error":
    case "Strong":
    case "Weak": {
      return size(self.value)
    }
    case "Sequence": {
      return size(self.left) + size(self.right)
    }
  }
}

/** @internal */
export const toAnsiDoc = (self: Span.Span): AnsiDoc.AnsiDoc => {
  switch (self._tag) {
    case "Text": {
      return Doc.text(self.value)
    }
    case "Code": {
      return Doc.annotate(Doc.text(self.value), AnsiStyle.color(Color.white))
    }
    case "Error": {
      return Doc.annotate(toAnsiDoc(self.value), AnsiStyle.color(Color.red))
    }
    case "Weak": {
      return Doc.annotate(toAnsiDoc(self.value), AnsiStyle.dullColor(Color.black))
    }
    case "Strong": {
      return Doc.annotate(toAnsiDoc(self.value), AnsiStyle.bold)
    }
    case "URI": {
      return Doc.annotate(Doc.text(self.value), AnsiStyle.underlined)
    }
    case "Sequence": {
      return Doc.cat(toAnsiDoc(self.left), toAnsiDoc(self.right))
    }
  }
}
