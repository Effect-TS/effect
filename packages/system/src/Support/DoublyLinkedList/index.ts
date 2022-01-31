// ets_tracing: off

import "../../Operator/index.js"

export class LinkedListNode<T> {
  public removed = false
  public left: LinkedListNode<T> | undefined
  public right: LinkedListNode<T> | undefined

  public constructor(public readonly value: T) {
    this.right = undefined
    this.left = undefined
  }
}

type Node<T> = LinkedListNode<T> | undefined

export class DoublyLinkedList<T> {
  public get head(): T | undefined {
    return this.headN === undefined ? undefined : this.headN.value
  }

  public get isEmpty(): boolean {
    return this.length === 0
  }

  public get tail(): T | undefined {
    return this.tailN === undefined ? undefined : this.tailN.value
  }

  public length = 0

  private headN: Node<T> = undefined
  private tailN: Node<T> = undefined

  public forEach(f: (_: T) => void) {
    let current = this.headN

    while (current !== undefined) {
      f(current.value)
      current = current.right
    }
  }

  public add(val: T): LinkedListNode<T> {
    const node = new LinkedListNode(val)
    if (this.length === 0) {
      this.headN = node
    }
    if (this.tailN === undefined) {
      this.tailN = node
    } else {
      this.tailN.right = node
      node.left = this.tailN
      this.tailN = node
    }
    this.length += 1

    return node
  }

  public empty(): void {
    this.length = 0
    this.headN = this.tailN = undefined
  }

  public pop(): T | undefined {
    const h = this.tailN
    if (h !== undefined) {
      this.remove(h)

      return h.value
    }

    return undefined
  }

  public remove(n: LinkedListNode<T>): void {
    if (n.removed) {
      return
    }

    n.removed = true

    if (n.left !== undefined && n.right !== undefined) {
      n.left.right = n.right
      n.right.left = n.left
    } else if (n.left !== undefined) {
      this.tailN = n.left
      n.left.right = undefined
    } else if (n.right !== undefined) {
      this.headN = n.right
      n.right.left = undefined
    } else {
      this.tailN = undefined
      this.headN = undefined
    }

    if (this.length > 0) {
      this.length -= 1
    }
  }

  public shift(): T | undefined {
    const h = this.headN
    if (h !== undefined) {
      this.remove(h)

      return h.value
    }

    return undefined
  }
}
