import { _A, _E, _R, StreamSym } from "@effect/core/stream/Stream/definition"
import type { Chunk } from "@fp-ts/data/Chunk"

/** @internal */
export class StreamInternal<R, E, A> implements Stream<R, E, A> {
  readonly [StreamSym]: StreamSym = StreamSym
  readonly [_R]!: () => R
  readonly [_E]!: () => E
  readonly [_A]!: () => A

  constructor(
    readonly channel: Channel<R, unknown, unknown, unknown, E, Chunk<A>, unknown>
  ) {}
}

/**
 * @tsplus macro remove
 * @internal
 */
export function concreteStream<R, E, A>(
  _: Stream<R, E, A>
): asserts _ is StreamInternal<R, E, A> {
  //
}
