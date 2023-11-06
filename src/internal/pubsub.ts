import * as Chunk from "../Chunk.js"
import type * as Deferred from "../Deferred.js"
import type * as Effect from "../Effect.js"
import { dual, pipe } from "../Function.js"
import * as MutableQueue from "../MutableQueue.js"
import * as MutableRef from "../MutableRef.js"
import * as Option from "../Option.js"
import { pipeArguments } from "../Pipeable.js"
import type * as PubSub from "../PubSub.js"
import type * as Queue from "../Queue.js"
import type * as Scope from "../Scope.js"
import * as cause from "./cause.js"
import * as core from "./core.js"
import * as executionStrategy from "./executionStrategy.js"
import * as fiberRuntime from "./fiberRuntime.js"
import * as queue from "./queue.js"

/** @internal */
export interface AtomicPubSub<A> {
  readonly capacity: number
  isEmpty(): boolean
  isFull(): boolean
  size(): number
  publish(value: A): boolean
  publishAll(elements: Iterable<A>): Chunk.Chunk<A>
  slide(): void
  subscribe(): Subscription<A>
}

/** @internal */
interface Subscription<A> {
  isEmpty(): boolean
  size(): number
  poll<D>(default_: D): A | D
  pollUpTo(n: number): Chunk.Chunk<A>
  unsubscribe(): void
}

/** @internal */
type Subscribers<A> = Map<
  Subscription<A>,
  Set<MutableQueue.MutableQueue<Deferred.Deferred<never, A>>>
>

const addSubscribers = <A>(
  subscription: Subscription<A>,
  pollers: MutableQueue.MutableQueue<Deferred.Deferred<never, A>>
) =>
(subscribers: Subscribers<A>) => {
  if (!subscribers.has(subscription)) {
    subscribers.set(subscription, new Set())
  }
  const set = subscribers.get(subscription)!
  set.add(pollers)
}

const removeSubscribers = <A>(
  subscription: Subscription<A>,
  pollers: MutableQueue.MutableQueue<Deferred.Deferred<never, A>>
) =>
(subscribers: Subscribers<A>) => {
  if (!subscribers.has(subscription)) {
    return
  }
  const set = subscribers.get(subscription)!
  set.delete(pollers)
  if (set.size === 0) {
    subscribers.delete(subscription)
  }
}

/** @internal */
export const bounded = <A>(requestedCapacity: number): Effect.Effect<never, never, PubSub.PubSub<A>> =>
  pipe(
    core.sync(() => makeBoundedPubSub<A>(requestedCapacity)),
    core.flatMap((atomicPubSub) => makePubSub(atomicPubSub, new BackPressureStrategy()))
  )

/** @internal */
export const dropping = <A>(requestedCapacity: number): Effect.Effect<never, never, PubSub.PubSub<A>> =>
  pipe(
    core.sync(() => makeBoundedPubSub<A>(requestedCapacity)),
    core.flatMap((atomicPubSub) => makePubSub(atomicPubSub, new DroppingStrategy()))
  )

/** @internal */
export const sliding = <A>(requestedCapacity: number): Effect.Effect<never, never, PubSub.PubSub<A>> =>
  pipe(
    core.sync(() => makeBoundedPubSub<A>(requestedCapacity)),
    core.flatMap((atomicPubSub) => makePubSub(atomicPubSub, new SlidingStrategy()))
  )

/** @internal */
export const unbounded = <A>(): Effect.Effect<never, never, PubSub.PubSub<A>> =>
  pipe(
    core.sync(() => makeUnboundedPubSub<A>()),
    core.flatMap((atomicPubSub) => makePubSub(atomicPubSub, new DroppingStrategy()))
  )

/** @internal */
export const capacity = <A>(self: PubSub.PubSub<A>): number => self.capacity()

/** @internal */
export const size = <A>(self: PubSub.PubSub<A>): Effect.Effect<never, never, number> => self.size()

/** @internal */
export const isFull = <A>(self: PubSub.PubSub<A>): Effect.Effect<never, never, boolean> => self.isFull()

/** @internal */
export const isEmpty = <A>(self: PubSub.PubSub<A>): Effect.Effect<never, never, boolean> => self.isEmpty()

/** @internal */
export const shutdown = <A>(self: PubSub.PubSub<A>): Effect.Effect<never, never, void> => self.shutdown()

/** @internal */
export const isShutdown = <A>(self: PubSub.PubSub<A>): Effect.Effect<never, never, boolean> => self.isShutdown()

/** @internal */
export const awaitShutdown = <A>(self: PubSub.PubSub<A>): Effect.Effect<never, never, void> => self.awaitShutdown()

/** @internal */
export const publish = dual<
  <A>(value: A) => (self: PubSub.PubSub<A>) => Effect.Effect<never, never, boolean>,
  <A>(self: PubSub.PubSub<A>, value: A) => Effect.Effect<never, never, boolean>
>(2, (self, value) => self.publish(value))

/** @internal */
export const publishAll = dual<
  <A>(elements: Iterable<A>) => (self: PubSub.PubSub<A>) => Effect.Effect<never, never, boolean>,
  <A>(self: PubSub.PubSub<A>, elements: Iterable<A>) => Effect.Effect<never, never, boolean>
>(2, (self, elements) => self.publishAll(elements))

/** @internal */
export const subscribe = <A>(self: PubSub.PubSub<A>): Effect.Effect<Scope.Scope, never, Queue.Dequeue<A>> =>
  self.subscribe()

/** @internal */
const makeBoundedPubSub = <A>(requestedCapacity: number): AtomicPubSub<A> => {
  ensureCapacity(requestedCapacity)
  if (requestedCapacity === 1) {
    return new BoundedPubSubSingle()
  } else if (nextPow2(requestedCapacity) === requestedCapacity) {
    return new BoundedPubSubPow2(requestedCapacity)
  } else {
    return new BoundedPubSubArb(requestedCapacity)
  }
}

/** @internal */
const makeUnboundedPubSub = <A>(): AtomicPubSub<A> => {
  return new UnboundedPubSub()
}

