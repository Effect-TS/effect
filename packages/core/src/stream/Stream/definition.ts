/**
 * @category symbol
 * @since 1.0.0
 */
export const StreamSym = Symbol.for("@effect/core/stream/Stream")

/**
 * @category symbol
 * @since 1.0.0
 */
export type StreamSym = typeof StreamSym

/**
 * @category symbol
 * @since 1.0.0
 */
export const _R = Symbol.for("@effect/core/stream/Stream/R")

/**
 * @category symbol
 * @since 1.0.0
 */
export type _R = typeof _R

/**
 * @category symbol
 * @since 1.0.0
 */
export const _E = Symbol.for("@effect/core/stream/Stream/E")

/**
 * @category symbol
 * @since 1.0.0
 */
export type _E = typeof _E

/**
 * @category symbol
 * @since 1.0.0
 */
export const _A = Symbol.for("@effect/core/stream/Stream/A")

/**
 * @category symbol
 * @since 1.0.0
 */
export type _A = typeof _A

/**
 * A `Stream<R, E, A>` is a description of a program that, when evaluated, may
 * emit zero or more values of type `A`, may fail with errors of type `E`, and
 * uses an environment of type `R`. One way to think of `Stream` is as a
 * `Effect` program that could emit multiple values.
 *
 * `Stream` is a purely functional *pull* based stream. Pull based streams offer
 * inherent laziness and backpressure, relieving users of the need to manage
 * buffers between operators. As an optimization, `Stream` does not emit
 * single values, but rather an array of values. This allows the cost of effect
 * evaluation to be amortized.
 *
 * `Stream` forms a monad on its `A` type parameter, and has error management
 * facilities for its `E` type parameter, modeled similarly to `Effect` (with
 * some adjustments for the multiple-valued nature of `Stream`). These aspects
 * allow for rich and expressive composition of streams.
 *
 * @tsplus type effect/core/stream/Stream
 * @category model
 * @since 1.0.0
 */
export interface Stream<R, E, A> {
  readonly [StreamSym]: StreamSym
  readonly [_R]: () => R
  readonly [_E]: () => E
  readonly [_A]: () => A
}

/**
 * @since 1.0.0
 */
export declare namespace Stream {
  export type IO<E, A> = Stream<never, E, A>
  export type RIO<R, A> = Stream<R, never, A>
  export type UIO<A> = Stream<never, never, A>
}

/**
 * @tsplus type effect/core/stream/Stream.Ops
 * @category model
 * @since 1.0.0
 */
export interface StreamOps {
  $: StreamAspects
}
export const Stream: StreamOps = {
  $: {}
}

/**
 * @tsplus type effect/core/stream/Stream.Aspects
 * @category model
 * @since 1.0.0
 */
export interface StreamAspects {}

/**
 * The default chunk size used by the various combinators and constructors of
 * `Stream`.
 *
 * @since 1.0.0
 */
export const DEFAULT_CHUNK_SIZE = 4096

/**
 * Determines if the provided `unknown` value is a `Stream`.
 *
 * @tsplus static effect/core/stream/Stream.Ops isStream
 * @category refinements
 * @since 1.0.0
 */
export function isStream(u: unknown): u is Stream<unknown, unknown, unknown> {
  return typeof u === "object" && u != null && StreamSym in u
}
