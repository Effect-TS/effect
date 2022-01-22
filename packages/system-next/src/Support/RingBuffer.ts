import * as V from "../Collections/Immutable/Vector"
import type { Predicate } from "../Function"
import { DoublyLinkedList } from "./DoublyLinkedList"

export class RingBuffer<T> {
  private values = new DoublyLinkedList<T>()
  private ignored = 0

  constructor(readonly size: number, readonly ignoreFn?: Predicate<T>) {}

  push(value: T) {
    if (this.values.length - this.ignored >= this.size) {
      this.values.shift()
    }
    this.values.add(value)
    if (this.ignoreFn && this.ignoreFn(value)) {
      this.ignored++
    }
    return this.values
  }

  pop() {
    const popped = this.values.pop()
    if (popped && this.ignoreFn && this.ignoreFn(popped)) {
      this.ignored--
    }
    return this.values
  }

  get list(): V.Vector<T> {
    const l = V.emptyPushable<T>()
    this.values.forEach((t) => {
      V.push_(l, t)
    })
    return l
  }

  get listReverse(): V.Vector<T> {
    return V.reverse(this.list)
  }
}