/** @internal */
const makeSubscription = <A>(
  pubsub: AtomicPubSub<A>,
  subscribers: Subscribers<A>,
  strategy: PubSubStrategy<A>
): Effect.Effect<never, never, Queue.Dequeue<A>> =>
  core.map(core.deferredMake<never, void>(), (deferred) =>
    unsafeMakeSubscription(
      pubsub,
      subscribers,
      pubsub.subscribe(),
      MutableQueue.unbounded<Deferred.Deferred<never, A>>(),
      deferred,
      MutableRef.make(false),
      strategy
    ))

/** @internal */
export const unsafeMakeSubscription = <A>(
  pubsub: AtomicPubSub<A>,
  subscribers: Subscribers<A>,
  subscription: Subscription<A>,
  pollers: MutableQueue.MutableQueue<Deferred.Deferred<never, A>>,
  shutdownHook: Deferred.Deferred<never, void>,
  shutdownFlag: MutableRef.MutableRef<boolean>,
  strategy: PubSubStrategy<A>
): Queue.Dequeue<A> => {
  return new SubscriptionImpl(
    pubsub,
    subscribers,
    subscription,
    pollers,
    shutdownHook,
    shutdownFlag,
    strategy
  )
}

/** @internal */
class BoundedPubSubArb<A> implements AtomicPubSub<A> {
  array: Array<A>
  publisherIndex = 0
  subscribers: Array<number>
  subscriberCount = 0
  subscribersIndex = 0

  readonly capacity: number

  constructor(requestedCapacity: number) {
    this.array = Array.from({ length: requestedCapacity })
    this.subscribers = Array.from({ length: requestedCapacity })
    this.capacity = requestedCapacity
  }

  isEmpty(): boolean {
    return this.publisherIndex === this.subscribersIndex
  }

  isFull(): boolean {
    return this.publisherIndex === this.subscribersIndex + this.capacity
  }

  size(): number {
    return this.publisherIndex - this.subscribersIndex
  }

  publish(value: A): boolean {
    if (this.isFull()) {
      return false
    }
    if (this.subscriberCount !== 0) {
      const index = this.publisherIndex % this.capacity
      this.array[index] = value
      this.subscribers[index] = this.subscriberCount
      this.publisherIndex += 1
    }
    return true
  }

  publishAll(elements: Iterable<A>): Chunk.Chunk<A> {
    const chunk = Chunk.fromIterable(elements)
    const n = chunk.length
    const size = this.publisherIndex - this.subscribersIndex
    const available = this.capacity - size
    const forPubSub = Math.min(n, available)
    if (forPubSub === 0) {
      return chunk
    }
    let iteratorIndex = 0
    const publishAllIndex = this.publisherIndex + forPubSub
    while (this.publisherIndex !== publishAllIndex) {
      const a = Chunk.unsafeGet(chunk, iteratorIndex++)
      const index = this.publisherIndex % this.capacity
      this.array[index] = a
      this.subscribers[index] = this.subscriberCount
      this.publisherIndex += 1
    }
    return Chunk.drop(chunk, iteratorIndex)
  }

  slide(): void {
    if (this.subscribersIndex !== this.publisherIndex) {
      const index = this.subscribersIndex % this.capacity
      this.array[index] = null as unknown as A
      this.subscribers[index] = 0
      this.subscribersIndex += 1
    }
  }

  subscribe(): Subscription<A> {
    this.subscriberCount += 1
    return new BoundedPubSubArbSubscription(this, this.publisherIndex, false)
  }
}

class BoundedPubSubArbSubscription<A> implements Subscription<A> {
  constructor(
    private self: BoundedPubSubArb<A>,
    private subscriberIndex: number,
    private unsubscribed: boolean
  ) {
  }

  isEmpty(): boolean {
    return (
      this.unsubscribed ||
      this.self.publisherIndex === this.subscriberIndex ||
      this.self.publisherIndex === this.self.subscribersIndex
    )
  }

  size() {
    if (this.unsubscribed) {
      return 0
    }
    return this.self.publisherIndex - Math.max(this.subscriberIndex, this.self.subscribersIndex)
  }

  poll<D>(default_: D): A | D {
    if (this.unsubscribed) {
      return default_
    }
    this.subscriberIndex = Math.max(this.subscriberIndex, this.self.subscribersIndex)
    if (this.subscriberIndex !== this.self.publisherIndex) {
      const index = this.subscriberIndex % this.self.capacity
      const elem = this.self.array[index]!
      this.self.subscribers[index] -= 1
      if (this.self.subscribers[index] === 0) {
        this.self.array[index] = null as unknown as A
        this.self.subscribersIndex += 1
      }
      this.subscriberIndex += 1
      return elem
    }
    return default_
  }

  pollUpTo(n: number): Chunk.Chunk<A> {
    if (this.unsubscribed) {
      return Chunk.empty()
    }
    this.subscriberIndex = Math.max(this.subscriberIndex, this.self.subscribersIndex)
    const size = this.self.publisherIndex - this.subscriberIndex
    const toPoll = Math.min(n, size)
    if (toPoll <= 0) {
      return Chunk.empty()
    }
    const builder: Array<A> = []
    const pollUpToIndex = this.subscriberIndex + toPoll
    while (this.subscriberIndex !== pollUpToIndex) {
      const index = this.subscriberIndex % this.self.capacity
      const a = this.self.array[index] as A
      this.self.subscribers[index] -= 1
      if (this.self.subscribers[index] === 0) {
        this.self.array[index] = null as unknown as A
        this.self.subscribersIndex += 1
      }
      builder.push(a)
      this.subscriberIndex += 1
    }

    return Chunk.fromIterable(builder)
  }

  unsubscribe(): void {
    if (!this.unsubscribed) {
      this.unsubscribed = true
      this.self.subscriberCount -= 1
      this.subscriberIndex = Math.max(this.subscriberIndex, this.self.subscribersIndex)
      while (this.subscriberIndex !== this.self.publisherIndex) {
        const index = this.subscriberIndex % this.self.capacity
        this.self.subscribers[index] -= 1
        if (this.self.subscribers[index] === 0) {
          this.self.array[index] = null as unknown as A
          this.self.subscribersIndex += 1
        }
        this.subscriberIndex += 1
      }
    }
  }
}

