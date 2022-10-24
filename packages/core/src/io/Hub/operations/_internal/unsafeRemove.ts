import { unsafeOfferAll } from "@effect/core/io/Hub/operations/_internal/unsafeOfferAll"
import { unsafePollAllQueue } from "@effect/core/io/Hub/operations/_internal/unsafePollAllQueue"
import { pipe } from "@fp-ts/data/Function"
import * as List from "@fp-ts/data/List"
import type * as MutableQueue from "@fp-ts/data/mutable/MutableQueue"

/** @internal */
export function unsafeRemove<A>(queue: MutableQueue.MutableQueue<A>, a: A): void {
  unsafeOfferAll(
    queue,
    pipe(unsafePollAllQueue(queue), List.filter((_) => _ !== a))
  )
}
