import type { AtomicHub } from "@effect/core/io/Hub/operations/_internal/AtomicHub"
import { makeSubscription } from "@effect/core/io/Hub/operations/_internal/makeSubscription"
import type { Subscription } from "@effect/core/io/Hub/operations/_internal/Subscription"
import { unsafePublishAll } from "@effect/core/io/Hub/operations/_internal/unsafePublishAll"
import type { Strategy } from "@effect/core/io/Hub/operations/strategy"
import type { AbstractQueue } from "@effect/core/io/Queue/definition"
import { QueueProto } from "@effect/core/io/Queue/definition"

/**
 * Creates a hub with the specified strategy.
 */
export function makeHub<A>(hub: AtomicHub<A>, strategy: Strategy<A>): Effect<never, never, Hub<A>> {
  return Scope.make.flatMap((scope) =>
    Deferred.make<never, void>().map((deferred) =>
      unsafeMakeHub(
        hub,
        MutableHashSet.empty(),
        scope,
        deferred,
        new AtomicBoolean(false),
        strategy
      )
    )
  )
}

/**
 * Unsafely creates a hub with the specified strategy.
 */
export function unsafeMakeHub<A>(
  hub: AtomicHub<A>,
  subscribers: MutableHashSet<Tuple<[Subscription<A>, MutableQueue<Deferred<never, A>>]>>,
  scope: Scope.Closeable,
  shutdownHook: Deferred<never, void>,
  shutdownFlag: AtomicBoolean,
  strategy: Strategy<A>
): Hub<A> {
  const base: AbstractQueue<Hub<A>, typeof QueueProto> = {
    capacity: hub.capacity,
    size: Effect.suspendSucceed(
      shutdownFlag.get ? Effect.interrupt : Effect.succeed(hub.size())
    ),
    awaitShutdown: shutdownHook.await(),
    shutdown: Effect.suspendSucceedWith((_, fiberId) => {
      shutdownFlag.set(true)
      return Effect.whenEffect(
        shutdownHook.succeed(undefined),
        scope.close(Exit.interrupt(fiberId)) > strategy.shutdown
      ).unit()
    }).uninterruptible(),
    isShutdown: Effect.succeed(shutdownFlag.get),
    subscribe: Effect.acquireRelease(
      makeSubscription(hub, subscribers, strategy).tap((dequeue) => scope.addFinalizer(dequeue.shutdown)),
      (dequeue) => dequeue.shutdown
    ),
    offer(a: A, __tsplusTrace?: string): Effect<never, never, boolean> {
      return this.publish(a)
    },
    offerAll(as: Collection<A>, __tsplusTrace?: string): Effect<never, never, boolean> {
      return this.publishAll(as)
    },
    publish(a: A, __tsplusTrace?: string) {
      return Effect.suspendSucceed(() => {
        if (shutdownFlag.get) {
          return Effect.interrupt
        }

        if (hub.publish(a)) {
          strategy.unsafeCompleteSubscribers(hub, subscribers)
          return Effect.succeedNow(true)
        }

        return strategy.handleSurplus(
          hub,
          subscribers,
          Chunk.single(a),
          shutdownFlag
        )
      })
    },
    publishAll(as: Collection<A>, __tsplusTrace?: string): Effect<never, never, boolean> {
      return Effect.suspendSucceed(() => {
        if (shutdownFlag.get) {
          return Effect.interrupt
        }
        const surplus = unsafePublishAll(hub, as)
        strategy.unsafeCompleteSubscribers(hub, subscribers)
        if (surplus.isEmpty) {
          return Effect.succeedNow(true)
        }
        return strategy.handleSurplus(
          hub,
          subscribers,
          surplus,
          shutdownFlag
        )
      })
    }
  }
  return Object.assign(Object.create(QueueProto), base)
}
