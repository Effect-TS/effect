import type * as AR from "../../Collections/Immutable/Array"
import * as T from "../../Effect"
import * as P from "../../Promise"
import type * as MQ from "../../Support/MutableQueue"
import type * as HB from "./Hub"

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
): AR.Array<A> {
  return queue.offerAll(as)
}

/**
 * Unsafely polls all values from a queue.
 */
export function unsafePollAllQueue<A>(queue: MQ.MutableQueue<A>): AR.Array<A> {
  return queue.pollUpTo(Number.MAX_SAFE_INTEGER)
}

/**
 * Unsafely polls all values from a subscription.
 */
export function unsafePollAllSubscription<A>(
  subscription: HB.Subscription<A>
): AR.Array<A> {
  return subscription.pollUpTo(Number.MAX_SAFE_INTEGER)
}

/**
 * Unsafely polls the specified number of values from a subscription.
 */
export function unsafePollN<A>(
  subscription: HB.Subscription<A>,
  max: number
): AR.Array<A> {
  return subscription.pollUpTo(max)
}

/**
 * Unsafely publishes the specified values to a hub.
 */
export function unsafePublishAll<A>(hub: HB.Hub<A>, as: Iterable<A>): AR.Array<A> {
  return hub.publishAll(as)
}

/**
 * Unsafely removes the specified item from a queue.
 */
export function unsafeRemove<A>(queue: MQ.MutableQueue<A>, a: A): void {
  unsafeOfferAll(
    queue,
    unsafePollAllQueue(queue).filter((_) => _ !== a)
  )
}
