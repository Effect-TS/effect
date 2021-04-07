import * as A from "../../Array"
import { _A } from "../../Effect/commons"
import { ArrayIndexOutOfBoundsException } from "../../GlobalExceptions"
import * as O from "../../Option"
import { AtomicNumber } from "../../Support/AtomicNumber"

export const BufferSize = 64

export const ChunkTypeId = Symbol()
export type ChunkTypeId = typeof ChunkTypeId

export abstract class Chunk<A> implements Iterable<A> {
  readonly [ChunkTypeId]: ChunkTypeId = ChunkTypeId;
  readonly [_A]!: () => A

  abstract length: number

  get left(): Chunk<A> {
    return new Empty()
  }

  get right(): Chunk<A> {
    return new Empty()
  }

  get depth(): number {
    return 0
  }

  abstract copyToArray(n: number, array: Array<A>): void

  abstract get(n: number): A | undefined

  toArray(): Array<A> {
    const arr = new Array(this.length)
    this.copyToArray(0, arr)
    return arr
  }

  [Symbol.iterator](): IterableIterator<A> {
    const arr = this.toArray()
    return arr[Symbol.iterator]()
  }

  append<A1>(a1: A1): Chunk<A | A1> {
    const buffer = new Array(BufferSize)
    buffer[0] = a1
    return new AppendN(this, buffer, 1, new AtomicNumber(1))
  }

  prepend<A1>(a1: A1): Chunk<A | A1> {
    const buffer = new Array(BufferSize)
    buffer[BufferSize - 1] = a1
    return new PrependN(this, buffer, 1, new AtomicNumber(1))
  }

  take(n: number): Chunk<A> {
    concrete(this)
    if (n <= 0) {
      return new Empty()
    } else if (n >= this.length) {
      return this
    } else {
      switch (this._typeId) {
        case EmptyTypeId: {
          return new Empty()
        }
        case SliceTypeId: {
          if (n >= this.l) {
            return this
          } else {
            return new Slice(this.chunk, this.offset, n)
          }
        }
        case SingletonTypeId: {
          return this
        }
        default: {
          return new Slice(this, 0, n)
        }
      }
    }
  }

  concat<A1>(that: Chunk<A1>): Chunk<A | A1> {
    concrete(this)
    concrete(that)
    if (this._typeId === AppendNTypeId) {
      const chunk = fromArray(this.buffer as A1[]).take(this.bufferUsed)
      return this.start.concat(chunk).concat(that)
    }
    if (that._typeId === PrependNTypeId) {
      const chunk = fromArray(A.takeRight_(that.buffer as A1[], that.bufferUsed))
      return this.concat(chunk).concat(that.end)
    }
    const diff = that.depth - this.depth
    if (Math.abs(diff) <= 1) {
      return new Concat<A | A1>(this, that)
    } else if (diff < -1) {
      if (this.left.depth >= this.right.depth) {
        const nr = this.right.concat(that)
        return new Concat(this.left, nr)
      } else {
        const nrr = this.right.right.concat(that)
        if (nrr.depth === this.depth - 3) {
          const nr = new Concat(this.right.left, nrr)
          return new Concat(this.left, nr)
        } else {
          const nl = new Concat(this.left, this.right.left)
          return new Concat(nl, nrr)
        }
      }
    } else {
      if (this.right.depth >= that.left.depth) {
        const nl = this.concat(that.left)
        return new Concat(nl, that.right)
      } else {
        const nll = this.concat(that.left.left)
        if (nll.depth === that.depth - 3) {
          const nl = new Concat(nll, that.left.right)
          return new Concat(nl, that.right)
        } else {
          const nr = new Concat(that.left.right, that.right)
          return new Concat(nll, nr)
        }
      }
    }
  }
}

/**
 * @optimize remove
 */
function concrete<A>(
  _: Chunk<A>
): asserts _ is
  | Empty<A>
  | AppendN<A>
  | Arr<A>
  | Slice<A>
  | Singleton<A>
  | PrependN<A>
  | Concat<A> {
  //
}

const AppendNTypeId = Symbol()
type AppendNTypeId = typeof AppendNTypeId

