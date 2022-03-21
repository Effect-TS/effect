// ets_tracing: off

import "../Operator/index.js"

import * as AR from "../Collections/Immutable/Array/index.js"
import * as Chunk from "../Collections/Immutable/Chunk/index.js"
import * as Tp from "../Collections/Immutable/Tuple/index.js"
import * as HS from "../Collections/Mutable/HashSet/index.js"
import * as ES from "../Effect/ExecutionStrategy.js"
import * as T from "../Effect/index.js"
import * as Ex from "../Exit/index.js"
import * as F from "../Fiber/index.js"
import { pipe } from "../Function/index.js"
import * as M from "../Managed/index.js"
import * as RM from "../Managed/ReleaseMap/index.js"
import * as P from "../Promise/index.js"
import * as Q from "../Queue/index.js"
import { XQueueInternal } from "../Queue/index.js"
import * as Ref from "../Ref/index.js"
import * as AB from "../Support/AtomicBoolean/index.js"
import * as MQ from "../Support/MutableQueue/index.js"
import type * as InternalHub from "./_internal/Hub.js"
import * as HF from "./_internal/hubFactory.js"
import * as U from "./_internal/unsafe.js"
import * as PR from "./primitives.js"
import * as S from "./Strategy.js"

export type HubDequeue<R, E, A> = Q.XQueue<never, R, unknown, E, never, A>

export type HubEnqueue<R, E, A> = Q.XQueue<R, never, E, unknown, A, never>

export type Hub<A> = XHub<unknown, unknown, never, never, A, A>

export const HubTypeId = Symbol()

/**
 * A `Hub<RA, RB, EA, EB, A, B>` is an asynchronous message hub. Publishers
 * can publish messages of type `A` to the hub and subscribers can subscribe to
 * take messages of type `B` from the hub. Publishing messages can require an
 * environment of type `RA` and fail with an error of type `EA`. Taking
 * messages can require an environment of type `RB` and fail with an error of
 * type `EB`.
 */
export interface XHub<RA, RB, EA, EB, A, B> {
  readonly typeId: typeof HubTypeId

  readonly [PR._RA]: (_: RA) => void
  readonly [PR._RB]: (_: RB) => void
  readonly [PR._EA]: () => EA
  readonly [PR._EB]: () => EB
  readonly [PR._A]: (_: A) => void
  readonly [PR._B]: () => B
}

export abstract class XHubInternal<RA, RB, EA, EB, A, B>
  implements XHub<RA, RB, EA, EB, A, B>
{
  readonly typeId: typeof HubTypeId = HubTypeId;

  readonly [PR._RA]!: (_: RA) => void;
  readonly [PR._RB]!: (_: RB) => void;
  readonly [PR._EA]!: () => EA;
  readonly [PR._EB]!: () => EB;
  readonly [PR._A]!: (_: A) => void;
  readonly [PR._B]!: () => B

  /**
   * Waits for the hub to be shut down.
   */
  abstract awaitShutdown: T.UIO<void>

  /**
   * The maximum capacity of the hub.
   */
  abstract capacity: number

  /**
   * Checks whether the hub is shut down.
   */
  abstract isShutdown: T.UIO<boolean>

  /**
   * Publishes a message to the hub, returning whether the message was
   * published to the hub.
   */
  abstract publish(a: A): T.Effect<RA, EA, boolean>

  /**
   * Publishes all of the specified messages to the hub, returning whether
   * they were published to the hub.
   */
  abstract publishAll(as: Iterable<A>): T.Effect<RA, EA, boolean>

  /**
   * Shuts down the hub.
   */
  abstract shutdown: T.UIO<void>

  /**
   * The current number of messages in the hub.
   */
  abstract size: T.UIO<number>

  /**
   * Subscribes to receive messages from the hub. The resulting subscription
   * can be evaluated multiple times within the scope of the managed to take a
   * message from the hub each time.
   */
  abstract subscribe: M.Managed<unknown, never, HubDequeue<RB, EB, B>>
}

/**
 * @ets_optimize remove
 */
export function concrete<RA, RB, EA, EB, A, B>(
  _: XHub<RA, RB, EA, EB, A, B>
): asserts _ is XHubInternal<RA, RB, EA, EB, A, B> {
  //
}

