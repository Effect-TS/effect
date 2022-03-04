import type { Chunk } from "../../../../collection/immutable/Chunk"
import type { SortedMap } from "../../../../collection/immutable/SortedMap"
import { _A } from "../../../../support/Symbols"
import type { TRef } from "../../../TRef"
import type { TPriorityQueue } from "../../definition"
import { TPriorityQueueSym } from "../../definition"

export class InternalTPriorityQueue<A> implements TPriorityQueue<A> {
  readonly [TPriorityQueueSym]: TPriorityQueueSym;
  readonly [_A]: () => A
  constructor(readonly map: TRef<SortedMap<A, Chunk<A>>>) {}
}

/**
 * @tsplus macro remove
 */
export function concrete<A>(
  _: TPriorityQueue<A>
): asserts _ is InternalTPriorityQueue<A> {
  //
}
