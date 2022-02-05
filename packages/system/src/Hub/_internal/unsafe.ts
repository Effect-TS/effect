// ets_tracing: off

import "../../Operator/index.js"

import * as Chunk from "../../Collections/Immutable/Chunk/index.js"
import * as T from "../../Effect/index.js"
import * as P from "../../Promise/index.js"
import type * as MQ from "../../Support/MutableQueue/index.js"
import type * as HB from "./Hub.js"

/**
 * Unsafely completes a promise with the specified value.
 */
export function unsafeCompletePromise<A>(promise: P.Promise<never, A>, a: A): void {
  P.unsafeDone(T.succeed(a))(promise)
}

/**
 * Unsafely offers the specified values to a queue.
 */
export function unsafeOfferAll<A>(
  queue: MQ.MutableQueue<A>,
  as: Iterable<A>
): Chunk.Chunk<A> {
  return queue.offerAll(as)
}

/**
 * Unsafely polls all values from a queue.
 */
export function unsafePollAllQueue<A>(queue: MQ.MutableQueue<A>): Chunk.Chunk<A> {
  return queue.pollUpTo(Number.MAX_SAFE_INTEGER)
}

/**
 * Unsafely polls all values from a subscription.
 */
export function unsafePollAllSubscription<A>(
  subscription: HB.Subscription<A>
): Chunk.Chunk<A> {
  return subscription.pollUpTo(Number.MAX_SAFE_INTEGER)
}

/**
 * Unsafely polls the specified number of values from a subscription.
 */
export function unsafePollN<A>(
  subscription: HB.Subscription<A>,
  max: number
): Chunk.Chunk<A> {
  return subscription.pollUpTo(max)
}

/**
 * Unsafely publishes the specified values to a hub.
 */
export function unsafePublishAll<A>(hub: HB.Hub<A>, as: Iterable<A>): Chunk.Chunk<A> {
  return hub.publishAll(as)
}

/**
 * Unsafely removes the specified item from a queue.
 */
export function unsafeRemove<A>(queue: MQ.MutableQueue<A>, a: A): void {
  unsafeOfferAll(
    queue,
    Chunk.filter_(unsafePollAllQueue(queue), (_) => _ !== a)
  )
}