/**
 * Waits for the hub to be shut down.
 */
export function awaitShutdown<RA, RB, EA, EB, A, B>(
  self: XHub<RA, RB, EA, EB, A, B>
): T.UIO<void> {
  concrete(self)
  return self.awaitShutdown
}

/**
 * The maximum capacity of the hub.
 */
export function capacity<RA, RB, EA, EB, A, B>(
  self: XHub<RA, RB, EA, EB, A, B>
): number {
  concrete(self)
  return self.capacity
}

/**
 * Checks whether the hub is shut down.
 */
export function isShutdown<RA, RB, EA, EB, A, B>(
  self: XHub<RA, RB, EA, EB, A, B>
): T.UIO<boolean> {
  concrete(self)
  return self.isShutdown
}

/**
 * Publishes a message to the hub, returning whether the message was
 * published to the hub.
 */
export function publish_<RA, RB, EA, EB, A, B>(
  self: XHub<RA, RB, EA, EB, A, B>,
  a: A
): T.Effect<RA, EA, boolean> {
  concrete(self)
  return self.publish(a)
}

/**
 * Publishes a message to the hub, returning whether the message was
 * published to the hub.
 *
 * @ets_data_first publish_
 */
export function publish<A>(a: A) {
  return <RA, RB, EA, EB, B>(self: XHub<RA, RB, EA, EB, A, B>) => publish_(self, a)
}

/**
 * Publishes all of the specified messages to the hub, returning whether
 * they were published to the hub.
 */
export function publishAll_<RA, RB, EA, EB, A, B>(
  self: XHub<RA, RB, EA, EB, A, B>,
  as: Iterable<A>
): T.Effect<RA, EA, boolean> {
  concrete(self)
  return self.publishAll(as)
}

/**
 * Publishes all of the specified messages to the hub, returning whether
 * they were published to the hub.
 *
 * @ets_data_first publishAll_
 */
export function publishAll<A>(as: Iterable<A>) {
  return <RA, RB, EA, EB, B>(self: XHub<RA, RB, EA, EB, A, B>) => publishAll_(self, as)
}

/**
 * Shuts down the hub.
 */
export function shutdown<RA, RB, EA, EB, A, B>(
  self: XHub<RA, RB, EA, EB, A, B>
): T.UIO<void> {
  concrete(self)
  return self.shutdown
}

/**
 * The current number of messages in the hub.
 */
export function size<RA, RB, EA, EB, A, B>(
  self: XHub<RA, RB, EA, EB, A, B>
): T.UIO<number> {
  concrete(self)
  return self.size
}

/**
 * Subscribes to receive messages from the hub. The resulting subscription
 * can be evaluated multiple times within the scope of the managed to take a
 * message from the hub each time.
 */
export function subscribe<RA, RB, EA, EB, A, B>(
  self: XHub<RA, RB, EA, EB, A, B>
): M.Managed<unknown, never, HubDequeue<RB, EB, B>> {
  concrete(self)
  return self.subscribe
}

/**
 * Transforms messages published to the hub using the specified effectual
 * function.
 */
export function contramapM_<RA, RB, RC, EA, EB, EC, A, B, C>(
  self: XHub<RA, RB, EA, EB, A, B>,
  f: (c: C) => T.Effect<RC, EC, A>
): XHub<RC & RA, RB, EA | EC, EB, C, B> {
  return dimapM_(self, f, T.succeed)
}

/**
 * Transforms messages published to the hub using the specified effectual
 * function.
 *
 * @ets_data_first contramapM_
 */
export function contramapM<RC, EC, A, C>(f: (c: C) => T.Effect<RC, EC, A>) {
  return <RA, RB, EA, EB, B>(self: XHub<RA, RB, EA, EB, A, B>) => contramapM_(self, f)
}

/**
 * Transforms messages published to and taken from the hub using the
 * specified functions.
 */
