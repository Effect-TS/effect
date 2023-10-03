import * as Effect from "../../Effect"
import { dual, identity, pipe } from "../../Function"
import * as HashSet from "../../HashSet"
import * as Option from "../../Option"
import * as RA from "../../ReadonlyArray"
import type * as Scope from "../../Scope"
import type * as STM from "../../STM"
import type * as TPubSub from "../../TPubSub"
import type * as TQueue from "../../TQueue"
import type * as TRef from "../../TRef"
import * as core from "./core"
import * as OpCodes from "./opCodes/strategy"
import * as stm from "./stm"
import * as tQueue from "./tQueue"
import * as tRef from "./tRef"

/** @internal */
const TPubSubSymbolKey = "effect/TPubSub"

/** @internal */
export const TPubSubTypeId: TPubSub.TPubSubTypeId = Symbol.for(TPubSubSymbolKey) as TPubSub.TPubSubTypeId

/** @internal */
export interface Node<A> {
  readonly head: A
  readonly subscribers: number
  readonly tail: TRef.TRef<Node<A> | undefined>
}

/** @internal */
export const makeNode = <A>(
  head: A,
  subscribers: number,
  tail: TRef.TRef<Node<A> | undefined>
): Node<A> => ({
  head,
  subscribers,
  tail
})

/** @internal */
class TPubSubImpl<A> implements TPubSub.TPubSub<A> {
  readonly [TPubSubTypeId]: TPubSub.TPubSubTypeId = TPubSubTypeId
  readonly [tQueue.TEnqueueTypeId] = tQueue.tEnqueueVariance
  constructor(
    readonly pubsubSize: TRef.TRef<number>,
    readonly publisherHead: TRef.TRef<TRef.TRef<Node<A> | undefined>>,
    readonly publisherTail: TRef.TRef<TRef.TRef<Node<A> | undefined> | undefined>,
    readonly requestedCapacity: number,
    readonly strategy: tQueue.TQueueStrategy,
    readonly subscriberCount: TRef.TRef<number>,
    readonly subscribers: TRef.TRef<HashSet.HashSet<TRef.TRef<TRef.TRef<Node<A>> | undefined>>>
  ) {}

  isShutdown: STM.STM<never, never, boolean> = core.effect<never, boolean>((journal) => {
    const currentPublisherTail = tRef.unsafeGet(this.publisherTail, journal)
    return currentPublisherTail === undefined
  })

  awaitShutdown: STM.STM<never, never, void> = core.flatMap(
    this.isShutdown,
    (isShutdown) => isShutdown ? stm.unit : core.retry
  )

  capacity(): number {
    return this.requestedCapacity
  }

  size: STM.STM<never, never, number> = core.withSTMRuntime((runtime) => {
    const currentPublisherTail = tRef.unsafeGet(this.publisherTail, runtime.journal)
    if (currentPublisherTail === undefined) {
      return core.interruptAs(runtime.fiberId)
    }
    return core.succeed(tRef.unsafeGet(this.pubsubSize, runtime.journal))
  })

  isEmpty: STM.STM<never, never, boolean> = core.map(this.size, (size) => size === 0)

  isFull: STM.STM<never, never, boolean> = core.map(this.size, (size) => size === this.capacity())

