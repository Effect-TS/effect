// ets_tracing: off

import "../../Operator/index.js"

import * as Chunk from "../../Collections/Immutable/Chunk/index.js"
import type { MutableArray } from "../../Support/Mutable/index.js"
import { Hub, Subscription } from "./Hub.js"

export class BoundedHubArb<A> extends Hub<A> {
  array: MutableArray<A>
  publisherIndex = 0
  subscribers: MutableArray<number>
  subscriberCount = 0
  subscribersIndex = 0

  readonly capacity: number

  constructor(requestedCapacity: number) {
    super()

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

  publish(a: A): boolean {
    if (this.isFull()) {
      return false
    }

    if (this.subscriberCount !== 0) {
      const index = this.publisherIndex % this.capacity

      this.array[index] = a
      this.subscribers[index] = this.subscriberCount
      this.publisherIndex += 1
    }

    return true
  }

  publishAll(as: Iterable<A>): Chunk.Chunk<A> {
    const asArray = Chunk.from(as)
    const n = Chunk.size(asArray)
    const size = this.publisherIndex - this.subscribersIndex
    const available = this.capacity - size
    const forHub = Math.min(n, available)

    if (forHub === 0) {
      return asArray
    }

    let iteratorIndex = 0
    const publishAllIndex = this.publisherIndex + forHub

    while (this.publisherIndex !== publishAllIndex) {
      const a = Chunk.unsafeGet_(asArray, iteratorIndex++)
      const index = this.publisherIndex % this.capacity
      this.array[index] = a
      this.publisherIndex += 1
    }

    return Chunk.drop_(asArray, iteratorIndex - 1)
  }

  size(): number {
    return this.publisherIndex - this.subscribersIndex
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

    return new BoundedHubArbSubscription(this, this.publisherIndex, false)
  }
}

class BoundedHubArbSubscription<A> extends Subscription<A> {
  constructor(
    private self: BoundedHubArb<A>,
    private subscriberIndex: number,
    private unsubscribed: boolean
  ) {
    super()
  }

  isEmpty(): boolean {
    return (
      this.unsubscribed ||
      this.self.publisherIndex === this.subscriberIndex ||
      this.self.publisherIndex === this.self.subscribersIndex
    )
  }

  poll<D>(default_: D): A | D {
    if (this.unsubscribed) {
      return default_
    }

    this.subscriberIndex = Math.max(this.subscriberIndex, this.self.subscribersIndex)

    if (this.subscriberIndex !== this.self.publisherIndex) {
      const index = this.subscriberIndex % this.self.capacity
      const a = this.self.array[index]!

      this.self.subscribers[index] -= 1

      if (this.self.subscribers[index] === 0) {
        this.self.array[index] = null as unknown as A
        this.self.subscribersIndex += 1
      }

      this.subscriberIndex += 1
      return a
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

    let builder = Chunk.empty<A>()
    const pollUpToIndex = this.subscriberIndex + toPoll

    while (this.subscriberIndex !== pollUpToIndex) {
      const index = this.subscriberIndex % this.self.capacity
      const a = this.self.array[index] as A
      builder = Chunk.append_(builder, a)
      this.subscriberIndex += 1
    }

    return builder
  }

  size() {
    if (this.unsubscribed) {
      return 0
    }

    return (
      this.self.publisherIndex -
      Math.max(this.subscriberIndex, this.self.subscribersIndex)
    )
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
