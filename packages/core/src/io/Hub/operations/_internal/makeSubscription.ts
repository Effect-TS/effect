import { Chunk } from "../../../../collection/immutable/Chunk"
import { Tuple } from "../../../../collection/immutable/Tuple"
import type { HashSet } from "../../../../collection/mutable/HashSet"
import { AtomicBoolean } from "../../../../support/AtomicBoolean"
import { EmptyQueue, MutableQueue } from "../../../../support/MutableQueue"
import type { UIO } from "../../../Effect"
import { Effect } from "../../../Effect"
import { Promise } from "../../../Promise"
import type { Dequeue } from "../../../Queue"
import { XQueueInternal } from "../../../Queue/definition/base"
import { unsafePollAll } from "../../../Queue/operations/_internal/unsafePollAll"
import type { Strategy } from "../strategy"
import type { AtomicHub } from "./AtomicHub"
import type { Subscription } from "./Subscription"
import { unsafePollAllSubscription } from "./unsafePollAllSubscription"
import { unsafePollN } from "./unsafePollN"
import { unsafeRemove } from "./unsafeRemove"

/**
 * Creates a subscription with the specified strategy.
 */
export function makeSubscription<A>(
  hub: AtomicHub<A>,
  subscribers: HashSet<Tuple<[Subscription<A>, MutableQueue<Promise<never, A>>]>>,
  strategy: Strategy<A>
): UIO<Dequeue<A>> {
  return Promise.make<never, void>().map((promise) =>
    unsafeMakeSubscription(
      hub,
      subscribers,
      hub.subscribe(),
      MutableQueue.Unbounded<Promise<never, A>>(),
      promise,
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
  subscribers: HashSet<Tuple<[Subscription<A>, MutableQueue<Promise<never, A>>]>>,
  subscription: Subscription<A>,
  pollers: MutableQueue<Promise<never, A>>,
  shutdownHook: Promise<never, void>,
  shutdownFlag: AtomicBoolean,
  strategy: Strategy<A>
): Dequeue<A> {
  return new UnsafeMakeSubscriptionImplementation(
    hub,
    subscribers,
    subscription,
    pollers,
    shutdownHook,
    shutdownFlag,
    strategy
  )
}

class UnsafeMakeSubscriptionImplementation<A> extends XQueueInternal<
  never,
  unknown,
  unknown,
  never,
  never,
  A
> {
  constructor(
    private hub: AtomicHub<A>,
    private subscribers: HashSet<
      Tuple<[Subscription<A>, MutableQueue<Promise<never, A>>]>
    >,
    private subscription: Subscription<A>,
    private pollers: MutableQueue<Promise<never, A>>,
    private shutdownHook: Promise<never, void>,
    private shutdownFlag: AtomicBoolean,
    private strategy: Strategy<A>
  ) {
    super()
  }

  _awaitShutdown: UIO<void> = this.shutdownHook.await()

  _capacity: number = this.hub.capacity

  _isShutdown: UIO<boolean> = Effect.succeed(this.shutdownFlag.get)

  _shutdown: UIO<void> = Effect.suspendSucceedWith((_, fiberId) => {
    this.shutdownFlag.set(true)
    return Effect.whenEffect(
      this.shutdownHook.succeed(undefined),
      Effect.forEachPar(unsafePollAll(this.pollers), (promise) =>
        promise.interruptAs(fiberId)
      ) >
        Effect.succeed(this.subscription.unsubscribe()) >
        Effect.succeed(this.strategy.unsafeOnHubEmptySpace(this.hub, this.subscribers))
    ).asUnit()
  }).uninterruptible()

  _size: UIO<number> = Effect.suspendSucceed(
    this.shutdownFlag.get
      ? Effect.interrupt
      : Effect.succeedNow(this.subscription.size())
  )

  _offer(_: never, __tsplusTrace?: string): Effect<never, unknown, boolean> {
    return Effect.succeedNow(false)
  }

  _offerAll(
    _: Iterable<never>,
    __tsplusTrace?: string
  ): Effect<never, unknown, boolean> {
    return Effect.succeedNow(false)
  }

  _take: Effect<unknown, never, A> = Effect.suspendSucceedWith((_, fiberId) => {
    if (this.shutdownFlag.get) {
      return Effect.interrupt
    }

    const message = this.pollers.isEmpty
      ? this.subscription.poll(EmptyQueue)
      : EmptyQueue

    if (message === EmptyQueue) {
      const promise = Promise.unsafeMake<never, A>(fiberId)

      return Effect.suspendSucceed(() => {
        this.pollers.offer(promise)
        this.subscribers.add(Tuple(this.subscription, this.pollers))
        this.strategy.unsafeCompletePollers(
          this.hub,
          this.subscribers,
          this.subscription,
          this.pollers
        )
        return this.shutdownFlag.get ? Effect.interrupt : promise.await()
      }).onInterrupt(() => Effect.succeed(unsafeRemove(this.pollers, promise)))
    } else {
      this.strategy.unsafeOnHubEmptySpace(this.hub, this.subscribers)
      return Effect.succeedNow(message)
    }
  })

  _takeAll: Effect<unknown, never, Chunk<A>> = Effect.suspendSucceed(() => {
    if (this.shutdownFlag.get) {
      return Effect.interrupt
    }

    const as = this.pollers.isEmpty
      ? unsafePollAllSubscription(this.subscription)
      : Chunk.empty<A>()

    this.strategy.unsafeOnHubEmptySpace(this.hub, this.subscribers)

    return Effect.succeedNow(as)
  })

  _takeUpTo(n: number): Effect<unknown, never, Chunk<A>> {
    return Effect.suspendSucceed(() => {
      if (this.shutdownFlag.get) {
        return Effect.interrupt
      }

      const as = this.pollers.isEmpty
        ? unsafePollN(this.subscription, n)
        : Chunk.empty<A>()

      this.strategy.unsafeOnHubEmptySpace(this.hub, this.subscribers)
      return Effect.succeedNow(as)
    })
  }
}