  offer(value: A): STM.STM<never, never, boolean> {
    return core.withSTMRuntime((runtime) => {
      const currentPublisherTail = tRef.unsafeGet(this.publisherTail, runtime.journal)
      if (currentPublisherTail === undefined) {
        return core.interruptAs(runtime.fiberId)
      }
      const currentSubscriberCount = tRef.unsafeGet(this.subscriberCount, runtime.journal)
      if (currentSubscriberCount === 0) {
        return core.succeed(true)
      }
      const currentPubSubSize = tRef.unsafeGet(this.pubsubSize, runtime.journal)
      if (currentPubSubSize < this.requestedCapacity) {
        const updatedPublisherTail: TRef.TRef<Node<A> | undefined> = new tRef.TRefImpl(void 0)
        const updatedNode = makeNode(value, currentSubscriberCount, updatedPublisherTail)
        tRef.unsafeSet<Node<A> | undefined>(currentPublisherTail, updatedNode, runtime.journal)
        tRef.unsafeSet<TRef.TRef<Node<A> | undefined> | undefined>(
          this.publisherTail,
          updatedPublisherTail,
          runtime.journal
        )
        tRef.unsafeSet(this.pubsubSize, currentPubSubSize + 1, runtime.journal)
        return core.succeed(true)
      }
      switch (this.strategy._tag) {
        case OpCodes.OP_BACKPRESSURE_STRATEGY: {
          return core.retry
        }
        case OpCodes.OP_DROPPING_STRATEGY: {
          return core.succeed(false)
        }
        case OpCodes.OP_SLIDING_STRATEGY: {
          if (this.requestedCapacity > 0) {
            let currentPublisherHead: TRef.TRef<Node<A> | undefined> = tRef.unsafeGet(
              this.publisherHead,
              runtime.journal
            )
            let loop = true
            while (loop) {
              const node = tRef.unsafeGet(currentPublisherHead, runtime.journal)
              if (node === undefined) {
                return core.retry
              }
              const head = node.head
              const tail = node.tail
              if (head !== undefined) {
                const updatedNode = makeNode(void 0, node.subscribers, node.tail)
                tRef.unsafeSet<Node<A | undefined> | undefined>(currentPublisherHead, updatedNode, runtime.journal)
                tRef.unsafeSet(this.publisherHead, tail, runtime.journal)
                loop = false
              } else {
                currentPublisherHead = tail
              }
            }
          }
          const updatedPublisherTail: TRef.TRef<Node<A> | undefined> = new tRef.TRefImpl(void 0)
          const updatedNode = makeNode(value, currentSubscriberCount, updatedPublisherTail)
          tRef.unsafeSet<Node<A> | undefined>(currentPublisherTail, updatedNode, runtime.journal)
          tRef.unsafeSet<TRef.TRef<Node<A> | undefined> | undefined>(
            this.publisherTail,
            updatedPublisherTail,
            runtime.journal
          )
          return core.succeed(true)
        }
      }
    })
  }

  offerAll(iterable: Iterable<A>): STM.STM<never, never, boolean> {
    return core.map(
      stm.forEach(iterable, (a) => this.offer(a)),
      RA.every(identity)
    )
  }

  shutdown: STM.STM<never, never, void> = core.effect<never, void>((journal) => {
    const currentPublisherTail = tRef.unsafeGet(this.publisherTail, journal)
    if (currentPublisherTail !== undefined) {
      tRef.unsafeSet<TRef.TRef<Node<A> | undefined> | undefined>(this.publisherTail, void 0, journal)
      const currentSubscribers = tRef.unsafeGet(this.subscribers, journal)
      HashSet.forEach(currentSubscribers, (subscriber) => {
        tRef.unsafeSet<TRef.TRef<Node<A>> | undefined>(subscriber, void 0, journal)
      })
      tRef.unsafeSet(this.subscribers, HashSet.empty<TRef.TRef<TRef.TRef<Node<A>> | undefined>>(), journal)
    }
  })
}

/** @internal */
class TPubSubSubscriptionImpl<A> implements TQueue.TDequeue<A> {
  readonly [TPubSubTypeId]: TPubSub.TPubSubTypeId = TPubSubTypeId
  readonly [tQueue.TDequeueTypeId] = tQueue.tDequeueVariance
  constructor(
    readonly pubsubSize: TRef.TRef<number>,
    readonly publisherHead: TRef.TRef<TRef.TRef<Node<A> | undefined>>,
    readonly requestedCapacity: number,
    readonly subscriberHead: TRef.TRef<TRef.TRef<Node<A | undefined> | undefined> | undefined>,
    readonly subscriberCount: TRef.TRef<number>,
    readonly subscribers: TRef.TRef<HashSet.HashSet<TRef.TRef<TRef.TRef<Node<A>> | undefined>>>
  ) {}

  isShutdown: STM.STM<never, never, boolean> = core.effect<never, boolean>((journal) => {
    const currentSubscriberHead = tRef.unsafeGet(this.subscriberHead, journal)
    return currentSubscriberHead === undefined
  })

  awaitShutdown: STM.STM<never, never, void> = core.flatMap(
    this.isShutdown,
    (isShutdown) => isShutdown ? stm.unit : core.retry
  )

