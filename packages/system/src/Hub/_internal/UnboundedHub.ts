import * as AR from "../../Collections/Immutable/Array"
import type { MutableArray } from "../../Support/Mutable"
import { Hub, Subscription } from "./Hub"

class Node<A> {
  constructor(
    public value: A | null,
    public subscribers: number,
    public next: Node<A> | null
  ) {}
}

export class UnboundedHub<A> extends Hub<A> {
  private publisherHead = new Node<A>(null, 0, null)
  private publisherIndex = 0
  private publisherTail: Node<A>
  private subscribersIndex = 0

  readonly capacity = Number.MAX_SAFE_INTEGER

  constructor() {
    super()

    this.publisherTail = this.publisherHead

    this.isEmpty = this.isEmpty.bind(this)
    this.isFull = this.isFull.bind(this)
    this.publish = this.publish.bind(this)
    this.publishAll = this.publishAll.bind(this)
    this.size = this.size.bind(this)
    this.slide = this.slide.bind(this)
    this.subscribe = this.subscribe.bind(this)
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

  publishAll(as: Iterable<A>): AR.Array<A> {
    AR.from(as).forEach((a) => this.publish(a))

    return AR.empty
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
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this
    let subscriberHead = self.publisherTail
    let subscriberIndex = self.publisherIndex
    let unsubscribed = false

    this.publisherTail.subscribers += 1

    return new (class UnboundedHubSubscription extends Subscription<A> {
      isEmpty(): boolean {
        if (unsubscribed) {
          return true
        }

        let empty = true
        let loop = true

        while (loop) {
          if (subscriberHead === self.publisherTail) {
            loop = false
          } else {
            if (subscriberHead.next!.value !== null) {
              empty = false
              loop = false
            } else {
              subscriberHead = subscriberHead.next!
              subscriberIndex += 1
            }
          }
        }

        return empty
      }

      poll(default_: A): A {
        if (unsubscribed) {
          return default_
        }

        let loop = true
        let polled = default_

        while (loop) {
          if (subscriberHead === self.publisherTail) {
            loop = false
          } else {
            const a = subscriberHead.next!.value

            if (a !== null) {
              polled = a
              subscriberHead.subscribers -= 1

              if (subscriberHead.subscribers === 0) {
                self.publisherHead = self.publisherHead.next!
                self.publisherHead.value = null
                self.subscribersIndex += 1
              }

              loop = false
            }

            subscriberHead = subscriberHead.next!
            subscriberIndex += 1
          }
        }

        return polled
      }

      pollUpTo(n: number): AR.Array<A> {
        const builder: MutableArray<A> = []
        const default_ = null
        let i = 0

        while (i !== n) {
          const a = this.poll((default_ as unknown) as A)
          if (a === default_) {
            i = n
          } else {
            builder.push(a)
            i += 1
          }
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
          self.publisherTail.subscribers -= 1

          while (subscriberHead !== self.publisherTail) {
            if (subscriberHead.next!.value !== null) {
              subscriberHead.subscribers -= 1

              if (subscriberHead.subscribers === 0) {
                self.publisherHead = self.publisherHead.next!
                self.publisherHead.value = null
                self.subscribersIndex += 1
              }
            }
            subscriberHead = subscriberHead.next!
          }
        }
      }
    })()
  }
}
