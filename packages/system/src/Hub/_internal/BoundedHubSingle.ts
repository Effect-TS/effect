// ets_tracing: off

import "../../Operator/index.js"

import * as Chunk from "../../Collections/Immutable/Chunk/index.js"
import { Hub, Subscription } from "./Hub.js"

export class BoundedHubSingle<A> extends Hub<A> {
  publisherIndex = 0
  subscriberCount = 0
  subscribers = 0
  value: A = null as unknown as A

  readonly capacity = 1

  constructor() {
    super()
  }

  isEmpty(): boolean {
    return this.subscribers === 0
  }

  isFull(): boolean {
    return !this.isEmpty()
  }

  publish(a: A): boolean {
    if (this.isFull()) {
      return false
    }

    if (this.subscriberCount !== 0) {
      this.value = a
      this.subscribers = this.subscriberCount
      this.publisherIndex += 1
    }

    return true
  }

  publishAll(as: Iterable<A>): Chunk.Chunk<A> {
    const list = Chunk.from(as)

    if (Chunk.isEmpty(list)) {
      return Chunk.empty()
    }

    if (this.publish(Chunk.unsafeHead(list)!)) {
      return Chunk.drop_(list, 1)
    } else {
      return list
    }
  }

  size(): number {
    return this.isEmpty() ? 0 : 1
  }

  slide(): void {
    if (this.isFull()) {
      this.subscribers = 0
      this.value = null as unknown as A
    }
  }

  subscribe(): Subscription<A> {
    this.subscriberCount += 1

    return new BoundedHubSingleSubscription(this, this.publisherIndex, false)
  }
}

class BoundedHubSingleSubscription<A> extends Subscription<A> {
  constructor(
    private self: BoundedHubSingle<A>,
    private subscriberIndex: number,
    private unsubscribed: boolean
  ) {
    super()
  }

  isEmpty(): boolean {
    return (
      this.unsubscribed ||
      this.self.subscribers === 0 ||
      this.subscriberIndex === this.self.publisherIndex
    )
  }

  poll<D>(default_: D): A | D {
    if (this.isEmpty()) {
      return default_
    }

    const a = this.self.value

    this.self.subscribers -= 1

    if (this.self.subscribers === 0) {
      this.self.value = null as unknown as A
    }

    this.subscriberIndex += 1

    return a
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

    return Chunk.single(a)
  }

  size() {
    return this.isEmpty() ? 0 : 1
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
