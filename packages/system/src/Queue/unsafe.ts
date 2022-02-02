// ets_tracing: off

import { None } from "../Fiber/id.js"
import { AtomicBoolean } from "../Support/AtomicBoolean/index.js"
import type { MutableQueue } from "../Support/MutableQueue/index.js"
import { Bounded, Unbounded } from "../Support/MutableQueue/index.js"
import { BackPressureStrategy, unsafeCreate } from "./api.js"
import type { Strategy } from "./core.js"
import { DroppingStrategy, SlidingStrategy } from "./core.js"
import * as P from "./promise.js"
import type { Queue } from "./xqueue.js"

/**
 * Unsafely creates a queue
 *
 * @ets_data_first unsafeCreateQueue_
 */
export function unsafeCreateQueue<A>(strategy: Strategy<A>) {
  return (queue: MutableQueue<A>) => unsafeCreateQueue_(queue, strategy)
}

/**
 * Unsafely creates a queue
 */
export function unsafeCreateQueue_<A>(queue: MutableQueue<A>, strategy: Strategy<A>) {
  return unsafeCreate(
    queue,
    new Unbounded(),
    P.unsafeMake<never, void>(None),
    new AtomicBoolean(false),
    strategy
  )
}

/**
 * Unsafely creates a sliding queue
 */
export function unsafeMakeSliding<A>(capacity: number): Queue<A> {
  return unsafeCreateQueue_(new Bounded<A>(capacity), new SlidingStrategy<A>())
}

/**
 * Unsafely creates a unbounded queue
 */
export function unsafeMakeUnbounded<A>(): Queue<A> {
  return unsafeCreateQueue_(new Unbounded<A>(), new DroppingStrategy<A>())
}

/**
 * Unsafely creates a dropping queue
 */
export function unsafeMakeDropping<A>(capacity: number): Queue<A> {
  return unsafeCreateQueue_(new Bounded<A>(capacity), new DroppingStrategy<A>())
}

/**
 * Unsafely creates a bounded queue
 */
export function unsafeMakeBounded<A>(capacity: number): Queue<A> {
  return unsafeCreateQueue_(new Bounded<A>(capacity), new BackPressureStrategy<A>())
}
