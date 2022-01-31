// ets_tracing: off

import { identity } from "../../../Function/index.js"
import { ArrayIndexOutOfBoundsException } from "../../../GlobalExceptions/index.js"
import * as O from "../../../Option/index.js"
import * as St from "../../../Structural/index.js"
import * as A from "../Array/index.js"
import type { Chunk } from "./definition.js"
import {
  _Empty,
  concrete,
  concreteId,
  corresponds_,
  EmptyTypeId,
  Singleton,
  SingletonTypeId,
  Slice,
  SliceTypeId
} from "./definition.js"

export * from "./definition.js"

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
  return _Empty
}

/**
 * Appends a value to a chunk
 *
 * @ets_data_first append_
 */
export function append<A1>(a: A1) {
  return <A>(self: Chunk<A>): Chunk<A | A1> => concreteId(self).append(a)
}

/**
 * Appends a value to a chunk
 */
export function append_<A, A1>(self: Chunk<A>, a: A1): Chunk<A | A1> {
  return concreteId(self).append(a)
}

/**
 * Prepends a value to a chunk
 *
 * @ets_data_first prepend_
 */
export function prepend<A1>(a: A1) {
  return <A>(self: Chunk<A>): Chunk<A | A1> => concreteId(self).prepend(a)
}

/**
 * Prepends a value to a chunk
 */
export function prepend_<A, A1>(self: Chunk<A>, a: A1): Chunk<A | A1> {
  return concreteId(self).prepend(a)
}

/**
 * Concats chunks
 *
 * @ets_data_first concat_
 */
export function concat<A1>(that: Chunk<A1>) {
  return <A>(self: Chunk<A>): Chunk<A | A1> => concreteId(self).concat(concreteId(that))
}

/**
 * Concats chunks
 */
export function concat_<A, A1>(self: Chunk<A>, that: Chunk<A1>): Chunk<A | A1> {
  return concreteId(self).concat(concreteId(that))
}

/**
 * Converts a chunk to an ArrayLike (either Array or Buffer)
 */
export function toArrayLike<A>(self: Chunk<A>): ArrayLike<A> {
  return concreteId(self).arrayLike()
}

/**
 * Converts a chunk to an Array
 */
export function toArray<A>(self: Chunk<A>): A.Array<A> {
  return concreteId(self).array()
}

/**
 * Safely get a value
 */
export function get_<A>(self: Chunk<A>, n: number): O.Option<A> {
  return !Number.isInteger(n) || n < 0 || n >= concreteId(self).length
    ? O.none
    : O.some(concreteId(self).get(n))
}

/**
 * Safely get a value
 *
 * @ets_data_first get_
 */
export function get(n: number) {
  return <A>(self: Chunk<A>): O.Option<A> => get_(self, n)
}

/**
 * Unsafely get a value
 */
export function unsafeGet_<A>(self: Chunk<A>, n: number): A {
  return concreteId(self).get(n)
}

/**
 * Safely get a value
 *
 * @ets_data_first unsafeGet_
 */
export function unsafeGet(n: number) {
  return <A>(self: Chunk<A>): A => unsafeGet_(self, n)
}

/**
 * Referential equality check
 */
export function equals_<A, B>(self: Chunk<A>, that: Chunk<B>): boolean {
  return corresponds_(self, that, St.equals)
}

/**
 * Referential equality check
 *
 * @ets_data_first equals_
 */
export function equals<B>(that: Chunk<B>): <A>(self: Chunk<A>) => boolean {
  return (self) => equals_(self, that)
}

/**
 * Takes the first n elements
 */
export function take_<A>(self: Chunk<A>, n: number): Chunk<A> {
  return concreteId(self).take(n)
}

/**
 * Takes the first n elements
 *
 * @ets_data_first take_
 */
export function take(n: number): <A>(self: Chunk<A>) => Chunk<A> {
  return (self) => concreteId(self).take(n)
}

/**
 * Takes the last n elements
 */
export function takeRight_<A>(self: Chunk<A>, n: number): Chunk<A> {
  return drop_(concreteId(self), size(self) - n)
}

/**
 * Takes the last n elements
 *
 * @ets_data_first takeRight_
 */