export function dimap_<RA, RB, EA, EB, A, B, C, D>(
  self: XHub<RA, RB, EA, EB, A, B>,
  f: (c: C) => A,
  g: (b: B) => D
): XHub<RA, RB, EA, EB, C, D> {
  return dimapM_(
    self,
    (c) => T.succeed(f(c)),
    (b) => T.succeed(g(b))
  )
}

/**
 * Transforms messages published to and taken from the hub using the
 * specified functions.
 *
 * @ets_data_first dimap_
 */
export function dimap<A, B, C, D>(f: (c: C) => A, g: (b: B) => D) {
  return <RA, RB, EA, EB>(self: XHub<RA, RB, EA, EB, A, B>) => dimap_(self, f, g)
}

class DimapMImplementation<
  RA,
  RB,
  RC,
  RD,
  EA,
  EB,
  EC,
  ED,
  A,
  B,
  C,
  D
> extends XHubInternal<RC & RA, RD & RB, EA | EC, EB | ED, C, D> {
  awaitShutdown: T.UIO<void>
  capacity: number
  isShutdown: T.UIO<boolean>
  shutdown: T.UIO<void>
  size: T.UIO<number>
  subscribe: M.Managed<unknown, never, HubDequeue<RD & RB, ED | EB, D>>

  constructor(
    readonly source: XHubInternal<RA, RB, EA, EB, A, B>,
    readonly f: (c: C) => T.Effect<RC, EC, A>,
    g: (b: B) => T.Effect<RD, ED, D>
  ) {
    super()
    this.awaitShutdown = source.awaitShutdown
    this.capacity = source.capacity
    this.isShutdown = source.isShutdown
    this.shutdown = source.shutdown
    this.size = source.size
    this.subscribe = M.map_(source.subscribe, Q.mapM(g))
  }

  publish(c: C) {
    return T.chain_(this.f(c), (a) => this.source.publish(a))
  }

  publishAll(cs: Iterable<C>) {
    return T.chain_(T.forEach_(cs, this.f), (as) => this.source.publishAll(as))
  }
}

/**
 * Transforms messages published to and taken from the hub using the
 * specified effectual functions.
 */
export function dimapM_<RA, RB, RC, RD, EA, EB, EC, ED, A, B, C, D>(
  self: XHub<RA, RB, EA, EB, A, B>,
  f: (c: C) => T.Effect<RC, EC, A>,
  g: (b: B) => T.Effect<RD, ED, D>
): XHub<RC & RA, RD & RB, EA | EC, EB | ED, C, D> {
  concrete(self)
  return new DimapMImplementation(self, f, g)
}

/**
 * Transforms messages published to and taken from the hub using the
 * specified effectual functions.
 *
 * @ets_data_first dimapM_
 */
export function dimapM<A, B, C, D, EC, ED, RC, RD>(
  f: (c: C) => T.Effect<RC, EC, A>,
  g: (b: B) => T.Effect<RD, ED, D>
) {
  return <RA, RB, EA, EB>(self: XHub<RA, RB, EA, EB, A, B>) => dimapM_(self, f, g)
}

class filterInputMImplementation<RA, RA1, RB, EA, EA1, EB, A, B> extends XHubInternal<
  RA & RA1,
  RB,
  EA | EA1,
  EB,
  A,
  B
> {
  awaitShutdown: T.UIO<void>
  capacity: number
  isShutdown: T.UIO<boolean>
  shutdown: T.UIO<void>
  size: T.UIO<number>
  subscribe: M.Managed<unknown, never, HubDequeue<RB, EB, B>>

  constructor(
    readonly source: XHubInternal<RA, RB, EA, EB, A, B>,
    readonly f: (a: A) => T.Effect<RA1, EA1, boolean>
  ) {
    super()
    this.awaitShutdown = source.awaitShutdown
    this.capacity = source.capacity
    this.isShutdown = source.isShutdown
    this.shutdown = source.shutdown
    this.size = source.size
    this.subscribe = source.subscribe
  }

  publish(a: A) {
    return T.chain_(this.f(a), (b) => (b ? this.source.publish(a) : T.succeed(false)))
  }

  publishAll(as: Iterable<A>) {
    return T.chain_(T.filter_(as, this.f), (as) =>
      AR.isNonEmpty(as) ? this.source.publishAll(as) : T.succeed(false)
    )
  }
}

