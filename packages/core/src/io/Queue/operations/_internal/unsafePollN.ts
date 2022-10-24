import { pipe } from "@fp-ts/data/Function"
import type { List } from "@fp-ts/data/List"
import * as MutableQueue from "@fp-ts/data/mutable/MutableQueue"

/** @internal */
export function unsafePollN<A>(queue: MutableQueue.MutableQueue<A>, max: number): List<A> {
  return pipe(queue, MutableQueue.pollUpTo(max))
}
