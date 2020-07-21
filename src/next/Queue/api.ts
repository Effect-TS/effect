import { pipe } from "../../Function"
import { chain } from "../Effect/chain"
import { AsyncRE } from "../Effect/effect"
import { map_ } from "../Effect/map_"
import { repeat_ } from "../Effect/repeat"
import { succeedNow } from "../Effect/succeedNow"
import { both_ } from "../Schedule/both"
import { collectAll } from "../Schedule/collectAll"
import { map } from "../Schedule/map"
import { recurs } from "../Schedule/recurs"

import { XQueue } from "./xqueue"

/**
 * Takes between min and max number of values from the queue. If there
 * is less than min items available, it'll block until the items are
 * collected.
 */
export const takeBetween = (min: number, max: number) => <RA, RB, EA, EB, A, B>(
  self: XQueue<RA, RB, EA, EB, A, B>
): AsyncRE<RA & RB, unknown, readonly B[]> => {
  if (max < min) {
    return succeedNow([])
  } else {
    return pipe(
      self.takeUpTo(max),
      chain((bs) => {
        const remaining = min - bs.length

        if (remaining === 1) {
          return map_(self.take, (b) => [...bs, b])
        } else if (remaining > 1) {
          return pipe(
            both_(collectAll<B>(), recurs(remaining - 1)),
            map(([_]) => _),
            (s) => map_(repeat_(self.take, s), (a) => [...bs, ...a])
          )
        } else {
          return succeedNow(bs)
        }
      })
    )
  }
}

/**
 * Takes between min and max number of values from the queue. If there
 * is less than min items available, it'll block until the items are
 * collected.
 */
export const takeBetween_ = <RA, RB, EA, EB, A, B>(
  self: XQueue<RA, RB, EA, EB, A, B>,
  min: number,
  max: number
): AsyncRE<RA & RB, unknown, readonly B[]> => takeBetween(min, max)(self)

/**
 * Waits until the queue is shutdown.
 * The `IO` returned by this method will not resume until the queue has been shutdown.
 * If the queue is already shutdown, the `IO` will resume right away.
 */
export const awaitShutdown = <RA, RB, EA, EB, A, B>(
  self: XQueue<RA, RB, EA, EB, A, B>
) => self.awaitShutdown

/**
 * How many elements can hold in the queue
 */
export const capacity = <RA, RB, EA, EB, A, B>(self: XQueue<RA, RB, EA, EB, A, B>) =>
  self.capacity

/**
 * `true` if `shutdown` has been called.
 */
export const isShutdown = <RA, RB, EA, EB, A, B>(self: XQueue<RA, RB, EA, EB, A, B>) =>
  self.isShutdown

/**
 * Places one value in the queue.
 */
export const offer = <A>(a: A) => <RA, RB, EA, EB, B>(
  self: XQueue<RA, RB, EA, EB, A, B>
) => self.offer(a)

/**
 * Places one value in the queue.
 */
export const offer_ = <RA, RB, EA, EB, A, B>(
  self: XQueue<RA, RB, EA, EB, A, B>,
  a: A
) => self.offer(a)

/**
 * For Bounded Queue: uses the `BackPressure` Strategy, places the values in the queue and always returns true.
 * If the queue has reached capacity, then
 * the fiber performing the `offerAll` will be suspended until there is room in
 * the queue.
 *
 * For Unbounded Queue:
 * Places all values in the queue and returns true.
 *
 * For Sliding Queue: uses `Sliding` Strategy
 * If there is room in the queue, it places the values otherwise it removes the old elements and
 * enqueues the new ones. Always returns true.
 *
 * For Dropping Queue: uses `Dropping` Strategy,
 * It places the values in the queue but if there is no room it will not enqueue them and return false.
 *
 */
export const offerAll = <A>(as: Iterable<A>) => <RA, RB, EA, EB, B>(
  self: XQueue<RA, RB, EA, EB, A, B>
) => self.offerAll(as)

/**
 * For Bounded Queue: uses the `BackPressure` Strategy, places the values in the queue and always returns true.
 * If the queue has reached capacity, then
 * the fiber performing the `offerAll` will be suspended until there is room in
 * the queue.
 *
 * For Unbounded Queue:
 * Places all values in the queue and returns true.
 *
 * For Sliding Queue: uses `Sliding` Strategy
 * If there is room in the queue, it places the values otherwise it removes the old elements and
 * enqueues the new ones. Always returns true.
 *
 * For Dropping Queue: uses `Dropping` Strategy,
 * It places the values in the queue but if there is no room it will not enqueue them and return false.
 *
 */
export const offerAll_ = <RA, RB, EA, EB, A, B>(
  self: XQueue<RA, RB, EA, EB, A, B>,
  as: Iterable<A>
) => self.offerAll(as)

/**
 * Interrupts any fibers that are suspended on `offer` or `take`.
 * Future calls to `offer*` and `take*` will be interrupted immediately.
 */
export const shutdown = <RA, RB, EA, EB, A, B>(self: XQueue<RA, RB, EA, EB, A, B>) =>
  self.shutdown

/**
 * Retrieves the size of the queue, which is equal to the number of elements
 * in the queue. This may be negative if fibers are suspended waiting for
 * elements to be added to the queue.
 */
export const size = <RA, RB, EA, EB, A, B>(self: XQueue<RA, RB, EA, EB, A, B>) =>
  self.size

/**
 * Removes the oldest value in the queue. If the queue is empty, this will
 * return a computation that resumes when an item has been added to the queue.
 */
export const take = <RA, RB, EA, EB, A, B>(self: XQueue<RA, RB, EA, EB, A, B>) =>
  self.take

/**
 * Removes all the values in the queue and returns the list of the values. If the queue
 * is empty returns empty list.
 */
export const takeAll = <RA, RB, EA, EB, A, B>(self: XQueue<RA, RB, EA, EB, A, B>) =>
  self.takeAll

/**
 * Takes up to max number of values in the queue.
 */
export const takeAllUpTo = (n: number) => <RA, RB, EA, EB, A, B>(
  self: XQueue<RA, RB, EA, EB, A, B>
) => self.takeUpTo(n)

/**
 * Takes up to max number of values in the queue.
 */
export const takeAllUpTo_ = <RA, RB, EA, EB, A, B>(
  self: XQueue<RA, RB, EA, EB, A, B>,
  n: number
) => self.takeUpTo(n)
