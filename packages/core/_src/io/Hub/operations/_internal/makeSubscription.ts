import type { AtomicHub } from "@effect-ts/core/io/Hub/operations/_internal/AtomicHub";
import type { Subscription } from "@effect-ts/core/io/Hub/operations/_internal/Subscription";
import { unsafePollAllSubscription } from "@effect-ts/core/io/Hub/operations/_internal/unsafePollAllSubscription";
import { unsafePollN } from "@effect-ts/core/io/Hub/operations/_internal/unsafePollN";
import { unsafeRemove } from "@effect-ts/core/io/Hub/operations/_internal/unsafeRemove";
import type { Strategy } from "@effect-ts/core/io/Hub/operations/strategy";
import { _In, _Out, QueueSym } from "@effect-ts/core/io/Queue/definition";
import { unsafePollAll } from "@effect-ts/core/io/Queue/operations/_internal/unsafePollAll";

/**
 * Creates a subscription with the specified strategy.
 */
export function makeSubscription<A>(
  hub: AtomicHub<A>,
  subscribers: HashSet<Tuple<[Subscription<A>, MutableQueue<Deferred<never, A>>]>>,
  strategy: Strategy<A>
): UIO<Dequeue<A>> {
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
  );
}

/**
 * Unsafely creates a subscription with the specified strategy.
 */
export function unsafeMakeSubscription<A>(
  hub: AtomicHub<A>,
  subscribers: HashSet<Tuple<[Subscription<A>, MutableQueue<Deferred<never, A>>]>>,
  subscription: Subscription<A>,
  pollers: MutableQueue<Deferred<never, A>>,
  shutdownHook: Deferred<never, void>,
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
  );
}

class UnsafeMakeSubscriptionImplementation<A> implements Dequeue<A> {
  readonly [QueueSym]: QueueSym = QueueSym;
  readonly [_Out]!: () => A;

  constructor(
    private hub: AtomicHub<A>,
    private subscribers: HashSet<
      Tuple<[Subscription<A>, MutableQueue<Deferred<never, A>>]>
    >,
    private subscription: Subscription<A>,
    private pollers: MutableQueue<Deferred<never, A>>,
    private shutdownHook: Deferred<never, void>,
    private shutdownFlag: AtomicBoolean,
    private strategy: Strategy<A>
  ) {}

  capacity: number = this.hub.capacity;

  size: UIO<number> = Effect.suspendSucceed(
    this.shutdownFlag.get
      ? Effect.interrupt
      : Effect.succeedNow(this.subscription.size())
  );

  awaitShutdown: UIO<void> = this.shutdownHook.await();

  isShutdown: UIO<boolean> = Effect.succeed(this.shutdownFlag.get);

  shutdown: UIO<void> = Effect.suspendSucceedWith((_, fiberId) => {
    this.shutdownFlag.set(true);
    return Effect.whenEffect(
      this.shutdownHook.succeed(undefined),
      Effect.forEachPar(unsafePollAll(this.pollers), (deferred) => deferred.interruptAs(fiberId)) >
        Effect.succeed(this.subscription.unsubscribe()) >
        Effect.succeed(this.strategy.unsafeOnHubEmptySpace(this.hub, this.subscribers))
    ).asUnit();
  }).uninterruptible();

  offer(_: never, __tsplusTrace?: string): UIO<boolean> {
    return Effect.succeedNow(false);
  }

  offerAll(_: Collection<never>, __tsplusTrace?: string): UIO<boolean> {
    return Effect.succeedNow(false);
  }

  take: UIO<A> = Effect.suspendSucceedWith((_, fiberId) => {
    if (this.shutdownFlag.get) {
      return Effect.interrupt;
    }

    const message = this.pollers.isEmpty
      ? this.subscription.poll(EmptyMutableQueue)
      : EmptyMutableQueue;

    if (message === EmptyMutableQueue) {
      const deferred = Deferred.unsafeMake<never, A>(fiberId);

      return Effect.suspendSucceed(() => {
        this.pollers.offer(deferred);
        this.subscribers.add(Tuple(this.subscription, this.pollers));
        this.strategy.unsafeCompletePollers(
          this.hub,
          this.subscribers,
          this.subscription,
          this.pollers
        );
        return this.shutdownFlag.get ? Effect.interrupt : deferred.await();
      }).onInterrupt(() => Effect.succeed(unsafeRemove(this.pollers, deferred)));
    } else {
      this.strategy.unsafeOnHubEmptySpace(this.hub, this.subscribers);
      return Effect.succeedNow(message);
    }
  });

  takeAll: UIO<Chunk<A>> = Effect.suspendSucceed(() => {
    if (this.shutdownFlag.get) {
      return Effect.interrupt;
    }

    const as = this.pollers.isEmpty
      ? unsafePollAllSubscription(this.subscription)
      : Chunk.empty<A>();

    this.strategy.unsafeOnHubEmptySpace(this.hub, this.subscribers);

    return Effect.succeedNow(as);
  });

  takeUpTo(n: number): UIO<Chunk<A>> {
    return Effect.suspendSucceed(() => {
      if (this.shutdownFlag.get) {
        return Effect.interrupt;
      }

      const as = this.pollers.isEmpty
        ? unsafePollN(this.subscription, n)
        : Chunk.empty<A>();

      this.strategy.unsafeOnHubEmptySpace(this.hub, this.subscribers);
      return Effect.succeedNow(as);
    });
  }
}
