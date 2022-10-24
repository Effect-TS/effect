import { pipe } from "@fp-ts/data/Function"
import type { List } from "@fp-ts/data/List"
import * as MutableQueue from "@fp-ts/data/mutable/MutableQueue"

/** @internal */
export function unsafePollAll<A>(queue: MutableQueue.MutableQueue<A>): List<A> {
  return pipe(queue, MutableQueue.pollUpTo(Infinity))
}
