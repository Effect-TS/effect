import { _A, TPriorityQueueSym } from "@effect/core/stm/TPriorityQueue/definition"
import type { Chunk } from "@fp-ts/data/Chunk"
import type { SortedMap } from "@fp-ts/data/SortedMap"

/** @internal */
export class InternalTPriorityQueue<A> implements TPriorityQueue<A> {
  readonly [TPriorityQueueSym]: TPriorityQueueSym = TPriorityQueueSym
  readonly [_A]!: () => A
  constructor(readonly map: TRef<SortedMap<A, Chunk<A>>>) {}
}

/**
 * @tsplus macro remove
 * @internal
 */
export function concreteTPriorityQueue<A>(
  _: TPriorityQueue<A>
): asserts _ is InternalTPriorityQueue<A> {
  //
}
