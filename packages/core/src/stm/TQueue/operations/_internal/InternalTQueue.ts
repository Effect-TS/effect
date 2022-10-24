import type { Strategy } from "@effect/core/stm/TQueue/definition"
import { _A, TQueueSym } from "@effect/core/stm/TQueue/definition"
import type { Queue } from "@fp-ts/data/Queue"

/** @internal */
export class InternalTQueue<A> implements TQueue<A> {
  readonly [TQueueSym]: TQueueSym = TQueueSym
  readonly [_A]!: () => A

  constructor(
    readonly ref: TRef<Queue<A>>,
    readonly capacity: number,
    readonly strategy: Strategy
  ) {}
}

/**
 * @tsplus macro remove
 * @internal
 */
export function concreteTQueue<A>(
  _: TQueue<A>
): asserts _ is InternalTQueue<A> {
  //
}
