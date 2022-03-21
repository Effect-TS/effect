// ets_tracing: off

import "../../Operator/index.js"

import * as Chunk from "../../Collections/Immutable/Chunk/index.js"
import { Hub, Subscription } from "./Hub.js"

class Node<A> {
  constructor(
    public value: A | null,
    public subscribers: number,
    public next: Node<A> | null
  ) {}
}

export class UnboundedHub<A> extends Hub<A> {
  publisherHead = new Node<A>(null, 0, null)
  publisherIndex = 0
  publisherTail: Node<A>
  subscribersIndex = 0

  readonly capacity = Number.MAX_SAFE_INTEGER

  constructor() {
    super()

    this.publisherTail = this.publisherHead
  }

  isEmpty(): boolean {
    return this.publisherHead === this.publisherTail
  }

  isFull(): boolean {
    return false
  }

  publish(a: A): boolean {
    const subscribers = this.publisherTail.subscribers

    if (subscribers !== 0) {
      this.publisherTail.next = new Node(a, subscribers, null)
      this.publisherTail = this.publisherTail.next
      this.publisherIndex += 1
    }

    return true
  }

  publishAll(as: Iterable<A>): Chunk.Chunk<A> {
    for (const a of as) {
      this.publish(a)
    }
    return Chunk.empty()
  }

  size(): number {
    return this.publisherIndex - this.subscribersIndex
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

    return new UnboundedHubSubscription(
      this,
      this.publisherTail,
      this.publisherIndex,
      false
    )
  }
}

class UnboundedHubSubscription<A> extends Subscription<A> {
  constructor(
    private self: UnboundedHub<A>,
    private subscriberHead: Node<A>,
    private subscriberIndex: number,
    private unsubscribed: boolean
  ) {
    super()
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
        const a = this.subscriberHead.next!.value

        if (a !== null) {
          polled = a
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
    let builder = Chunk.empty<A>()
    const default_ = null
    let i = 0

    while (i !== n) {
      const a = this.poll(default_ as unknown as A)
      if (a === default_) {
        i = n
      } else {
        builder = Chunk.append_(builder, a)
        i += 1
      }
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