/**
 * Filters messages published to the hub using the specified function.
 */
export function filterInput_<RA, RB, EA, EB, A, B>(
  self: XHub<RA, RB, EA, EB, A, B>,
  f: (a: A) => boolean
) {
  return filterInputM_(self, (a) => T.succeed(f(a)))
}

/**
 * Filters messages published to the hub using the specified function.
 *
 * @ets_data_first filterInput_
 */
export function filterInput<A>(f: (a: A) => boolean) {
  return <RA, RB, EA, EB, B>(self: XHub<RA, RB, EA, EB, A, B>) => filterInput_(self, f)
}

/**
 * Filters messages published to the hub using the specified effectual
 * function.
 */
export function filterInputM_<RA, RA1, RB, EA, EA1, EB, A, B>(
  self: XHub<RA, RB, EA, EB, A, B>,
  f: (a: A) => T.Effect<RA1, EA1, boolean>
): XHub<RA & RA1, RB, EA | EA1, EB, A, B> {
  concrete(self)
  return new filterInputMImplementation(self, f)
}

/**
 * Filters messages published to the hub using the specified effectual
 * function.
 *
 * @ets_data_first filterInputM_
 */
export function filterInputM<RA1, EA1, A>(f: (a: A) => T.Effect<RA1, EA1, boolean>) {
  return <RA, RB, EA, EB, B>(self: XHub<RA, RB, EA, EB, A, B>) => filterInputM_(self, f)
}

/**
 * Filters messages taken from the hub using the specified function.
 */
export function filterOutput_<RA, RB, EA, EB, A, B>(
  self: XHub<RA, RB, EA, EB, A, B>,
  f: (b: B) => boolean
): XHub<RA, RB, EA, EB, A, B> {
  return filterOutputM_(self, (b) => T.succeed(f(b)))
}

/**
 * Filters messages taken from the hub using the specified function.
 *
 * @ets_data_first filterOutput_
 */
export function filterOutput<B>(f: (b: B) => boolean) {
  return <RA, RB, EA, EB, A>(self: XHub<RA, RB, EA, EB, A, B>) => filterOutput_(self, f)
}

class filterOutputMImplementation<RA, RB, RB1, EA, EB, EB1, A, B> extends XHubInternal<
  RA,
  RB & RB1,
  EA,
  EB | EB1,
  A,
  B
> {
  awaitShutdown: T.UIO<void>
  capacity: number
  isShutdown: T.UIO<boolean>
  shutdown: T.UIO<void>
  size: T.UIO<number>
  subscribe: M.Managed<unknown, never, HubDequeue<RB & RB1, EB | EB1, B>>

  constructor(
    readonly source: XHubInternal<RA, RB, EA, EB, A, B>,
    readonly f: (b: B) => T.Effect<RB1, EB1, boolean>
  ) {
    super()
    this.awaitShutdown = source.awaitShutdown
    this.capacity = source.capacity
    this.isShutdown = source.isShutdown
    this.shutdown = source.shutdown
    this.size = source.size
    this.subscribe = M.map_(source.subscribe, Q.filterOutputM(f))
  }

  publish(a: A) {
    return this.source.publish(a)
  }

  publishAll(as: Iterable<A>) {
    return this.source.publishAll(as)
  }
}

/**
 * Filters messages taken from the hub using the specified effectual
 * function.
 */
export function filterOutputM_<RA, RB, RB1, EA, EB, EB1, A, B>(
  self: XHub<RA, RB, EA, EB, A, B>,
  f: (a: B) => T.Effect<RB1, EB1, boolean>
): XHub<RA, RB & RB1, EA, EB | EB1, A, B> {
  concrete(self)
  return new filterOutputMImplementation(self, f)
}

/**
 * Filters messages taken from the hub using the specified effectual
 * function.
 *
 * @ets_data_first filterOutputM_
 */
export function filterOutputM<RB1, EB1, B>(f: (a: B) => T.Effect<RB1, EB1, boolean>) {
  return <RA, RB, EA, EB, A>(self: XHub<RA, RB, EA, EB, A, B>) =>
    filterOutputM_(self, f)
}

