import { Tuple } from "../../../collection/immutable/Tuple"
import type { HashSet } from "../../../collection/mutable/HashSet"
import type { AtomicBoolean } from "../../../support/AtomicBoolean"
import { EmptyQueue, MutableQueue } from "../../../support/MutableQueue"
import type { UIO } from "../../Effect"
import { Effect } from "../../Effect"
import { Promise } from "../../Promise"
import type { AtomicHub } from "./_internal/AtomicHub"
import type { Subscription } from "./_internal/Subscription"
import { unsafeCompletePromise } from "./_internal/unsafeCompletePromise"
import { unsafeOfferAll } from "./_internal/unsafeOfferAll"
import { unsafePollAllQueue } from "./_internal/unsafePollAllQueue"

/**
 * A `Strategy<A>` describes the protocol for how publishers and subscribers
 * will communicate with each other through the hub.
 *
 * @tsplus type ets/Hub/Strategy
 */
export interface Strategy<A> {
  /**
   * Describes how publishers should signal to subscribers that they are
   * waiting for space to become available in the hub.
   */
  readonly handleSurplus: (
    hub: AtomicHub<A>,
    subscribers: HashSet<Tuple<[Subscription<A>, MutableQueue<Promise<never, A>>]>>,
    as: Iterable<A>,
    isShutdown: AtomicBoolean
  ) => UIO<boolean>

  /**
   * Describes any finalization logic associated with this strategy.
   */
  readonly shutdown: UIO<void>

  /**
   * Describes how subscribers should signal to publishers waiting for space
   * to become available in the hub that space may be available.
   */
  readonly unsafeOnHubEmptySpace: (
    hub: AtomicHub<A>,
    subscribers: HashSet<Tuple<[Subscription<A>, MutableQueue<Promise<never, A>>]>>
  ) => void

  /**
   * Describes how subscribers waiting for additional values from the hub
   * should take those values and signal to publishers that they are no
   * longer waiting for additional values.
   */
  readonly unsafeCompletePollers: (
    hub: AtomicHub<A>,
    subscribers: HashSet<Tuple<[Subscription<A>, MutableQueue<Promise<never, A>>]>>,
    subscription: Subscription<A>,
    pollers: MutableQueue<Promise<never, A>>
  ) => void

  /**
   * Describes how publishers should signal to subscribers waiting for
   * additional values from the hub that new values are available.
   */
  readonly unsafeCompleteSubscribers: (
    hub: AtomicHub<A>,
    subscribers: HashSet<Tuple<[Subscription<A>, MutableQueue<Promise<never, A>>]>>
  ) => void
}

/**
 * @tsplus type ets/Hub/StrategyOps
 */
export interface StrategyOps {}
export const Strategy: StrategyOps = {}

abstract class BaseStrategy<A> implements Strategy<A> {
  abstract handleSurplus(
    hub: AtomicHub<A>,
    subscribers: HashSet<Tuple<[Subscription<A>, MutableQueue<Promise<never, A>>]>>,
    as: Iterable<A>,
    isShutdown: AtomicBoolean
  ): UIO<boolean>

  abstract shutdown: UIO<void>

  abstract unsafeOnHubEmptySpace(
    hub: AtomicHub<A>,
    subscribers: HashSet<Tuple<[Subscription<A>, MutableQueue<Promise<never, A>>]>>
  ): void

  unsafeCompletePollers(
    hub: AtomicHub<A>,
    subscribers: HashSet<Tuple<[Subscription<A>, MutableQueue<Promise<never, A>>]>>,
    subscription: Subscription<A>,
    pollers: MutableQueue<Promise<never, A>>
  ): void {
    let keepPolling = true

    while (keepPolling && !subscription.isEmpty()) {
      const poller = pollers.poll(EmptyQueue)!

      if (poller === EmptyQueue) {
        const subPollerPair = Tuple(subscription, pollers)

        subscribers.remove(subPollerPair)

        if (pollers.isEmpty) {
          keepPolling = false
        } else {
          subscribers.add(subPollerPair)
        }
      } else {
        const pollResult = subscription.poll(EmptyQueue)

        if (pollResult == EmptyQueue) {
          unsafeOfferAll(pollers, unsafePollAllQueue(pollers).prepend(poller))
        } else {
          unsafeCompletePromise(poller, pollResult)
          this.unsafeOnHubEmptySpace(hub, subscribers)
        }
      }
    }
  }

  unsafeCompleteSubscribers(
    hub: AtomicHub<A>,
    subscribers: HashSet<Tuple<[Subscription<A>, MutableQueue<Promise<never, A>>]>>
  ): void {
    for (const {
      tuple: [subscription, pollers]
    } of subscribers) {
      this.unsafeCompletePollers(hub, subscribers, subscription, pollers)
    }
  }
}

/**
 * A strategy that applies back pressure to publishers when the hub is at
 * capacity. This guarantees that all subscribers will receive all messages
 * published to the hub while they are subscribed. However, it creates the
 * risk that a slow subscriber will slow down the rate at which messages
 * are published and received by other subscribers.
 */
export class BackPressure<A> extends BaseStrategy<A> {
  publishers: MutableQueue<readonly [A, Promise<never, boolean>, boolean]> =
    MutableQueue.Unbounded()

