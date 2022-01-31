// ets_tracing: off

import "../../../Operator/index.js"

import type * as CK from "../../../Collections/Immutable/Chunk/index.js"
import * as T from "../../../Effect/index.js"
import type * as C from "../Channel/index.js"

export const StreamTypeId = Symbol()
export type StreamTypeId = typeof StreamTypeId

/**
 * A `Stream<R, E, A>` is a description of a program that, when evaluated,
 * may emit 0 or more values of type `A`, may fail with errors of type `E`
 * and uses an environment of type `R`.
 * One way to think of `Stream` is as a `Effect` program that could emit multiple values.
 *
 * `Stream` is a purely functional *pull* based stream. Pull based streams offer
 * inherent laziness and backpressure, relieving users of the need to manage buffers
 * between operators. As an optimization, `Stream` does not emit single values, but
 * rather an array of values. This allows the cost of effect evaluation to be
 * amortized.
 *
 * `Stream` forms a monad on its `A` type parameter, and has error management
 * facilities for its `E` type parameter, modeled similarly to `Effect` (with some
 * adjustments for the multiple-valued nature of `Stream`). These aspects allow
 * for rich and expressive composition of streams.
 */
export class Stream<R, E, A> {
  readonly [StreamTypeId]: StreamTypeId = StreamTypeId;
  readonly [T._R]!: (_: R) => void;
  readonly [T._E]!: () => E;
  readonly [T._A]!: () => A

  constructor(
    readonly channel: C.Channel<R, unknown, unknown, unknown, E, CK.Chunk<A>, unknown>
  ) {}
}

export type IO<E, A> = Stream<unknown, E, A>

export type RIO<R, A> = Stream<R, never, A>

export type UIO<A> = Stream<unknown, never, A>

export function isStream(u: unknown): u is Stream<unknown, unknown, unknown> {
  return typeof u === "object" && u != null && StreamTypeId in u
}

export const DEFAULT_CHUNK_SIZE = 4096