/** @internal */
class BoundedPubSubPow2<A> implements AtomicPubSub<A> {
  array: Array<A>
  mask: number
  publisherIndex = 0
  subscribers: Array<number>
  subscriberCount = 0
  subscribersIndex = 0

  readonly capacity: number

  constructor(requestedCapacity: number) {
    this.array = Array.from({ length: requestedCapacity })
    this.mask = requestedCapacity - 1
    this.subscribers = Array.from({ length: requestedCapacity })
    this.capacity = requestedCapacity
  }

  isEmpty(): boolean {
    return this.publisherIndex === this.subscribersIndex
  }

  isFull(): boolean {
    return this.publisherIndex === this.subscribersIndex + this.capacity
  }

  size(): number {
    return this.publisherIndex - this.subscribersIndex
  }

  publish(value: A): boolean {
    if (this.isFull()) {
      return false
    }
    if (this.subscriberCount !== 0) {
      const index = this.publisherIndex & this.mask
      this.array[index] = value
      this.subscribers[index] = this.subscriberCount
      this.publisherIndex += 1
    }
    return true
  }

  publishAll(elements: Iterable<A>): Chunk.Chunk<A> {
    const chunk = Chunk.fromIterable(elements)
    const n = chunk.length
    const size = this.publisherIndex - this.subscribersIndex
    const available = this.capacity - size
    const forPubSub = Math.min(n, available)
    if (forPubSub === 0) {
      return chunk
    }
    let iteratorIndex = 0
    const publishAllIndex = this.publisherIndex + forPubSub
    while (this.publisherIndex !== publishAllIndex) {
      const elem = Chunk.unsafeGet(chunk, iteratorIndex++)
      const index = this.publisherIndex & this.mask
      this.array[index] = elem
      this.subscribers[index] = this.subscriberCount
      this.publisherIndex += 1
    }
    return Chunk.drop(chunk, iteratorIndex)
  }

  slide(): void {
    if (this.subscribersIndex !== this.publisherIndex) {
      const index = this.subscribersIndex & this.mask
      this.array[index] = null as unknown as A
      this.subscribers[index] = 0
      this.subscribersIndex += 1
    }
  }

  subscribe(): Subscription<A> {
    this.subscriberCount += 1
    return new BoundedPubSubPow2Subscription(this, this.publisherIndex, false)
  }
}

/** @internal */
class BoundedPubSubPow2Subscription<A> implements Subscription<A> {
  constructor(
    private self: BoundedPubSubPow2<A>,
    private subscriberIndex: number,
    private unsubscribed: boolean
  ) {
  }

  isEmpty(): boolean {
    return (
      this.unsubscribed ||
      this.self.publisherIndex === this.subscriberIndex ||
      this.self.publisherIndex === this.self.subscribersIndex
    )
  }

  size() {
    if (this.unsubscribed) {
      return 0
    }
    return this.self.publisherIndex - Math.max(this.subscriberIndex, this.self.subscribersIndex)
  }

  poll<D>(default_: D): A | D {
    if (this.unsubscribed) {
      return default_
    }
    this.subscriberIndex = Math.max(this.subscriberIndex, this.self.subscribersIndex)
    if (this.subscriberIndex !== this.self.publisherIndex) {
      const index = this.subscriberIndex & this.self.mask
      const elem = this.self.array[index]!
      this.self.subscribers[index] -= 1
      if (this.self.subscribers[index] === 0) {
        this.self.array[index] = null as unknown as A
        this.self.subscribersIndex += 1
      }
      this.subscriberIndex += 1
      return elem
    }
    return default_
  }

  pollUpTo(n: number): Chunk.Chunk<A> {
    if (this.unsubscribed) {
      return Chunk.empty()
    }
    this.subscriberIndex = Math.max(this.subscriberIndex, this.self.subscribersIndex)
    const size = this.self.publisherIndex - this.subscriberIndex
    const toPoll = Math.min(n, size)
    if (toPoll <= 0) {
      return Chunk.empty()
    }
    const builder: Array<A> = []
    const pollUpToIndex = this.subscriberIndex + toPoll
    while (this.subscriberIndex !== pollUpToIndex) {
      const index = this.subscriberIndex & this.self.mask
      const elem = this.self.array[index] as A
      this.self.subscribers[index] -= 1
      if (this.self.subscribers[index] === 0) {
        this.self.array[index] = null as unknown as A
        this.self.subscribersIndex += 1
      }
      builder.push(elem)
      this.subscriberIndex += 1
    }
    return Chunk.fromIterable(builder)
  }

  unsubscribe(): void {
    if (!this.unsubscribed) {
      this.unsubscribed = true
      this.self.subscriberCount -= 1
      this.subscriberIndex = Math.max(this.subscriberIndex, this.self.subscribersIndex)
      while (this.subscriberIndex !== this.self.publisherIndex) {
        const index = this.subscriberIndex & this.self.mask
        this.self.subscribers[index] -= 1
        if (this.self.subscribers[index] === 0) {
          this.self.array[index] = null as unknown as A
          this.self.subscribersIndex += 1
        }
        this.subscriberIndex += 1
      }
    }
  }
}

/** @internal */
class BoundedPubSubSingle<A> implements AtomicPubSub<A> {
  publisherIndex = 0
  subscriberCount = 0
  subscribers = 0
  value: A = null as unknown as A

  readonly capacity = 1

  pipe() {
    return pipeArguments(this, arguments)
  }

  isEmpty(): boolean {
    return this.subscribers === 0
  }

  isFull(): boolean {
    return !this.isEmpty()
  }

  size(): number {
    return this.isEmpty() ? 0 : 1
  }

  publish(value: A): boolean {
    if (this.isFull()) {
      return false
    }
    if (this.subscriberCount !== 0) {
      this.value = value
      this.subscribers = this.subscriberCount
      this.publisherIndex += 1
    }
    return true
  }

  publishAll(elements: Iterable<A>): Chunk.Chunk<A> {
    const chunk = Chunk.fromIterable(elements)
    if (Chunk.isEmpty(chunk)) {
      return chunk
    }
    if (this.publish(Chunk.unsafeHead(chunk))) {
      return Chunk.drop(chunk, 1)
    } else {
      return chunk
    }
  }

