import type * as AnsiDoc from "@effect/printer-ansi/AnsiDoc"
import * as AnsiRender from "@effect/printer-ansi/AnsiRender"
import * as AnsiStyle from "@effect/printer-ansi/AnsiStyle"
import * as Doc from "@effect/printer/Doc"
import * as Optimize from "@effect/printer/Optimize"
import { dual } from "effect/Function"
import * as RA from "effect/ReadonlyArray"
import type * as HelpDoc from "../HelpDoc"
import type * as Span from "../HelpDoc/Span"
import * as span from "./helpDoc/span"

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
  const elements = RA.fromIterable(helpDocs)
  if (RA.isNonEmptyReadonlyArray(elements)) {
    return elements.slice(1).reduce(sequence, elements[0])
  }
  return empty
}

/** @internal */
export const getSpan = (self: HelpDoc.HelpDoc): Span.Span =>
  isHeader(self) || isParagraph(self) ? self.value : span.empty

/** @internal */
export const descriptionList = (
  definitions: RA.NonEmptyReadonlyArray<readonly [Span.Span, HelpDoc.HelpDoc]>
): HelpDoc.HelpDoc => ({
  _tag: "DescriptionList",
  definitions
})

/** @internal */
export const enumeration = (elements: RA.NonEmptyReadonlyArray<HelpDoc.HelpDoc>): HelpDoc.HelpDoc => ({
  _tag: "Enumeration",
  elements
})

/** @internal */
export const h1 = (value: string | Span.Span): HelpDoc.HelpDoc => ({
  _tag: "Header",
  value: typeof value === "string" ? span.text(value) : value,
  level: 1
})

/** @internal */
export const h2 = (value: string | Span.Span): HelpDoc.HelpDoc => ({
  _tag: "Header",
  value: typeof value === "string" ? span.text(value) : value,
  level: 2
})

/** @internal */
export const h3 = (value: string | Span.Span): HelpDoc.HelpDoc => ({
  _tag: "Header",
  value: typeof value === "string" ? span.text(value) : value,
  level: 3
})

/** @internal */
export const p = (value: string | Span.Span): HelpDoc.HelpDoc => ({
  _tag: "Paragraph",
  value: typeof value === "string" ? span.text(value) : value
})

/** @internal */
export const mapDescriptionList = dual<
  (
    f: (span: Span.Span, helpDoc: HelpDoc.HelpDoc) => readonly [Span.Span, HelpDoc.HelpDoc]
  ) => (self: HelpDoc.HelpDoc) => HelpDoc.HelpDoc,
  (
    self: HelpDoc.HelpDoc,
    f: (span: Span.Span, helpDoc: HelpDoc.HelpDoc) => readonly [Span.Span, HelpDoc.HelpDoc]
  ) => HelpDoc.HelpDoc
>(2, (self, f) =>
  isDescriptionList(self)
    ? descriptionList(RA.mapNonEmpty(self.definitions, ([span, helpDoc]) => f(span, helpDoc)))
    : self)

const helpDocToAnsiDoc: {
  [K in HelpDoc.HelpDoc["_tag"]]: (self: Extract<HelpDoc.HelpDoc, { _tag: K }>) => AnsiDoc.AnsiDoc
} = {
  Empty: () => Doc.empty,
  Paragraph: (self) => Doc.cat(span.toAnsiDoc(self.value), Doc.hardLine),
  Header: (self) => Doc.cat(Doc.annotate(span.toAnsiDoc(self.value), AnsiStyle.bold), Doc.hardLine),
  Enumeration: (self) =>
    Doc.indent(
      Doc.vsep(self.elements.map((doc) =>
        Doc.cat(
          Doc.text("- "),
          helpDocToAnsiDoc[doc._tag](doc as any)
        )
      )),
      2
    ),
  DescriptionList: (self) =>
    Doc.vsep(self.definitions.map(([s, d]) =>
      Doc.cats([
        Doc.annotate(span.toAnsiDoc(s), AnsiStyle.bold),
        Doc.empty,
        Doc.indent(helpDocToAnsiDoc[d._tag](d as any), 2)
      ])
    )),
  Sequence: (self) =>
    Doc.vsep([
      helpDocToAnsiDoc[self.left._tag](self.left as any),
      helpDocToAnsiDoc[self.right._tag](self.right as any)
    ])
}

/** @internal */
export const toAnsiDoc = (self: HelpDoc.HelpDoc): AnsiDoc.AnsiDoc =>
  Optimize.optimize(helpDocToAnsiDoc[self._tag](self as any), Optimize.Deep)

/** @internal */
export const toAnsiText = (self: HelpDoc.HelpDoc): string => AnsiRender.prettyDefault(toAnsiDoc(self))
