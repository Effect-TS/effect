// tracing: off

import "../../Operator"

import type { HasHash } from "../../Case"
import { hashSym } from "../../Case"
import { incrementalHash } from "../../Hash"
import { DoublyLinkedList } from "../DoublyLinkedList"

export interface MutableQueue<A> extends HasHash {
  /**
   * The '''maximum''' number of elements that a queue can hold.
   *
   * @note that unbounded queues can still implement this interface
   * with `capacity = MAX_NUMBER`.
   */
  readonly capacity: number
  /**
   * A non-blocking enqueue.
   *
   * @return whether the enqueue was successful or not.
   */
  readonly offer: (a: A) => boolean

  /**
   * A non-blocking enqueue.
   *
   * @return elements that were not enqueued
   */
  readonly offerAll: (a: Iterable<A>) => readonly A[]

  /**
   * A non-blocking dequeue.
   *
   * @return either an element from the queue, or the `default`
   * param.
   *
   * @note that if there's no meaningful default for your type, you
   * can always use `poll(undefined)`. Not the best, but reasonable price
   * to pay for lower heap churn.
   */
  readonly poll: (a: A | undefined) => A | undefined

  /**
   * A non-blocking dequeue.
   *
   * @return an array of up to `n` elements
   */
  readonly pollUpTo: (n: number) => readonly A[]
  /**
   * @return the '''current''' number of elements inside the queue.
   *
   * @note that this method can be non-atomic and return the
   * approximate number in a concurrent setting.
   */
  readonly size: number
  /**
   * @return if the queue is empty
   */
  readonly isEmpty: boolean
  /**
   * @return if the queue is full
   */
  readonly isFull: boolean
}

export class Unbounded<A> implements MutableQueue<A> {
  private queue = new DoublyLinkedList<A>()

  get size() {
    return this.queue.length
  }

  get isEmpty() {
    return this.size === 0
  }

  get isFull() {
    return false
  }

  get capacity() {
    return Number.MAX_SAFE_INTEGER
  }

  offer(a: A) {
    this.queue.add(a)
    return true
  }

  offerAll(as: Iterable<A>): readonly A[] {
    for (const a of as) {
      this.offer(a)
    }

    return []
  }

  poll(a: A | undefined) {
    if (this.isEmpty) {
      return a
    }
    return this.queue.shift()
  }

  pollUpTo(n: number): readonly A[] {
    const result: A[] = []
    const count = 0

    while (count < n) {
      const elem = this.poll(undefined)

      if (elem === undefined) {
        break
      }

      result.push(elem)
    }

    return result
  }

  [hashSym](): number {
    return incrementalHash(this)
  }
}

export class Bounded<A> implements MutableQueue<A> {
  private queue = new DoublyLinkedList<A>()
  private n: number

  constructor(n: number) {
    this.n = n
  }

  get size() {
    return this.queue.length
  }

  get isEmpty() {
    return this.size === 0
  }

  get isFull() {
    return this.size === this.capacity
  }

  get capacity() {
    return this.n
  }

  offer(a: A) {
    if (this.isFull) {
      return false
    }
    this.queue.add(a)
    return true
  }

  offerAll(as: Iterable<A>): readonly A[] {
    const allAs = Array.from(as)

    let i = 0

    while (this.offer(allAs[i]!)) {
      i += 1
    }

    return allAs.slice(i)
  }

  poll(a: A | undefined) {
    if (this.isEmpty) {
      return a
    }
    return this.queue.shift()
  }

  pollUpTo(n: number): readonly A[] {
    const result: A[] = []
    const count = 0

    while (count < n) {
      const elem = this.poll(undefined)

      if (elem === undefined) {
        break
      }

      result.push(elem)
    }

    return result
  }

  [hashSym](): number {
    return incrementalHash(this)
  }
}