  slide(): void {
    if (this.isFull()) {
      this.subscribers = 0
      this.value = null as unknown as A
    }
  }

  subscribe(): Subscription<A> {
    this.subscriberCount += 1
    return new BoundedPubSubSingleSubscription(this, this.publisherIndex, false)
  }
}

/** @internal */
class BoundedPubSubSingleSubscription<A> implements Subscription<A> {
  constructor(
    private self: BoundedPubSubSingle<A>,
    private subscriberIndex: number,
    private unsubscribed: boolean
  ) {
  }

  isEmpty(): boolean {
    return (
      this.unsubscribed ||
      this.self.subscribers === 0 ||
      this.subscriberIndex === this.self.publisherIndex
    )
  }

  size() {
    return this.isEmpty() ? 0 : 1
  }

  poll<D>(default_: D): A | D {
    if (this.isEmpty()) {
      return default_
    }
    const elem = this.self.value
    this.self.subscribers -= 1
    if (this.self.subscribers === 0) {
      this.self.value = null as unknown as A
    }
    this.subscriberIndex += 1
    return elem
  }

  pollUpTo(n: number): Chunk.Chunk<A> {
    if (this.isEmpty() || n < 1) {
      return Chunk.empty()
    }
    const a = this.self.value
    this.self.subscribers -= 1
    if (this.self.subscribers === 0) {
      this.self.value = null as unknown as A
    }
    this.subscriberIndex += 1
    return Chunk.of(a)
  }

  unsubscribe(): void {
    if (!this.unsubscribed) {
      this.unsubscribed = true
      this.self.subscriberCount -= 1
      if (this.subscriberIndex !== this.self.publisherIndex) {
        this.self.subscribers -= 1
        if (this.self.subscribers === 0) {
          this.self.value = null as unknown as A
        }
      }
    }
  }
}

/** @internal */
class Node<A> {
  constructor(
    public value: A | null,
    public subscribers: number,
    public next: Node<A> | null
  ) {
  }
}

/** @internal */
class UnboundedPubSub<A> implements AtomicPubSub<A> {
  publisherHead = new Node<A>(null, 0, null)
  publisherIndex = 0
  publisherTail: Node<A>
  subscribersIndex = 0

  readonly capacity = Number.MAX_SAFE_INTEGER

  constructor() {
    this.publisherTail = this.publisherHead
  }

  isEmpty(): boolean {
    return this.publisherHead === this.publisherTail
  }

  isFull(): boolean {
    return false
  }

  size(): number {
    return this.publisherIndex - this.subscribersIndex
  }

  publish(value: A): boolean {
    const subscribers = this.publisherTail.subscribers
    if (subscribers !== 0) {
      this.publisherTail.next = new Node(value, subscribers, null)
      this.publisherTail = this.publisherTail.next
      this.publisherIndex += 1
    }
    return true
  }

  publishAll(elements: Iterable<A>): Chunk.Chunk<A> {
    for (const a of elements) {
      this.publish(a)
    }
    return Chunk.empty()
  }

  slide(): void {
    if (this.publisherHead !== this.publisherTail) {
      this.publisherHead = this.publisherHead.next!
      this.publisherHead.value = null
      this.subscribersIndex += 1
    }
  }

  subscribe(): Subscription<A> {
    this.publisherTail.subscribers += 1
    return new UnboundedPubSubSubscription(
      this,
      this.publisherTail,
      this.publisherIndex,
      false
    )
  }
}

/** @internal */
class UnboundedPubSubSubscription<A> implements Subscription<A> {
  constructor(
    private self: UnboundedPubSub<A>,
    private subscriberHead: Node<A>,
    private subscriberIndex: number,
    private unsubscribed: boolean
  ) {
  }

  isEmpty(): boolean {
    if (this.unsubscribed) {
      return true
    }
    let empty = true
    let loop = true
    while (loop) {
      if (this.subscriberHead === this.self.publisherTail) {
        loop = false
      } else {
        if (this.subscriberHead.next!.value !== null) {
          empty = false
          loop = false
        } else {
          this.subscriberHead = this.subscriberHead.next!
          this.subscriberIndex += 1
        }
      }
    }
    return empty
  }

  size() {
    if (this.unsubscribed) {
      return 0
    }
    return this.self.publisherIndex - Math.max(this.subscriberIndex, this.self.subscribersIndex)
  }

  poll<D>(default_: D): A | D {
    if (this.unsubscribed) {
      return default_
    }
    let loop = true
    let polled: A | D = default_
    while (loop) {
      if (this.subscriberHead === this.self.publisherTail) {
        loop = false
      } else {
        const elem = this.subscriberHead.next!.value
        if (elem !== null) {
          polled = elem
          this.subscriberHead.subscribers -= 1
          if (this.subscriberHead.subscribers === 0) {
            this.self.publisherHead = this.self.publisherHead.next!
            this.self.publisherHead.value = null
            this.self.subscribersIndex += 1
          }
          loop = false
        }
        this.subscriberHead = this.subscriberHead.next!
        this.subscriberIndex += 1
      }
    }
    return polled
  }

  pollUpTo(n: number): Chunk.Chunk<A> {
    const builder: Array<A> = []
    const default_ = null
    let i = 0
    while (i !== n) {
      const a = this.poll(default_ as unknown as A)
      if (a === default_) {
        i = n
      } else {
        builder.push(a)
        i += 1
      }
    }
    return Chunk.fromIterable(builder)
  }

  unsubscribe(): void {
    if (!this.unsubscribed) {
      this.unsubscribed = true
      this.self.publisherTail.subscribers -= 1
      while (this.subscriberHead !== this.self.publisherTail) {
        if (this.subscriberHead.next!.value !== null) {
          this.subscriberHead.subscribers -= 1
          if (this.subscriberHead.subscribers === 0) {
            this.self.publisherHead = this.self.publisherHead.next!
            this.self.publisherHead.value = null
            this.self.subscribersIndex += 1
          }
        }
        this.subscriberHead = this.subscriberHead.next!
      }
    }
  }
}

/** @internal */
class SubscriptionImpl<A> implements Queue.Dequeue<A> {
  [queue.DequeueTypeId] = queue.dequeueVariance

