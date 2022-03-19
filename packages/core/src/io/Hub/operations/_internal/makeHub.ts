import { Chunk } from "../../../../collection/immutable/Chunk"
import type { Tuple } from "../../../../collection/immutable/Tuple"
import { HashSet } from "../../../../collection/mutable/HashSet"
import { AtomicBoolean } from "../../../../support/AtomicBoolean"
import type { MutableQueue } from "../../../../support/MutableQueue"
import type { UIO } from "../../../Effect"
import { Effect } from "../../../Effect"
import { ExecutionStrategy } from "../../../ExecutionStrategy"
import { Exit } from "../../../Exit"
import { Managed } from "../../../Managed"
import { ReleaseMap } from "../../../Managed/ReleaseMap"
import { Promise } from "../../../Promise"
import type { XDequeue } from "../../../Queue"
import type { Hub } from "../../definition"
import { XHubInternal } from "../../definition"
import type { Strategy } from "../strategy"
import type { AtomicHub } from "./AtomicHub"
import { makeSubscription } from "./makeSubscription"
import type { Subscription } from "./Subscription"
import { unsafePublishAll } from "./unsafePublishAll"

/**
 * Creates a hub with the specified strategy.
 */
export function makeHub<A>(hub: AtomicHub<A>, strategy: Strategy<A>): UIO<Hub<A>> {
  return ReleaseMap.make.flatMap((releaseMap) =>
    Promise.make<never, void>().map((promise) =>
      unsafeMakeHub(
        hub,
        HashSet.empty(),
        releaseMap,
        promise,
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
  subscribers: HashSet<Tuple<[Subscription<A>, MutableQueue<Promise<never, A>>]>>,
  releaseMap: ReleaseMap,
  shutdownHook: Promise<never, void>,
  shutdownFlag: AtomicBoolean,
  strategy: Strategy<A>
): Hub<A> {
  return new UnsafeMakeHubImplementation(
    hub,
    subscribers,
    releaseMap,
    shutdownHook,
    shutdownFlag,
    strategy
  )
}

class UnsafeMakeHubImplementation<A> extends XHubInternal<
  unknown,
  unknown,
  never,
  never,
  A,
  A
> {
  _awaitShutdown: UIO<void>
  _capacity: number
  _isShutdown: UIO<boolean>
  _shutdown: UIO<void>
  _size: UIO<number>
  _subscribe: Managed<unknown, never, XDequeue<unknown, never, A>>

  constructor(
    private hub: AtomicHub<A>,
    private subscribers: HashSet<
      Tuple<[Subscription<A>, MutableQueue<Promise<never, A>>]>
    >,
    releaseMap: ReleaseMap,
    shutdownHook: Promise<never, void>,
    private shutdownFlag: AtomicBoolean,
    private strategy: Strategy<A>
  ) {
    super()
    this._awaitShutdown = shutdownHook.await()
    this._capacity = hub.capacity
    this._isShutdown = Effect.succeed(shutdownFlag.get)
    this._shutdown = Effect.suspendSucceedWith((_, fiberId) => {
      shutdownFlag.set(true)
      return Effect.whenEffect(
        shutdownHook.succeed(undefined),
        releaseMap.releaseAll(Exit.interrupt(fiberId), ExecutionStrategy.Parallel) >
          strategy.shutdown
      ).asUnit()
    }).uninterruptible()
    this._size = Effect.suspendSucceed(
      shutdownFlag.get ? Effect.interrupt : Effect.succeed(hub.size())
    )
    this._subscribe = makeSubscription(hub, subscribers, strategy)
      .toManaged()
      .tap((dequeue) =>
        Managed.acquireReleaseExitWith(
          releaseMap.add(() => dequeue.shutdown()),
          (finalizer, exit) => finalizer(exit)
        )
      )
  }

  _publish(a: A, __tsplusTrace?: string): Effect<unknown, never, boolean> {
    return Effect.suspendSucceed(() => {
      if (this.shutdownFlag.get) {
        return Effect.interrupt
      }

      if (this.hub.publish(a)) {
        this.strategy.unsafeCompleteSubscribers(this.hub, this.subscribers)
        return Effect.succeedNow(true)
      }

      return this.strategy.handleSurplus(
        this.hub,
        this.subscribers,
        Chunk.single(a),
        this.shutdownFlag
      )
    })
  }

  _publishAll(
    as: Iterable<A>,
    __tsplusTrace?: string
  ): Effect<unknown, never, boolean> {
    return Effect.suspendSucceed(() => {
      if (this.shutdownFlag.get) {
        return Effect.interrupt
      }

      const surplus = unsafePublishAll(this.hub, as)

      this.strategy.unsafeCompleteSubscribers(this.hub, this.subscribers)

      if (surplus.isEmpty()) {
        return Effect.succeedNow(true)
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
