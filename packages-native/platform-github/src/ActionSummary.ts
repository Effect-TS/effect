/**
 * ActionSummary service for building GitHub Actions job summaries.
 *
 * Provides a chainable API for building rich markdown summaries:
 * - Text content (raw, headings, code blocks)
 * - Lists and tables
 * - Collapsible details sections
 * - Images and links
 * - Buffer management and file operations
 *
 * @since 1.0.0
 */
import type { Tag } from "effect/Context"
import * as Effect from "effect/Effect"
import type * as Layer from "effect/Layer"
import type { ActionSummaryError } from "./ActionError.js"
import * as internal from "./internal/actionSummary.js"

/**
 * @since 1.0.0
 * @category type id
 */
export const TypeId: unique symbol = internal.TypeId

/**
 * @since 1.0.0
 * @category type id
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category models
 */
export interface SummaryTableRow {
  readonly [key: string]: SummaryTableCell
}

/**
 * @since 1.0.0
 * @category models
 */
export interface SummaryTableCell {
  readonly data: string
  readonly header?: boolean
  readonly colspan?: number
  readonly rowspan?: number
}

/**
 * @since 1.0.0
 * @category models
 */
export interface SummaryImageOptions {
  readonly width?: string
  readonly height?: string
}

/**
 * @since 1.0.0
 * @category models
 */
export interface ActionSummary {
  readonly [TypeId]: typeof TypeId

  // Content methods (chainable, returns new ActionSummary)
  readonly addRaw: (text: string, addEOL?: boolean) => ActionSummary
  readonly addEOL: () => ActionSummary
  readonly addHeading: (text: string, level?: 1 | 2 | 3 | 4 | 5 | 6) => ActionSummary
  readonly addCodeBlock: (code: string, lang?: string) => ActionSummary
  readonly addList: (items: ReadonlyArray<string>, ordered?: boolean) => ActionSummary
  readonly addTable: (rows: ReadonlyArray<ReadonlyArray<SummaryTableCell>>) => ActionSummary
  readonly addDetails: (label: string, content: string) => ActionSummary
  readonly addImage: (src: string, alt: string, options?: SummaryImageOptions) => ActionSummary
  readonly addLink: (text: string, href: string) => ActionSummary
  readonly addSeparator: () => ActionSummary
  readonly addBreak: () => ActionSummary
  readonly addQuote: (text: string, cite?: string) => ActionSummary

  // Buffer methods
  readonly stringify: () => string
  readonly isEmptyBuffer: () => boolean
  readonly emptyBuffer: () => ActionSummary

  // File operations
  readonly write: (options?: { overwrite?: boolean }) => Effect.Effect<ActionSummary, ActionSummaryError>
  readonly clear: () => Effect.Effect<ActionSummary, ActionSummaryError>
}

/**
 * @since 1.0.0
 * @category context
 */
export const ActionSummary: Tag<ActionSummary, ActionSummary> = internal.ActionSummary

/**
 * @since 1.0.0
 * @category layers
 */
export const layer: Layer.Layer<ActionSummary> = internal.layer

/**
 * @since 1.0.0
 * @category accessors
 */
export const write: (options?: {
  overwrite?: boolean
}) => Effect.Effect<ActionSummary, ActionSummaryError, ActionSummary> = (options) =>
  Effect.flatMap(ActionSummary, (summary) => summary.write(options))

/**
 * @since 1.0.0
 * @category accessors
 */
export const clear: Effect.Effect<ActionSummary, ActionSummaryError, ActionSummary> = Effect.flatMap(
  ActionSummary,
  (summary) => summary.clear()
)
