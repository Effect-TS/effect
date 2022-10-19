/**
 * @since 1.0.0
 */

import * as R from "@effect/printer/internal/Render"

// -----------------------------------------------------------------------------
// Rendering Algorithms
// -----------------------------------------------------------------------------

/**
 * Renders a `DocStream` to a `string`.
 *
 * **Note**: this method requires using a `Layout` algorithm to layout a `Doc`
 * into a `DocStream` prior to rendering.
 *
 * @tsplus static effect/printer/DocStream.Ops render
 * @tsplus getter effect/printer/DocStream render
 */
export const render: <A>(self: DocStream<A>) => string = R.render

/**
 * @tsplus static effect/printer/Doc.Ops compact
 * @tsplus getter effect/printer/Doc compact
 */
export const compact: <A>(self: Doc<A>) => string = R.compact

/**
 * @tsplus static effect/printer/Doc.Aspects pretty
 * @tsplus pipeable effect/printer/Doc pretty
 */
export const pretty: (
  lineWidth: number,
  ribbonFraction?: number
) => <A>(self: Doc<A>) => string = R.pretty

/**
 * @tsplus static effect/printer/Doc.Ops prettyDefault
 * @tsplus getter effect/printer/Doc prettyDefault
 */
export const prettyDefault: <A>(self: Doc<A>) => string = R.prettyDefault

/**
 * @tsplus static effect/printer/Doc.Ops prettyUnbounded
 * @tsplus getter effect/printer/Doc prettyUnbounded
 */
export const prettyUnbounded: <A>(self: Doc<A>) => string = R.prettyUnbounded

/**
 * @tsplus static effect/printer/Doc.Aspects smart
 * @tsplus pipeable effect/printer/Doc smart
 */
export const smart: <A>(
  lineWidth: number,
  ribbonFraction?: number
) => (self: Doc<A>) => string = R.smart

/**
 * @tsplus static effect/printer/Doc.Ops smartDefault
 * @tsplus getter effect/printer/Doc smartDefault
 */
export const smartDefault: <A>(self: Doc<A>) => string = R.smartDefault

/**
 * @tsplus static effect/printer/Doc.Ops smartUnbounded
 * @tsplus getter effect/printer/Doc smartUnbounded
 */
export const smartUnbounded: <A>(self: Doc<A>) => string = R.smartUnbounded
