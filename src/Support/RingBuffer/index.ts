import * as L from "../../List"
import { DoublyLinkedList } from "../DublyLinkedList"

export class RingBuffer<T> {
  private values = new DoublyLinkedList<T>()

  constructor(readonly size: number) {}

  push(value: T) {
    if (this.values.length >= this.size) {
      this.values.shift()
    }
    this.values.add(value)
    return this.values
  }

  pop() {
    this.values.pop()
    return this.values
  }

  get list(): L.List<T> {
    const l = L.emptyPushable<T>()
    this.values.forEach((t) => {
      L.push(t, l)
    })
    return l
  }
}
