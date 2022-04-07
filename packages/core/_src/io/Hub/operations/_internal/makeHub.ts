import { HubSym } from "@effect/core/io/Hub/definition";
import type { AtomicHub } from "@effect/core/io/Hub/operations/_internal/AtomicHub";
import { makeSubscription } from "@effect/core/io/Hub/operations/_internal/makeSubscription";
import type { Subscription } from "@effect/core/io/Hub/operations/_internal/Subscription";
import { unsafePublishAll } from "@effect/core/io/Hub/operations/_internal/unsafePublishAll";
import type { Strategy } from "@effect/core/io/Hub/operations/strategy";
import { _In, _Out, QueueSym } from "@effect/core/io/Queue/definition";

/**
 * Creates a hub with the specified strategy.
 */
export function makeHub<A>(hub: AtomicHub<A>, strategy: Strategy<A>): UIO<Hub<A>> {
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
  );
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
  return new UnsafeMakeHubImplementation(
    hub,
    subscribers,
    scope,
    shutdownHook,
    shutdownFlag,
    strategy
  );
}

class UnsafeMakeHubImplementation<A> implements Hub<A> {
  readonly [HubSym]: HubSym = HubSym;
  readonly [QueueSym]: QueueSym = QueueSym;
  readonly [_In]!: (_: A) => void;

  capacity: number;

  size: UIO<number>;

  awaitShutdown: UIO<void>;

  shutdown: UIO<void>;

  isShutdown: UIO<boolean>;

  subscribe: Effect<Has<Scope>, never, Dequeue<A>>;

  constructor(
    private hub: AtomicHub<A>,
    private subscribers: MutableHashSet<Tuple<[Subscription<A>, MutableQueue<Deferred<never, A>>]>>,
    scope: Scope.Closeable,
    shutdownHook: Deferred<never, void>,
    private shutdownFlag: AtomicBoolean,
    private strategy: Strategy<A>
  ) {
    this.capacity = hub.capacity;

    this.size = Effect.suspendSucceed(
      shutdownFlag.get ? Effect.interrupt : Effect.succeed(hub.size())
    );

    this.awaitShutdown = shutdownHook.await();

    this.shutdown = Effect.suspendSucceedWith((_, fiberId) => {
      shutdownFlag.set(true);
      return Effect.whenEffect(
        shutdownHook.succeed(undefined),
        scope.close(Exit.interrupt(fiberId)) > strategy.shutdown
      ).asUnit();
    }).uninterruptible();

    this.isShutdown = Effect.succeed(shutdownFlag.get);

    this.subscribe = Effect.acquireRelease(
      makeSubscription(hub, subscribers, strategy).tap((dequeue) => scope.addFinalizer(dequeue.shutdown)),
      (dequeue) => dequeue.shutdown
    );
  }

  offer(a: A, __tsplusTrace?: string): UIO<boolean> {
    return this.publish(a);
  }

  offerAll(as: Collection<A>, __tsplusTrace?: string): UIO<boolean> {
    return this.publishAll(as);
  }

  publish(a: A, __tsplusTrace?: string): UIO<boolean> {
    return Effect.suspendSucceed(() => {
      if (this.shutdownFlag.get) {
        return Effect.interrupt;
      }

      if (this.hub.publish(a)) {
        this.strategy.unsafeCompleteSubscribers(this.hub, this.subscribers);
        return Effect.succeedNow(true);
      }

      return this.strategy.handleSurplus(
        this.hub,
        this.subscribers,
        Chunk.single(a),
        this.shutdownFlag
      );
    });
  }

  publishAll(as: Collection<A>, __tsplusTrace?: string): UIO<boolean> {
    return Effect.suspendSucceed(() => {
      if (this.shutdownFlag.get) {
        return Effect.interrupt;
      }

      const surplus = unsafePublishAll(this.hub, as);

      this.strategy.unsafeCompleteSubscribers(this.hub, this.subscribers);

      if (surplus.isEmpty()) {
        return Effect.succeedNow(true);
      }

      return this.strategy.handleSurplus(
        this.hub,
        this.subscribers,
        surplus,
        this.shutdownFlag
      );
    });
  }
}
