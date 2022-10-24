import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"
import * as MutableList from "@fp-ts/data/mutable/MutableList"
import type { Predicate } from "@fp-ts/data/Predicate"

/**
 * @category constructors
 * @since 1.0.0
 */
export class RingBuffer<T> {
  private values = MutableList.empty<T>()
  private ignored = 0

  constructor(readonly size: number, readonly ignoreFn?: Predicate<T>) {}

  push(value: T) {
    if (pipe(this.values, MutableList.length) - this.ignored >= this.size) {
      pipe(this.values, MutableList.shift)
    }
    pipe(this.values, MutableList.append(value))
    if (this.ignoreFn && this.ignoreFn(value)) {
      this.ignored++
    }
    return this.values
  }

  pop() {
    const popped = pipe(this.values, MutableList.pop)
    if (popped && this.ignoreFn && this.ignoreFn(popped)) {
      this.ignored--
    }
    return this.values
  }

  toChunk(): Chunk.Chunk<T> {
    const array: Array<T> = []
    pipe(
      this.values,
      MutableList.forEach((t) => {
        array.push(t)
      })
    )
    return Chunk.fromIterable(array)
  }

  toChunkReversed(): Chunk.Chunk<T> {
    const array: Array<T> = []
    pipe(
      this.values,
      MutableList.forEach((t) => {
        array.push(t)
      })
    )
    return Chunk.fromIterable(array.reverse())
  }
}
