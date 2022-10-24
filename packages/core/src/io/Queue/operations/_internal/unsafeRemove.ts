import { unsafeOfferAll } from "@effect/core/io/Queue/operations/_internal/unsafeOfferAll"
import { unsafePollAll } from "@effect/core/io/Queue/operations/_internal/unsafePollAll"
import { pipe } from "@fp-ts/data/Function"
import * as List from "@fp-ts/data/List"
import type * as MutableQueue from "@fp-ts/data/mutable/MutableQueue"

/** @internal */
export function unsafeRemove<A>(queue: MutableQueue.MutableQueue<A>, a: A): void {
  unsafeOfferAll(
    queue,
    pipe(unsafePollAll(queue), List.filter((b) => a !== b))
  )
}