  capacity(): number {
    return this.requestedCapacity
  }
  size: STM.STM<never, never, number> = core.withSTMRuntime((runtime) => {
    let currentSubscriberHead = tRef.unsafeGet(this.subscriberHead, runtime.journal)
    if (currentSubscriberHead === undefined) {
      return core.interruptAs(runtime.fiberId)
    }
    let loop = true
    let size = 0
    while (loop) {
      const node = tRef.unsafeGet(currentSubscriberHead, runtime.journal)
      if (node === undefined) {
        loop = false
      } else {
        const head = node.head
        const tail: TRef.TRef<Node<A | undefined> | undefined> = node.tail
        if (head !== undefined) {
          size = size + 1
          if (size >= Number.MAX_SAFE_INTEGER) {
            loop = false
          }
        }
        currentSubscriberHead = tail
      }
    }
    return core.succeed(size)
  })

  isEmpty: STM.STM<never, never, boolean> = core.map(this.size, (size) => size === 0)

  isFull: STM.STM<never, never, boolean> = core.map(this.size, (size) => size === this.capacity())

  peek: STM.STM<never, never, A> = core.withSTMRuntime((runtime) => {
    let currentSubscriberHead = tRef.unsafeGet(this.subscriberHead, runtime.journal)
    if (currentSubscriberHead === undefined) {
      return core.interruptAs(runtime.fiberId)
    }
    let value: A | undefined = undefined
    let loop = true
    while (loop) {
      const node = tRef.unsafeGet(currentSubscriberHead, runtime.journal)
      if (node === undefined) {
        return core.retry
      }
      const head = node.head
      const tail: TRef.TRef<Node<A | undefined> | undefined> = node.tail
      if (head !== undefined) {
        value = head
        loop = false
      } else {
        currentSubscriberHead = tail
      }
    }
    return core.succeed(value!)
  })

  peekOption: STM.STM<never, never, Option.Option<A>> = core.withSTMRuntime((runtime) => {
    let currentSubscriberHead = tRef.unsafeGet(this.subscriberHead, runtime.journal)
    if (currentSubscriberHead === undefined) {
      return core.interruptAs(runtime.fiberId)
    }
    let value: Option.Option<A> = Option.none()
    let loop = true
    while (loop) {
      const node = tRef.unsafeGet(currentSubscriberHead, runtime.journal)
      if (node === undefined) {
        value = Option.none()
        loop = false
      } else {
        const head = node.head
        const tail: TRef.TRef<Node<A | undefined> | undefined> = node.tail
        if (head !== undefined) {
          value = Option.some(head)
          loop = false
        } else {
          currentSubscriberHead = tail
        }
      }
    }
    return core.succeed(value)
  })

  shutdown: STM.STM<never, never, void> = core.effect<never, void>((journal) => {
    let currentSubscriberHead = tRef.unsafeGet(this.subscriberHead, journal)
    if (currentSubscriberHead !== undefined) {
      tRef.unsafeSet<TRef.TRef<Node<A | undefined> | undefined> | undefined>(this.subscriberHead, void 0, journal)
      let loop = true
      while (loop) {
        const node = tRef.unsafeGet(currentSubscriberHead, journal)
        if (node === undefined) {
          loop = false
        } else {
          const head = node.head
          const tail: TRef.TRef<Node<A | undefined> | undefined> = node.tail
          if (head !== undefined) {
            const subscribers = node.subscribers
            if (subscribers === 1) {
              const size = tRef.unsafeGet(this.pubsubSize, journal)
              const updatedNode = makeNode(undefined, 0, tail)
              tRef.unsafeSet<Node<A | undefined> | undefined>(currentSubscriberHead, updatedNode, journal)
              tRef.unsafeSet(this.publisherHead, tail, journal)
              tRef.unsafeSet(this.pubsubSize, size - 1, journal)
            } else {
              const updatedNode = makeNode(head, subscribers - 1, tail)
              tRef.unsafeSet<Node<A | undefined> | undefined>(currentSubscriberHead, updatedNode, journal)
            }
          }
          currentSubscriberHead = tail
        }
      }
      const currentSubscriberCount = tRef.unsafeGet(this.subscriberCount, journal)
      tRef.unsafeSet(this.subscriberCount, currentSubscriberCount - 1, journal)
      tRef.unsafeSet(
        this.subscribers,
        HashSet.remove(
          tRef.unsafeGet(this.subscribers, journal),
          this.subscriberHead
        ),
        journal
      )
    }
  })

