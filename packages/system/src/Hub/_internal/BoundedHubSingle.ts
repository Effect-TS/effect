import * as AR from "../../Collections/Immutable/Array"
import { Hub, Subscription } from "./Hub"

export class BoundedHubSingle<A> extends Hub<A> {
  private publisherIndex = 0
  private subscriberCount = 0
  private subscribers = 0
  private value: A = (null as unknown) as A

  readonly capacity = 1

  constructor() {
    super()
    this.isEmpty = this.isEmpty.bind(this)
    this.isFull = this.isFull.bind(this)
    this.publish = this.publish.bind(this)
    this.publishAll = this.publishAll.bind(this)
    this.size = this.size.bind(this)
    this.slide = this.slide.bind(this)
    this.subscribe = this.subscribe.bind(this)
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

  publishAll(as: Iterable<A>): AR.Array<A> {
    const array = AR.from(as)

    if (AR.isEmpty(array)) {
      return AR.empty
    }

    const [h, ...tail] = array

    if (this.publish(h!)) {
      return tail
    } else {
      return array
    }
  }

  size(): number {
    return this.isEmpty() ? 0 : 1
  }

  slide(): void {
    if (this.isFull()) {
      this.subscribers = 0
      this.value = (null as unknown) as A
    }
  }

  subscribe(): Subscription<A> {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this
    let subscriberIndex = self.publisherIndex
    let unsubscribed = false

    this.subscriberCount += 1

    return new (class BoundedHubSingleSubscription extends Subscription<A> {
      isEmpty(): boolean {
        return (
          unsubscribed ||
          self.subscribers === 0 ||
          subscriberIndex === self.publisherIndex
        )
      }

      poll(default_: A): A {
        if (this.isEmpty()) {
          return default_
        }

        const a = self.value

        self.subscribers -= 1

        if (self.subscribers === 0) {
          self.value = (null as unknown) as A
        }

        subscriberIndex += 1

        return a
      }

      pollUpTo(n: number): AR.Array<A> {
        if (this.isEmpty() || n < 1) {
          return AR.empty
        }

        const a = self.value

        self.subscribers -= 1

        if (self.subscribers === 0) {
          self.value = (null as unknown) as A
        }

        subscriberIndex += 1

        return AR.single(a as A)
      }

      size() {
        return this.isEmpty() ? 0 : 1
      }

      unsubscribe(): void {
        if (!unsubscribed) {
          unsubscribed = true
          self.subscriberCount -= 1

          if (subscriberIndex !== self.publisherIndex) {
            self.subscribers -= 1

            if (self.subscribers === 0) {
              self.value = (null as unknown) as A
            }
          }
        }
      }
    })()
  }
}
