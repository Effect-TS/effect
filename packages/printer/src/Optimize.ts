/**
 * @since 1.0.0
 */

import * as O from "@effect/printer/internal/Optimize"

// -----------------------------------------------------------------------------
// Models
// -----------------------------------------------------------------------------

/**
 * Represents optimization of a given document tree through fusion of redundant
 * document nodes.
 *
 * @category model
 * @since 1.0.0
 * @tsplus type effect/printer/Optimize
 */
export interface Optimize<A> {
  (depth: Optimize.Depth): Doc<A>
}

/**
 * @category model
 * @since 1.0.0
 * @tsplus type effect/printer/Optimize.Ops
 */
export interface OptimizeOps {
  readonly $: OptimizeAspects
  readonly Depth: FusionDepthOps
}

/**
 * @category model
 * @since 1.0.0
 * @tsplus type effect/printer/Optimize.Aspects
 */
export interface OptimizeAspects {}

/**
 * @since 1.0.0
 */
export declare namespace Optimize {
  export type Depth = FusionDepth
}

/**
 * Represents an instruction that determines how deeply the document fusion
 * optimizer should traverse the document tree.
 *
 * @category model
 * @since 1.0.0
 * @tsplus type effect/printer/Optimize.Depth
 */
export type FusionDepth = Shallow | Deep

/**
 * @category model
 * @since 1.0.0
 * @tsplus type effect/printer/Optimize.Depth.Ops
 */
export interface FusionDepthOps {}

/**
 * @category instances
 * @since 1.0.0
 */
export const FusionDepth: FusionDepthOps = {}

/**
 * @category instances
 * @since 1.0.0
 */
export const Optimize: OptimizeOps = {
  $: {},
  Depth: FusionDepth
}

/**
 * Instructs the document fusion optimizer to avoid diving deeply into nested
 * documents, fusing mostly concatenations of text nodes together.
 *
 * @category model
 * @since 1.0.0
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
 * @category model
 * @since 1.0.0
 */
export interface Deep {
  readonly _tag: "Deep"
}

/**
 * @category instances
 * @since 1.0.0
 * @tsplus static effect/printer/Optimize.Depth.Ops Shallow
 */
export const Shallow: FusionDepth = {
  _tag: "Shallow"
}

/**
 * @category instances
 * @since 1.0.0
 * @tsplus static effect/printer/Optimize.Depth.Ops Deep
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
 *
 * @category optimization
 * @since 1.0.0
 * @tsplus static effect/printer/Doc.Aspects optimize
 * @tsplus pipeable effect/printer/Doc optimize
 */
export const optimize: <A>(depth: FusionDepth) => (self: Doc<A>) => Doc<A> = O.optimize
