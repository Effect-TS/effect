import { Effect } from "@effect/core/io/Effect/definition"
import { HubSym } from "@effect/core/io/Hub/definition"
import type { AtomicHub } from "@effect/core/io/Hub/operations/_internal/AtomicHub"
import { makeSubscription } from "@effect/core/io/Hub/operations/_internal/makeSubscription"
import type { Subscription } from "@effect/core/io/Hub/operations/_internal/Subscription"
import { unsafePublishAll } from "@effect/core/io/Hub/operations/_internal/unsafePublishAll"
import type { Strategy } from "@effect/core/io/Hub/operations/strategy"
import type { Dequeue } from "@effect/core/io/Queue/definition"
import { _In, _Out, QueueSym } from "@effect/core/io/Queue/definition"
import { Scope } from "@effect/core/io/Scope/definition"
import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"
import * as MutableHashSet from "@fp-ts/data/mutable/MutableHashSet"
import type * as MutableQueue from "@fp-ts/data/mutable/MutableQueue"
import * as MutableRef from "@fp-ts/data/mutable/MutableRef"

/** @internal */
export function makeHub<A>(hub: AtomicHub<A>, strategy: Strategy<A>): Effect<never, never, Hub<A>> {
  return Scope.make.flatMap((scope) =>
    Deferred.make<never, void>().map((deferred) =>
      unsafeMakeHub(
        hub,
        MutableHashSet.empty(),
        scope,
        deferred,
        MutableRef.make(false),
        strategy
      )
    )
  )
}

class HubImpl<A> implements Hub<A> {
  get [_In](): (_: A) => unknown {
    return (a) => a
  }
  get [HubSym](): HubSym {
    return HubSym
  }
  get [QueueSym](): QueueSym {
    return QueueSym
  }
  constructor(
    readonly hub: AtomicHub<A>,
    readonly subscribers: MutableHashSet.MutableHashSet<
      readonly [Subscription<A>, MutableQueue.MutableQueue<Deferred<never, A>>]
    >,
    readonly scope: Scope.Closeable,
    readonly shutdownHook: Deferred<never, void>,
    readonly shutdownFlag: MutableRef.MutableRef<boolean>,
    readonly strategy: Strategy<A>
  ) {}
  publish(this: this, a: A): Effect<never, never, boolean> {
    return Effect.suspendSucceed(() => {
      if (MutableRef.get(this.shutdownFlag)) {
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
  }
  publishAll(this: this, as: Iterable<A>): Effect<never, never, boolean> {
    return Effect.suspendSucceed(() => {
      if (MutableRef.get(this.shutdownFlag)) {
        return Effect.interrupt
      }
      const surplus = unsafePublishAll(this.hub, as)
      this.strategy.unsafeCompleteSubscribers(this.hub, this.subscribers)
      if (Chunk.isEmpty(surplus)) {
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
  get subscribe(): Effect<Scope, never, Dequeue<A>> {
    return Effect.acquireRelease(
      makeSubscription(this.hub, this.subscribers, this.strategy).tap((dequeue) =>
        this.scope.addFinalizer(dequeue.shutdown)
      ),
      (dequeue) => dequeue.shutdown
    )
  }
  offer(this: this, a: A): Effect<never, never, boolean> {
    return this.publish(a)
  }
  offerAll(this: this, as: Iterable<A>): Effect<never, never, boolean> {
    return this.publishAll(as)
  }
  get capacity(): number {
    return this.hub.capacity
  }
  get size(): Effect<never, never, number> {
    return Effect.suspendSucceed(
      MutableRef.get(this.shutdownFlag) ?
        Effect.interrupt :
        Effect.sync(this.hub.size)
    )
  }
  get awaitShutdown(): Effect<never, never, void> {
    return this.shutdownHook.await
  }
  get isShutdown(): Effect<never, never, boolean> {
    return Effect.sync(MutableRef.get(this.shutdownFlag))
  }
  get shutdown(): Effect<never, never, void> {
    return Effect.withFiberRuntime<never, never, void>((state) => {
      pipe(this.shutdownFlag, MutableRef.set(true))
      return Effect.whenEffect(
        this.shutdownHook.succeed(undefined),
        this.scope.close(Exit.interrupt(state.id)) >
          this.strategy.shutdown
      ).unit
    }).uninterruptible
  }
  get isFull(): Effect<never, never, boolean> {
    return this.size.map((size) => size === this.capacity)
  }
  get isEmpty(): Effect<never, never, boolean> {
    return this.size.map((size) => size === 0)
  }
}

/** @internal */
export function unsafeMakeHub<A>(
  hub: AtomicHub<A>,
  subscribers: MutableHashSet.MutableHashSet<
    readonly [
      Subscription<A>,
      MutableQueue.MutableQueue<Deferred<never, A>>
    ]
  >,
  scope: Scope.Closeable,
  shutdownHook: Deferred<never, void>,
  shutdownFlag: MutableRef.MutableRef<boolean>,
  strategy: Strategy<A>
): Hub<A> {
  return new HubImpl(hub, subscribers, scope, shutdownHook, shutdownFlag, strategy)
}
