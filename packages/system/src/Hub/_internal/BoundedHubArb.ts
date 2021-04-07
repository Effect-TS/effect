import * as AR from "../../Collections/Immutable/Array"
import type { MutableArray } from "../../Support/Mutable"
import { Hub, Subscription } from "./Hub"

export class BoundedHubArb<A> extends Hub<A> {
  private array: MutableArray<A>
  private publisherIndex = 0
  private subscribers: MutableArray<number>
  private subscriberCount = 0
  private subscribersIndex = 0

  readonly capacity: number

  constructor(requestedCapacity: number) {
    super()

    this.array = Array.from({ length: requestedCapacity })
    this.subscribers = Array.from({ length: requestedCapacity })
    this.capacity = requestedCapacity

    this.isEmpty = this.isEmpty.bind(this)
    this.isFull = this.isFull.bind(this)
    this.publish = this.publish.bind(this)
    this.publishAll = this.publishAll.bind(this)
    this.size = this.size.bind(this)
    this.slide = this.slide.bind(this)
    this.subscribe = this.subscribe.bind(this)
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

  publishAll(as: Iterable<A>): AR.Array<A> {
    const asArray = AR.from(as)
    const n = asArray.length
    const size = this.publisherIndex - this.subscribersIndex
    const available = this.capacity - size
    const forHub = Math.min(n, available)

    if (forHub === 0) {
      return asArray
    }

    let iteratorIndex = 0
    const publishAllIndex = this.publisherIndex + forHub

    while (this.publisherIndex !== publishAllIndex) {
      const a = asArray[iteratorIndex++]!
      const index = this.publisherIndex % this.capacity
      this.array[index] = a
      this.publisherIndex += 1
    }

    return AR.dropLeft_(asArray, iteratorIndex - 1)
  }

  size(): number {
    return this.publisherIndex - this.subscribersIndex
  }

  slide(): void {
    if (this.subscribersIndex !== this.publisherIndex) {
      const index = this.subscribersIndex % this.capacity

      this.array[index] = (null as unknown) as A
      this.subscribers[index] = 0
      this.subscribersIndex += 1
    }
  }

  subscribe(): Subscription<A> {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this
    let subscriberIndex = self.publisherIndex
    let unsubscribed = false

    this.subscriberCount += 1

    return new (class BoundedHubArbSubscription extends Subscription<A> {
      isEmpty(): boolean {
        return (
          unsubscribed ||
          self.publisherIndex === subscriberIndex ||
          self.publisherIndex === self.subscribersIndex
        )
      }

      poll(default_: A): A {
        if (unsubscribed) {
          return default_
        }

        subscriberIndex = Math.max(subscriberIndex, self.subscribersIndex)

        if (subscriberIndex !== self.publisherIndex) {
          const index = subscriberIndex % self.capacity
          const a = self.array[index]!

          self.subscribers[index] -= 1

          if (self.subscribers[index] === 0) {
            self.array[index] = (null as unknown) as A
            self.subscribersIndex += 1
          }

          subscriberIndex += 1
          return a
        }

        return default_
      }

      pollUpTo(n: number): AR.Array<A> {
        if (unsubscribed) {
          return AR.empty
        }

        subscriberIndex = Math.max(subscriberIndex, self.subscribersIndex)
        const size = self.publisherIndex - subscriberIndex
        const toPoll = Math.min(n, size)

        if (toPoll <= 0) {
          return AR.empty
        }

        const builder: MutableArray<A> = []
        const pollUpToIndex = subscriberIndex + toPoll

        while (subscriberIndex !== pollUpToIndex) {
          const index = subscriberIndex % self.capacity
          const a = self.array[index] as A
          builder.push(a)
          subscriberIndex += 1
        }

        return builder
      }

      size() {
        if (unsubscribed) {
          return 0
        }

        return self.publisherIndex - Math.max(subscriberIndex, self.subscribersIndex)
      }

      unsubscribe(): void {
        if (!unsubscribed) {
          unsubscribed = true
          self.subscriberCount -= 1
          subscriberIndex = Math.max(subscriberIndex, self.subscribersIndex)

          while (subscriberIndex !== self.publisherIndex) {
            const index = subscriberIndex % self.capacity
            self.subscribers[index] -= 1

            if (self.subscribers[index] === 0) {
              self.array[index] = (null as unknown) as A
              self.subscribersIndex += 1
            }

            subscriberIndex += 1
          }
        }
      }
    })()
  }
}
