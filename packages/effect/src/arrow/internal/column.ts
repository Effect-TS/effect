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
  /** Where each chunk starts, then the total length. */
  private readonly starts: Array<number>
  private readonly readers: Array<Values.Reader | undefined>

  constructor(field: S.Field, chunks: ReadonlyArray<ArrowData.ArrowData>, options: Values.Options) {
    this.field = field
    this.chunks = chunks
    this.options = options
    this.starts = [0]
    for (const chunk of chunks) this.starts.push(this.starts[this.starts.length - 1] + chunk.length)
    this.length = this.starts[chunks.length]
    this.readers = new Array(chunks.length)
  }

  readerAt(chunk: number): Values.Reader {
    return this.readers[chunk] ??= Values.reader(this.field, this.chunks[chunk], this.options)
  }

  /** The value at `index`, assuming `0 <= index < length`. */
  read(index: number): unknown {
    const chunk = Values.slotOf(this.starts, index)
    return this.readerAt(chunk)(index - this.starts[chunk])
  }

  [Symbol.iterator](): Iterator<unknown> {
    return Values.iterate(this.chunks.length, (c) => this.chunks[c].length, (c) => this.readerAt(c))
  }
}
