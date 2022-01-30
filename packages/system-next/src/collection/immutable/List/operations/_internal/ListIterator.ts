import type { List } from "../../definition"
import { getDepth, getPrefixSize, getSuffixSize } from "./bits"

export abstract class ListIterator<A> implements Iterator<A> {
  stack: any[][] | undefined

  indices: number[] | undefined

  idx: number

  prefixSize: number

  middleSize: number

  result: IteratorResult<A> = { done: false, value: undefined as any }

  constructor(protected l: List<A>, direction: 1 | -1) {
    this.idx = direction === 1 ? -1 : l.length
    this.prefixSize = getPrefixSize(l)
    this.middleSize = l.length - getSuffixSize(l)
    if (l.root !== undefined) {
      const depth = getDepth(l)
      this.stack = new Array(depth + 1)
      this.indices = new Array(depth + 1)
      let currentNode = l.root.array
      for (let i = depth; 0 <= i; --i) {
        this.stack[i] = currentNode
        const idx = direction === 1 ? 0 : currentNode.length - 1
        this.indices[i] = idx
        currentNode = currentNode[idx].array
      }
      this.indices[0] -= direction
    }
  }

  abstract next(): IteratorResult<A>
}

export class BackwardsListIterator<A> extends ListIterator<A> {
  constructor(l: List<A>) {
    super(l, -1)
  }

  prevInTree(): void {
    /* eslint-disable-next-line no-var */
    for (var i = 0; this.indices![i] === 0; ++i) {
      //
    }
    --this.indices![i]
    for (; 0 < i; --i) {
      const n = this.stack![i]![this.indices![i]!].array
      this.stack![i - 1] = n
      this.indices![i - 1] = n.length - 1
    }
  }

  next(): IteratorResult<A> {
    let newVal
    const idx = --this.idx
    if (this.middleSize <= idx) {
      newVal = this.l.suffix[idx - this.middleSize]
    } else if (this.prefixSize <= idx) {
      this.prevInTree()
      newVal = this.stack![0]![this.indices![0]!]
    } else if (0 <= idx) {
      newVal = this.l.prefix[this.prefixSize - idx - 1]
    } else {
      this.result.done = true
    }
    this.result.value = newVal
    return this.result
  }
}

export class ForwardListIterator<A> extends ListIterator<A> {
  constructor(l: List<A>) {
    super(l, 1)
  }
  nextInTree(): void {
    /* eslint-disable-next-line no-var */
    for (var i = 0; ++this.indices![i] === this.stack![i]!.length; ++i) {
      this.indices![i] = 0
    }
    for (; 0 < i; --i) {
      this.stack![i - 1] = this.stack![i]![this.indices![i]!].array
    }
  }

  next(): IteratorResult<A> {
    let newVal
    const idx = ++this.idx
    if (idx < this.prefixSize) {
      newVal = this.l.prefix[this.prefixSize - idx - 1]
    } else if (idx < this.middleSize) {
      this.nextInTree()
      newVal = this.stack![0]![this.indices![0]!]
    } else if (idx < this.l.length) {
      newVal = this.l.suffix[idx - this.middleSize]
    } else {
      this.result.done = true
    }
    this.result.value = newVal
    return this.result
  }
}