  constructor(
    readonly pubsub: AtomicPubSub<A>,
    readonly subscribers: Subscribers<A>,
    readonly subscription: Subscription<A>,
    readonly pollers: MutableQueue.MutableQueue<Deferred.Deferred<never, A>>,
    readonly shutdownHook: Deferred.Deferred<never, void>,
    readonly shutdownFlag: MutableRef.MutableRef<boolean>,
    readonly strategy: PubSubStrategy<A>
  ) {
  }

  pipe() {
    return pipeArguments(this, arguments)
  }

  capacity(): number {
    return this.pubsub.capacity
  }

  isActive(): boolean {
    return !MutableRef.get(this.shutdownFlag)
  }

  size(): Effect.Effect<never, never, number> {
    return core.suspend(() =>
      MutableRef.get(this.shutdownFlag)
        ? core.interrupt
        : core.succeed(this.subscription.size())
    )
  }

  unsafeSize(): Option.Option<number> {
    if (MutableRef.get(this.shutdownFlag)) {
      return Option.none()
    }
    return Option.some(this.subscription.size())
  }

  isFull(): Effect.Effect<never, never, boolean> {
    return core.map(this.size(), (size) => size === this.capacity())
  }

  isEmpty(): Effect.Effect<never, never, boolean> {
    return core.map(this.size(), (size) => size === 0)
  }

  shutdown(): Effect.Effect<never, never, void> {
    return core.uninterruptible(
      core.withFiberRuntime<never, never, void>((state) => {
        MutableRef.set(this.shutdownFlag, true)
        return pipe(
          fiberRuntime.forEachParUnbounded(
            unsafePollAllQueue(this.pollers),
            (d) => core.deferredInterruptWith(d, state.id()),
            false
          ),
          core.zipRight(core.sync(() => {
            this.subscribers.delete(this.subscription)
            this.subscription.unsubscribe()
            this.strategy.unsafeOnPubSubEmptySpace(this.pubsub, this.subscribers)
          })),
          core.whenEffect(core.deferredSucceed(this.shutdownHook, void 0)),
          core.asUnit
        )
      })
    )
  }

  isShutdown(): Effect.Effect<never, never, boolean> {
    return core.sync(() => MutableRef.get(this.shutdownFlag))
  }

  awaitShutdown(): Effect.Effect<never, never, void> {
    return core.deferredAwait(this.shutdownHook)
  }

  take(): Effect.Effect<never, never, A> {
    return core.withFiberRuntime<never, never, A>((state) => {
      if (MutableRef.get(this.shutdownFlag)) {
        return core.interrupt
      }
      const message = MutableQueue.isEmpty(this.pollers)
        ? this.subscription.poll(MutableQueue.EmptyMutableQueue)
        : MutableQueue.EmptyMutableQueue
      if (message === MutableQueue.EmptyMutableQueue) {
        const deferred = core.deferredUnsafeMake<never, A>(state.id())
        return pipe(
          core.suspend(() => {
            pipe(this.pollers, MutableQueue.offer(deferred))
            pipe(this.subscribers, addSubscribers(this.subscription, this.pollers))
            this.strategy.unsafeCompletePollers(
              this.pubsub,
              this.subscribers,
              this.subscription,
              this.pollers
            )
            return MutableRef.get(this.shutdownFlag) ? core.interrupt : core.deferredAwait(deferred)
          }),
          core.onInterrupt(() => core.sync(() => unsafeRemove(this.pollers, deferred)))
        )
      } else {
        this.strategy.unsafeOnPubSubEmptySpace(this.pubsub, this.subscribers)
        return core.succeed(message)
      }
    })
  }

  takeAll(): Effect.Effect<never, never, Chunk.Chunk<A>> {
    return core.suspend(() => {
      if (MutableRef.get(this.shutdownFlag)) {
        return core.interrupt
      }
      const as = MutableQueue.isEmpty(this.pollers)
        ? unsafePollAllSubscription(this.subscription)
        : Chunk.empty()
      this.strategy.unsafeOnPubSubEmptySpace(this.pubsub, this.subscribers)
      return core.succeed(as)
    })
  }

  takeUpTo(this: this, max: number): Effect.Effect<never, never, Chunk.Chunk<A>> {
    return core.suspend(() => {
      if (MutableRef.get(this.shutdownFlag)) {
        return core.interrupt
      }
      const as = MutableQueue.isEmpty(this.pollers)
        ? unsafePollN(this.subscription, max)
        : Chunk.empty()
      this.strategy.unsafeOnPubSubEmptySpace(this.pubsub, this.subscribers)
      return core.succeed(as)
    })
  }

  takeBetween(min: number, max: number): Effect.Effect<never, never, Chunk.Chunk<A>> {
    return core.suspend(() => takeRemainderLoop(this, min, max, Chunk.empty()))
  }
}

/** @internal */
const takeRemainderLoop = <A>(
  self: Queue.Dequeue<A>,
  min: number,
  max: number,
  acc: Chunk.Chunk<A>
): Effect.Effect<never, never, Chunk.Chunk<A>> => {
  if (max < min) {
    return core.succeed(acc)
  }
  return pipe(
    self.takeUpTo(max),
    core.flatMap((bs) => {
      const remaining = min - bs.length
      if (remaining === 1) {
        return pipe(self.take(), core.map((b) => pipe(acc, Chunk.appendAll(bs), Chunk.append(b))))
      }
      if (remaining > 1) {
        return pipe(
          self.take(),
          core.flatMap((b) =>
            takeRemainderLoop(
              self,
              remaining - 1,
              max - bs.length - 1,
              pipe(acc, Chunk.appendAll(bs), Chunk.append(b))
            )
          )
        )
      }
      return core.succeed(pipe(acc, Chunk.appendAll(bs)))
    })
  )
}

/** @internal */
class PubSubImpl<A> implements PubSub.PubSub<A> {
  readonly [queue.EnqueueTypeId] = queue.enqueueVariance

  constructor(
    readonly pubsub: AtomicPubSub<A>,
    readonly subscribers: Subscribers<A>,
    readonly scope: Scope.Scope.Closeable,
    readonly shutdownHook: Deferred.Deferred<never, void>,
    readonly shutdownFlag: MutableRef.MutableRef<boolean>,
    readonly strategy: PubSubStrategy<A>
  ) {
  }

