import { Chunk } from "../../../../collection/immutable/Chunk"
import type { Tuple } from "../../../../collection/immutable/Tuple"
import { HashSet } from "../../../../collection/mutable/HashSet"
import { AtomicBoolean } from "../../../../support/AtomicBoolean"
import type { MutableQueue } from "../../../../support/MutableQueue"
import type { UIO } from "../../../Effect"
import { Effect } from "../../../Effect"
import { Exit } from "../../../Exit"
import { Promise } from "../../../Promise"
import type { Dequeue } from "../../../Queue"
import { _In, QueueSym } from "../../../Queue"
import type { HasScope } from "../../../Scope"
import { Scope } from "../../../Scope"
import type { Hub } from "../../definition"
import { HubSym } from "../../definition"
import type { Strategy } from "../strategy"
import type { AtomicHub } from "./AtomicHub"
import { makeSubscription } from "./makeSubscription"
import type { Subscription } from "./Subscription"
import { unsafePublishAll } from "./unsafePublishAll"

/**
 * Creates a hub with the specified strategy.
 */
export function makeHub<A>(hub: AtomicHub<A>, strategy: Strategy<A>): UIO<Hub<A>> {
  return Scope.make.flatMap((scope) =>
    Promise.make<never, void>().map((promise) =>
      unsafeMakeHub(
        hub,
        HashSet.empty(),
        scope,
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
  scope: Scope.Closeable,
  shutdownHook: Promise<never, void>,
  shutdownFlag: AtomicBoolean,
  strategy: Strategy<A>
): Hub<A> {
  return new UnsafeMakeHubImplementation(
    hub,
    subscribers,
    scope,
    shutdownHook,
    shutdownFlag,
    strategy
  )
}

class UnsafeMakeHubImplementation<A> implements Hub<A> {
  readonly [HubSym]: HubSym = HubSym;
  readonly [QueueSym]: QueueSym = QueueSym;
  readonly [_In]!: (_: A) => void

  capacity: number

  size: UIO<number>

  awaitShutdown: UIO<void>

  shutdown: UIO<void>

  isShutdown: UIO<boolean>

  subscribe: Effect<HasScope, never, Dequeue<A>>

  constructor(
    private hub: AtomicHub<A>,
    private subscribers: HashSet<
      Tuple<[Subscription<A>, MutableQueue<Promise<never, A>>]>
    >,
    scope: Scope.Closeable,
    shutdownHook: Promise<never, void>,
    private shutdownFlag: AtomicBoolean,
    private strategy: Strategy<A>
  ) {
    this.capacity = hub.capacity

    this.size = Effect.suspendSucceed(
      shutdownFlag.get ? Effect.interrupt : Effect.succeed(hub.size())
    )

    this.awaitShutdown = shutdownHook.await()

    this.shutdown = Effect.suspendSucceedWith((_, fiberId) => {
      shutdownFlag.set(true)
      return Effect.whenEffect(
        shutdownHook.succeed(undefined),
        scope.close(Exit.interrupt(fiberId)) > strategy.shutdown
      ).asUnit()
    }).uninterruptible()

    this.isShutdown = Effect.succeed(shutdownFlag.get)

    this.subscribe = Effect.acquireRelease(
      makeSubscription(hub, subscribers, strategy).tap((dequeue) =>
        scope.addFinalizer(dequeue.shutdown)
      ),
      (dequeue) => dequeue.shutdown
    )
  }

  offer(a: A, __tsplusTrace?: string): UIO<boolean> {
    return this.publish(a)
  }

  offerAll(as: Iterable<A>, __tsplusTrace?: string): UIO<boolean> {
    return this.publishAll(as)
  }

  publish(a: A, __tsplusTrace?: string): UIO<boolean> {
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

  publishAll(as: Iterable<A>, __tsplusTrace?: string): UIO<boolean> {
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
