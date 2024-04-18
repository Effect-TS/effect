import * as Ansi from "@effect/printer-ansi/Ansi"
import * as Doc from "@effect/printer-ansi/AnsiDoc"
import * as Optimize from "@effect/printer/Optimize"
import * as Arr from "effect/Array"
import { dual, pipe } from "effect/Function"
import type * as HelpDoc from "../HelpDoc.js"
import type * as Span from "../HelpDoc/Span.js"
import * as InternalSpan from "./helpDoc/span.js"

/** @internal */
export const isEmpty = (helpDoc: HelpDoc.HelpDoc): helpDoc is HelpDoc.Empty => helpDoc._tag === "Empty"

/** @internal */
export const isHeader = (helpDoc: HelpDoc.HelpDoc): helpDoc is HelpDoc.Header => helpDoc._tag === "Header"

/** @internal */
export const isParagraph = (helpDoc: HelpDoc.HelpDoc): helpDoc is HelpDoc.Paragraph => helpDoc._tag === "Paragraph"

/** @internal */
export const isDescriptionList = (helpDoc: HelpDoc.HelpDoc): helpDoc is HelpDoc.DescriptionList =>
  helpDoc._tag === "DescriptionList"

/** @internal */
export const isEnumeration = (helpDoc: HelpDoc.HelpDoc): helpDoc is HelpDoc.Enumeration =>
  helpDoc._tag === "Enumeration"

/** @internal */
export const isSequence = (helpDoc: HelpDoc.HelpDoc): helpDoc is HelpDoc.Sequence => helpDoc._tag === "Sequence"

/** @internal */
export const empty: HelpDoc.HelpDoc = {
  _tag: "Empty"
}

/** @internal */
export const sequence = dual<
  (that: HelpDoc.HelpDoc) => (self: HelpDoc.HelpDoc) => HelpDoc.HelpDoc,
  (self: HelpDoc.HelpDoc, that: HelpDoc.HelpDoc) => HelpDoc.HelpDoc
>(2, (self, that) => {
  if (isEmpty(self)) {
    return that
  }
  if (isEmpty(that)) {
    return self
  }
  return {
    _tag: "Sequence",
    left: self,
    right: that
  }
})

/** @internal */
export const orElse = dual<
  (that: HelpDoc.HelpDoc) => (self: HelpDoc.HelpDoc) => HelpDoc.HelpDoc,
  (self: HelpDoc.HelpDoc, that: HelpDoc.HelpDoc) => HelpDoc.HelpDoc
>(2, (self, that) => isEmpty(self) ? that : self)

/** @internal */
export const blocks = (helpDocs: Iterable<HelpDoc.HelpDoc>): HelpDoc.HelpDoc => {
  const elements = Arr.fromIterable(helpDocs)
  if (Arr.isNonEmptyReadonlyArray(elements)) {
    return elements.slice(1).reduce(sequence, elements[0])
  }
  return empty
}

/** @internal */
export const getSpan = (self: HelpDoc.HelpDoc): Span.Span =>
  isHeader(self) || isParagraph(self) ? self.value : InternalSpan.empty

/** @internal */
export const descriptionList = (
  definitions: Arr.NonEmptyReadonlyArray<[Span.Span, HelpDoc.HelpDoc]>
): HelpDoc.HelpDoc => ({
  _tag: "DescriptionList",
  definitions
})

/** @internal */
export const enumeration = (
  elements: Arr.NonEmptyReadonlyArray<HelpDoc.HelpDoc>
): HelpDoc.HelpDoc => ({
  _tag: "Enumeration",
  elements
})

/** @internal */
export const h1 = (value: string | Span.Span): HelpDoc.HelpDoc => ({
  _tag: "Header",
  value: typeof value === "string" ? InternalSpan.text(value) : value,
  level: 1
})

/** @internal */
export const h2 = (value: string | Span.Span): HelpDoc.HelpDoc => ({
  _tag: "Header",
  value: typeof value === "string" ? InternalSpan.text(value) : value,
  level: 2
})

/** @internal */
export const h3 = (value: string | Span.Span): HelpDoc.HelpDoc => ({
  _tag: "Header",
  value: typeof value === "string" ? InternalSpan.text(value) : value,
  level: 3
})

/** @internal */
export const p = (value: string | Span.Span): HelpDoc.HelpDoc => ({
  _tag: "Paragraph",
  value: typeof value === "string" ? InternalSpan.text(value) : value
})

/** @internal */
export const mapDescriptionList = dual<
  (
    f: (span: Span.Span, helpDoc: HelpDoc.HelpDoc) => [Span.Span, HelpDoc.HelpDoc]
  ) => (self: HelpDoc.HelpDoc) => HelpDoc.HelpDoc,
  (
    self: HelpDoc.HelpDoc,
    f: (span: Span.Span, helpDoc: HelpDoc.HelpDoc) => [Span.Span, HelpDoc.HelpDoc]
  ) => HelpDoc.HelpDoc
>(2, (self, f) =>
  isDescriptionList(self)
    ? descriptionList(Arr.map(self.definitions, ([span, helpDoc]) => f(span, helpDoc)))
    : self)

/** @internal */
export const toAnsiDoc = (self: HelpDoc.HelpDoc): Doc.AnsiDoc =>
  Optimize.optimize(toAnsiDocInternal(self), Optimize.Deep)

/** @internal */
export const toAnsiText = (self: HelpDoc.HelpDoc): string => Doc.render(toAnsiDoc(self), { style: "pretty" })

// =============================================================================
// Internals
// =============================================================================

const toAnsiDocInternal = (self: HelpDoc.HelpDoc): Doc.AnsiDoc => {
  switch (self._tag) {
    case "Empty": {
      return Doc.empty
    }
    case "Header": {
      return pipe(
        Doc.annotate(InternalSpan.toAnsiDoc(self.value), Ansi.bold),
        Doc.cat(Doc.hardLine)
      )
    }
    case "Paragraph": {
      return pipe(
        InternalSpan.toAnsiDoc(self.value),
        Doc.cat(Doc.hardLine)
      )
    }
    case "DescriptionList": {
      const definitions = self.definitions.map(([span, doc]) =>
        Doc.cats([
          Doc.annotate(InternalSpan.toAnsiDoc(span), Ansi.bold),
          Doc.empty,
          Doc.indent(toAnsiDocInternal(doc), 2)
        ])
      )
      return Doc.vsep(definitions)
    }
    case "Enumeration": {
      const elements = self.elements.map((doc) => Doc.cat(Doc.text("- "), toAnsiDocInternal(doc)))
      return Doc.indent(Doc.vsep(elements), 2)
    }
    case "Sequence": {
      return Doc.vsep([
        toAnsiDocInternal(self.left),
        toAnsiDocInternal(self.right)
      ])
    }
  }
}
