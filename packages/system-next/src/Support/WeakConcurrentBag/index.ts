import * as L from "../../Collections/Immutable/List/core"
import * as H from "../../Structural/HasHash"
import { AtomicReferenceArray } from "../AtomicReferenceArray"
import { WeakReference } from "../WeakReference"

export class WeakConcurrentBag<A extends H.HasHash> implements Iterable<A> {
  // TODO: ZIO uses `FastList` here
  private contents: AtomicReferenceArray<L.List<WeakReference<A>>>
  constructor(readonly tableSize: number) {
    this.contents = new AtomicReferenceArray(tableSize)
  }

  [Symbol.iterator](): Iterator<A> {
    let _currentBucket = 0
    let _currentList = L.empty<WeakReference<A>>()
    let _nextElement: A | undefined = undefined

    let done = false

    const prefetchNext = (): void => {
      const bucketCount = this.tableSize

      let nextElement: A | undefined = undefined
      let currentList = _currentList
      let currentBucket = _currentBucket

      while (
        (currentBucket < bucketCount || !L.isEmpty(currentList)) &&
        nextElement === undefined
      ) {
        if (L.isEmpty(currentList)) {
          currentList = this.contents.get(currentBucket) || L.empty()
          currentBucket = currentBucket + 1
        } else {
          nextElement = L.unsafeFirst(currentList)!.deref()
          currentList = L.tail(currentList)
        }
      }

      _nextElement = nextElement
      _currentList = currentList
      _currentBucket = currentBucket
    }

    prefetchNext()

    return {
      next() {
        const value = _nextElement
        if (value === undefined) {
          return this.return!()
        }
        prefetchNext()
        return { done: false, value }
      },
      return(value?: unknown) {
        if (!done) {
          done = true
        }
        return { done: true, value }
      }
    }
  }

  get size(): number {
    let s = 0
    for (let i = 0; i < this.tableSize; i++) {
      s += this.contents.get(i)?.length ?? 0
    }
    return s
  }

  add(value: A): WeakReference<A> {
    const hashCode = Math.abs(H.hash(value))
    const bucket = hashCode % this.tableSize

    const newRef = new WeakReference(value)

    const oldValue = this.contents.get(bucket)
    const newValue = oldValue ? L.prepend_(oldValue, newRef) : L.of(newRef)

    this.contents.set(bucket, newValue)

    if (bucket === 0) {
      this.gc()
    }

    return newRef
  }

  gc(): void {
    for (let i = 0; i < this.tableSize; i++) {
      const oldValue = this.contents.get(i)
      if (oldValue && !L.every_(oldValue, _gcPredicate)) {
        const newValue = L.filter_(oldValue, _gcPredicate)
        this.contents.set(i, newValue)
      }
    }
  }
}

function _gcPredicate<A>(ref: WeakReference<A> | undefined): boolean {
  return ref !== undefined && ref.deref() !== undefined
}
