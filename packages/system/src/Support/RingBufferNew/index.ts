// ets_tracing: off

import * as Chunk from "../../Collections/Immutable/Chunk/index.js"
import * as O from "../../Option/index.js"

export class RingBufferNew<A> {
  private array: Array<A | null>
  private size = 0
  private current = 0

  constructor(public readonly capacity: number) {
    this.array = Array.from({ length: capacity }, (_) => null)
  }

  head(): O.Option<A> {
    return O.fromNullable(this.array[this.current])
  }

  lastorNull(): A | null {
    if (this.size === 0) {
      return null
    }

    const index = this.current === 0 ? this.array.length - 1 : this.current - 1

    return this.array[index] ?? null
  }

  put(value: A): void {
    this.array[this.current] = value
    this.increment()
  }

  dropLast(): void {
    if (this.size > 0) {
      this.decrement()
      this.array[this.current] = null
    }
  }

  toChunk(): Chunk.Chunk<A> {
    const begin = this.current - this.size
    const newArray =
      begin < 0
        ? this.array
            .slice(this.capacity + begin, this.capacity)
            .concat(this.array.slice(0, this.current))
        : this.array.slice(begin, this.current)

    return Chunk.from(newArray) as Chunk.Chunk<A>
  }

  private increment(): void {
    if (this.size < this.capacity) {
      this.size += 1
    }

    this.current = (this.current + 1) % this.capacity
  }

  private decrement(): void {
    this.size -= 1

    if (this.current > 0) {
      this.current -= 1
    } else {
      this.current = this.capacity - 1
    }
  }
}