/**
 * Transforms messages taken from the hub using the specified function.
 */
export function map_<RA, RB, EA, EB, A, B, C>(
  self: XHub<RA, RB, EA, EB, A, B>,
  f: (b: B) => C
): XHub<RA, RB, EA, EB, A, C> {
  return mapM_(self, (b) => T.succeed(f(b)))
}

/**
 * Transforms messages taken from the hub using the specified function.
 *
 * @ets_data_first map_
 */
export function map<B, C>(f: (b: B) => C) {
  return <RA, RB, EA, EB, A>(self: XHub<RA, RB, EA, EB, A, B>) => map_(self, f)
}

/**
 * Transforms messages taken from the hub using the specified effectual
 * function.
 */
export function mapM_<RA, RB, RC, EA, EB, EC, A, B, C>(
  self: XHub<RA, RB, EA, EB, A, B>,
  f: (b: B) => T.Effect<RC, EC, C>
): XHub<RA, RC & RB, EA, EB | EC, A, C> {
  return dimapM_(self, (a) => T.succeed<A>(a), f)
}

/**
 * Transforms messages taken from the hub using the specified effectual
 * function.
 *
 * @ets_data_first mapM_
 */
export function mapM<B, C, EC, RC>(f: (b: B) => T.Effect<RC, EC, C>) {
  return <A, EA, EB, RA, RB>(self: XHub<RA, RB, EA, EB, A, B>) => mapM_(self, f)
}

class ToQueueImplementation<RA, RB, EA, EB, A, B> extends XQueueInternal<
  RA,
  never,
  EA,
  unknown,
  A,
  never
> {
  awaitShutdown: T.UIO<void>
  capacity: number
  isShutdown: T.UIO<boolean>
  shutdown: T.UIO<void>
  size: T.UIO<number>
  take: T.Effect<unknown, never, never>
  takeAll: T.Effect<unknown, never, Chunk.Chunk<never>>

  constructor(readonly source: XHubInternal<RA, RB, EA, EB, A, B>) {
    super()
    this.awaitShutdown = source.awaitShutdown
    this.capacity = source.capacity
    this.isShutdown = source.isShutdown
    this.shutdown = source.shutdown
    this.size = source.size
    this.take = T.never
    this.takeAll = T.succeed(Chunk.empty())
  }

  offer(a: A): T.Effect<RA, EA, boolean> {
    return this.source.publish(a)
  }

  offerAll(as: Iterable<A>): T.Effect<RA, EA, boolean> {
    return this.source.publishAll(as)
  }

  takeUpTo(): T.Effect<unknown, never, Chunk.Chunk<never>> {
    return T.succeed(Chunk.empty())
  }
}

/**
 * Views the hub as a queue that can only be written to.
 */
export function toQueue<RA, RB, EA, EB, A, B>(
  self: XHub<RA, RB, EA, EB, A, B>
): HubEnqueue<RA, EA, A> {
  concrete(self)
  return new ToQueueImplementation(self)
}

/**
 * Creates a bounded hub with the back pressure strategy. The hub will retain
 * messages until they have been taken by all subscribers, applying back
 * pressure to publishers if the hub is at capacity.
 *
 * For best performance use capacities that are powers of two.
 */
export function makeBounded<A>(requestedCapacity: number): T.UIO<Hub<A>> {
  return T.chain_(
    T.succeedWith(() => HF.makeBounded<A>(requestedCapacity)),
    (_) => makeHub(_, new S.BackPressure())
  )
}

/**
 * Creates a bounded hub with the back pressure strategy. The hub will retain
 * messages until they have been taken by all subscribers, applying back
 * pressure to publishers if the hub is at capacity.
 *
 * For best performance use capacities that are powers of two.
 */
export function unsafeMakeBounded<A>(requestedCapacity: number): Hub<A> {
  const releaseMap = new RM.ReleaseMap(
    Ref.unsafeMakeRef<RM.State>(new RM.Running(0, new Map()))
  )

  return unsafeMakeHub(
    HF.makeBounded<A>(requestedCapacity),
    makeSubscribersHashSet<A>(),
    releaseMap,
    P.unsafeMake<never, void>(F.None),
    new AB.AtomicBoolean(false),
    new S.BackPressure()
  )
}

