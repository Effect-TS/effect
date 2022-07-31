import type { AtomicHub } from "@effect/core/io/Hub/operations/_internal/AtomicHub"
import type { Subscription } from "@effect/core/io/Hub/operations/_internal/Subscription"
import { unsafePollAllSubscription } from "@effect/core/io/Hub/operations/_internal/unsafePollAllSubscription"
import { unsafePollN } from "@effect/core/io/Hub/operations/_internal/unsafePollN"
import { unsafeRemove } from "@effect/core/io/Hub/operations/_internal/unsafeRemove"
import type { Strategy } from "@effect/core/io/Hub/operations/strategy"
import type { AbstractQueue } from "@effect/core/io/Queue/definition"
import { _In, _Out, QueueProto } from "@effect/core/io/Queue/definition"
import { unsafePollAll } from "@effect/core/io/Queue/operations/_internal/unsafePollAll"

/**
 * Creates a subscription with the specified strategy.
 */
export function makeSubscription<A>(
  hub: AtomicHub<A>,
  subscribers: MutableHashSet<Tuple<[Subscription<A>, MutableQueue<Deferred<never, A>>]>>,
  strategy: Strategy<A>
): Effect<never, never, Dequeue<A>> {
  return Deferred.make<never, void>().map((deferred) =>
    unsafeMakeSubscription(
      hub,
      subscribers,
      hub.subscribe(),
      MutableQueue.unbounded<Deferred<never, A>>(),
      deferred,
      new AtomicBoolean(false),
      strategy
    )
  )
}

/**
 * Unsafely creates a subscription with the specified strategy.
 */
export function unsafeMakeSubscription<A>(
  hub: AtomicHub<A>,
  subscribers: MutableHashSet<Tuple<[Subscription<A>, MutableQueue<Deferred<never, A>>]>>,
  subscription: Subscription<A>,
  pollers: MutableQueue<Deferred<never, A>>,
  shutdownHook: Deferred<never, void>,
  shutdownFlag: AtomicBoolean,
  strategy: Strategy<A>
): Dequeue<A> {
  const base: AbstractQueue<Dequeue<A>, typeof QueueProto> = {
    capacity: hub.capacity,
    size: Effect.suspendSucceed(
      shutdownFlag.get
        ? Effect.interrupt
        : Effect.succeed(subscription.size())
    ),
    awaitShutdown: shutdownHook.await,
    shutdown: Effect.suspendSucceedWith((_, fiberId) => {
      shutdownFlag.set(true)
      return Effect.whenEffect(
        shutdownHook.succeed(undefined),
        Effect.forEachPar(unsafePollAll(pollers), (deferred) => deferred.interruptAs(fiberId)) >
          Effect.sync(subscription.unsubscribe()) >
          Effect.sync(strategy.unsafeOnHubEmptySpace(hub, subscribers))
      ).unit
    }).uninterruptible,
    isShutdown: Effect.sync(shutdownFlag.get),
    take: Effect.suspendSucceedWith((_, fiberId) => {
      if (shutdownFlag.get) {
        return Effect.interrupt
      }
      const message = pollers.isEmpty
        ? subscription.poll(EmptyMutableQueue)
        : EmptyMutableQueue
      if (message === EmptyMutableQueue) {
        const deferred = Deferred.unsafeMake<never, A>(fiberId)
        return Effect.suspendSucceed(() => {
          pollers.offer(deferred)
          subscribers.add(Tuple(subscription, pollers))
          strategy.unsafeCompletePollers(
            hub,
            subscribers,
            subscription,
            pollers
          )
          return shutdownFlag.get ? Effect.interrupt : deferred.await
        }).onInterrupt(() => Effect.sync(unsafeRemove(pollers, deferred)))
      } else {
        strategy.unsafeOnHubEmptySpace(hub, subscribers)
        return Effect.succeed(message)
      }
    }),
    takeAll: Effect.suspendSucceed(() => {
      if (shutdownFlag.get) {
        return Effect.interrupt
      }
      const as = pollers.isEmpty
        ? unsafePollAllSubscription(subscription)
        : Chunk.empty<A>()
      strategy.unsafeOnHubEmptySpace(hub, subscribers)
      return Effect.succeed(as)
    }),
    takeUpTo(max: number) {
      return Effect.suspendSucceed(() => {
        if (shutdownFlag.get) {
          return Effect.interrupt
        }
        const as = pollers.isEmpty
          ? unsafePollN(subscription, max)
          : Chunk.empty<A>()
        strategy.unsafeOnHubEmptySpace(hub, subscribers)
        return Effect.succeed(as)
      })
    }
  }
  return Object.setPrototypeOf(base, QueueProto)
}