export function takeRight(n: number) {
  return <A>(self: Chunk<A>) => takeRight_(self, n)
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
 * @ets_data_first drop_
 */
export function drop(n: number): <A>(self: Chunk<A>) => Chunk<A> {
  return (self) => drop_(self, n)
}

/**
 * Drops the first n elements
 */
export function dropRight_<A>(self: Chunk<A>, n: number) {
  concrete(self)

  return take_(self, Math.max(0, self.length - n))
}

/**
 * Drops the first n elements
 *
 * @ets_data_first dropRight_
 */
export function dropRight(n: number) {
  return <A>(self: Chunk<A>) => dropRight_(self, n)
}

/**
 * Returns the number of elements in the chunk
 */
export function size<A>(self: Chunk<A>) {
  return concreteId(self).length
}

/**
 * Returns a chunk with the elements mapped by the specified function.
 */
export function map_<A, B>(self: Chunk<A>, f: (a: A) => B): Chunk<B> {
  concrete(self)

  if (self._typeId === SingletonTypeId) {
    return new Singleton(f(self.a))
  }

  let r = empty<B>()
  for (const k of self) {
    r = append_(r, f(k))
  }
  return r
}

/**
 * Returns a chunk with the elements mapped by the specified function.
 *
 * @ets_data_first map_
 */
export function map<A, B>(f: (a: A) => B): (self: Chunk<A>) => Chunk<B> {
  return (self) => map_(self, f)
}

/**
 * Returns a chunk with the elements mapped by the specified function.
 */
export function mapWithIndex_<A, B>(
  self: Chunk<A>,
  f: (index: number, a: A) => B
): Chunk<B> {
  concrete(self)

  if (self._typeId === SingletonTypeId) {
    return new Singleton(f(0, self.a))
  }

  let r = empty<B>()
  let i = 0
  for (const k of self) {
    r = append_(r, f(i, k))
    i += 1
  }
  return r
}

/**
 * Returns a chunk with the elements mapped by the specified function.
 *
 * @ets_data_first mapWithIndex_
 */
export function mapWithIndex<A, B>(
  f: (index: number, a: A) => B
): (self: Chunk<A>) => Chunk<B> {
  return (self) => mapWithIndex_(self, f)
}

/**
 * Returns a chunk with the elements mapped by the specified function.
 */
export function chain_<A, B>(self: Chunk<A>, f: (a: A) => Chunk<B>): Chunk<B> {
  concrete(self)

  if (self._typeId === SingletonTypeId) {
    return f(self.a)
  }

  let r = empty<B>()
  for (const k of self) {
    r = concat_(r, f(k))
  }
  return r
}

/**
 * Returns a chunk with the elements mapped by the specified function.
 *
 * @ets_data_first chain_
 */
export function chain<A, B>(f: (a: A) => Chunk<B>): (self: Chunk<A>) => Chunk<B> {
  return (self) => chain_(self, f)
}

/**
 * Flattens a chunk of chunks into a single chunk by concatenating all chunks.
 */
export function flatten<A>(self: Chunk<Chunk<A>>): Chunk<A> {
  return chain_(self, identity)
}

/**
 * Returns the first element of this chunk if it exists.
 */
export function head<A>(self: Chunk<A>): O.Option<A> {
  return get_(self, 0)
}

/**
 * Returns every elements after the first
 */
export function tail<A>(self: Chunk<A>): O.Option<Chunk<A>> {
  return concreteId(self).length > 0 ? O.some(drop_(self, 1)) : O.none
}

/**
 * Returns the last element of this chunk if it exists.
 */
export function last<A>(self: Chunk<A>): O.Option<A> {
  return get_(self, concreteId(self).length - 1)
}

/**
 * Returns the first element of this chunk. Note that this method is partial
 * in that it will throw an exception if the chunk is empty. Consider using
 * `head` to explicitly handle the possibility that the chunk is empty
 * or iterating over the elements of the chunk in lower level, performance
 * sensitive code unless you really only need the first element of the chunk.
 */
export function unsafeHead<A>(self: Chunk<A>): A {
  return concreteId(self).get(0)
}

/**
 * Returns every elements after the first. Note that this method is partial
 * in that it will throw an exception if the chunk is empty. Consider using
 * `head` to explicitly handle the possibility that the chunk is empty
 * or iterating over the elements of the chunk in lower level, performance
 * sensitive code unless you really only need the first element of the chunk.
 */
export function unsafeTail<A>(self: Chunk<A>): Chunk<A> {
  if (concreteId(self).length === 0) {
    throw new ArrayIndexOutOfBoundsException(1)
  }

  return drop_(self, 1)
}

/**
 * Returns the last element of this chunk. Note that this method is partial
 * in that it will throw an exception if the chunk is empty. Consider using
 * `last` to explicitly handle the possibility that the chunk is empty
 * or iterating over the elements of the chunk in lower level, performance
 * sensitive code unless you really only need the last element of the chunk.
 */
export function unsafeLast<A>(self: Chunk<A>): A {
  return concreteId(self).get(concreteId(self).length - 1)
}

/**
 * Determines if the chunk is empty.
 */
export function isEmpty<A>(self: Chunk<A>): boolean {
  return concreteId(self).length === 0
}

/**
 * Determines if the chunk is empty.
 */
export function isNonEmpty<A>(self: Chunk<A>): boolean {
  return concreteId(self).length !== 0
}

/**
 * Buckets iterator
 */
export function buckets<A>(self: Chunk<A>): Iterable<ArrayLike<A>> {
  return concreteId(self).buckets()
}

/**
 * Reverse buckets iterator
 */
export function reverseBuckets<A>(self: Chunk<A>): Iterable<ArrayLike<A>> {
  return concreteId(self).reverseBuckets()
}

/**
 * Reverse buckets iterator
 */
export function reverse<A>(self: Chunk<A>): Iterable<A> {
  return concreteId(self).reverse()
}

/**
 * Materializes a chunk into a chunk backed by an array. This method can
 * improve the performance of bulk operations.
 */
export function materialize<A>(self: Chunk<A>): Chunk<A> {
  return concreteId(self).materialize()
}

/**
 * The unit chunk
 */
export const unit: Chunk<void> = single(void 0)

/**
 * Build a chunk from a sequence of values
 *
 * NOTE: different from Chunk#from this copies the elements 1 by 1
 * allowing for binary to be correctly stored in typed arrays
 */
export function make<Elem extends readonly any[]>(...iter: Elem): Chunk<Elem[number]> {
  let builder = empty<Elem[number]>()
  for (const x of iter) {
    builder = append_(builder, x)
  }
  return builder
}

/**
 * Return a chunk of length `n` with element `i` initialized with `f(i)`
 */
export function makeBy_<A>(n: number, f: (i: number) => A): Chunk<A> {
  const b = builder<A>()

  for (let i = 0; i < n; i++) {
    b.append(f(i))
  }

  return b.build()
}

/**
 * Builder
 */
export function builder<A>() {
  return new ChunkBuilder<A>(empty())
}

export class ChunkBuilder<A> {
  constructor(private chunk: Chunk<A>) {}

  append(a: A): ChunkBuilder<A> {
    this.chunk = append_(this.chunk, a)
    return this
  }

  build() {
    return this.chunk
  }
}
