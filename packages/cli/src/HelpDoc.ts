/**
 * @since 1.0.0
 */
import type { Span } from "@effect/cli/HelpDoc/Span"
import * as internal from "@effect/cli/internal/helpDoc"
import type { AnsiDoc } from "@effect/printer-ansi/AnsiDoc"
import type { NonEmptyReadonlyArray } from "effect/ReadonlyArray"

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
export const isEmpty: (helpDoc: HelpDoc) => helpDoc is Empty = internal.isEmpty

/**
 * @since 1.0.0
 * @category refinements
 */
export const isHeader: (helpDoc: HelpDoc) => helpDoc is Header = internal.isHeader

/**
 * @since 1.0.0
 * @category refinements
 */
export const isParagraph: (helpDoc: HelpDoc) => helpDoc is Paragraph = internal.isParagraph

/**
 * @since 1.0.0
 * @category refinements
 */
export const isDescriptionList: (helpDoc: HelpDoc) => helpDoc is DescriptionList = internal.isDescriptionList

/**
 * @since 1.0.0
 * @category refinements
 */
export const isEnumeration: (helpDoc: HelpDoc) => helpDoc is Enumeration = internal.isEnumeration

/**
 * @since 1.0.0
 * @category refinements
 */
export const isSequence: (helpDoc: HelpDoc) => helpDoc is Sequence = internal.isSequence

/**
 * @since 1.0.0
 * @category constructors
 */
export const empty: HelpDoc = internal.empty

/**
 * @since 1.0.0
 * @category constructors
 */
export const blocks: (helpDocs: Iterable<HelpDoc>) => HelpDoc = internal.blocks

/**
 * @since 1.0.0
 * @category constructors
 */
export const h1: (value: string | Span) => HelpDoc = internal.h1

/**
 * @since 1.0.0
 * @category constructors
 */
export const h2: (value: string | Span) => HelpDoc = internal.h2

/**
 * @since 1.0.0
 * @category constructors
 */
export const h3: (value: string | Span) => HelpDoc = internal.h3

/**
 * @since 1.0.0
 * @category constructors
 */
export const p: (value: string | Span) => HelpDoc = internal.p

/**
 * @since 1.0.0
 * @category constructors
 */
export const descriptionList: (
  definitions: NonEmptyReadonlyArray<[Span, HelpDoc]>
) => HelpDoc = internal.descriptionList

/**
 * @since 1.0.0
 * @category constructors
 */
export const enumeration: (elements: NonEmptyReadonlyArray<HelpDoc>) => HelpDoc = internal.enumeration

/**
 * @since 1.0.0
 * @category getters
 */
export const getSpan: (self: HelpDoc) => Span = internal.getSpan

/**
 * @since 1.0.0
 * @category combinators
 */
export const sequence: {
  (that: HelpDoc): (self: HelpDoc) => HelpDoc
  (self: HelpDoc, that: HelpDoc): HelpDoc
} = internal.sequence

/**
 * @since 1.0.0
 * @category combinators
 */
export const orElse: {
  (that: HelpDoc): (self: HelpDoc) => HelpDoc
  (self: HelpDoc, that: HelpDoc): HelpDoc
} = internal.orElse

/**
 * @since 1.0.0
 * @category mapping
 */
export const mapDescriptionList: {
  (f: (span: Span, helpDoc: HelpDoc) => readonly [Span, HelpDoc]): (self: HelpDoc) => HelpDoc
  (self: HelpDoc, f: (span: Span, helpDoc: HelpDoc) => readonly [Span, HelpDoc]): HelpDoc
} = internal.mapDescriptionList

/**
 * @since 1.0.0
 * @category rendering
 */
export const toAnsiDoc: (self: HelpDoc) => AnsiDoc = internal.toAnsiDoc

/**
 * @since 1.0.0
 * @category rendering
 */
export const toAnsiText: (self: HelpDoc) => string = internal.toAnsiText
