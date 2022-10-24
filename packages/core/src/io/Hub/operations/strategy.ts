import type { AtomicHub } from "@effect/core/io/Hub/operations/_internal/AtomicHub"
import type { Subscription } from "@effect/core/io/Hub/operations/_internal/Subscription"
import { unsafeCompleteDeferred } from "@effect/core/io/Hub/operations/_internal/unsafeCompleteDeferred"
import { unsafeOfferAll } from "@effect/core/io/Hub/operations/_internal/unsafeOfferAll"
import { unsafePollAllQueue } from "@effect/core/io/Hub/operations/_internal/unsafePollAllQueue"
import { pipe } from "@fp-ts/data/Function"
import * as List from "@fp-ts/data/List"
import * as MutableHashSet from "@fp-ts/data/mutable/MutableHashSet"
import * as MutableQueue from "@fp-ts/data/mutable/MutableQueue"
import * as MutableRef from "@fp-ts/data/mutable/MutableRef"
/**
 * A `Strategy<A>` describes the protocol for how publishers and subscribers
 * will communicate with each other through the hub.
 *
 * @tsplus type effect/core/io/Hub/Strategy
 * @category model
 * @since 1.0.0
 */
export interface Strategy<A> {
  /**
   * Describes how publishers should signal to subscribers that they are
   * waiting for space to become available in the hub.
   */
  readonly handleSurplus: (
    hub: AtomicHub<A>,
    subscribers: MutableHashSet.MutableHashSet<
      readonly [
        Subscription<A>,
        MutableQueue.MutableQueue<Deferred<never, A>>
      ]
    >,
    as: Iterable<A>,
    isShutdown: MutableRef.MutableRef<boolean>
  ) => Effect<never, never, boolean>

  /**
   * Describes any finalization logic associated with this strategy.
   */
  readonly shutdown: Effect<never, never, void>

  /**
   * Describes how subscribers should signal to publishers waiting for space
   * to become available in the hub that space may be available.
   */
  readonly unsafeOnHubEmptySpace: (
    hub: AtomicHub<A>,
    subscribers: MutableHashSet.MutableHashSet<
      readonly [
        Subscription<A>,
        MutableQueue.MutableQueue<Deferred<never, A>>
      ]
    >
  ) => void

  /**
   * Describes how subscribers waiting for additional values from the hub
   * should take those values and signal to publishers that they are no
   * longer waiting for additional values.
   */
  readonly unsafeCompletePollers: (
    hub: AtomicHub<A>,
    subscribers: MutableHashSet.MutableHashSet<
      readonly [
        Subscription<A>,
        MutableQueue.MutableQueue<Deferred<never, A>>
      ]
    >,
    subscription: Subscription<A>,
    pollers: MutableQueue.MutableQueue<Deferred<never, A>>
  ) => void

  /**
   * Describes how publishers should signal to subscribers waiting for
   * additional values from the hub that new values are available.
   */
  readonly unsafeCompleteSubscribers: (
    hub: AtomicHub<A>,
    subscribers: MutableHashSet.MutableHashSet<
      readonly [Subscription<A>, MutableQueue.MutableQueue<Deferred<never, A>>]
    >
  ) => void
}

/**
 * @tsplus type effect/core/io/Hub/Strategy.Ops
 * @category model
 * @since 1.0.0
 */
export interface StrategyOps {}
export const Strategy: StrategyOps = {}

abstract class BaseStrategy<A> implements Strategy<A> {
  abstract handleSurplus(
    hub: AtomicHub<A>,
    subscribers: MutableHashSet.MutableHashSet<
      readonly [
        Subscription<A>,
        MutableQueue.MutableQueue<Deferred<never, A>>
      ]
    >,
    as: Iterable<A>,
    isShutdown: MutableRef.MutableRef<boolean>
  ): Effect<never, never, boolean>

  abstract shutdown: Effect<never, never, void>

