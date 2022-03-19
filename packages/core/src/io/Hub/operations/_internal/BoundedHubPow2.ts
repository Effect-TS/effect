import { Chunk } from "../../../../collection/immutable/Chunk"
import type { MutableArray } from "../../../../support/Mutable"
import type { AtomicHub } from "./AtomicHub"
import { Subscription } from "./Subscription"

export class BoundedHubPow2<A> implements AtomicHub<A> {
  array: MutableArray<A>
  mask: number
  publisherIndex = 0
  subscribers: MutableArray<number>
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

  publish(a: A): boolean {
    if (this.isFull()) {
      return false
    }

    if (this.subscriberCount !== 0) {
      const index = this.publisherIndex & this.mask

      this.array[index] = a

      this.subscribers[index] = this.subscriberCount
      this.publisherIndex += 1
    }

    return true
  }

  publishAll(as: Iterable<A>): Chunk<A> {
    const asArray = Chunk.from(as)
    const n = asArray.size
    const size = this.publisherIndex - this.subscribersIndex
    const available = this.capacity - size
    const forHub = Math.min(n, available)

    if (forHub === 0) {
      return asArray
    }

    let iteratorIndex = 0
    const publishAllIndex = this.publisherIndex + forHub

    while (this.publisherIndex !== publishAllIndex) {
      const a = asArray.unsafeGet(iteratorIndex++)!
      const index = this.publisherIndex & this.mask
      this.array[index] = a
      this.subscribers[index] = this.subscriberCount
      this.publisherIndex += 1
    }

    return asArray.drop(iteratorIndex - 1)
  }

  size(): number {
    return this.publisherIndex - this.subscribersIndex
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
    return new BoundedHubPow2Subscription(this, this.publisherIndex, false)
  }
}

class BoundedHubPow2Subscription<A> extends Subscription<A> {
  constructor(
    private self: BoundedHubPow2<A>,
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

  poll(default_: A): A {
    if (this.unsubscribed) {
      return default_
    }

    this.subscriberIndex = Math.max(this.subscriberIndex, this.self.subscribersIndex)

    if (this.subscriberIndex !== this.self.publisherIndex) {
      const index = this.subscriberIndex & this.self.mask
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

  pollUpTo(n: number): Chunk<A> {
    if (this.unsubscribed) {
      return Chunk.empty()
    }

    this.subscriberIndex = Math.max(this.subscriberIndex, this.self.subscribersIndex)
    const size = this.self.publisherIndex - this.subscriberIndex
    const toPoll = Math.min(n, size)

    if (toPoll <= 0) {
      return Chunk.empty()
    }

    const builder = Chunk.builder<A>()
    const pollUpToIndex = this.subscriberIndex + toPoll

    while (this.subscriberIndex !== pollUpToIndex) {
      const index = this.subscriberIndex & this.self.mask
      const a = this.self.array[index] as A

      this.self.subscribers[index] -= 1

      if (this.self.subscribers[index] === 0) {
        this.self.array[index] = null as unknown as A
        this.self.subscribersIndex += 1
      }

      builder.append(a)
      this.subscriberIndex += 1
    }

    return builder.build()
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