  capacity(): number {
    return this.pubsub.capacity
  }

  size(): Effect.Effect<never, never, number> {
    return core.suspend(() =>
      MutableRef.get(this.shutdownFlag) ?
        core.interrupt :
        core.sync(() => this.pubsub.size())
    )
  }

  unsafeSize(): Option.Option<number> {
    if (MutableRef.get(this.shutdownFlag)) {
      return Option.none()
    }
    return Option.some(this.pubsub.size())
  }

  isFull(): Effect.Effect<never, never, boolean> {
    return core.map(this.size(), (size) => size === this.capacity())
  }

  isEmpty(): Effect.Effect<never, never, boolean> {
    return core.map(this.size(), (size) => size === 0)
  }

  awaitShutdown(): Effect.Effect<never, never, void> {
    return core.deferredAwait(this.shutdownHook)
  }

  isShutdown(): Effect.Effect<never, never, boolean> {
    return core.sync(() => MutableRef.get(this.shutdownFlag))
  }

  shutdown(): Effect.Effect<never, never, void> {
    return core.uninterruptible(core.withFiberRuntime<never, never, void>((state) => {
      pipe(this.shutdownFlag, MutableRef.set(true))
      return pipe(
        this.scope.close(core.exitInterrupt(state.id())),
        core.zipRight(this.strategy.shutdown()),
        core.whenEffect(core.deferredSucceed(this.shutdownHook, void 0)),
        core.asUnit
      )
    }))
  }

  publish(value: A): Effect.Effect<never, never, boolean> {
    return core.suspend(() => {
      if (MutableRef.get(this.shutdownFlag)) {
        return core.interrupt
      }

      if ((this.pubsub as AtomicPubSub<unknown>).publish(value)) {
        this.strategy.unsafeCompleteSubscribers(this.pubsub, this.subscribers)
        return core.succeed(true)
      }

      return this.strategy.handleSurplus(
        this.pubsub,
        this.subscribers,
        Chunk.of(value),
        this.shutdownFlag
      )
    })
  }

  isActive(): boolean {
    return !MutableRef.get(this.shutdownFlag)
  }

  unsafeOffer(value: A): boolean {
    if (MutableRef.get(this.shutdownFlag)) {
      return false
    }

    if ((this.pubsub as AtomicPubSub<unknown>).publish(value)) {
      this.strategy.unsafeCompleteSubscribers(this.pubsub, this.subscribers)
      return true
    }

    return false
  }

  publishAll(elements: Iterable<A>): Effect.Effect<never, never, boolean> {
    return core.suspend(() => {
      if (MutableRef.get(this.shutdownFlag)) {
        return core.interrupt
      }
      const surplus = unsafePublishAll(this.pubsub, elements)
      this.strategy.unsafeCompleteSubscribers(this.pubsub, this.subscribers)
      if (Chunk.isEmpty(surplus)) {
        return core.succeed(true)
      }
      return this.strategy.handleSurplus(
        this.pubsub,
        this.subscribers,
        surplus,
        this.shutdownFlag
      )
    })
  }

  subscribe(): Effect.Effect<Scope.Scope, never, Queue.Dequeue<A>> {
    const acquire = core.tap(
      fiberRuntime.all([
        this.scope.fork(executionStrategy.sequential),
        makeSubscription(this.pubsub, this.subscribers, this.strategy)
      ]),
      (tuple) => tuple[0].addFinalizer(() => tuple[1].shutdown())
    )
    return core.map(
      fiberRuntime.acquireRelease(acquire, (tuple, exit) => tuple[0].close(exit)),
      (tuple) => tuple[1]
    )
  }

  offer(value: A): Effect.Effect<never, never, boolean> {
    return this.publish(value)
  }

  offerAll(elements: Iterable<A>): Effect.Effect<never, never, boolean> {
    return this.publishAll(elements)
  }

  pipe() {
    return pipeArguments(this, arguments)
  }
}

/** @internal */
export const makePubSub = <A>(
  pubsub: AtomicPubSub<A>,
  strategy: PubSubStrategy<A>
): Effect.Effect<never, never, PubSub.PubSub<A>> =>
  core.flatMap(
    fiberRuntime.scopeMake(),
    (scope) =>
      core.map(core.deferredMake<never, void>(), (deferred) =>
        unsafeMakePubSub(
          pubsub,
          new Map(),
          scope,
          deferred,
          MutableRef.make(false),
          strategy
        ))
  )

/** @internal */
export const unsafeMakePubSub = <A>(
  pubsub: AtomicPubSub<A>,
  subscribers: Subscribers<A>,
  scope: Scope.Scope.Closeable,
  shutdownHook: Deferred.Deferred<never, void>,
  shutdownFlag: MutableRef.MutableRef<boolean>,
  strategy: PubSubStrategy<A>
): PubSub.PubSub<A> => {
  return new PubSubImpl(pubsub, subscribers, scope, shutdownHook, shutdownFlag, strategy)
}

/** @internal */
const nextPow2 = (n: number): number => {
  const nextPow = Math.ceil(Math.log(n) / Math.log(2.0))
  return Math.max(Math.pow(2, nextPow), 2)
}

/** @internal */
const ensureCapacity = (capacity: number): void => {
  if (capacity <= 0) {
    throw cause.InvalidPubSubCapacityException(`Cannot construct PubSub with capacity of ${capacity}`)
  }
}

/** @internal */
const unsafeCompleteDeferred = <A>(deferred: Deferred.Deferred<never, A>, a: A): void => {
  core.deferredUnsafeDone(deferred, core.succeed(a))
}

/** @internal */
const unsafeOfferAll = <A>(queue: MutableQueue.MutableQueue<A>, as: Iterable<A>): Chunk.Chunk<A> => {
  return pipe(queue, MutableQueue.offerAll(as))
}

/** @internal */
const unsafePollAllQueue = <A>(queue: MutableQueue.MutableQueue<A>): Chunk.Chunk<A> => {
  return pipe(queue, MutableQueue.pollUpTo(Number.POSITIVE_INFINITY))
}