  abstract unsafeOnHubEmptySpace(
    hub: AtomicHub<A>,
    subscribers: MutableHashSet.MutableHashSet<
      readonly [
        Subscription<A>,
        MutableQueue.MutableQueue<Deferred<never, A>>
      ]
    >
  ): void

  unsafeCompletePollers(
    hub: AtomicHub<A>,
    subscribers: MutableHashSet.MutableHashSet<
      readonly [
        Subscription<A>,
        MutableQueue.MutableQueue<Deferred<never, A>>
      ]
    >,
    subscription: Subscription<A>,
    pollers: MutableQueue.MutableQueue<Deferred<never, A>>
  ): void {
    let keepPolling = true

    while (keepPolling && !subscription.isEmpty) {
      const poller = pipe(pollers, MutableQueue.poll(MutableQueue.EmptyMutableQueue))

      if (poller === MutableQueue.EmptyMutableQueue) {
        const subPollerPair = [subscription, pollers] as const

        pipe(subscribers, MutableHashSet.remove(subPollerPair))

        if (MutableQueue.isEmpty(pollers)) {
          keepPolling = false
        } else {
          pipe(subscribers, MutableHashSet.add(subPollerPair))
        }
      } else {
        const pollResult = subscription.poll(MutableQueue.EmptyMutableQueue)

        if (pollResult === MutableQueue.EmptyMutableQueue) {
          unsafeOfferAll(pollers, pipe(unsafePollAllQueue(pollers), List.prepend(poller)))
        } else {
          unsafeCompleteDeferred(poller, pollResult)
          this.unsafeOnHubEmptySpace(hub, subscribers)
        }
      }
    }
  }

