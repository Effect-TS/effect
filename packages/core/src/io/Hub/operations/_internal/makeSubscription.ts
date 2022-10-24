import { Effect } from "@effect/core/io/Effect/definition"
import type { AtomicHub } from "@effect/core/io/Hub/operations/_internal/AtomicHub"
import type { Subscription } from "@effect/core/io/Hub/operations/_internal/Subscription"
import { unsafePollAllSubscription } from "@effect/core/io/Hub/operations/_internal/unsafePollAllSubscription"
import { unsafePollN } from "@effect/core/io/Hub/operations/_internal/unsafePollN"
import { unsafeRemove } from "@effect/core/io/Hub/operations/_internal/unsafeRemove"
import type { Strategy } from "@effect/core/io/Hub/operations/strategy"
import { _In, _Out, QueueSym } from "@effect/core/io/Queue/definition"
import { unsafePollAll } from "@effect/core/io/Queue/operations/_internal/unsafePollAll"
import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"
import * as MutableHashSet from "@fp-ts/data/mutable/MutableHashSet"
import * as MutableQueue from "@fp-ts/data/mutable/MutableQueue"
import * as MutableRef from "@fp-ts/data/mutable/MutableRef"
import type { Option } from "@fp-ts/data/Option"

/** @internal */
export function makeSubscription<A>(
  hub: AtomicHub<A>,
  subscribers: MutableHashSet.MutableHashSet<
    readonly [Subscription<A>, MutableQueue.MutableQueue<Deferred<never, A>>]
  >,
  strategy: Strategy<A>
): Effect<never, never, Dequeue<A>> {
  return Deferred.make<never, void>().map((deferred) =>
    unsafeMakeSubscription(
      hub,
      subscribers,
      hub.subscribe(),
      MutableQueue.unbounded<Deferred<never, A>>(),
      deferred,
      MutableRef.make(false),
      strategy
    )
  )
}

class SubscriptionImpl<A> implements Dequeue<A> {
  get [QueueSym](): QueueSym {
    return QueueSym
  }
  get [_Out](): (_: never) => A {
    return (a) => a
  }
  constructor(
    readonly hub: AtomicHub<A>,
    readonly subscribers: MutableHashSet.MutableHashSet<
      readonly [Subscription<A>, MutableQueue.MutableQueue<Deferred<never, A>>]
    >,
    readonly subscription: Subscription<A>,
    readonly pollers: MutableQueue.MutableQueue<Deferred<never, A>>,
    readonly shutdownHook: Deferred<never, void>,
    readonly shutdownFlag: MutableRef.MutableRef<boolean>,
    readonly strategy: Strategy<A>
  ) {}
  get take(): Effect<never, never, A> {
    return Effect.withFiberRuntime((state) => {
      if (MutableRef.get(this.shutdownFlag)) {
        return Effect.interrupt
      }
      const message = MutableQueue.isEmpty(this.pollers)
        ? this.subscription.poll(MutableQueue.EmptyMutableQueue)
        : MutableQueue.EmptyMutableQueue
      if (message === MutableQueue.EmptyMutableQueue) {
        const deferred = Deferred.unsafeMake<never, A>(state.id)
        return Effect.suspendSucceed(() => {
          pipe(this.pollers, MutableQueue.offer(deferred))
          pipe(this.subscribers, MutableHashSet.add([this.subscription, this.pollers] as const))
          this.strategy.unsafeCompletePollers(
            this.hub,
            this.subscribers,
            this.subscription,
            this.pollers
          )
          return MutableRef.get(this.shutdownFlag) ? Effect.interrupt : deferred.await
        }).onInterrupt(() => Effect.sync(unsafeRemove(this.pollers, deferred)))
      } else {
        this.strategy.unsafeOnHubEmptySpace(this.hub, this.subscribers)
        return Effect.succeed(message)
      }
    })
  }
  get takeAll(): Effect<never, never, Chunk.Chunk<A>> {
    return Effect.suspendSucceed(() => {
      if (MutableRef.get(this.shutdownFlag)) {
        return Effect.interrupt
      }
      const as = MutableQueue.isEmpty(this.pollers)
        ? unsafePollAllSubscription(this.subscription)
        : Chunk.empty
      this.strategy.unsafeOnHubEmptySpace(this.hub, this.subscribers)
      return Effect.succeed(as)
    })
  }
  takeUpTo(this: this, max: number): Effect<never, never, Chunk.Chunk<A>> {
    return Effect.suspendSucceed(() => {
      if (MutableRef.get(this.shutdownFlag)) {
        return Effect.interrupt
      }
      const as = MutableQueue.isEmpty(this.pollers)
        ? unsafePollN(this.subscription, max)
        : Chunk.empty
      this.strategy.unsafeOnHubEmptySpace(this.hub, this.subscribers)
      return Effect.succeed(as)
    })
  }
  takeRemainderLoop<A>(
    self: Dequeue<A>,
    min: number,
    max: number,
    acc: Chunk.Chunk<A>
  ): Effect<never, never, Chunk.Chunk<A>> {
    if (max < min) {
      return Effect.succeed(acc)
    }
    return self.takeUpTo(max).flatMap((bs) => {
      const remaining = min - bs.length

      if (remaining === 1) {
        return self.take.map((b) => pipe(acc, Chunk.concat(bs), Chunk.append(b)))
      }

      if (remaining > 1) {
        return self.take.flatMap((b) =>
          this.takeRemainderLoop(
            self,
            remaining - 1,
            max - bs.length - 1,
            pipe(acc, Chunk.concat(bs), Chunk.append(b))
          )
        )
      }

      return Effect.succeed(pipe(acc, Chunk.concat(bs)))
    })
  }
  takeBetween(this: this, min: number, max: number): Effect<never, never, Chunk.Chunk<A>> {
    return Effect.suspendSucceed(this.takeRemainderLoop(this, min, max, Chunk.empty))
  }
  takeN(this: this, n: number): Effect<never, never, Chunk.Chunk<A>> {
    return this.takeBetween(n, n)
  }
  get poll(): Effect<never, never, Option<A>> {
    return this.takeUpTo(1).map(Chunk.head)
  }
  get capacity(): number {
    return this.hub.capacity
  }
  get size(): Effect<never, never, number> {
    return Effect.suspendSucceed(
      MutableRef.get(this.shutdownFlag)
        ? Effect.interrupt
        : Effect.succeed(this.subscription.size)
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
        Effect.forEachPar(
          unsafePollAll(this.pollers),
          (deferred) => deferred.interruptAs(state.id)
        ) >
          Effect.sync(this.subscription.unsubscribe()) >
          Effect.sync(this.strategy.unsafeOnHubEmptySpace(this.hub, this.subscribers))
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
export function unsafeMakeSubscription<A>(
  hub: AtomicHub<A>,
  subscribers: MutableHashSet.MutableHashSet<
    readonly [
      Subscription<A>,
      MutableQueue.MutableQueue<Deferred<never, A>>
    ]
  >,
  subscription: Subscription<A>,
  pollers: MutableQueue.MutableQueue<Deferred<never, A>>,
  shutdownHook: Deferred<never, void>,
  shutdownFlag: MutableRef.MutableRef<boolean>,
  strategy: Strategy<A>
): Dequeue<A> {
  return new SubscriptionImpl(
    hub,
    subscribers,
    subscription,
    pollers,
    shutdownHook,
    shutdownFlag,
    strategy
  )
}
