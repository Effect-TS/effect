import * as A from "../../Collections/Immutable/Array"
import { _A } from "../../Effect/commons"
import { ArrayIndexOutOfBoundsException } from "../../GlobalExceptions"
import { AtomicNumber } from "../../Support/AtomicNumber"

export const BufferSize = 64

export const ChunkTypeId = Symbol()
export type ChunkTypeId = typeof ChunkTypeId

export const alloc =
  typeof Buffer !== "undefined" ? Buffer.alloc : (n: number) => new Uint8Array(n)

export function isByte(u: unknown) {
  return typeof u === "number" && u >= 0 && u <= 255
}

export abstract class Chunk<A> implements Iterable<A> {
  readonly [ChunkTypeId]: ChunkTypeId = ChunkTypeId;
  readonly [_A]!: () => A

  abstract readonly binary: boolean
  abstract readonly length: number
  abstract readonly depth: number
  abstract readonly left: Chunk<A>
  abstract readonly right: Chunk<A>
  abstract copyToArray(n: number, array: Array<A> | Uint8Array): void
  abstract get(n: number): A

  private arrayLikeCache: ArrayLike<unknown> | undefined

  toArrayLike(): ArrayLike<A> {
    if (this.arrayLikeCache) {
      return this.arrayLikeCache as ArrayLike<A>
    }
    const arr = this.binary ? alloc(this.length) : new Array(this.length)
    this.copyToArray(0, arr)
    this.arrayLikeCache = arr
    return arr as ArrayLike<A>
  }

  private arrayCache: readonly unknown[] | undefined

  toArray(): readonly A[] {
    if (this.arrayCache) {
      return this.arrayCache as readonly A[]
    }
    const arr = new Array<A>(this.length)
    this.copyToArray(0, arr)
    this.arrayCache = arr
    return arr
  }

  abstract [Symbol.iterator](): Iterator<A>
  abstract arrayLikeIterator(): Iterator<ArrayLike<A>>

  materialize(): Chunk<A> {
    concrete(this)
    switch (this._typeId) {
      case EmptyTypeId: {
        return this
      }
      case ArrTypeId: {
        return this
      }
      default: {
        return from(this.toArrayLike())
      }
    }
  }

  append<A1>(a1: A1, binary: boolean): Chunk<A | A1> {
    const buffer = this.binary && binary ? alloc(BufferSize) : new Array(BufferSize)
    buffer[0] = a1
    return new AppendN(this, buffer, 1, new AtomicNumber(1), this.binary && binary)
  }

  prepend<A1>(a1: A1, binary: boolean): Chunk<A | A1> {
    const buffer = this.binary && binary ? alloc(BufferSize) : new Array(BufferSize)
    buffer[BufferSize - 1] = a1
    return new PrependN(this, buffer, 1, new AtomicNumber(1), this.binary && binary)
  }