  take: STM.STM<never, never, A> = core.withSTMRuntime((runtime) => {
    let currentSubscriberHead = tRef.unsafeGet(this.subscriberHead, runtime.journal)
    if (currentSubscriberHead === undefined) {
      return core.interruptAs(runtime.fiberId)
    }
    let value: A | undefined = undefined
    let loop = true
    while (loop) {
      const node = tRef.unsafeGet(currentSubscriberHead, runtime.journal)
      if (node === undefined) {
        return core.retry
      }
      const head = node.head
      const tail: TRef.TRef<Node<A | undefined> | undefined> = node.tail
      if (head !== undefined) {
        const subscribers = node.subscribers
        if (subscribers === 1) {
          const size = tRef.unsafeGet(this.pubsubSize, runtime.journal)
          const updatedNode = makeNode(void 0, 0, tail)
          tRef.unsafeSet<Node<A | undefined> | undefined>(currentSubscriberHead, updatedNode, runtime.journal)
          tRef.unsafeSet(this.publisherHead, tail, runtime.journal)
          tRef.unsafeSet(this.pubsubSize, size - 1, runtime.journal)
        } else {
          const updatedNode = makeNode(head, subscribers - 1, tail)
          tRef.unsafeSet<Node<A | undefined> | undefined>(currentSubscriberHead, updatedNode, runtime.journal)
        }
        tRef.unsafeSet<TRef.TRef<Node<A | undefined> | undefined> | undefined>(
          this.subscriberHead,
          tail,
          runtime.journal
        )
        value = head
        loop = false
      } else {
        currentSubscriberHead = tail
      }
    }
    return core.succeed(value!)
  })

  takeAll: STM.STM<never, never, Array<A>> = this.takeUpTo(Number.POSITIVE_INFINITY)

  takeUpTo(max: number): STM.STM<never, never, Array<A>> {
    return core.withSTMRuntime((runtime) => {
      let currentSubscriberHead = tRef.unsafeGet(this.subscriberHead, runtime.journal)
      if (currentSubscriberHead === undefined) {
        return core.interruptAs(runtime.fiberId)
      }
      const builder: Array<A> = []
      let n = 0
      while (n !== max) {
        const node = tRef.unsafeGet(currentSubscriberHead, runtime.journal)
        if (node === undefined) {
          n = max
        } else {
          const head = node.head
          const tail: TRef.TRef<Node<A | undefined> | undefined> = node.tail
          if (head !== undefined) {
            const subscribers = node.subscribers
            if (subscribers === 1) {
              const size = tRef.unsafeGet(this.pubsubSize, runtime.journal)
              const updatedNode = makeNode(void 0, 0, tail)
              tRef.unsafeSet<Node<A | undefined> | undefined>(currentSubscriberHead, updatedNode, runtime.journal)
              tRef.unsafeSet(this.publisherHead, tail, runtime.journal)
              tRef.unsafeSet(this.pubsubSize, size - 1, runtime.journal)
            } else {
              const updatedNode = makeNode(head, subscribers - 1, tail)
              tRef.unsafeSet<Node<A | undefined> | undefined>(currentSubscriberHead, updatedNode, runtime.journal)
            }
            builder.push(head)
            n = n + 1
          }
          currentSubscriberHead = tail
        }
      }
      tRef.unsafeSet<TRef.TRef<Node<A | undefined> | undefined> | undefined>(
        this.subscriberHead,
        currentSubscriberHead,
        runtime.journal
      )
      return core.succeed(builder)
    })
  }
}

/** @internal */
const makeTPubSub = <A>(
  requestedCapacity: number,
  strategy: tQueue.TQueueStrategy
): STM.STM<never, never, TPubSub.TPubSub<A>> =>
  pipe(
    stm.all([
      tRef.make<Node<A> | undefined>(void 0),
      tRef.make(0)
    ]),
    core.flatMap(([empty, pubsubSize]) =>
      pipe(
        stm.all([
          tRef.make(empty),
          tRef.make(empty),
          tRef.make(0),
          tRef.make(HashSet.empty())
        ]),
        core.map(([publisherHead, publisherTail, subscriberCount, subscribers]) =>
          new TPubSubImpl(
            pubsubSize,
            publisherHead,
            publisherTail,
            requestedCapacity,
            strategy,
            subscriberCount,
            subscribers
          )
        )
      )
    )
  )

