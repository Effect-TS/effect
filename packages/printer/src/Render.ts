/**
 * @since 1.0.0
 */

import type { Doc } from "./Doc.js"
import type { DocStream } from "./DocStream.js"
import * as internal from "./internal/render.js"
import type { AvailablePerLine } from "./PageWidth.js"

// -----------------------------------------------------------------------------
// Rendering Algorithms
// -----------------------------------------------------------------------------

/**
 * Renders a `DocStream` to a `string`.
 *
 * **Note**: this method requires using a `Layout` algorithm to layout a `Doc`
 * into a `DocStream` prior to rendering.
 *
 * @since 1.0.0
 * @category rendering
 */
export const render: <A>(self: DocStream<A>) => string = internal.render

/**
 * @since 1.0.0
 * @category rendering
 */
export const compact: <A>(self: Doc<A>) => string = internal.compact

/**
 * @since 1.0.0
 * @category rendering
 */
export const pretty: {
  (options: Partial<Omit<AvailablePerLine, "_tag">>): <A>(self: Doc<A>) => string
  <A>(self: Doc<A>, options: Partial<Omit<AvailablePerLine, "_tag">>): string
} = internal.pretty

/**
 * @since 1.0.0
 * @category rendering
 */
export const prettyDefault: <A>(self: Doc<A>) => string = internal.prettyDefault

/**
 * @since 1.0.0
 * @category rendering
 */
export const prettyUnbounded: <A>(self: Doc<A>) => string = internal.prettyUnbounded

/**
 * @since 1.0.0
 * @category rendering
 */
export const smart: {
  (options: Partial<Omit<AvailablePerLine, "_tag">>): <A>(self: Doc<A>) => string
  <A>(self: Doc<A>, options: Partial<Omit<AvailablePerLine, "_tag">>): string
} = internal.smart

/**
 * @since 1.0.0
 * @category rendering
 */
export const smartDefault: <A>(self: Doc<A>) => string = internal.smartDefault

/**
 * @since 1.0.0
 * @category rendering
 */
export const smartUnbounded: <A>(self: Doc<A>) => string = internal.smartUnbounded
