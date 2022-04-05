import { SinkSym } from "@effect-ts/core/stream/Sink/definition/base";
import { _E, _In, _L, _R, _Z } from "@effect-ts/core/stream/Sink/definition/symbols";

export class SinkInternal<R, E, In, L, Z> implements Sink<R, E, In, L, Z> {
  readonly [SinkSym]: SinkSym = SinkSym;
  readonly [_R]!: (_: R) => void;
  readonly [_E]!: () => E;
  readonly [_In]!: (_: In) => void;
  readonly [_L]!: () => L;
  readonly [_Z]!: () => Z;

  constructor(
    readonly channel: Channel<R, never, Chunk<In>, unknown, E, Chunk<L>, Z>
  ) {}
}

/**
 * @tsplus macro remove
 */
export function concreteSink<R, E, In, L, Z>(
  _: Sink<R, E, In, L, Z>
): asserts _ is SinkInternal<R, E, In, L, Z> {
  //
}