  take(n: number): Chunk<A> {
    concrete(this)
    if (n <= 0) {
      return _Empty
    } else if (n >= this.length) {
      return this
    } else {
      switch (this._typeId) {
        case EmptyTypeId: {
          return _Empty
        }
        case SliceTypeId: {
          if (n >= this.length) {
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
    if (this._typeId === EmptyTypeId) {
      return that
    }
    if (that._typeId === EmptyTypeId) {
      return this
    }
    if (this._typeId === AppendNTypeId) {
      const chunk = from(this.buffer as A1[]).take(this.bufferUsed)
      return this.start.concat(chunk).concat(that)
    }
    if (that._typeId === PrependNTypeId) {
      const chunk = from(A.takeRight_(that.buffer as A1[], that.bufferUsed))
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

export const EmptyTypeId = Symbol()
export type EmptyTypeId = typeof EmptyTypeId

export class Empty<A> extends Chunk<A> {
  readonly depth = 0

  readonly _typeId: EmptyTypeId = EmptyTypeId
  readonly left = this
  readonly right = this
  readonly binary = true
  readonly length = 0

  get(n: number): A {
    throw new ArrayIndexOutOfBoundsException(n)
  }

  constructor() {
    super()
  }

  copyToArray(_n: number, _array: Array<A> | Uint8Array) {
    // no-op
  }

  [Symbol.iterator](): Iterator<A> {
    return {
      next: () => ({
        value: 0,
        done: true
      })
    }
  }

  arrayLikeIterator(): Iterator<ArrayLike<A>> {
    return {
      next: () => ({
        value: 0,
        done: true
      })
    }
  }
}

export const _Empty: Chunk<never> = new Empty()

/**
 * @optimize remove
 */
export function concrete<A>(
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

export const AppendNTypeId = Symbol()
export type AppendNTypeId = typeof AppendNTypeId

export class AppendN<A> extends Chunk<A> {
  readonly _typeId: AppendNTypeId = AppendNTypeId

  readonly depth = 0
  readonly left = _Empty
  readonly right = _Empty
  readonly length: number

  constructor(
    readonly start: Chunk<A>,
    readonly buffer: Array<unknown> | Uint8Array,
    readonly bufferUsed: number,
    readonly chain: AtomicNumber,
    readonly binary: boolean
  ) {
    super()
    this.length = this.start.length + this.bufferUsed
  }

  get(n: number): A {
    if (n < this.start.length) {
      return this.start.get(n)
    }
    const k = n - this.start.length
    if (k >= this.buffer.length || k < 0) {
      throw new ArrayIndexOutOfBoundsException(n)
    }
    return (this.buffer as A[])[k]!
  }

  append<A1>(a1: A1, binary: boolean): Chunk<A | A1> {
    if (
      this.bufferUsed < this.buffer.length &&
      this.chain.compareAndSet(this.bufferUsed, this.bufferUsed + 1)
    ) {
      if (this.binary && !binary) {
        const buffer = new Array(BufferSize)
        for (let i = 0; i < BufferSize; i++) {
          buffer[i] = this.buffer[i]
        }
        buffer[this.bufferUsed] = a1
        return new AppendN(
          this.start,
          buffer,
          this.bufferUsed + 1,
          this.chain,
          this.binary && binary
        )
      }
      this.buffer[this.bufferUsed] = a1
      return new AppendN(
        this.start,
        this.buffer,
        this.bufferUsed + 1,
        this.chain,
        this.binary && binary
      )
    } else {
      const buffer = this.binary && binary ? alloc(BufferSize) : new Array(BufferSize)
      buffer[0] = a1
      const chunk = from(this.buffer as A1[]).take(this.bufferUsed)
      return new AppendN(
        this.start.concat(chunk),
        buffer,
        1,
        new AtomicNumber(1),
        this.binary && binary
      )
    }
  }

  copyToArray(n: number, array: Array<A> | Uint8Array) {
    this.start.copyToArray(n, array)
    _copy(this.buffer as A[], 0, array, this.start.length + n, this.bufferUsed)
  }

  [Symbol.iterator](): Iterator<A> {
    const k = this.toArrayLike()
    return k[Symbol.iterator]()
  }

  arrayLikeIterator(): Iterator<ArrayLike<A>> {
    const array = this.toArrayLike()
    let done = false
    return {
      next: () => {
        if (!done) {
          done = true
          return {
            value: array,
            done: false
          }
        } else {
          return {
            value: 1,
            done: true
          }
        }
      }
    }
  }
}

export const ArrTypeId = Symbol()
export type ArrTypeId = typeof ArrTypeId

export abstract class Arr<A> extends Chunk<A> {
  readonly _typeId: ArrTypeId = ArrTypeId
}

export class PlainArr<A> extends Arr<A> {
  readonly depth = 0
  readonly left = _Empty
  readonly right = _Empty
  readonly length: number
  readonly binary = false

  constructor(readonly array: readonly A[]) {
    super()
    this.length = array.length
  }

  get(n: number): A {
    if (n >= this.length || n < 0) {
      throw new ArrayIndexOutOfBoundsException(n)
    }
    return this.array[n]!
  }

  toArrayLike() {
    return this.array
  }

  toArray() {
    return this.array
  }

  materialize() {
    return this
  }

  copyToArray(n: number, array: Array<A> | Uint8Array) {
    _copy(this.array, 0, array, n, this.length)
  }

  [Symbol.iterator](): Iterator<A> {
    return this.array[Symbol.iterator]()
  }

  arrayLikeIterator(): Iterator<ArrayLike<A>> {
    let done = false
    return {
      next: () => {
        if (!done) {
          done = true
          return {
            value: this.array,
            done: false
          }
        } else {
          return {
            value: 1,
            done: true
          }
        }
      }
    }
  }
}

export class Uint8Arr extends Arr<number> {
  readonly depth = 0
  readonly left = _Empty
  readonly right = _Empty
  readonly length: number
  readonly binary = true

  constructor(readonly array: Uint8Array) {
    super()
    this.length = array.length
  }

  toArrayLike() {
    return this.array
  }

  get(n: number): number {
    if (n >= this.length || n < 0) {
      throw new ArrayIndexOutOfBoundsException(n)
    }
    return this.array[n]!
  }

  materialize() {
    return this
  }

  copyToArray(n: number, array: Array<number> | Uint8Array) {
    _copy(this.array, 0, array, n, this.length)
  }

  [Symbol.iterator](): Iterator<number> {
    return this.array[Symbol.iterator]()
  }

  arrayLikeIterator(): Iterator<ArrayLike<number>> {
    let done = false
    return {
      next: () => {
        if (!done) {
          done = true
          return {
            value: this.array,
            done: false
          }
        } else {
          return {
            value: 1,
            done: true
          }
        }
      }
    }
  }
}

export const SliceTypeId = Symbol()
export type SliceTypeId = typeof SliceTypeId

export class Slice<A> extends Chunk<A> {
  readonly depth = 0
  readonly left = _Empty
  readonly right = _Empty
  readonly binary: boolean
  readonly _typeId: SliceTypeId = SliceTypeId

  get(n: number): A {
    return this.chunk.get(n + this.offset)
  }

  constructor(
    readonly chunk: Chunk<A>,
    readonly offset: number,
    readonly length: number
  ) {
    super()
    this.binary = this.chunk.binary
  }

  copyToArray(n: number, array: Array<A> | Uint8Array) {
    let i = 0
    let j = n
    while (i < this.length) {
      array[j] = this.get(i)!
      i += 1
      j += 1
    }
  }

  [Symbol.iterator](): Iterator<A> {
    const k = this.toArrayLike()
    return k[Symbol.iterator]()
  }

  arrayLikeIterator(): Iterator<ArrayLike<A>> {
    const array = this.toArrayLike()
    let done = false
    return {
      next: () => {
        if (!done) {
          done = true
          return {
            value: array,
            done: false
          }
        } else {
          return {
            value: 1,
            done: true
          }
        }
      }
    }
  }
}

export const SingletonTypeId = Symbol()
export type SingletonTypeId = typeof SingletonTypeId

export class Singleton<A> extends Chunk<A> {
  readonly depth = 0
  readonly left = _Empty
  readonly right = _Empty
  readonly length = 1
  readonly _typeId: SingletonTypeId = SingletonTypeId

  get(n: number): A {
    if (n === 0) {
      return this.a
    }
    throw new ArrayIndexOutOfBoundsException(n)
  }

  constructor(readonly a: A, readonly binary: boolean) {
    super()
  }

  copyToArray(n: number, array: Array<A> | Uint8Array) {
    array[n] = this.a
  }

  [Symbol.iterator](): Iterator<A> {
    const k = this.toArrayLike()
    return k[Symbol.iterator]()
  }

  arrayLikeIterator(): Iterator<ArrayLike<A>> {
    let done = false
    return {
      next: () => {
        if (!done) {
          done = true
          return {
            value: this.toArrayLike(),
            done: false
          }
        } else {
          return {
            value: 1,
            done: true
          }
        }
      }
    }
  }
}

export const PrependNTypeId = Symbol()
export type PrependNTypeId = typeof PrependNTypeId

export class PrependN<A> extends Chunk<A> {
  readonly depth = 0
  readonly left = _Empty
  readonly right = _Empty
  readonly length: number
  readonly _typeId: PrependNTypeId = PrependNTypeId

  get(n: number): A {
    if (n < this.bufferUsed) {
      const k = BufferSize - this.bufferUsed + n
      if (k >= this.buffer.length || k < 0) {
        throw new ArrayIndexOutOfBoundsException(n)
      }
      return (this.buffer as A[])[k]!
    }
    return this.end.get(n - this.bufferUsed)
  }

  constructor(
    readonly end: Chunk<A>,
    readonly buffer: Array<unknown> | Uint8Array,
    readonly bufferUsed: number,
    readonly chain: AtomicNumber,
    readonly binary: boolean
  ) {
    super()
    this.length = this.end.length + this.bufferUsed
  }

  copyToArray(n: number, array: Array<A> | Uint8Array) {
    const length = Math.min(this.bufferUsed, Math.max(array.length - n, 0))
    _copy(this.buffer, BufferSize - this.bufferUsed, array, n, length)
    this.end.copyToArray(n + length, array)
  }

  prepend<A1>(a1: A1, binary: boolean): Chunk<A | A1> {
    if (
      this.bufferUsed < this.buffer.length &&
      this.chain.compareAndSet(this.bufferUsed, this.bufferUsed + 1)
    ) {
      if (this.binary && !binary) {
        const buffer = new Array(BufferSize)
        for (let i = 0; i < BufferSize; i++) {
          buffer[i] = this.buffer[i]
        }
        buffer[BufferSize - this.bufferUsed - 1] = a1
        return new PrependN(
          this.end,
          this.buffer,
          this.bufferUsed + 1,
          this.chain,
          this.binary && binary
        )
      }
      this.buffer[BufferSize - this.bufferUsed - 1] = a1
      return new PrependN(
        this.end,
        this.buffer,
        this.bufferUsed + 1,
        this.chain,
        this.binary && binary
      )
    } else {
      const buffer = binary ? alloc(BufferSize) : new Array(BufferSize)
      buffer[BufferSize - 1] = a1
      const chunk = from(
        this.buffer.slice(this.buffer.length - this.bufferUsed - 1) as A1[]
      )
      return new PrependN(
        chunk.concat(this.end),
        buffer,
        1,
        new AtomicNumber(1),
        this.binary && binary
      )
    }
  }

  [Symbol.iterator](): Iterator<A> {
    const k = this.toArrayLike()
    return k[Symbol.iterator]()
  }

  arrayLikeIterator(): Iterator<ArrayLike<A>> {
    const array = this.toArrayLike()
    let done = false
    return {
      next: () => {
        if (!done) {
          done = true
          return {
            value: array,
            done: false
          }
        } else {
          return {
            value: 1,
            done: true
          }
        }
      }
    }
  }
}

export function _copy<A>(
  src: ArrayLike<A>,
  srcPos: number,
  dest: A[] | Uint8Array,
  destPos: number,
  len: number
) {
  for (let i = srcPos; i < Math.min(src.length, srcPos + len); i++) {
    dest[destPos + i - srcPos] = src[i]!
  }
  return dest
}

export const ConcatTypeId = Symbol()
export type ConcatTypeId = typeof ConcatTypeId

export class Concat<A> extends Chunk<A> {
  readonly depth: number
  readonly _typeId: ConcatTypeId = ConcatTypeId
  readonly length: number
  readonly binary: boolean

  get(n: number): A {
    return n < this.left.length
      ? this.left.get(n)
      : this.right.get(n - this.left.length)
  }

  constructor(readonly left: Chunk<A>, readonly right: Chunk<A>) {
    super()
    this.depth = 1 + Math.max(this.left.depth, this.right.depth)
    this.length = this.left.length + this.right.length
    this.binary = this.left.binary && this.right.binary
  }

  copyToArray(n: number, array: Array<A> | Uint8Array) {
    this.left.copyToArray(n, array)
    this.right.copyToArray(n + this.left.length, array)
  }

  [Symbol.iterator](): Iterator<A> {
    const k = this.toArrayLike()
    return k[Symbol.iterator]()
  }

  arrayLikeIterator(): Iterator<ArrayLike<A>> {
    let it = this.left.arrayLikeIterator()
    let i = 0
    let n = it.next()
    let j = 0
    return {
      next: () => {
        j++
        if (i === 0 && n.done) {
          it = this.right.arrayLikeIterator()
          const k = it.next()
          if (k.done) {
            return {
              value: j,
              done: true
            }
          }
          i++
          n = it.next()
          return k
        } else {
          if (n.done) {
            return {
              value: j,
              done: true
            }
          }
          const k = n
          n = it.next()
          return k
        }
      }
    }
  }
}

/**
 * Builds a chunk from an array.
 *
 * NOTE: The provided array should be totally filled, no holes are allowed
 */
export function from(array: Uint8Array): Chunk<number>
export function from<A>(array: Iterable<A>): Chunk<A>
export function from<A>(array: ArrayLike<A>): Chunk<A>
export function from(
  array: Uint8Array | Iterable<unknown> | ArrayLike<unknown>
): Chunk<unknown> {
  if ("buffer" in array) {
    return new Uint8Arr(array)
  }
  return Array.isArray(array) ? new PlainArr(array) : new PlainArr(Array.from(array))
}
