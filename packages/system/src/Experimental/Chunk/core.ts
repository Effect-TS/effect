import * as A from "../../Collections/Immutable/Array"
import { _A } from "../../Effect/commons"
import type { Equal } from "../../Equal"
import { makeEqual } from "../../Equal"
import { ArrayIndexOutOfBoundsException } from "../../GlobalExceptions"
import * as O from "../../Option"
import { AtomicNumber } from "../../Support/AtomicNumber"

const BufferSize = 64

const ChunkTypeId = Symbol()
type ChunkTypeId = typeof ChunkTypeId

const alloc =
  typeof Buffer !== "undefined" ? Buffer.alloc : (n: number) => new Uint8Array(n)

function isByte(u: unknown) {
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

  private arrayCache: ArrayLike<unknown> | undefined

  toArrayLike(): ArrayLike<A> {
    if (this.arrayCache) {
      return this.arrayCache as ArrayLike<A>
    }
    const arr = this.binary ? alloc(this.length) : new Array(this.length)
    this.copyToArray(0, arr)
    this.arrayCache = arr
    return arr as ArrayLike<A>
  }

  abstract [Symbol.iterator](): Iterator<A>

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

const EmptyTypeId = Symbol()
type EmptyTypeId = typeof EmptyTypeId

class Empty<A> extends Chunk<A> {
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
}

const _Empty: Chunk<never> = new Empty()

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
}

const ArrTypeId = Symbol()
type ArrTypeId = typeof ArrTypeId

abstract class Arr<A> extends Chunk<A> {
  readonly _typeId: ArrTypeId = ArrTypeId
}

class PlainArr<A> extends Arr<A> {
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

  toArray(): readonly A[] {
    return this.array
  }

  copyToArray(n: number, array: Array<A> | Uint8Array) {
    _copy(this.array, 0, array, n, this.length)
  }

  [Symbol.iterator](): Iterator<A> {
    return this.array[Symbol.iterator]()
  }
}

class Uint8Arr extends Arr<number> {
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

  copyToArray(n: number, array: Array<number> | Uint8Array) {
    _copy(this.array, 0, array, n, this.length)
  }

  [Symbol.iterator](): Iterator<number> {
    return this.array[Symbol.iterator]()
  }
}

const SliceTypeId = Symbol()
type SliceTypeId = typeof SliceTypeId

class Slice<A> extends Chunk<A> {
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
}

const SingletonTypeId = Symbol()
type SingletonTypeId = typeof SingletonTypeId

class Singleton<A> extends Chunk<A> {
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
}

const PrependNTypeId = Symbol()
type PrependNTypeId = typeof PrependNTypeId

class PrependN<A> extends Chunk<A> {
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
}