class AppendN<A> extends Chunk<A> {
  readonly _typeId: AppendNTypeId = AppendNTypeId

  get length(): number {
    return this.start.length + this.bufferUsed
  }

  constructor(
    readonly start: Chunk<A>,
    readonly buffer: Array<unknown>,
    readonly bufferUsed: number,
    readonly chain: AtomicNumber
  ) {
    super()
  }

  get(n: number): A | undefined {
    if (n < this.start.length) {
      return this.start.get(n)
    }
    const k = n - this.start.length
    if (k >= this.buffer.length || k < 0) {
      throw new ArrayIndexOutOfBoundsException(n)
    }
    return (this.buffer as A[])[k]
  }

  append<A1>(a1: A1): Chunk<A | A1> {
    if (
      this.bufferUsed < this.buffer.length &&
      this.chain.compareAndSet(this.bufferUsed, this.bufferUsed + 1)
    ) {
      this.buffer[this.bufferUsed] = a1
      return new AppendN(this.start, this.buffer, this.bufferUsed + 1, this.chain)
    } else {
      const buffer = new Array(BufferSize)
      buffer[0] = a1
      const chunk = fromArray(this.buffer as A1[]).take(this.bufferUsed)
      return new AppendN(this.start.concat(chunk), buffer, 1, new AtomicNumber(1))
    }
  }

  copyToArray(n: number, array: Array<A>) {
    this.start.copyToArray(n, array)
    _copy(this.buffer as A[], 0, array, this.start.length + n, this.bufferUsed)
  }
}

const ArrTypeId = Symbol()
type ArrTypeId = typeof ArrTypeId

class Arr<A> extends Chunk<A> {
  readonly _typeId: ArrTypeId = ArrTypeId

  get length(): number {
    return this.array.length
  }

  get(n: number): A | undefined {
    if (n >= this.length || n < 0) {
      throw new ArrayIndexOutOfBoundsException(n)
    }
    return this.array[n]
  }

  constructor(readonly array: readonly A[]) {
    super()
  }

  copyToArray(n: number, array: Array<A>) {
    _copy(this.array, 0, array, n, this.length)
  }
}

const EmptyTypeId = Symbol()
type EmptyTypeId = typeof EmptyTypeId

class Empty<A> extends Chunk<A> {
  readonly _typeId: EmptyTypeId = EmptyTypeId

  get length(): number {
    return 0
  }

  get(n: number): A | undefined {
    throw new ArrayIndexOutOfBoundsException(n)
  }

  constructor() {
    super()
  }

  copyToArray(_n: number, _array: Array<A>) {
    //
  }
}

const SliceTypeId = Symbol()
type SliceTypeId = typeof SliceTypeId

class Slice<A> extends Chunk<A> {
  readonly _typeId: SliceTypeId = SliceTypeId

  get length(): number {
    return this.l
  }

  get(n: number): A | undefined {
    return this.chunk.get(n + this.offset)
  }

  constructor(readonly chunk: Chunk<A>, readonly offset: number, readonly l: number) {
    super()
  }

  copyToArray(n: number, array: Array<A>) {
    let i = 0
    let j = n
    while (i < this.length) {
      array[j] = this.get(i)!
      i += 1
      j += 1
    }
  }
}

const SingletonTypeId = Symbol()
type SingletonTypeId = typeof SingletonTypeId

class Singleton<A> extends Chunk<A> {
  readonly _typeId: SingletonTypeId = SingletonTypeId

  get length(): number {
    return 1
  }

  get(n: number): A | undefined {
    if (n === 0) {
      return this.a
    }
    throw new ArrayIndexOutOfBoundsException(n)
  }

  constructor(readonly a: A) {
    super()
  }

  copyToArray(n: number, array: Array<A>) {
    array[n] = this.a
  }
}

const PrependNTypeId = Symbol()
type PrependNTypeId = typeof PrependNTypeId

class PrependN<A> extends Chunk<A> {
  readonly _typeId: PrependNTypeId = PrependNTypeId

  get length(): number {
    return this.end.length + this.bufferUsed
  }