  handleSurplus(
    hub: AtomicHub<A>,
    subscribers: HashSet<Tuple<[Subscription<A>, MutableQueue<Promise<never, A>>]>>,
    as: Iterable<A>,
    isShutdown: AtomicBoolean
  ): UIO<boolean> {
    return Effect.suspendSucceedWith((_, fiberId) => {
      const promise = Promise.unsafeMake<never, boolean>(fiberId)

      return Effect.suspendSucceed(() => {
        this.unsafeOffer(as, promise)
        this.unsafeOnHubEmptySpace(hub, subscribers)
        this.unsafeCompleteSubscribers(hub, subscribers)

        return isShutdown.get ? Effect.interrupt : promise.await()
      }).onInterrupt(() => Effect.succeed(this.unsafeRemove(promise)))
    })
  }

  get shutdown(): UIO<void> {
    return Effect.Do()
      .bind("fiberId", () => Effect.fiberId)
      .bind("publishers", () => Effect.succeed(unsafePollAllQueue(this.publishers)))
      .tap(({ fiberId, publishers }) =>
        Effect.forEachParDiscard(publishers, ([_, promise, last]) =>
          last ? promise.interruptAs(fiberId) : Effect.unit
        )
      )
      .asUnit()
  }

  unsafeOnHubEmptySpace(
    hub: AtomicHub<A>,
    subscribers: HashSet<Tuple<[Subscription<A>, MutableQueue<Promise<never, A>>]>>
  ): void {
    let keepPolling = true

    while (keepPolling && !hub.isFull()) {
      const publisher = this.publishers.poll(EmptyQueue)!

      if (publisher === EmptyQueue) {
        keepPolling = false
      } else {
        const published = hub.publish(publisher[0])

        if (published && publisher[2]) {
          unsafeCompletePromise(publisher[1], true)
        } else if (!published) {
          unsafeOfferAll(
            this.publishers,
            unsafePollAllQueue(this.publishers).prepend(publisher)
          )
        }
        this.unsafeCompleteSubscribers(hub, subscribers)
      }
    }
  }

  private unsafeOffer(as: Iterable<A>, promise: Promise<never, boolean>): void {
    const it = as[Symbol.iterator]()
    let curr = it.next()

    if (!curr.done) {
      let next
      while ((next = it.next()) && !next.done) {
        this.publishers.offer([curr.value, promise, false] as const)
        curr = next
      }
      this.publishers.offer([curr.value, promise, true] as const)
    }
  }

  private unsafeRemove(promise: Promise<never, boolean>): void {
    unsafeOfferAll(
      this.publishers,
      unsafePollAllQueue(this.publishers).filter(([_, a]) => a !== promise)
    )
  }
}

/**
 * A strategy that drops new messages when the hub is at capacity. This
 * guarantees that a slow subscriber will not slow down the rate at which
 * messages are published. However, it creates the risk that a slow
 * subscriber will slow down the rate at which messages are received by
 * other subscribers and that subscribers may not receive all messages
 * published to the hub while they are subscribed.
 */
export class Dropping<A> extends BaseStrategy<A> {
  handleSurplus(
    _hub: AtomicHub<A>,
    _subscribers: HashSet<Tuple<[Subscription<A>, MutableQueue<Promise<never, A>>]>>,
    _as: Iterable<A>,
    _isShutdown: AtomicBoolean
  ): UIO<boolean> {
    return Effect.succeed(false)
  }

  shutdown: UIO<void> = Effect.unit

  unsafeOnHubEmptySpace(
    _hub: AtomicHub<A>,
    _subscribers: HashSet<Tuple<[Subscription<A>, MutableQueue<Promise<never, A>>]>>
  ): void {
    //
  }
}

/**
 * A strategy that adds new messages and drops old messages when the hub is
 * at capacity. This guarantees that a slow subscriber will not slow down
 * the rate at which messages are published and received by other
 * subscribers. However, it creates the risk that a slow subscriber will
 * not receive some messages published to the hub while it is subscribed.
 */
export class Sliding<A> extends BaseStrategy<A> {
  private unsafeSlidingPublish(hub: AtomicHub<A>, as: Iterable<A>): void {
    const it = as[Symbol.iterator]()
    let next = it.next()

    if (!next.done && hub.capacity > 0) {
      let a = next.value
      let loop = true
      while (loop) {
        hub.slide()
        const pub = hub.publish(a)
        if (pub && (next = it.next()) && !next.done) {
          a = next.value
        } else if (pub) {
          loop = false
        }
      }
    }
  }

  handleSurplus(
    hub: AtomicHub<A>,
    subscribers: HashSet<Tuple<[Subscription<A>, MutableQueue<Promise<never, A>>]>>,
    as: Iterable<A>,
    _isShutdown: AtomicBoolean
  ): UIO<boolean> {
    return Effect.succeed(() => {
      this.unsafeSlidingPublish(hub, as)
      this.unsafeCompleteSubscribers(hub, subscribers)
      return true
    })
  }

  shutdown: UIO<void> = Effect.unit

  unsafeOnHubEmptySpace(
    _hub: AtomicHub<A>,
    _subscribers: HashSet<Tuple<[Subscription<A>, MutableQueue<Promise<never, A>>]>>
  ): void {
    //
  }
}

/**
 * @tsplus static ets/Hub/StrategyOps BackPressure
 */
export function backPressureStrategy<A>(): Strategy<A> {
  return new BackPressure<A>()
}

/**
 * @tsplus static ets/Hub/StrategyOps Dropping
 */
export function droppingStrategy<A>(): Strategy<A> {
  return new Dropping<A>()
}

/**
 * @tsplus static ets/Hub/StrategyOps Sliding
 */
export function slidingStrategy<A>(): Strategy<A> {
  return new Sliding<A>()
}
