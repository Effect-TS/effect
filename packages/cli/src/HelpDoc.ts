/**
 * @since 1.0.0
 */
import type { AnsiDoc } from "@effect/printer-ansi/AnsiDoc"
import type { NonEmptyReadonlyArray } from "effect/Array"
import type { Span } from "./HelpDoc/Span.js"
import * as InternalHelpDoc from "./internal/helpDoc.js"

/**
 * A `HelpDoc` models the full documentation for a command-line application.
 *
 * `HelpDoc` is composed of optional header and footers, and in-between, a
 * list of HelpDoc-level content items.
 *
 * HelpDoc-level content items, in turn, can be headers, paragraphs, description
 * lists, and enumerations.
 *
 * A `HelpDoc` can be converted into plaintext, JSON, and HTML.
 *
 * @since 1.0.0
 * @category models
 */
export type HelpDoc = Empty | Header | Paragraph | DescriptionList | Enumeration | Sequence

/**
 * @since 1.0.0
 * @category models
 */
export interface Empty {
  readonly _tag: "Empty"
}

/**
 * @since 1.0.0
 * @category models
 */
export interface Header {
  readonly _tag: "Header"
  readonly value: Span
  readonly level: number
}

/**
 * @since 1.0.0
 * @category models
 */
export interface Paragraph {
  readonly _tag: "Paragraph"
  readonly value: Span
}

/**
 * @since 1.0.0
 * @category models
 */
export interface DescriptionList {
  readonly _tag: "DescriptionList"
  readonly definitions: NonEmptyReadonlyArray<readonly [Span, HelpDoc]>
}

/**
 * @since 1.0.0
 * @category models
 */
export interface Enumeration {
  readonly _tag: "Enumeration"
  readonly elements: NonEmptyReadonlyArray<HelpDoc>
}

/**
 * @since 1.0.0
 * @category models
 */
export interface Sequence {
  readonly _tag: "Sequence"
  readonly left: HelpDoc
  readonly right: HelpDoc
}

/**
 * @since 1.0.0
 * @category refinements
 */
export const isEmpty: (helpDoc: HelpDoc) => helpDoc is Empty = InternalHelpDoc.isEmpty

/**
 * @since 1.0.0
 * @category refinements
 */
export const isHeader: (helpDoc: HelpDoc) => helpDoc is Header = InternalHelpDoc.isHeader

/**
 * @since 1.0.0
 * @category refinements
 */
export const isParagraph: (helpDoc: HelpDoc) => helpDoc is Paragraph = InternalHelpDoc.isParagraph

/**
 * @since 1.0.0
 * @category refinements
 */
export const isDescriptionList: (helpDoc: HelpDoc) => helpDoc is DescriptionList = InternalHelpDoc.isDescriptionList

/**
 * @since 1.0.0
 * @category refinements
 */
export const isEnumeration: (helpDoc: HelpDoc) => helpDoc is Enumeration = InternalHelpDoc.isEnumeration

/**
 * @since 1.0.0
 * @category refinements
 */
export const isSequence: (helpDoc: HelpDoc) => helpDoc is Sequence = InternalHelpDoc.isSequence

/**
 * @since 1.0.0
 * @category constructors
 */
export const empty: HelpDoc = InternalHelpDoc.empty

/**
 * @since 1.0.0
 * @category constructors
 */
export const blocks: (helpDocs: Iterable<HelpDoc>) => HelpDoc = InternalHelpDoc.blocks

/**
 * @since 1.0.0
 * @category constructors
 */
export const h1: (value: string | Span) => HelpDoc = InternalHelpDoc.h1

/**
 * @since 1.0.0
 * @category constructors
 */
export const h2: (value: string | Span) => HelpDoc = InternalHelpDoc.h2

/**
 * @since 1.0.0
 * @category constructors
 */
export const h3: (value: string | Span) => HelpDoc = InternalHelpDoc.h3

/**
 * @since 1.0.0
 * @category constructors
 */
export const p: (value: string | Span) => HelpDoc = InternalHelpDoc.p

/**
 * @since 1.0.0
 * @category constructors
 */
export const descriptionList: (
  definitions: NonEmptyReadonlyArray<[Span, HelpDoc]>
) => HelpDoc = InternalHelpDoc.descriptionList

/**
 * @since 1.0.0
 * @category constructors
 */
export const enumeration: (elements: NonEmptyReadonlyArray<HelpDoc>) => HelpDoc = InternalHelpDoc.enumeration

/**
 * @since 1.0.0
 * @category getters
 */
export const getSpan: (self: HelpDoc) => Span = InternalHelpDoc.getSpan

/**
 * @since 1.0.0
 * @category combinators
 */
export const sequence: {
  (that: HelpDoc): (self: HelpDoc) => HelpDoc
  (self: HelpDoc, that: HelpDoc): HelpDoc
} = InternalHelpDoc.sequence

/**
 * @since 1.0.0
 * @category combinators
 */
export const orElse: {
  (that: HelpDoc): (self: HelpDoc) => HelpDoc
  (self: HelpDoc, that: HelpDoc): HelpDoc
} = InternalHelpDoc.orElse

/**
 * @since 1.0.0
 * @category mapping
 */
export const mapDescriptionList: {
  (f: (span: Span, helpDoc: HelpDoc) => [Span, HelpDoc]): (self: HelpDoc) => HelpDoc
  (self: HelpDoc, f: (span: Span, helpDoc: HelpDoc) => [Span, HelpDoc]): HelpDoc
} = InternalHelpDoc.mapDescriptionList

/**
 * @since 1.0.0
 * @category rendering
 */
export const toAnsiDoc: (self: HelpDoc) => AnsiDoc = InternalHelpDoc.toAnsiDoc

/**
 * @since 1.0.0
 * @category rendering
 */
export const toAnsiText: (self: HelpDoc) => string = InternalHelpDoc.toAnsiText