/**
 * Creates a bounded hub with the dropping strategy. The hub will drop new
 * messages if the hub is at capacity.
 *
 * For best performance use capacities that are powers of two.
 */
export function makeDropping<A>(requestedCapacity: number): T.UIO<Hub<A>> {
  return T.chain_(
    T.succeedWith(() => {
      return HF.makeBounded<A>(requestedCapacity)
    }),
    (_) => makeHub(_, new S.Dropping())
  )
}

/**
 * Creates a bounded hub with the dropping strategy. The hub will drop new
 * messages if the hub is at capacity.
 *
 * For best performance use capacities that are powers of two.
 */
export function unsafeMakeDropping<A>(requestedCapacity: number): Hub<A> {
  const releaseMap = new RM.ReleaseMap(
    Ref.unsafeMakeRef<RM.State>(new RM.Running(0, new Map()))
  )

  return unsafeMakeHub(
    HF.makeBounded<A>(requestedCapacity),
    makeSubscribersHashSet<A>(),
    releaseMap,
    P.unsafeMake<never, void>(F.None),
    new AB.AtomicBoolean(false),
    new S.Dropping()
  )
}

/**
 * Creates a bounded hub with the sliding strategy. The hub will add new
 * messages and drop old messages if the hub is at capacity.
 *
 * For best performance use capacities that are powers of two.
 */
export function makeSliding<A>(requestedCapacity: number): T.UIO<Hub<A>> {
  return T.chain_(
    T.succeedWith(() => {
      return HF.makeBounded<A>(requestedCapacity)
    }),
    (_) => makeHub(_, new S.Sliding())
  )
}

/**
 * Creates a bounded hub with the sliding strategy. The hub will add new
 * messages and drop old messages if the hub is at capacity.
 *
 * For best performance use capacities that are powers of two.
 */
export function unsafeMakeSliding<A>(requestedCapacity: number): Hub<A> {
  const releaseMap = new RM.ReleaseMap(
    Ref.unsafeMakeRef<RM.State>(new RM.Running(0, new Map()))
  )

  return unsafeMakeHub(
    HF.makeBounded<A>(requestedCapacity),
    makeSubscribersHashSet<A>(),
    releaseMap,
    P.unsafeMake<never, void>(F.None),
    new AB.AtomicBoolean(false),
    new S.Sliding()
  )
}

/**
 * Creates an unbounded hub.
 */
export function makeUnbounded<A>(): T.UIO<Hub<A>> {
  return T.chain_(
    T.succeedWith(() => {
      return HF.makeUnbounded<A>()
    }),
    (_) => makeHub(_, new S.Dropping())
  )
}

/**
 * Creates an unbounded hub.
 */
