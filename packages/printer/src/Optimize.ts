/**
 * @since 1.0.0
 */

import type { Doc } from "./Doc.js"
import * as internal from "./internal/optimize.js"

// -----------------------------------------------------------------------------
// Models
// -----------------------------------------------------------------------------

/**
 * Represents optimization of a given document tree through fusion of redundant
 * document nodes.
 *
 * @since 1.0.0
 * @category model
 */
export interface Optimize<A> {
  (depth: Optimize.Depth): Doc<A>
}

/**
 * @since 1.0.0
 */
export declare namespace Optimize {
  /**
   * @since 1.0.0
   */
  export type Depth = FusionDepth
}

/**
 * Represents an instruction that determines how deeply the document fusion
 * optimizer should traverse the document tree.
 *
 * @since 1.0.0
 * @category model
 */
export type FusionDepth = Shallow | Deep

/**
 * Instructs the document fusion optimizer to avoid diving deeply into nested
 * documents, fusing mostly concatenations of text nodes together.
 *
 * @since 1.0.0
 * @category model
 */
export interface Shallow {
  readonly _tag: "Shallow"
}

/**
 * Instructs the document fusion optimizer to recurse into all leaves of the
 * document tree, including different layout alternatives and all
 * location-sensitive values (i.e. those created by `nesting`), which cannot be
 * fused before, but only during, the layout process. As a result, the
 * performance cost of using deep document fusion optimization is often hard to
 * predict and depends on the interplay between page layout and the document
 * that is to be pretty printed.
 *
 * This value should only be utilized if profiling demonstrates that it is
 * **significantly** faster than using `Shallow`.
 *
 * @since 1.0.0
 * @category model
 */
export interface Deep {
  readonly _tag: "Deep"
}

/**
 * @since 1.0.0
 * @category instances
 */
export const Shallow: FusionDepth = {
  _tag: "Shallow"
}

/**
 * @since 1.0.0
 * @category instances
 */
export const Deep: FusionDepth = {
  _tag: "Deep"
}

// -----------------------------------------------------------------------------
// Optimization
// -----------------------------------------------------------------------------

/**
 * The `optimize` function will combine text nodes so that they can be rendered
 * more efficiently. An optimized document is always laid out in an identical
 * manner to its un-optimized counterpart.
 *
 * When laying a `Doc` out to a `SimpleDocStream`, every component of the input
 * document is translated directly to the simpler output format. This sometimes
 * yields undesirable chunking when many pieces have been concatenated together.
 *
 * It is therefore a good idea to run `fuse` on concatenations of lots of small
 * strings that are used many times.
 *
 * @example
 * ```ts
 * import * as Doc from "@effect/printer/Doc"
 * import * as Optimize from "@effect/printer/Optimize"
 *
 * // The document below contains a chain of four entries in the output `DocStream`
 * const inefficient = Doc.hsep([
 *   Doc.char("a"),
 *   Doc.char("b"),
 *   Doc.char("c"),
 *   Doc.char("d")
 * ])
 *
 * // However, the above document is fully equivalent to the tightly packed
 * // document below which is only a single entry in the output `DocStream` and
 * // can be processed much more efficiently.
 * const efficient = Doc.text("abcd")
 *
 * // We can optimize the `inefficient` document using `Optimize`
 * Optimize.optimize(Optimize.Deep)(inefficient)
 * ```
 *
 * @since 1.0.0
 * @category optimization
 */
export const optimize: {
  (depth: FusionDepth): <A>(self: Doc<A>) => Doc<A>
  <A>(self: Doc<A>, depth: FusionDepth): Doc<A>
} = internal.optimize