  get(n: number): A | undefined {
    if (n < this.bufferUsed) {
      const k = BufferSize - this.bufferUsed + n
      if (k >= this.buffer.length || k < 0) {
        throw new ArrayIndexOutOfBoundsException(n)
      }
      return (this.buffer as A[])[k]
    }
    return this.end.get(n - this.bufferUsed)
  }

  constructor(
    readonly end: Chunk<A>,
    readonly buffer: Array<unknown>,
    readonly bufferUsed: number,
    readonly chain: AtomicNumber
  ) {
    super()
  }

  copyToArray(n: number, array: Array<A>) {
    const length = Math.min(this.bufferUsed, Math.max(array.length - n, 0))
    _copy(this.buffer, BufferSize - this.bufferUsed, array, n, length)
    this.end.copyToArray(n + length, array)
  }

  prepend<A1>(a1: A1): Chunk<A | A1> {
    if (
      this.bufferUsed < this.buffer.length &&
      this.chain.compareAndSet(this.bufferUsed, this.bufferUsed + 1)
    ) {
      this.buffer[BufferSize - this.bufferUsed - 1] = a1
      return new PrependN(this.end, this.buffer, this.bufferUsed + 1, this.chain)
    } else {
      const buffer = new Array(BufferSize)
      buffer[BufferSize - 1] = a1
      const chunk = fromArray(A.takeRight_(this.buffer as A1[], this.bufferUsed))
      return new PrependN(chunk.concat(this.end), buffer, 1, new AtomicNumber(1))
    }
  }
}

function _copy<A>(
  src: readonly A[],
  srcPos: number,
  dest: A[],
  destPos: number,
  len: number
) {
  for (let i = srcPos; i < Math.min(src.length, srcPos + len); i++) {
    dest[destPos + i - srcPos] = src[i]!
  }
  return dest
}

const ConcatTypeId = Symbol()
type ConcatTypeId = typeof ConcatTypeId

class Concat<A> extends Chunk<A> {
  readonly _typeId: ConcatTypeId = ConcatTypeId

  get length(): number {
    return this.left.length + this.right.length
  }

  get(n: number): A | undefined {
    return n < this.left.length
      ? this.left.get(n)
      : this.right.get(n - this.left.length)
  }

  get depth(): number {
    return 1 + Math.max(this.left.depth, this.right.depth)
  }

  constructor(readonly _left: Chunk<A>, readonly _right: Chunk<A>) {
    super()
  }

  get left(): Chunk<A> {
    return this._left
  }

  get right(): Chunk<A> {
    return this._right
  }

  copyToArray(n: number, array: Array<A>) {
    this.left.copyToArray(n, array)
    this.right.copyToArray(n + this.left.length, array)
  }
}

/**
 * Builds a chunk of a single value
 */
export function single<A>(a: A): Chunk<A> {
  return new Singleton(a)
}

/**
 * Builds an empty chunk
 */
export function empty<A>(): Chunk<A> {
  return new Empty()
}

/**
 * Builds a chunk from an array
 */
export function fromArray<A>(array: readonly A[]): Chunk<A> {
  return new Arr(array)
}

/**
 * Appends a value to a chunk
 */
export function append<A1>(a: A1) {
  return <A>(self: Chunk<A>): Chunk<A | A1> => self.append(a)
}

/**
 * Prepends a value to a chunk
 */
export function prepend<A1>(a: A1) {
  return <A>(self: Chunk<A>): Chunk<A | A1> => self.prepend(a)
}

/**
 * Concats chunks
 */
export function concat<A1>(that: Chunk<A1>) {
  return <A>(self: Chunk<A>): Chunk<A | A1> => self.concat(that)
}

/**
 * Converts a chunk to an Array
 */
export function toArray<A>(self: Chunk<A>): A[] {
  return self.toArray()
}

/**
 * Safely get a value
 */
export function get(n: number) {
  return <A>(self: Chunk<A>): O.Option<A> =>
    !Number.isInteger(n) || n < 0 || n >= self.length
      ? O.none
      : O.fromNullable(self.get(n))
}
