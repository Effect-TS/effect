// ets_tracing: off

import "../../Operator/index.js"

import * as L from "../../Collections/Immutable/List/index.js"
import type { Predicate } from "../../Function/index.js"
import { DoublyLinkedList } from "../DoublyLinkedList/index.js"

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

  get list(): L.List<T> {
    const l = L.emptyPushable<T>()
    this.values.forEach((t) => {
      L.push_(l, t)
    })
    return l
  }

  get listReverse(): L.List<T> {
    return L.reverse(this.list)
  }
}