/** @internal */
const unsafePollAllSubscription = <A>(subscription: Subscription<A>): Chunk.Chunk<A> => {
  return subscription.pollUpTo(Number.POSITIVE_INFINITY)
}

/** @internal */
const unsafePollN = <A>(subscription: Subscription<A>, max: number): Chunk.Chunk<A> => {
  return subscription.pollUpTo(max)
}

/** @internal */
const unsafePublishAll = <A>(pubsub: AtomicPubSub<A>, as: Iterable<A>): Chunk.Chunk<A> => {
  return pubsub.publishAll(as)
}

/** @internal */
const unsafeRemove = <A>(queue: MutableQueue.MutableQueue<A>, value: A): void => {
  unsafeOfferAll(
    queue,
    pipe(unsafePollAllQueue(queue), Chunk.filter((elem) => elem !== value))
  )
}

// -----------------------------------------------------------------------------
// PubSub.Strategy
// -----------------------------------------------------------------------------

/**
 * A `PubSubStrategy<A>` describes the protocol for how publishers and subscribers
 * will communicate with each other through the `PubSub`.
 *
 * @internal
 */
export interface PubSubStrategy<A> {
  /**
   * Describes any finalization logic associated with this strategy.
   */
  shutdown(): Effect.Effect<never, never, void>

  /**
   * Describes how publishers should signal to subscribers that they are
   * waiting for space to become available in the `PubSub`.
   */
  handleSurplus(
    pubsub: AtomicPubSub<A>,
    subscribers: Subscribers<A>,
    elements: Iterable<A>,
    isShutdown: MutableRef.MutableRef<boolean>
  ): Effect.Effect<never, never, boolean>

  /**
   * Describes how subscribers should signal to publishers waiting for space
   * to become available in the `PubSub` that space may be available.
   */
  unsafeOnPubSubEmptySpace(
    pubsub: AtomicPubSub<A>,
    subscribers: Subscribers<A>
  ): void

  /**
   * Describes how subscribers waiting for additional values from the `PubSub`
   * should take those values and signal to publishers that they are no
   * longer waiting for additional values.
   */
  unsafeCompletePollers(
    pubsub: AtomicPubSub<A>,
    subscribers: Subscribers<A>,
    subscription: Subscription<A>,
    pollers: MutableQueue.MutableQueue<Deferred.Deferred<never, A>>
  ): void

  /**
   * Describes how publishers should signal to subscribers waiting for
   * additional values from the `PubSub` that new values are available.
   */
  unsafeCompleteSubscribers(
    pubsub: AtomicPubSub<A>,
    subscribers: Subscribers<A>
  ): void
}

/**
 * A strategy that applies back pressure to publishers when the `PubSub` is at
 * capacity. This guarantees that all subscribers will receive all messages
 * published to the `PubSub` while they are subscribed. However, it creates the
 * risk that a slow subscriber will slow down the rate at which messages
 * are published and received by other subscribers.
 *
 * @internal
 */
class BackPressureStrategy<A> implements PubSubStrategy<A> {
  publishers: MutableQueue.MutableQueue<
    readonly [
      A,
      Deferred.Deferred<never, boolean>,
      boolean
    ]
  > = MutableQueue.unbounded()

  shutdown(): Effect.Effect<never, never, void> {
    return core.flatMap(core.fiberId, (fiberId) =>
      core.flatMap(
        core.sync(() => unsafePollAllQueue(this.publishers)),
        (publishers) =>
          fiberRuntime.forEachParUnboundedDiscard(
            publishers,
            ([_, deferred, last]) =>
              last ?
                pipe(core.deferredInterruptWith(deferred, fiberId), core.asUnit) :
                core.unit,
            false
          )
      ))
  }

  handleSurplus(
    pubsub: AtomicPubSub<A>,
    subscribers: Subscribers<A>,
    elements: Iterable<A>,
    isShutdown: MutableRef.MutableRef<boolean>
  ): Effect.Effect<never, never, boolean> {
    return core.withFiberRuntime<never, never, boolean>((state) => {
      const deferred = core.deferredUnsafeMake<never, boolean>(state.id())
      return pipe(
        core.suspend(() => {
          this.unsafeOffer(elements, deferred)
          this.unsafeOnPubSubEmptySpace(pubsub, subscribers)
          this.unsafeCompleteSubscribers(pubsub, subscribers)
          return MutableRef.get(isShutdown) ?
            core.interrupt :
            core.deferredAwait(deferred)
        }),
        core.onInterrupt(() => core.sync(() => this.unsafeRemove(deferred)))
      )
    })
  }

  unsafeOnPubSubEmptySpace(
    pubsub: AtomicPubSub<A>,
    subscribers: Subscribers<A>
  ): void {
    let keepPolling = true
    while (keepPolling && !pubsub.isFull()) {
      const publisher = pipe(this.publishers, MutableQueue.poll(MutableQueue.EmptyMutableQueue))
      if (publisher === MutableQueue.EmptyMutableQueue) {
        keepPolling = false
      } else {
        const published = pubsub.publish(publisher[0])
        if (published && publisher[2]) {
          unsafeCompleteDeferred(publisher[1], true)
        } else if (!published) {
          unsafeOfferAll(
            this.publishers,
            pipe(unsafePollAllQueue(this.publishers), Chunk.prepend(publisher))
          )
        }
        this.unsafeCompleteSubscribers(pubsub, subscribers)
      }
    }
  }

  unsafeCompletePollers(
    pubsub: AtomicPubSub<A>,
    subscribers: Subscribers<A>,
    subscription: Subscription<A>,
    pollers: MutableQueue.MutableQueue<Deferred.Deferred<never, A>>
  ): void {
    return unsafeStrategyCompletePollers(this, pubsub, subscribers, subscription, pollers)
  }

  unsafeCompleteSubscribers(pubsub: AtomicPubSub<A>, subscribers: Subscribers<A>): void {
    return unsafeStrategyCompleteSubscribers(this, pubsub, subscribers)
  }