export function unsafeMakeUnbounded<A>(): Hub<A> {
  const releaseMap = new RM.ReleaseMap(
    Ref.unsafeMakeRef<RM.State>(new RM.Running(0, new Map()))
  )

  return unsafeMakeHub(
    HF.makeUnbounded<A>(),
    makeSubscribersHashSet<A>(),
    releaseMap,
    P.unsafeMake<never, void>(F.None),
    new AB.AtomicBoolean(false),
    new S.Dropping()
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
  awaitShutdown: T.UIO<void>
  capacity: number
  isShutdown: T.UIO<boolean>
  shutdown: T.UIO<void>
  size: T.UIO<number>
  subscribe: M.Managed<unknown, never, HubDequeue<unknown, never, A>>

  constructor(
    private hub: InternalHub.Hub<A>,
    private subscribers: HS.HashSet<
      Tp.Tuple<[InternalHub.Subscription<A>, MQ.MutableQueue<P.Promise<never, A>>]>
    >,
    releaseMap: RM.ReleaseMap,
    shutdownHook: P.Promise<never, void>,
    private shutdownFlag: AB.AtomicBoolean,
    private strategy: S.Strategy<A>
  ) {
    super()
    this.awaitShutdown = P.await(shutdownHook)
    this.capacity = hub.capacity
    this.isShutdown = T.succeedWith(() => shutdownFlag.get)
    this.shutdown = T.uninterruptible(
      T.suspend((_, fiberId) => {
        shutdownFlag.set(true)

        return T.asUnit(
          T.whenM_(
            T.zipRight_(
              RM.releaseAll(Ex.interrupt(fiberId), ES.parallel)(releaseMap),
              strategy.shutdown
            ),
            P.succeed_(shutdownHook, undefined)
          )
        )
      })
    )

    this.size = T.suspend(() => {
      if (shutdownFlag.get) {
        return T.interrupt
      }

      return T.succeed(hub.size())
    })

    this.subscribe = pipe(
      M.do,
      M.bind("dequeue", () =>
        T.toManaged(makeSubscription(hub, subscribers, strategy))
      ),
      M.tap(({ dequeue }) =>
        M.makeExit_(RM.add((_) => Q.shutdown(dequeue))(releaseMap), (finalizer, exit) =>
          finalizer(exit)
        )
      ),
      M.map(({ dequeue }) => dequeue)
    )
  }

  publish(a: A): T.Effect<unknown, never, boolean> {
    return T.suspend(() => {
      if (this.shutdownFlag.get) {
        return T.interrupt
      }

      if (this.hub.publish(a)) {
        this.strategy.unsafeCompleteSubscribers(this.hub, this.subscribers)
        return T.succeed(true)
      }

      return this.strategy.handleSurplus(
        this.hub,
        this.subscribers,
        Chunk.single(a),
        this.shutdownFlag
      )
    })
  }

  publishAll(as: Iterable<A>): T.Effect<unknown, never, boolean> {
    return T.suspend(() => {
      if (this.shutdownFlag.get) {
        return T.interrupt
      }

      const surplus = U.unsafePublishAll(this.hub, as)

      this.strategy.unsafeCompleteSubscribers(this.hub, this.subscribers)

      if (Chunk.isEmpty(surplus)) {
        return T.succeed(true)
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

function makeHub<A>(hub: InternalHub.Hub<A>, strategy: S.Strategy<A>): T.UIO<Hub<A>> {
  return T.chain_(RM.makeReleaseMap, (releaseMap) => {
    return T.map_(P.make<never, void>(), (promise) => {
      return unsafeMakeHub(
        hub,
        makeSubscribersHashSet<A>(),
        releaseMap,
        promise,
        new AB.AtomicBoolean(false),
        strategy
      )
    })
  })
}

/**
 * Unsafely creates a hub with the specified strategy.
 */
function unsafeMakeHub<A>(
  hub: InternalHub.Hub<A>,
  subscribers: HS.HashSet<
    Tp.Tuple<[InternalHub.Subscription<A>, MQ.MutableQueue<P.Promise<never, A>>]>
  >,
  releaseMap: RM.ReleaseMap,
  shutdownHook: P.Promise<never, void>,
  shutdownFlag: AB.AtomicBoolean,
  strategy: S.Strategy<A>
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

/**
 * Creates a subscription with the specified strategy.
 */
function makeSubscription<A>(
  hub: InternalHub.Hub<A>,
  subscribers: HS.HashSet<
    Tp.Tuple<[InternalHub.Subscription<A>, MQ.MutableQueue<P.Promise<never, A>>]>
  >,
  strategy: S.Strategy<A>
): T.UIO<Q.Dequeue<A>> {
  return T.map_(P.make<never, void>(), (promise) => {
    return unsafeMakeSubscription(
      hub,
      subscribers,
      hub.subscribe(),
      new MQ.Unbounded<P.Promise<never, A>>(),
      promise,
      new AB.AtomicBoolean(false),
      strategy
    )
  })
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
    private hub: InternalHub.Hub<A>,
    private subscribers: HS.HashSet<
      Tp.Tuple<[InternalHub.Subscription<A>, MQ.MutableQueue<P.Promise<never, A>>]>
    >,
    private subscription: InternalHub.Subscription<A>,
    private pollers: MQ.MutableQueue<P.Promise<never, A>>,
    private shutdownHook: P.Promise<never, void>,
    private shutdownFlag: AB.AtomicBoolean,
    private strategy: S.Strategy<A>
  ) {
    super()
  }

  awaitShutdown: T.UIO<void> = P.await(this.shutdownHook)

  capacity: number = this.hub.capacity

  isShutdown: T.UIO<boolean> = T.succeedWith(() => this.shutdownFlag.get)

  shutdown: T.UIO<void> = T.uninterruptible(
    T.suspend((_, fiberId) => {
      this.shutdownFlag.set(true)

      return T.asUnit(
        T.whenM_(
          T.zipRight_(
            T.forEachPar_(U.unsafePollAllQueue(this.pollers), (_) => {
              return P.interruptAs(fiberId)(_)
            }),
            T.succeedWith(() => this.subscription.unsubscribe())
          ),
          P.succeed_(this.shutdownHook, undefined)
        )
      )
    })
  )

  size: T.UIO<number> = T.suspend(() => {
    if (this.shutdownFlag.get) {
      return T.interrupt
    }

    return T.succeed(this.subscription.size())
  })

  offer(_: never): T.Effect<never, unknown, boolean> {
    return T.succeed(false)
  }

  offerAll(_: Iterable<never>): T.Effect<never, unknown, boolean> {
    return T.succeed(false)
  }

  take: T.Effect<unknown, never, A> = T.suspend((_, fiberId) => {
    if (this.shutdownFlag.get) {
      return T.interrupt
    }

    const message = this.pollers.isEmpty
      ? this.subscription.poll(MQ.EmptyQueue)
      : MQ.EmptyQueue

    if (message === MQ.EmptyQueue) {
      const promise = P.unsafeMake<never, A>(fiberId)

      return T.onInterrupt_(
        T.suspend(() => {
          this.pollers.offer(promise)

          this.subscribers.add(Tp.tuple(this.subscription, this.pollers))
          this.strategy.unsafeCompletePollers(
            this.hub,
            this.subscribers,
            this.subscription,
            this.pollers
          )

          if (this.shutdownFlag.get) {
            return T.interrupt
          } else {
            return P.await(promise)
          }
        }),
        () =>
          T.succeedWith(() => {
            U.unsafeRemove(this.pollers, promise)
          })
      )
    } else {
      this.strategy.unsafeOnHubEmptySpace(this.hub, this.subscribers)
      return T.succeed(message)
    }
  })

  takeAll: T.Effect<unknown, never, Chunk.Chunk<A>> = T.suspend(() => {
    if (this.shutdownFlag.get) {
      return T.interrupt
    }

    const as = this.pollers.isEmpty
      ? U.unsafePollAllSubscription(this.subscription)
      : Chunk.empty<A>()

    this.strategy.unsafeOnHubEmptySpace(this.hub, this.subscribers)

    return T.succeed(as)
  })

  takeUpTo(n: number): T.Effect<unknown, never, Chunk.Chunk<A>> {
    return T.suspend(() => {
      if (this.shutdownFlag.get) {
        return T.interrupt
      }

      const as = this.pollers.isEmpty
        ? U.unsafePollN(this.subscription, n)
        : Chunk.empty<A>()

      this.strategy.unsafeOnHubEmptySpace(this.hub, this.subscribers)
      return T.succeed(as)
    })
  }
}

/**
 * Unsafely creates a subscription with the specified strategy.
 */
function unsafeMakeSubscription<A>(
  hub: InternalHub.Hub<A>,
  subscribers: HS.HashSet<
    Tp.Tuple<[InternalHub.Subscription<A>, MQ.MutableQueue<P.Promise<never, A>>]>
  >,
  subscription: InternalHub.Subscription<A>,
  pollers: MQ.MutableQueue<P.Promise<never, A>>,
  shutdownHook: P.Promise<never, void>,
  shutdownFlag: AB.AtomicBoolean,
  strategy: S.Strategy<A>
): Q.Dequeue<A> {
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

function makeSubscribersHashSet<A>(): HS.HashSet<
  Tp.Tuple<[InternalHub.Subscription<A>, MQ.MutableQueue<P.Promise<never, A>>]>
> {
  return HS.make<
    Tp.Tuple<[InternalHub.Subscription<A>, MQ.MutableQueue<P.Promise<never, A>>]>
  >()
}