function _copy<A>(
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

const ConcatTypeId = Symbol()
type ConcatTypeId = typeof ConcatTypeId

class Concat<A> extends Chunk<A> {
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
}

/**
 * Builds a chunk of a single value
 */
export function single<A>(a: A): Chunk<A> {
  return new Singleton(a, isByte(a))
}

/**
 * Builds an empty chunk
 */
export function empty<A>(): Chunk<A> {
  return _Empty
}

/**
 * Builds a chunk from an array.
 *
 * NOTE: The provided array should be totally filled, no holes are allowed
 */
export function from(array: Uint8Array): Chunk<number>
export function from<A>(array: Iterable<A>): Chunk<A>
export function from(array: Uint8Array | Iterable<unknown>): Chunk<unknown> {
  if ("buffer" in array) {
    return new Uint8Arr(array)
  }
  return Array.isArray(array) ? new PlainArr(array) : new PlainArr(Array.from(array))
}

/**
 * Appends a value to a chunk
 *
 * @dataFirst append_
 */
export function append<A1>(a: A1) {
  return <A>(self: Chunk<A>): Chunk<A | A1> => self.append(a, isByte(a))
}

/**
 * Appends a value to a chunk
 */
export function append_<A, A1>(self: Chunk<A>, a: A1): Chunk<A | A1> {
  return self.append(a, isByte(a))
}

/**
 * Prepends a value to a chunk
 *
 * @dataFirst prepend_
 */
export function prepend<A1>(a: A1) {
  return <A>(self: Chunk<A>): Chunk<A | A1> => self.prepend(a, isByte(a))
}

/**
 * Prepends a value to a chunk
 */
export function prepend_<A, A1>(self: Chunk<A>, a: A1): Chunk<A | A1> {
  return self.prepend(a, isByte(a))
}

/**
 * Concats chunks
 *
 * @dataFirst concat_
 */
export function concat<A1>(that: Chunk<A1>) {
  return <A>(self: Chunk<A>): Chunk<A | A1> => self.concat(that)
}

/**
 * Concats chunks
 */
export function concat_<A, A1>(self: Chunk<A>, that: Chunk<A1>): Chunk<A | A1> {
  return self.concat(that)
}

/**
 * Converts a chunk to an ArrayLike (either Array or Buffer)
 */
export function toArrayLike<A>(self: Chunk<A>): ArrayLike<A> {
  return self.toArrayLike()
}

/**
 * Converts a chunk to an Array
 */
export function toArray<A>(self: Chunk<A>): readonly A[] {
  return Array.from(self.toArrayLike())
}

/**
 * Safely get a value
 */
export function get_<A>(self: Chunk<A>, n: number): O.Option<A> {
  return !Number.isInteger(n) || n < 0 || n >= self.length
    ? O.none
    : O.some(self.get(n))
}

/**
 * Safely get a value
 *
 * @dataFirst get_
 */
export function get(n: number) {
  return <A>(self: Chunk<A>): O.Option<A> => get_(self, n)
}

/**
 * Unsafely get a value
 */
export function unsafeGet_<A>(self: Chunk<A>, n: number): A {
  return self.get(n)
}

/**
 * Safely get a value
 *
 * @dataFirst unsafeGet_
 */
export function unsafeGet(n: number) {
  return <A>(self: Chunk<A>): A => unsafeGet_(self, n)
}

/**
 * Type guard
 */
export function isChunk<A>(u: Iterable<A>): u is Chunk<A>
export function isChunk(u: unknown): u is Chunk<unknown>
export function isChunk(u: unknown): u is Chunk<unknown> {
  return typeof u === "object" && u != null && ChunkTypeId in u
}

/**
 * Equality check
 */
export function equalsWith_<A>(self: Chunk<A>, eq: Equal<A>, that: Chunk<A>): boolean {
  const len = self.length

  if (len !== that.length) {
    return false
  }

  for (let i = 0; i < len; i++) {
    const l = self.get(i)
    const r = that.get(i)

    if (!eq.equals(l, r)) {
      return false
    }
  }

  return true
}

/**
 * Equality check
 *
 * @dataFirst equalsWith_
 */
export function equalsWith<A>(
  eq: Equal<A>,
  that: Chunk<A>
): (self: Chunk<A>) => boolean {
  return (self) => equalsWith_(self, eq, that)
}

const refEq = makeEqual((x, y) => x === y)

/**
 * Referential equality check
 */
export function equals_<A>(self: Chunk<A>, that: Chunk<A>): boolean {
  return equalsWith_(self, refEq, that)
}

/**
 * Referential equality check
 *
 * @dataFirst equals_
 */
export function equals<A>(that: Chunk<A>): (self: Chunk<A>) => boolean {
  return (self) => equals_(self, that)
}

/**
 * Takes the first n elements
 */
export function take_<A>(self: Chunk<A>, n: number): Chunk<A> {
  return self.take(n)
}

/**
 * Takes the first n elements
 *
 * @dataFirst take_
 */
export function take(n: number): <A>(self: Chunk<A>) => Chunk<A> {
  return (self) => self.take(n)
}

/**
 * Drops the first n elements
 */
export function drop_<A>(self: Chunk<A>, n: number): Chunk<A> {
  concrete(self)
  if (n <= 0) {
    return self
  } else if (n >= self.length) {
    return _Empty
  } else {
    const len = self.length
    switch (self._typeId) {
      case EmptyTypeId: {
        return _Empty
      }
      case SliceTypeId: {
        return new Slice(self.chunk, self.offset + n, self.length - n)
      }
      case SingletonTypeId: {
        if (n > 0) {
          return _Empty
        }
        return self
      }
      default: {
        return new Slice(self, n, len - n)
      }
    }
  }
}

/**
 * Drops the first n elements
 *
 * @dataFirst drop_
 */
export function drop(n: number): <A>(self: Chunk<A>) => Chunk<A> {
  return (self) => self.take(n)
}

/**
 * Returns the number of elements in the chunk
 */
export function size<A>(self: Chunk<A>) {
  return self.length
}

/**
 * Returns a chunk with the elements mapped by the specified function.
 */
export function map_<A, B>(self: Chunk<A>, f: (a: A) => B): Chunk<B> {
  let r = empty<B>()
  for (const k of self) {
    r = append_(r, f(k))
  }
  return r
}

/**
 * Returns a chunk with the elements mapped by the specified function.
 *
 * @dataFirst map_
 */
export function map<A, B>(f: (a: A) => B): (self: Chunk<A>) => Chunk<B> {
  return (self) => map_(self, f)
}

/**
 * Returns a chunk with the elements mapped by the specified function.
 */
export function chain_<A, B>(self: Chunk<A>, f: (a: A) => Chunk<B>): Chunk<B> {
  let r = empty<B>()
  for (const k of self) {
    r = concat_(r, f(k))
  }
  return r
}

/**
 * Returns a chunk with the elements mapped by the specified function.
 *
 * @dataFirst chain_
 */
export function chain<A, B>(f: (a: A) => Chunk<B>): (self: Chunk<A>) => Chunk<B> {
  return (self) => chain_(self, f)
}
