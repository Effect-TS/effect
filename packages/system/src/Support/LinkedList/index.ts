// tracing: off

import "../../Operator"

import * as St from "../../Structural"

export class LinkedListNode<T> {
  constructor(public value: T | null, public next: LinkedListNode<T> | null = null) {}
}

export class LinkedList<T> implements St.HasHash, St.HasEquals {
  constructor(
    public head: LinkedListNode<T> | null = null,
    public tail: LinkedListNode<T> | null = null
  ) {
    this.head = null
    this.tail = null
  }

  [St.hashSym](): number {
    return St.hashIncremental(this)
  }

  [St.equalsSym](that: unknown): boolean {
    return this === that
  }

  empty() {
    return this.head === null
  }

  prepend(value: T) {
    const newNode = new LinkedListNode<T>(value, this.head)
    this.head = newNode
    if (!this.tail) {
      this.tail = newNode
    }
    return this
  }

  append(value: T) {
    const newNode = new LinkedListNode(value)
    if (!this.head) {
      this.head = newNode
      this.tail = newNode

      return this
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    this.tail!.next = newNode
    this.tail = newNode
    return this
  }

  deleteHead() {
    if (!this.head) {
      return null
    }
    const deletedHead = this.head
    if (this.head.next) {
      this.head = this.head.next
    } else {
      this.head = null
      this.tail = null
    }
    return deletedHead
  }
}