const makeSubscription = <A>(
  pubsubSize: TRef.TRef<number>,
  publisherHead: TRef.TRef<TRef.TRef<Node<A> | undefined>>,
  publisherTail: TRef.TRef<TRef.TRef<Node<A> | undefined> | undefined>,
  requestedCapacity: number,
  subscriberCount: TRef.TRef<number>,
  subscribers: TRef.TRef<HashSet.HashSet<TRef.TRef<TRef.TRef<Node<A>> | undefined>>>
): STM.STM<never, never, TQueue.TDequeue<A>> =>
  pipe(
    tRef.get(publisherTail),
    core.flatMap((currentPublisherTail) =>
      pipe(
        stm.all([
          tRef.make(currentPublisherTail),
          tRef.get(subscriberCount),
          tRef.get(subscribers)
        ]),
        stm.tap(([_, currentSubscriberCount]) =>
          pipe(
            subscriberCount,
            tRef.set(currentSubscriberCount + 1)
          )
        ),
        stm.tap(([subscriberHead, _, currentSubscribers]) =>
          pipe(
            subscribers,
            tRef.set(pipe(currentSubscribers, HashSet.add(subscriberHead)))
          )
        ),
        core.map(([subscriberHead]) =>
          new TPubSubSubscriptionImpl(
            pubsubSize,
            publisherHead,
            requestedCapacity,
            subscriberHead,
            subscriberCount,
            subscribers
          )
        )
      )
    )
  )

/** @internal */
export const awaitShutdown = <A>(self: TPubSub.TPubSub<A>): STM.STM<never, never, void> => self.awaitShutdown

/** @internal */
export const bounded = <A>(requestedCapacity: number): STM.STM<never, never, TPubSub.TPubSub<A>> =>
  makeTPubSub<A>(requestedCapacity, tQueue.BackPressure)

/** @internal */
export const capacity = <A>(self: TPubSub.TPubSub<A>): number => self.capacity()

/** @internal */
export const dropping = <A>(requestedCapacity: number): STM.STM<never, never, TPubSub.TPubSub<A>> =>
  makeTPubSub<A>(requestedCapacity, tQueue.Dropping)

/** @internal */
export const isEmpty = <A>(self: TPubSub.TPubSub<A>): STM.STM<never, never, boolean> => self.isEmpty

/** @internal */
export const isFull = <A>(self: TPubSub.TPubSub<A>): STM.STM<never, never, boolean> => self.isFull

/** @internal */
export const isShutdown = <A>(self: TPubSub.TPubSub<A>): STM.STM<never, never, boolean> => self.isShutdown

/** @internal */
export const publish = dual<
  <A>(value: A) => (self: TPubSub.TPubSub<A>) => STM.STM<never, never, boolean>,
  <A>(self: TPubSub.TPubSub<A>, value: A) => STM.STM<never, never, boolean>
>(2, (self, value) => self.offer(value))

/** @internal */
export const publishAll = dual<
  <A>(iterable: Iterable<A>) => (self: TPubSub.TPubSub<A>) => STM.STM<never, never, boolean>,
  <A>(self: TPubSub.TPubSub<A>, iterable: Iterable<A>) => STM.STM<never, never, boolean>
>(2, (self, iterable) => self.offerAll(iterable))

/** @internal */
export const size = <A>(self: TPubSub.TPubSub<A>): STM.STM<never, never, number> => self.size

/** @internal */
export const shutdown = <A>(self: TPubSub.TPubSub<A>): STM.STM<never, never, void> => self.shutdown

/** @internal */
export const sliding = <A>(requestedCapacity: number): STM.STM<never, never, TPubSub.TPubSub<A>> =>
  makeTPubSub<A>(requestedCapacity, tQueue.Sliding)

/** @internal */
export const subscribe = <A>(self: TPubSub.TPubSub<A>): STM.STM<never, never, TQueue.TDequeue<A>> =>
  makeSubscription(
    self.pubsubSize,
    self.publisherHead,
    self.publisherTail,
    self.requestedCapacity,
    self.subscriberCount,
    self.subscribers
  )

/** @internal */
export const subscribeScoped = <A>(self: TPubSub.TPubSub<A>): Effect.Effect<Scope.Scope, never, TQueue.TDequeue<A>> =>
  Effect.acquireRelease(
    subscribe(self),
    (dequeue) => tQueue.shutdown(dequeue)
  )

/** @internal */
export const unbounded = <A>(): STM.STM<never, never, TPubSub.TPubSub<A>> =>
  makeTPubSub<A>(Number.MAX_SAFE_INTEGER, tQueue.Dropping)
