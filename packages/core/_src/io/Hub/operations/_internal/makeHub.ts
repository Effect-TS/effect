import type { AtomicHub } from "@effect/core/io/Hub/operations/_internal/AtomicHub"
import { makeSubscription } from "@effect/core/io/Hub/operations/_internal/makeSubscription"
import type { Subscription } from "@effect/core/io/Hub/operations/_internal/Subscription"
import { unsafePublishAll } from "@effect/core/io/Hub/operations/_internal/unsafePublishAll"
import type { Strategy } from "@effect/core/io/Hub/operations/strategy"

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

const HubProto: any = {
  get capacity() {
    return (this.hub as AtomicHub<unknown>).capacity
  },
  get size() {
    return Effect.suspendSucceed(
      (this.shutdownFlag as AtomicBoolean).get ?
        Effect.interrupt :
        Effect.sync((this.hub as AtomicHub<unknown>).size())
    )
  },
  get awaitShutdown() {
    return (this.shutdownHook as Deferred<never, void>).await()
  },
  get shutdown() {
    return Effect.suspendSucceedWith((_, fiberId) => {
      ;(this.shutdownFlag as AtomicBoolean).set(true)
      return Effect.whenEffect(
        (this.shutdownHook as Deferred<never, void>).succeed(undefined),
        (this.scope as Scope.Closeable).close(Exit.interrupt(fiberId)) > (this.strategy as Strategy<unknown>).shutdown
      ).unit
    }).uninterruptible
  },
  get isShutdown() {
    return Effect.sync((this.shutdownFlag as AtomicBoolean).get)
  },
  get subscribe() {
    return Effect.acquireRelease(
      makeSubscription(this.hub, this.subscribers, this.strategy).tap((dequeue) =>
        (this.scope as Scope.Closeable).addFinalizer(dequeue.shutdown)
      ),
      (dequeue) => dequeue.shutdown
    )
  },
  offer(a: unknown, __tsplusTrace?: string): Effect<never, never, boolean> {
    return this.publish(a)
  },
  offerAll(as: Collection<unknown>, __tsplusTrace?: string): Effect<never, never, boolean> {
    return this.publishAll(as)
  },
  publish(a: unknown, __tsplusTrace?: string) {
    return Effect.suspendSucceed(() => {
      if (this.shutdownFlag.get) {
        return Effect.interrupt
      }

      if ((this.hub as AtomicHub<unknown>).publish(a)) {
        this.strategy.unsafeCompleteSubscribers(this.hub, this.subscribers)
        return Effect.succeed(true)
      }

      return this.strategy.handleSurplus(
        this.hub,
        this.subscribers,
        Chunk.single(a),
        this.shutdownFlag
      )
    })
  },
  publishAll(as: Collection<unknown>, __tsplusTrace?: string) {
    return Effect.suspendSucceed(() => {
      if (this.shutdownFlag.get) {
        return Effect.interrupt
      }
      const surplus = unsafePublishAll(this.hub, as)
      this.strategy.unsafeCompleteSubscribers(this.hub, this.subscribers)
      if (surplus.isEmpty) {
        return Effect.succeed(true)
      }
      return this.strategy.handleSurplus(
        this.hub,
        this.subscribers,
        surplus,
        this.shutdownFlag
      )
    })
  }
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
  return Object.setPrototypeOf({
    hub,
    subscribers,
    scope,
    shutdownHook,
    shutdownFlag,
    strategy
  }, HubProto)
}
