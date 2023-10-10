/**
 * @since 1.0.0
 */

import type { Doc } from "@effect/printer/Doc"
import type { DocStream } from "@effect/printer/DocStream"
import type { AvailablePerLine } from "@effect/printer/PageWidth"
import type { AnsiDoc } from "./AnsiDoc"
import type { AnsiStyle } from "./AnsiStyle"
import * as internal from "./internal/ansiRender"

// -----------------------------------------------------------------------------
// Rendering Algorithms
// -----------------------------------------------------------------------------

/**
 * @since 1.0.0
 * @category rendering algorithms
 */
export const render: (self: DocStream<AnsiStyle>) => string = internal.render

/**
 * @since 1.0.0
 * @category rendering algorithms
 */
export const compact: (self: AnsiDoc) => string = internal.compact

/**
 * @since 1.0.0
 * @category rendering algorithms
 */
export const pretty: {
  (options: Partial<Omit<AvailablePerLine, "_tag">>): (self: Doc<AnsiStyle>) => string
  (self: Doc<AnsiStyle>, options: Partial<Omit<AvailablePerLine, "_tag">>): string
} = internal.pretty

/**
 * @since 1.0.0
 * @category rendering algorithms
 */
export const prettyDefault: (self: AnsiDoc) => string = internal.prettyDefault

/**
 * @since 1.0.0
 * @category rendering algorithms
 */
export const prettyUnbounded: (self: AnsiDoc) => string = internal.prettyUnbounded

/**
 * @since 1.0.0
 * @category rendering algorithms
 */
export const smart: {
  (options: Partial<Omit<AvailablePerLine, "_tag">>): (self: Doc<AnsiStyle>) => string
  (self: Doc<AnsiStyle>, options: Partial<Omit<AvailablePerLine, "_tag">>): string
} = internal.smart

/**
 * @since 1.0.0
 * @category rendering algorithms
 */
export const smartDefault: (self: AnsiDoc) => string = internal.smartDefault

/**
 * @since 1.0.0
 * @category rendering algorithms
 */
export const smartUnbounded: (self: Doc<AnsiStyle>) => string = internal.smartUnbounded
