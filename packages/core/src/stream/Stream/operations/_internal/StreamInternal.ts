import type { Chunk } from "../../../../collection/immutable/Chunk"
import { _A, _E, _R } from "../../../../support/Symbols"
import type { Channel } from "../../../Channel"
import type { Stream } from "../../definition"
import { StreamSym } from "../../definition"

export class StreamInternal<R, E, A> implements Stream<R, E, A> {
  readonly [StreamSym]: StreamSym = StreamSym;
  readonly [_R]!: (_: R) => void;
  readonly [_E]!: () => E;
  readonly [_A]!: () => A

  constructor(
    readonly channel: Channel<R, unknown, unknown, unknown, E, Chunk<A>, unknown>
  ) {}
}

/**
 * @tsplus macro remove
 */
export function concreteStream<R, E, A>(
  _: Stream<R, E, A>
): asserts _ is StreamInternal<R, E, A> {
  //
}
