import type { Strategy } from "@effect/core/stm/TQueue/definition"
import { _A, TQueueSym } from "@effect/core/stm/TQueue/definition"

export class InternalTQueue<A> implements TQueue<A> {
  readonly [TQueueSym]: TQueueSym = TQueueSym
  readonly [_A]!: () => A

  constructor(
    readonly ref: TRef<ImmutableQueue<A>>,
    readonly capacity: number,
    readonly strategy: Strategy
  ) {}
}

/**
 * @tsplus macro remove
 */
export function concreteTQueue<A>(
  _: TQueue<A>
): asserts _ is InternalTQueue<A> {
  //
}