  private unsafeOffer(elements: Iterable<A>, deferred: Deferred.Deferred<never, boolean>): void {
    const iterator = elements[Symbol.iterator]()
    let next: IteratorResult<A> = iterator.next()
    if (!next.done) {
      // eslint-disable-next-line no-constant-condition
      while (1) {
        const value = next.value
        next = iterator.next()
        if (next.done) {
          pipe(
            this.publishers,
            MutableQueue.offer([value, deferred, true as boolean] as const)
          )
          break
        }
        pipe(
          this.publishers,
          MutableQueue.offer([value, deferred, false as boolean] as const)
        )
      }
    }
  }

  unsafeRemove(deferred: Deferred.Deferred<never, boolean>): void {
    unsafeOfferAll(
      this.publishers,
      pipe(unsafePollAllQueue(this.publishers), Chunk.filter(([_, a]) => a !== deferred))
    )
  }
}

/**
 * A strategy that drops new messages when the `PubSub` is at capacity. This
 * guarantees that a slow subscriber will not slow down the rate at which
 * messages are published. However, it creates the risk that a slow
 * subscriber will slow down the rate at which messages are received by
 * other subscribers and that subscribers may not receive all messages
 * published to the `PubSub` while they are subscribed.
 *
 * @internal
 */
export class DroppingStrategy<A> implements PubSubStrategy<A> {
  shutdown(): Effect.Effect<never, never, void> {
    return core.unit
  }

  handleSurplus(
    _pubsub: AtomicPubSub<A>,
    _subscribers: Subscribers<A>,
    _elements: Iterable<A>,
    _isShutdown: MutableRef.MutableRef<boolean>
  ): Effect.Effect<never, never, boolean> {
    return core.succeed(false)
  }

  unsafeOnPubSubEmptySpace(
    _pubsub: AtomicPubSub<A>,
    _subscribers: Subscribers<A>
  ): void {
    //
  }

  unsafeCompletePollers(
    pubsub: AtomicPubSub<A>,
    subscribers: Subscribers<A>,
    subscription: Subscription<A>,
    pollers: MutableQueue.MutableQueue<Deferred.Deferred<never, A>>
  ): void {
    return unsafeStrategyCompletePollers(this, pubsub, subscribers, subscription, pollers)
  }

  unsafeCompleteSubscribers(pubsub: AtomicPubSub<A>, subscribers: Subscribers<A>): void {
    return unsafeStrategyCompleteSubscribers(this, pubsub, subscribers)
  }
}

/**
 * A strategy that adds new messages and drops old messages when the `PubSub` is
 * at capacity. This guarantees that a slow subscriber will not slow down
 * the rate at which messages are published and received by other
 * subscribers. However, it creates the risk that a slow subscriber will
 * not receive some messages published to the `PubSub` while it is subscribed.
 *
 * @internal
 */
export class SlidingStrategy<A> implements PubSubStrategy<A> {
  shutdown(): Effect.Effect<never, never, void> {
    return core.unit
  }

  handleSurplus(
    pubsub: AtomicPubSub<A>,
    subscribers: Subscribers<A>,
    elements: Iterable<A>,
    _isShutdown: MutableRef.MutableRef<boolean>
  ): Effect.Effect<never, never, boolean> {
    return core.sync(() => {
      this.unsafeSlidingPublish(pubsub, elements)
      this.unsafeCompleteSubscribers(pubsub, subscribers)
      return true
    })
  }

  unsafeOnPubSubEmptySpace(
    _pubsub: AtomicPubSub<A>,
    _subscribers: Subscribers<A>
  ): void {
    //
  }

  unsafeCompletePollers(
    pubsub: AtomicPubSub<A>,
    subscribers: Subscribers<A>,
    subscription: Subscription<A>,
    pollers: MutableQueue.MutableQueue<Deferred.Deferred<never, A>>
  ): void {
    return unsafeStrategyCompletePollers(this, pubsub, subscribers, subscription, pollers)
  }

  unsafeCompleteSubscribers(pubsub: AtomicPubSub<A>, subscribers: Subscribers<A>): void {
    return unsafeStrategyCompleteSubscribers(this, pubsub, subscribers)
  }

  unsafeSlidingPublish(pubsub: AtomicPubSub<A>, elements: Iterable<A>): void {
    const it = elements[Symbol.iterator]()
    let next = it.next()
    if (!next.done && pubsub.capacity > 0) {
      let a = next.value
      let loop = true
      while (loop) {
        pubsub.slide()
        const pub = pubsub.publish(a)
        if (pub && (next = it.next()) && !next.done) {
          a = next.value
        } else if (pub) {
          loop = false
        }
      }
    }
  }
}

/** @internal */
const unsafeStrategyCompletePollers = <A>(
  strategy: PubSubStrategy<A>,
  pubsub: AtomicPubSub<A>,
  subscribers: Subscribers<A>,
  subscription: Subscription<A>,
  pollers: MutableQueue.MutableQueue<Deferred.Deferred<never, A>>
): void => {
  let keepPolling = true
  while (keepPolling && !subscription.isEmpty()) {
    const poller = pipe(pollers, MutableQueue.poll(MutableQueue.EmptyMutableQueue))
    if (poller === MutableQueue.EmptyMutableQueue) {
      pipe(subscribers, removeSubscribers(subscription, pollers))
      if (MutableQueue.isEmpty(pollers)) {
        keepPolling = false
      } else {
        pipe(subscribers, addSubscribers(subscription, pollers))
      }
    } else {
      const pollResult = subscription.poll(MutableQueue.EmptyMutableQueue)
      if (pollResult === MutableQueue.EmptyMutableQueue) {
        unsafeOfferAll(pollers, pipe(unsafePollAllQueue(pollers), Chunk.prepend(poller)))
      } else {
        unsafeCompleteDeferred(poller, pollResult)
        strategy.unsafeOnPubSubEmptySpace(pubsub, subscribers)
      }
    }
  }
}

/** @internal */
const unsafeStrategyCompleteSubscribers = <A>(
  strategy: PubSubStrategy<A>,
  pubsub: AtomicPubSub<A>,
  subscribers: Subscribers<A>
): void => {
  for (
    const [subscription, pollersSet] of subscribers
  ) {
    for (const pollers of pollersSet) {
      strategy.unsafeCompletePollers(pubsub, subscribers, subscription, pollers)
    }
  }
}
