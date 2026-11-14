/**
 * The column implementation behind `ArrowColumn`: a field plus chunks, with
 * one compiled reader per chunk, created on first use.
 *
 * @internal
 */
import type * as ArrowData from "../ArrowData.ts"
import type * as S from "../ArrowSchema.ts"
import * as Values from "./values.ts"

/** @internal */
export class Column implements Iterable<unknown> {
  readonly field: S.Field
  readonly chunks: ReadonlyArray<ArrowData.ArrowData>
  readonly length: number
  private readonly options: Values.Options
  private readonly starts: Array<number>
  private readonly readers: Array<Values.Reader | undefined>

  constructor(field: S.Field, chunks: ReadonlyArray<ArrowData.ArrowData>, options: Values.Options) {
    this.field = field
    this.chunks = chunks
    this.options = options
    this.starts = []
    let length = 0
    for (const chunk of chunks) {
      this.starts.push(length)
      length += chunk.length
    }
    this.length = length
    this.readers = new Array(chunks.length)
  }

  readerAt(chunk: number): Values.Reader {
    return this.readers[chunk] ??= Values.reader(this.field, this.chunks[chunk], this.options)
  }

  /** The value at `index`, assuming `0 <= index < length`. */
  read(index: number): unknown {
    const starts = this.starts
    let lo = 0
    let hi = starts.length - 1
    while (lo < hi) {
      const mid = (lo + hi + 1) >>> 1
      if (starts[mid] <= index) lo = mid
      else hi = mid - 1
    }
    return this.readerAt(lo)(index - starts[lo])
  }

  [Symbol.iterator](): Iterator<unknown> {
    return Values.iterate(this.chunks.length, (c) => this.chunks[c].length, (c) => this.readerAt(c))
  }
}