  unsafeCompleteSubscribers(
    hub: AtomicHub<A>,
    subscribers: MutableHashSet.MutableHashSet<
      readonly [
        Subscription<A>,
        MutableQueue.MutableQueue<Deferred<never, A>>
      ]
    >
  ): void {
    for (
      const [subscription, pollers] of subscribers
    ) {
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
 *
 * @category model
 * @since 1.0.0
 */
export class BackPressure<A> extends BaseStrategy<A> {
  publishers: MutableQueue.MutableQueue<readonly [A, Deferred<never, boolean>, boolean]> =
    MutableQueue
      .unbounded()

  handleSurplus(
    hub: AtomicHub<A>,
    subscribers: MutableHashSet.MutableHashSet<
      readonly [
        Subscription<A>,
        MutableQueue.MutableQueue<Deferred<never, A>>
      ]
    >,
    as: Iterable<A>,
    isShutdown: MutableRef.MutableRef<boolean>
  ): Effect<never, never, boolean> {
    return Effect.withFiberRuntime((state) => {
      const deferred: Deferred<never, boolean> = Deferred.unsafeMake<never, boolean>(state.id)

      return Effect.suspendSucceed(() => {
        this.unsafeOffer(as, deferred)
        this.unsafeOnHubEmptySpace(hub, subscribers)
        this.unsafeCompleteSubscribers(hub, subscribers)

        return MutableRef.get(isShutdown) ? Effect.interrupt : deferred.await
      }).onInterrupt(() => Effect.sync(this.unsafeRemove(deferred)))
    })
  }

  get shutdown(): Effect<never, never, void> {
    return Do(($) => {
      const fiberId = $(Effect.fiberId)
      const publishers = $(Effect.sync(unsafePollAllQueue(this.publishers)))
      return $(
        Effect.forEachParDiscard(publishers, ([_, deferred, last]) =>
          last ?
            deferred.interruptAs(fiberId) :
            Effect.unit).unit
      )
    })
  }

  unsafeOnHubEmptySpace(
    hub: AtomicHub<A>,
    subscribers: MutableHashSet.MutableHashSet<
      readonly [
        Subscription<A>,
        MutableQueue.MutableQueue<Deferred<never, A>>
      ]
    >
  ): void {
    let keepPolling = true

    while (keepPolling && !hub.isFull) {
      const publisher = pipe(this.publishers, MutableQueue.poll(MutableQueue.EmptyMutableQueue))

      if (publisher === MutableQueue.EmptyMutableQueue) {
        keepPolling = false
      } else {
        const published = hub.publish(publisher[0])

        if (published && publisher[2]) {
          unsafeCompleteDeferred(publisher[1], true)
        } else if (!published) {
          unsafeOfferAll(
            this.publishers,
            pipe(unsafePollAllQueue(this.publishers), List.prepend(publisher))
          )
        }
        this.unsafeCompleteSubscribers(hub, subscribers)
      }
    }
  }

  private unsafeOffer(as: Iterable<A>, deferred: Deferred<never, boolean>): void {
    const it = as[Symbol.iterator]()
    let curr = it.next()

    if (!curr.done) {
      let next
      while ((next = it.next()) && !next.done) {
        pipe(this.publishers, MutableQueue.offer([curr.value, deferred, false as boolean] as const))
        curr = next
      }
      pipe(this.publishers, MutableQueue.offer([curr.value, deferred, true as boolean] as const))
    }
  }

  private unsafeRemove(deferred: Deferred<never, boolean>): void {
    unsafeOfferAll(
      this.publishers,
      pipe(unsafePollAllQueue(this.publishers), List.filter(([_, a]) => a !== deferred))
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
 *
 * @category model
 * @since 1.0.0
 */
export class Dropping<A> extends BaseStrategy<A> {
  handleSurplus(
    _hub: AtomicHub<A>,
    _subscribers: MutableHashSet.MutableHashSet<
      readonly [
        Subscription<A>,
        MutableQueue.MutableQueue<Deferred<never, A>>
      ]
    >,
    _as: Iterable<A>,
    _isShutdown: MutableRef.MutableRef<boolean>
  ): Effect<never, never, boolean> {
    return Effect.succeed(false)
  }

  shutdown: Effect<never, never, void> = Effect.unit

  unsafeOnHubEmptySpace(
    _hub: AtomicHub<A>,
    _subscribers: MutableHashSet.MutableHashSet<
      readonly [
        Subscription<A>,
        MutableQueue.MutableQueue<Deferred<never, A>>
      ]
    >
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
 *
 * @category model
 * @since 1.0.0
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
    subscribers: MutableHashSet.MutableHashSet<
      readonly [
        Subscription<A>,
        MutableQueue.MutableQueue<Deferred<never, A>>
      ]
    >,
    as: Iterable<A>,
    _isShutdown: MutableRef.MutableRef<boolean>
  ): Effect<never, never, boolean> {
    return Effect.sync(() => {
      this.unsafeSlidingPublish(hub, as)
      this.unsafeCompleteSubscribers(hub, subscribers)
      return true
    })
  }

  shutdown: Effect<never, never, void> = Effect.unit

  unsafeOnHubEmptySpace(
    _hub: AtomicHub<A>,
    _subscribers: MutableHashSet.MutableHashSet<
      readonly [
        Subscription<A>,
        MutableQueue.MutableQueue<Deferred<never, A>>
      ]
    >
  ): void {
    //
  }
}

/**
 * @tsplus static effect/core/io/Hub/Strategy.Ops BackPressure
 * @category constructors
 * @since 1.0.0
 */
export function backPressureStrategy<A>(): Strategy<A> {
  return new BackPressure<A>()
}

/**
 * @tsplus static effect/core/io/Hub/Strategy.Ops Dropping
 * @category constructors
 * @since 1.0.0
 */
export function droppingStrategy<A>(): Strategy<A> {
  return new Dropping<A>()
}

/**
 * @tsplus static effect/core/io/Hub/Strategy.Ops Sliding
 * @category constructors
 * @since 1.0.0
 */
export function slidingStrategy<A>(): Strategy<A> {
  return new Sliding<A>()
}
