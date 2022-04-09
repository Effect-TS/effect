import { _A, TPriorityQueueSym } from "@effect/core/stm/TPriorityQueue/definition";

export class InternalTPriorityQueue<A> implements TPriorityQueue<A> {
  readonly [TPriorityQueueSym]: TPriorityQueueSym = TPriorityQueueSym;
  readonly [_A]!: () => A;
  constructor(readonly map: TRef<SortedMap<A, Chunk<A>>>) {}
}

/**
 * @tsplus macro remove
 */
export function concreteTPriorityQueue<A>(
  _: TPriorityQueue<A>
): asserts _ is InternalTPriorityQueue<A> {
  //
}
