/**
 * @since 2.0.0
 */
import type { Either } from "./Either.js"
import * as Equal from "./Equal.js"
import * as Equivalence from "./Equivalence.js"
import { dual, identity, pipe } from "./Function.js"
import * as Hash from "./Hash.js"
import type { TypeLambda } from "./HKT.js"
import { type Inspectable, NodeInspectSymbol, toJSON, toString } from "./Inspectable.js"
import type { NonEmptyIterable } from "./NonEmptyIterable.js"
import type { Option } from "./Option.js"
import * as O from "./Option.js"
import * as Order from "./Order.js"
import type { Pipeable } from "./Pipeable.js"
import { pipeArguments } from "./Pipeable.js"
import { hasProperty, type Predicate, type Refinement } from "./Predicate.js"
import * as RA from "./ReadonlyArray.js"
import type { NonEmptyReadonlyArray } from "./ReadonlyArray.js"

const TypeId: unique symbol = Symbol.for("effect/Chunk") as TypeId

/**
 * @category symbol
 * @since 2.0.0
 */
export type TypeId = typeof TypeId

/**
 * @category models
 * @since 2.0.0
 */
export interface Chunk<A> extends Iterable<A>, Equal.Equal, Pipeable, Inspectable {
  readonly [TypeId]: {
    readonly _A: (_: never) => A
  }
  readonly length: number
  /** @internal */
  right: Chunk<A>
  /** @internal */
  left: Chunk<A>
  /** @internal */
  backing: Backing<A>
  /** @internal */
  depth: number
}

/**
 * @category model
 * @since 2.0.0
 */
export interface NonEmptyChunk<A> extends Chunk<A>, NonEmptyIterable<A> {}

/**
 * @category type lambdas
 * @since 2.0.0
 */
export interface ChunkTypeLambda extends TypeLambda {
  readonly type: Chunk<this["Target"]>
}

type Backing<A> =
  | IArray<A>
  | IConcat<A>
  | ISingleton<A>
  | IEmpty
  | ISlice<A>

interface IArray<A> {
  readonly _tag: "IArray"
  readonly array: ReadonlyArray<A>
}

interface IConcat<A> {
  readonly _tag: "IConcat"
  readonly left: Chunk<A>
  readonly right: Chunk<A>
}

interface ISingleton<A> {
  readonly _tag: "ISingleton"
  readonly a: A
}

interface IEmpty {
  readonly _tag: "IEmpty"
}

interface ISlice<A> {
  readonly _tag: "ISlice"
  readonly chunk: Chunk<A>
  readonly offset: number
  readonly length: number
}

function copy<A>(
  src: ReadonlyArray<A>,
  srcPos: number,
  dest: Array<A>,
  destPos: number,
  len: number
) {
  for (let i = srcPos; i < Math.min(src.length, srcPos + len); i++) {
    dest[destPos + i - srcPos] = src[i]!
  }
  return dest
}

const emptyArray: ReadonlyArray<never> = []

/**
 * Compares the two chunks of equal length using the specified function
 *
 * @category equivalence
 * @since 2.0.0
 */
export const getEquivalence = <A>(isEquivalent: Equivalence.Equivalence<A>): Equivalence.Equivalence<Chunk<A>> =>
  Equivalence.make((self, that) =>
    self.length === that.length && toReadonlyArray(self).every((value, i) => isEquivalent(value, unsafeGet(that, i)))
  )

const _equivalence = getEquivalence(Equal.equals)

const ChunkProto: Omit<Chunk<unknown>, "backing" | "depth" | "left" | "length" | "right"> = {
  [TypeId]: {
    _A: (_: never) => _
  },
  toString<A>(this: Chunk<A>) {
    return toString(this.toJSON())
  },
  toJSON<A>(this: Chunk<A>) {
    return {
      _id: "Chunk",
      values: toReadonlyArray(this).map(toJSON)
    }
  },
  [NodeInspectSymbol]<A>(this: Chunk<A>) {
    return this.toJSON()
  },
  [Equal.symbol]<A>(this: Chunk<A>, that: unknown): boolean {
    return isChunk(that) && _equivalence(this, that)
  },
  [Hash.symbol]<A>(this: Chunk<A>): number {
    return Hash.array(toReadonlyArray(this))
  },
  [Symbol.iterator]<A>(this: Chunk<A>): Iterator<A> {
    switch (this.backing._tag) {
      case "IArray": {
        return this.backing.array[Symbol.iterator]()
      }
      case "IEmpty": {
        return emptyArray[Symbol.iterator]()
      }
      default: {
        return toReadonlyArray(this)[Symbol.iterator]()
      }
    }
  },
  pipe<A>(this: Chunk<A>) {
    return pipeArguments(this, arguments)
  }
}

const makeChunk = <A>(backing: Backing<A>): Chunk<A> => {
  const chunk = Object.create(ChunkProto)
  chunk.backing = backing
  switch (backing._tag) {
    case "IEmpty": {
      chunk.length = 0
      chunk.depth = 0
      chunk.left = chunk
      chunk.right = chunk
      break
    }
    case "IConcat": {
      chunk.length = backing.left.length + backing.right.length
      chunk.depth = 1 + Math.max(backing.left.depth, backing.right.depth)
      chunk.left = backing.left
      chunk.right = backing.right
      break
    }
    case "IArray": {
      chunk.length = backing.array.length
      chunk.depth = 0
      chunk.left = _empty
      chunk.right = _empty
      break
    }
    case "ISingleton": {
      chunk.length = 1
      chunk.depth = 0
      chunk.left = _empty
      chunk.right = _empty
      break
    }
    case "ISlice": {
      chunk.length = backing.length
      chunk.depth = backing.chunk.depth + 1
      chunk.left = _empty
      chunk.right = _empty
      break
    }
  }
  return chunk
}

/**
 * Checks if `u` is a `Chunk<unknown>`
 *
 * @category constructors
 * @since 2.0.0
 */
export const isChunk: {
  <A>(u: Iterable<A>): u is Chunk<A>
  (u: unknown): u is Chunk<unknown>
} = (u: unknown): u is Chunk<unknown> => hasProperty(u, TypeId)

const _empty = makeChunk<never>({ _tag: "IEmpty" })

/**
 * @category constructors
 * @since 2.0.0
 */
export const empty: <A = never>() => Chunk<A> = () => _empty

/**
 * Builds a `NonEmptyChunk` from an non-empty collection of elements.
 *
 * @category constructors
 * @since 2.0.0
 */
export const make = <As extends readonly [any, ...ReadonlyArray<any>]>(
  ...as: As
): NonEmptyChunk<As[number]> => as.length === 1 ? of(as[0]) : unsafeFromNonEmptyArray(as)

/**
 * Builds a `NonEmptyChunk` from a single element.
 *
 * @category constructors
 * @since 2.0.0
 */
export const of = <A>(a: A): NonEmptyChunk<A> => makeChunk({ _tag: "ISingleton", a }) as any

/**
 * Converts from an `Iterable<A>`
 *
 * @category conversions
 * @since 2.0.0
 */
export const fromIterable = <A>(self: Iterable<A>): Chunk<A> =>
  isChunk(self) ? self : makeChunk({ _tag: "IArray", array: RA.fromIterable(self) })

const copyToArray = <A>(self: Chunk<A>, array: Array<any>, initial: number): void => {
  switch (self.backing._tag) {
    case "IArray": {
      copy(self.backing.array, 0, array, initial, self.length)
      break
    }
    case "IConcat": {
      copyToArray(self.left, array, initial)
      copyToArray(self.right, array, initial + self.left.length)
      break
    }
    case "ISingleton": {
      array[initial] = self.backing.a
      break
    }
    case "ISlice": {
      let i = 0
      let j = initial
      while (i < self.length) {
        array[j] = unsafeGet(self, i)
        i += 1
        j += 1
      }
      break
    }
  }
}

/**
 * Converts the specified `Chunk` to a `ReadonlyArray`.
 *
 * @category conversions
 * @since 2.0.0
 */
export const toReadonlyArray = <A>(self: Chunk<A>): ReadonlyArray<A> => {
  switch (self.backing._tag) {
    case "IEmpty": {
      return emptyArray
    }
    case "IArray": {
      return self.backing.array
    }
    default: {
      const arr = new Array<A>(self.length)
      copyToArray(self, arr, 0)
      self.backing = {
        _tag: "IArray",
        array: arr
      }
      self.left = _empty
      self.right = _empty
      self.depth = 0
      return arr
    }
  }
}

/**
 * @since 2.0.0
 * @category elements
 */
export const reverse = <A>(self: Chunk<A>): Chunk<A> => {
  switch (self.backing._tag) {
    case "IEmpty":
    case "ISingleton":
      return self
    case "IArray": {
      return makeChunk({ _tag: "IArray", array: RA.reverse(self.backing.array) })
    }
    case "IConcat": {
      return makeChunk({ _tag: "IConcat", left: reverse(self.backing.right), right: reverse(self.backing.left) })
    }
    case "ISlice":
      return unsafeFromArray(RA.reverse(toReadonlyArray(self)))
  }
}

/**
 * This function provides a safe way to read a value at a particular index from a `Chunk`.
 *
 * @category elements
 * @since 2.0.0
 */
export const get: {
  (index: number): <A>(self: Chunk<A>) => Option<A>
  <A>(self: Chunk<A>, index: number): Option<A>
} = dual(
  2,
  <A>(self: Chunk<A>, index: number): Option<A> =>
    index < 0 || index >= self.length ? O.none() : O.some(unsafeGet(self, index))
)

/**
 * Wraps an array into a chunk without copying, unsafe on mutable arrays
 *
 * @since 2.0.0
 * @category unsafe
 */
export const unsafeFromArray = <A>(self: ReadonlyArray<A>): Chunk<A> => makeChunk({ _tag: "IArray", array: self })

/**
 * Wraps an array into a chunk without copying, unsafe on mutable arrays
 *
 * @since 2.0.0
 * @category unsafe
 */
export const unsafeFromNonEmptyArray = <A>(self: NonEmptyReadonlyArray<A>): NonEmptyChunk<A> =>
  unsafeFromArray(self) as any

/**
 * Gets an element unsafely, will throw on out of bounds
 *
 * @since 2.0.0
 * @category unsafe
 */
export const unsafeGet: {
  (index: number): <A>(self: Chunk<A>) => A
  <A>(self: Chunk<A>, index: number): A
} = dual(2, <A>(self: Chunk<A>, index: number): A => {
  switch (self.backing._tag) {
    case "IEmpty": {
      throw new Error(`Index out of bounds`)
    }
    case "ISingleton": {
      if (index !== 0) {
        throw new Error(`Index out of bounds`)
      }
      return self.backing.a
    }
    case "IArray": {
      if (index >= self.length || index < 0) {
        throw new Error(`Index out of bounds`)
      }
      return self.backing.array[index]!
    }
    case "IConcat": {
      return index < self.left.length
        ? unsafeGet(self.left, index)
        : unsafeGet(self.right, index - self.left.length)
    }
    case "ISlice": {
      return unsafeGet(self.backing.chunk, index + self.backing.offset)
    }
  }
})

/**
 * Appends the specified element to the end of the `Chunk`.
 *
 * @category concatenating
 * @since 2.0.0
 */
export const append: {
  <A2>(a: A2): <A>(self: Chunk<A>) => NonEmptyChunk<A2 | A>
  <A, A2>(self: Chunk<A>, a: A2): NonEmptyChunk<A | A2>
} = dual(2, <A, A2>(self: Chunk<A>, a: A2): NonEmptyChunk<A | A2> => appendAllNonEmpty(self, of(a)))

/**
 * Prepend an element to the front of a `Chunk`, creating a new `NonEmptyChunk`.
 *
 * @category concatenating
 * @since 2.0.0
 */
export const prepend: {
  <B>(elem: B): <A>(self: Chunk<A>) => NonEmptyChunk<B | A>
  <A, B>(self: Chunk<A>, elem: B): NonEmptyChunk<A | B>
} = dual(2, <A, B>(self: Chunk<A>, elem: B): NonEmptyChunk<A | B> => appendAllNonEmpty(of(elem), self))

/**
 * Takes the first up to `n` elements from the chunk
 *
 * @since 2.0.0
 */
export const take: {
  (n: number): <A>(self: Chunk<A>) => Chunk<A>
  <A>(self: Chunk<A>, n: number): Chunk<A>
} = dual(2, <A>(self: Chunk<A>, n: number): Chunk<A> => {
  if (n <= 0) {
    return _empty
  } else if (n >= self.length) {
    return self
  } else {
    switch (self.backing._tag) {
      case "ISlice": {
        return makeChunk({
          _tag: "ISlice",
          chunk: self.backing.chunk,
          length: n,
          offset: self.backing.offset
        })
      }
      case "IConcat": {
        if (n > self.left.length) {
          return makeChunk({
            _tag: "IConcat",
            left: self.left,
            right: take(self.right, n - self.left.length)
          })
        }

        return take(self.left, n)
      }
      default: {
        return makeChunk({
          _tag: "ISlice",
          chunk: self,
          offset: 0,
          length: n
        })
      }
    }
  }
})

/**
 * Drops the first up to `n` elements from the chunk
 *
 * @since 2.0.0
 */
export const drop: {
  (n: number): <A>(self: Chunk<A>) => Chunk<A>
  <A>(self: Chunk<A>, n: number): Chunk<A>
} = dual(2, <A>(self: Chunk<A>, n: number): Chunk<A> => {
  if (n <= 0) {
    return self
  } else if (n >= self.length) {
    return _empty
  } else {
    switch (self.backing._tag) {
      case "ISlice": {
        return makeChunk({
          _tag: "ISlice",
          chunk: self.backing.chunk,
          offset: self.backing.offset + n,
          length: self.backing.length - n
        })
      }
      case "IConcat": {
        if (n > self.left.length) {
          return drop(self.right, n - self.left.length)
        }
        return makeChunk({
          _tag: "IConcat",
          left: drop(self.left, n),
          right: self.right
        })
      }
      default: {
        return makeChunk({
          _tag: "ISlice",
          chunk: self,
          offset: n,
          length: self.length - n
        })
      }
    }
  }
})

/**
 * Drops the last `n` elements.
 *
 * @since 2.0.0
 */
export const dropRight: {
  (n: number): <A>(self: Chunk<A>) => Chunk<A>
  <A>(self: Chunk<A>, n: number): Chunk<A>
} = dual(2, <A>(self: Chunk<A>, n: number): Chunk<A> => take(self, Math.max(0, self.length - n)))

/**
 * Drops all elements so long as the predicate returns true.
 *
 * @since 2.0.0
 */
export const dropWhile: {
  <A>(f: (a: A) => boolean): (self: Chunk<A>) => Chunk<A>
  <A>(self: Chunk<A>, f: (a: A) => boolean): Chunk<A>
} = dual(2, <A>(self: Chunk<A>, f: (a: A) => boolean): Chunk<A> => {
  const arr = toReadonlyArray(self)
  const len = arr.length
  let i = 0
  while (i < len && f(arr[i]!)) {
    i++
  }
  return drop(self, i)
})

/**
 * @category concatenating
 * @since 2.0.0
 */
export const prependAll: {
  <B>(that: Chunk<B>): <A>(self: Chunk<A>) => Chunk<B | A>
  <A, B>(self: Chunk<A>, that: Chunk<B>): Chunk<A | B>
} = dual(2, <A, B>(self: NonEmptyChunk<A>, that: Chunk<B>): Chunk<A | B> => appendAll(that, self))

/**
 * @category concatenating
 * @since 2.0.0
 */
export const prependAllNonEmpty: {
  <B>(that: NonEmptyChunk<B>): <A>(self: Chunk<A>) => NonEmptyChunk<B | A>
  <B>(that: Chunk<B>): <A>(self: NonEmptyChunk<A>) => NonEmptyChunk<B | A>
  <A, B>(self: Chunk<A>, that: NonEmptyChunk<B>): NonEmptyChunk<A | B>
  <A, B>(self: NonEmptyChunk<A>, that: Chunk<B>): NonEmptyChunk<A | B>
} = dual(2, <A, B>(self: NonEmptyChunk<A>, that: Chunk<B>): NonEmptyChunk<A | B> => prependAll(self, that) as any)

/**
 * Concatenates the two chunks
 *
 * @category concatenating
 * @since 2.0.0
 */
export const appendAll: {
  <B>(that: Chunk<B>): <A>(self: Chunk<A>) => Chunk<B | A>
  <A, B>(self: Chunk<A>, that: Chunk<B>): Chunk<A | B>
} = dual(2, <A, B>(self: Chunk<A>, that: Chunk<B>): Chunk<A | B> => {
  if (self.backing._tag === "IEmpty") {
    return that
  }
  if (that.backing._tag === "IEmpty") {
    return self
  }
  const diff = that.depth - self.depth
  if (Math.abs(diff) <= 1) {
    return makeChunk<A | B>({ _tag: "IConcat", left: self, right: that })
  } else if (diff < -1) {
    if (self.left.depth >= self.right.depth) {
      const nr = appendAll(self.right, that)
      return makeChunk({ _tag: "IConcat", left: self.left, right: nr })
    } else {
      const nrr = appendAll(self.right.right, that)
      if (nrr.depth === self.depth - 3) {
        const nr = makeChunk({ _tag: "IConcat", left: self.right.left, right: nrr })
        return makeChunk({ _tag: "IConcat", left: self.left, right: nr })
      } else {
        const nl = makeChunk({ _tag: "IConcat", left: self.left, right: self.right.left })
        return makeChunk({ _tag: "IConcat", left: nl, right: nrr })
      }
    }
  } else {
    if (that.right.depth >= that.left.depth) {
      const nl = appendAll(self, that.left)
      return makeChunk({ _tag: "IConcat", left: nl, right: that.right })
    } else {
      const nll = appendAll(self, that.left.left)
      if (nll.depth === that.depth - 3) {
        const nl = makeChunk({ _tag: "IConcat", left: nll, right: that.left.right })
        return makeChunk({ _tag: "IConcat", left: nl, right: that.right })
      } else {
        const nr = makeChunk({ _tag: "IConcat", left: that.left.right, right: that.right })
        return makeChunk({ _tag: "IConcat", left: nll, right: nr })
      }
    }
  }
})

/**
 * @category concatenating
 * @since 2.0.0
 */
export const appendAllNonEmpty: {
  <B>(that: NonEmptyChunk<B>): <A>(self: Chunk<A>) => NonEmptyChunk<B | A>
  <B>(that: Chunk<B>): <A>(self: NonEmptyChunk<A>) => NonEmptyChunk<B | A>
  <A, B>(self: Chunk<A>, that: NonEmptyChunk<B>): NonEmptyChunk<A | B>
  <A, B>(self: NonEmptyChunk<A>, that: Chunk<B>): NonEmptyChunk<A | B>
} = dual(2, <A, B>(self: NonEmptyChunk<A>, that: Chunk<B>): NonEmptyChunk<A | B> => appendAll(self, that) as any)

/**
 * Returns a filtered and mapped subset of the elements.
 *
 * @since 2.0.0
 * @category filtering
 */
export const filterMap: {
  <A, B>(f: (a: A, i: number) => Option<B>): (self: Chunk<A>) => Chunk<B>
  <A, B>(self: Chunk<A>, f: (a: A, i: number) => Option<B>): Chunk<B>
} = dual(
  2,
  <A, B>(self: Chunk<A>, f: (a: A, i: number) => Option<B>): Chunk<B> => unsafeFromArray(RA.filterMap(self, f))
)

/**
 * Returns a filtered and mapped subset of the elements.
 *
 * @since 2.0.0
 * @category filtering
 */
export const filter: {
  <C extends A, B extends A, A = C>(refinement: Refinement<A, B>): (self: Chunk<C>) => Chunk<B>
  <B extends A, A = B>(predicate: Predicate<A>): (self: Chunk<B>) => Chunk<B>
  <C extends A, B extends A, A = C>(self: Chunk<C>, refinement: Refinement<A, B>): Chunk<B>
  <B extends A, A = B>(self: Chunk<B>, predicate: Predicate<A>): Chunk<B>
} = dual(
  2,
  <B extends A, A = B>(self: Chunk<B>, predicate: Predicate<A>) =>
    unsafeFromArray(RA.filterMap(self, O.liftPredicate(predicate)))
)

/**
 * Transforms all elements of the chunk for as long as the specified function returns some value
 *
 * @since 2.0.0
 * @category filtering
 */
export const filterMapWhile: {
  <A, B>(f: (a: A) => Option<B>): (self: Chunk<A>) => Chunk<B>
  <A, B>(self: Chunk<A>, f: (a: A) => Option<B>): Chunk<B>
} = dual(2, <A, B>(self: Chunk<A>, f: (a: A) => Option<B>) => unsafeFromArray(RA.filterMapWhile(self, f)))

/**
 * Filter out optional values
 *
 * @since 2.0.0
 * @category filtering
 */
export const compact = <A>(self: Chunk<Option<A>>): Chunk<A> => filterMap(self, identity)

/**
 * Returns a chunk with the elements mapped by the specified function.
 *
 * @since 2.0.0
 * @category sequencing
 */
export const flatMap: {
  <A, B>(f: (a: A, i: number) => Chunk<B>): (self: Chunk<A>) => Chunk<B>
  <A, B>(self: Chunk<A>, f: (a: A, i: number) => Chunk<B>): Chunk<B>
} = dual(2, <A, B>(self: Chunk<A>, f: (a: A, i: number) => Chunk<B>) => {
  if (self.backing._tag === "ISingleton") {
    return f(self.backing.a, 0)
  }
  let out: Chunk<B> = _empty
  let i = 0
  for (const k of self) {
    out = appendAll(out, f(k, i++))
  }
  return out
})

/**
 * @category sequencing
 * @since 2.0.0
 */
export const flatMapNonEmpty: {
  <A, B>(f: (a: A, i: number) => NonEmptyChunk<B>): (self: NonEmptyChunk<A>) => NonEmptyChunk<B>
  <A, B>(self: NonEmptyChunk<A>, f: (a: A, i: number) => NonEmptyChunk<B>): NonEmptyChunk<B>
} = flatMap as any

/**
 * Applies the specified function to each element of the `List`.
 *
 * @since 2.0.0
 * @category combinators
 */
export const forEach: {
  <A, B>(f: (a: A) => B): (self: Chunk<A>) => void
  <A, B>(self: Chunk<A>, f: (a: A) => B): void
} = dual(2, <A, B>(self: Chunk<A>, f: (a: A) => B): void => toReadonlyArray(self).forEach(f))

/**
 * Flattens a chunk of chunks into a single chunk by concatenating all chunks.
 *
 * @since 2.0.0
 * @category sequencing
 */
export const flatten: <A>(self: Chunk<Chunk<A>>) => Chunk<A> = flatMap(identity)

/**
 * @category sequencing
 * @since 2.0.0
 */
export const flattenNonEmpty: <A>(
  self: NonEmptyChunk<NonEmptyChunk<A>>
) => NonEmptyChunk<A> = flatMapNonEmpty(identity)

/**
 * Groups elements in chunks of up to `n` elements.
 *
 * @since 2.0.0
 * @category elements
 */
export const chunksOf: {
  (n: number): <A>(self: Chunk<A>) => Chunk<Chunk<A>>
  <A>(self: Chunk<A>, n: number): Chunk<Chunk<A>>
} = dual(2, <A>(self: Chunk<A>, n: number) => {
  const gr: Array<Chunk<A>> = []
  let current: Array<A> = []
  toReadonlyArray(self).forEach((a) => {
    current.push(a)
    if (current.length >= n) {
      gr.push(unsafeFromArray(current))
      current = []
    }
  })
  if (current.length > 0) {
    gr.push(unsafeFromArray(current))
  }
  return unsafeFromArray(gr)
})

/**
 * Creates a Chunk of unique values that are included in all given Chunks.
 *
 * The order and references of result values are determined by the Chunk.
 *
 * @since 2.0.0
 * @category elements
 */
export const intersection: {
  <A>(that: Chunk<A>): <B>(self: Chunk<B>) => Chunk<A & B>
  <A, B>(self: Chunk<A>, that: Chunk<B>): Chunk<A & B>
} = dual(
  2,
  <A, B>(self: Chunk<A>, that: Chunk<B>): Chunk<A & B> =>
    unsafeFromArray(RA.intersection(toReadonlyArray(self), toReadonlyArray(that)))
)

/**
 * Determines if the chunk is empty.
 *
 * @since 2.0.0
 * @category elements
 */
export const isEmpty = <A>(self: Chunk<A>): boolean => self.length === 0

/**
 * Determines if the chunk is not empty.
 *
 * @since 2.0.0
 * @category elements
 */
export const isNonEmpty = <A>(self: Chunk<A>): self is NonEmptyChunk<A> => self.length > 0

/**
 * Returns the first element of this chunk if it exists.
 *
 * @since 2.0.0
 * @category elements
 */
export const head: <A>(self: Chunk<A>) => Option<A> = get(0)

/**
 * Returns the first element of this chunk.
 *
 * @since 2.0.0
 * @category unsafe
 */
export const unsafeHead = <A>(self: Chunk<A>): A => unsafeGet(self, 0)

/**
 * Returns the first element of this non empty chunk.
 *
 * @since 2.0.0
 * @category elements
 */
export const headNonEmpty: <A>(self: NonEmptyChunk<A>) => A = unsafeHead

/**
 * Returns the last element of this chunk if it exists.
 *
 * @since 2.0.0
 * @category elements
 */
export const last = <A>(self: Chunk<A>): Option<A> => get(self, self.length - 1)

/**
 * Returns the last element of this chunk.
 *
 * @since 2.0.0
 * @category unsafe
 */
export const unsafeLast = <A>(self: Chunk<A>): A => unsafeGet(self, self.length - 1)

/**
 * @since 2.0.0
 */
export declare namespace Chunk {
  /**
   * @since 2.0.0
   */
  export type Infer<T extends Chunk<any>> = T extends Chunk<infer A> ? A : never

  /**
   * @since 2.0.0
   */
  export type With<T extends Chunk<any>, A> = T extends NonEmptyChunk<any> ? NonEmptyChunk<A> : Chunk<A>
}

/**
 * Returns a chunk with the elements mapped by the specified f function.
 *
 * @since 2.0.0
 * @category mapping
 */
export const map: {
  <T extends Chunk<any>, B>(f: (a: Chunk.Infer<T>, i: number) => B): (self: T) => Chunk.With<T, B>
  <T extends Chunk<any>, B>(self: T, f: (a: Chunk.Infer<T>, i: number) => B): Chunk.With<T, B>
} = dual(2, <A, B>(self: Chunk<A>, f: (a: A, i: number) => B): Chunk<B> =>
  self.backing._tag === "ISingleton" ?
    of(f(self.backing.a, 0)) :
    unsafeFromArray(pipe(toReadonlyArray(self), RA.map((a, i) => f(a, i)))))

/**
 * Statefully maps over the chunk, producing new elements of type `B`.
 *
 * @since 2.0.0
 * @category folding
 */
export const mapAccum: {
  <S, A, B>(s: S, f: (s: S, a: A) => readonly [S, B]): (self: Chunk<A>) => [S, Chunk<B>]
  <S, A, B>(self: Chunk<A>, s: S, f: (s: S, a: A) => readonly [S, B]): [S, Chunk<B>]
} = dual(3, <S, A, B>(self: Chunk<A>, s: S, f: (s: S, a: A) => readonly [S, B]): [S, Chunk<B>] => {
  const [s1, as] = RA.mapAccum(self, s, f)
  return [s1, unsafeFromArray(as)]
})

/**
 * Separate elements based on a predicate that also exposes the index of the element.
 *
 * @category filtering
 * @since 2.0.0
 */
export const partition: {
  <C extends A, B extends A, A = C>(refinement: Refinement<A, B>): (self: Chunk<C>) => [Chunk<Exclude<C, B>>, Chunk<B>]
  <B extends A, A = B>(predicate: (a: A) => boolean): (self: Chunk<B>) => [Chunk<B>, Chunk<B>]
  <C extends A, B extends A, A = C>(self: Chunk<C>, refinement: Refinement<A, B>): [Chunk<Exclude<C, B>>, Chunk<B>]
  <B extends A, A = B>(self: Chunk<B>, predicate: (a: A) => boolean): [Chunk<B>, Chunk<B>]
} = dual(
  2,
  <B extends A, A = B>(self: Chunk<B>, predicate: (a: A) => boolean): [Chunk<B>, Chunk<B>] =>
    pipe(
      RA.partition(toReadonlyArray(self), predicate),
      ([l, r]) => [unsafeFromArray(l), unsafeFromArray(r)]
    )
)

/**
 * Partitions the elements of this chunk into two chunks using f.
 *
 * @category filtering
 * @since 2.0.0
 */
export const partitionMap: {
  <A, B, C>(f: (a: A) => Either<B, C>): (self: Chunk<A>) => [Chunk<B>, Chunk<C>]
  <A, B, C>(self: Chunk<A>, f: (a: A) => Either<B, C>): [Chunk<B>, Chunk<C>]
} = dual(2, <A, B, C>(self: Chunk<A>, f: (a: A) => Either<B, C>): [Chunk<B>, Chunk<C>] =>
  pipe(
    RA.partitionMap(toReadonlyArray(self), f),
    ([l, r]) => [unsafeFromArray(l), unsafeFromArray(r)]
  ))

/**
 * Partitions the elements of this chunk into two chunks.
 *
 * @category filtering
 * @since 2.0.0
 */
export const separate = <A, B>(self: Chunk<Either<A, B>>): [Chunk<A>, Chunk<B>] =>
  pipe(
    RA.separate(toReadonlyArray(self)),
    ([l, r]) => [unsafeFromArray(l), unsafeFromArray(r)]
  )

/**
 * Retireves the size of the chunk
 *
 * @since 2.0.0
 * @category elements
 */
export const size = <A>(self: Chunk<A>): number => self.length

/**
 * Sort the elements of a Chunk in increasing order, creating a new Chunk.
 *
 * @since 2.0.0
 * @category elements
 */
export const sort: {
  <B>(O: Order.Order<B>): <A extends B>(self: Chunk<A>) => Chunk<A>
  <A extends B, B>(self: Chunk<A>, O: Order.Order<B>): Chunk<A>
} = dual(
  2,
  <A extends B, B>(self: Chunk<A>, O: Order.Order<B>): Chunk<A> => unsafeFromArray(RA.sort(toReadonlyArray(self), O))
)

/**
 * @since 2.0.0
 * @category elements
 */
export const sortWith: {
  <A, B>(f: (a: A) => B, order: Order.Order<B>): (self: Chunk<A>) => Chunk<A>
  <A, B>(self: Chunk<A>, f: (a: A) => B, order: Order.Order<B>): Chunk<A>
} = dual(
  3,
  <A, B>(self: Chunk<A>, f: (a: A) => B, order: Order.Order<B>): Chunk<A> => sort(self, Order.mapInput(order, f))
)

/**
 *  Returns two splits of this chunk at the specified index.
 *
 * @since 2.0.0
 * @category elements
 */
export const splitAt: {
  (n: number): <A>(self: Chunk<A>) => [Chunk<A>, Chunk<A>]
  <A>(self: Chunk<A>, n: number): [Chunk<A>, Chunk<A>]
} = dual(2, <A>(self: Chunk<A>, n: number): [Chunk<A>, Chunk<A>] => [take(self, n), drop(self, n)])

/**
 * Splits this chunk into `n` equally sized chunks.
 *
 * @since 2.0.0
 * @category elements
 */
export const split: {
  (n: number): <A>(self: Chunk<A>) => Chunk<Chunk<A>>
  <A>(self: Chunk<A>, n: number): Chunk<Chunk<A>>
} = dual(2, <A>(self: Chunk<A>, n: number) => chunksOf(self, Math.ceil(self.length / Math.floor(n))))

/**
 * Splits this chunk on the first element that matches this predicate.
 *
 * @category elements
 * @since 2.0.0
 */
export const splitWhere: {
  <A>(predicate: Predicate<A>): (self: Chunk<A>) => [Chunk<A>, Chunk<A>]
  <A>(self: Chunk<A>, predicate: Predicate<A>): [Chunk<A>, Chunk<A>]
} = dual(2, <A>(self: Chunk<A>, predicate: Predicate<A>): [Chunk<A>, Chunk<A>] => {
  let i = 0
  for (const a of toReadonlyArray(self)) {
    if (predicate(a)) {
      break
    } else {
      i++
    }
  }
  return splitAt(self, i)
})

/**
 * Returns every elements after the first.
 *
 * @since 2.0.0
 * @category elements
 */
export const tail = <A>(self: Chunk<A>): Option<Chunk<A>> => self.length > 0 ? O.some(drop(self, 1)) : O.none()

/**
 * Returns every elements after the first.
 *
 * @since 2.0.0
 * @category elements
 */
export const tailNonEmpty = <A>(self: NonEmptyChunk<A>): Chunk<A> => drop(self, 1)

/**
 * Takes the last `n` elements.
 *
 * @since 2.0.0
 * @category elements
 */
export const takeRight: {
  (n: number): <A>(self: Chunk<A>) => Chunk<A>
  <A>(self: Chunk<A>, n: number): Chunk<A>
} = dual(2, <A>(self: Chunk<A>, n: number): Chunk<A> => drop(self, self.length - n))

/**
 * Takes all elements so long as the predicate returns true.
 *
 * @since 2.0.0
 * @category elements
 */
export const takeWhile: {
  <A>(predicate: Predicate<A>): (self: Chunk<A>) => Chunk<A>
  <A>(self: Chunk<A>, predicate: Predicate<A>): Chunk<A>
} = dual(2, <A>(self: Chunk<A>, predicate: Predicate<A>) => {
  const res: Array<A> = []
  for (const a of toReadonlyArray(self)) {
    if (predicate(a)) {
      res.push(a)
    } else {
      break
    }
  }
  return unsafeFromArray(res)
})

/**
 * Creates a Chunks of unique values, in order, from all given Chunks.
 *
 * @since 2.0.0
 * @category elements
 */
export const union: {
  <A>(that: Chunk<A>): <B>(self: Chunk<B>) => Chunk<A | B>
  <A, B>(self: Chunk<A>, that: Chunk<B>): Chunk<A | B>
} = dual(
  2,
  <A, B>(self: Chunk<A>, that: Chunk<B>) => unsafeFromArray(RA.union(toReadonlyArray(self), toReadonlyArray(that)))
)

/**
 * Remove duplicates from an array, keeping the first occurrence of an element.
 *
 * @since 2.0.0
 * @category elements
 */
export const dedupe = <A>(self: Chunk<A>): Chunk<A> => unsafeFromArray(RA.dedupe(toReadonlyArray(self)))

/**
 * Deduplicates adjacent elements that are identical.
 *
 * @since 2.0.0
 * @category filtering
 */
export const dedupeAdjacent = <A>(self: Chunk<A>): Chunk<A> => unsafeFromArray(RA.dedupeAdjacent(self))

/**
 * Takes a `Chunk` of pairs and return two corresponding `Chunk`s.
 *
 * Note: The function is reverse of `zip`.
 *
 * @since 2.0.0
 * @category elements
 */
export const unzip = <A, B>(self: Chunk<readonly [A, B]>): [Chunk<A>, Chunk<B>] => {
  const [left, right] = RA.unzip(self)
  return [unsafeFromArray(left), unsafeFromArray(right)]
}

/**
 * Zips this chunk pointwise with the specified chunk using the specified combiner.
 *
 * @since 2.0.0
 * @category elements
 */
export const zipWith: {
  <A, B, C>(that: Chunk<B>, f: (a: A, b: B) => C): (self: Chunk<A>) => Chunk<C>
  <A, B, C>(self: Chunk<A>, that: Chunk<B>, f: (a: A, b: B) => C): Chunk<C>
} = dual(
  3,
  <A, B, C>(self: Chunk<A>, that: Chunk<B>, f: (a: A, b: B) => C): Chunk<C> =>
    unsafeFromArray(RA.zipWith(self, that, f))
)

/**
 * Zips this chunk pointwise with the specified chunk.
 *
 * @since 2.0.0
 * @category elements
 */
export const zip: {
  <B>(that: Chunk<B>): <A>(self: Chunk<A>) => Chunk<readonly [A, B]>
  <A, B>(self: Chunk<A>, that: Chunk<B>): Chunk<readonly [A, B]>
} = dual(
  2,
  <A, B>(self: Chunk<A>, that: Chunk<B>): Chunk<readonly [A, B]> => zipWith(self, that, (a, b) => [a, b])
)

/**
 * Delete the element at the specified index, creating a new `Chunk`,
 * or returning the input if the index is out of bounds.
 *
 * @since 2.0.0
 */
export const remove: {
  (i: number): <A>(self: Chunk<A>) => Chunk<A>
  <A>(self: Chunk<A>, i: number): Chunk<A>
} = dual(
  2,
  <A>(self: Chunk<A>, i: number): Chunk<A> => unsafeFromArray(RA.remove(toReadonlyArray(self), i))
)

/**
 * @since 2.0.0
 */
export const modifyOption: {
  <A, B>(i: number, f: (a: A) => B): (self: Chunk<A>) => Option<Chunk<A | B>>
  <A, B>(self: Chunk<A>, i: number, f: (a: A) => B): Option<Chunk<A | B>>
} = dual(
  3,
  <A, B>(self: Chunk<A>, i: number, f: (a: A) => B): Option<Chunk<A | B>> =>
    O.map(RA.modifyOption(toReadonlyArray(self), i, f), unsafeFromArray)
)

/**
 * Apply a function to the element at the specified index, creating a new `Chunk`,
 * or returning the input if the index is out of bounds.
 *
 * @since 2.0.0
 */
export const modify: {
  <A, B>(i: number, f: (a: A) => B): (self: Chunk<A>) => Chunk<A | B>
  <A, B>(self: Chunk<A>, i: number, f: (a: A) => B): Chunk<A | B>
} = dual(
  3,
  <A, B>(self: Chunk<A>, i: number, f: (a: A) => B): Chunk<A | B> => O.getOrElse(modifyOption(self, i, f), () => self)
)

/**
 * Change the element at the specified index, creating a new `Chunk`,
 * or returning the input if the index is out of bounds.
 *
 * @since 2.0.0
 */
export const replace: {
  <B>(i: number, b: B): <A>(self: Chunk<A>) => Chunk<B | A>
  <A, B>(self: Chunk<A>, i: number, b: B): Chunk<B | A>
} = dual(3, <A, B>(self: Chunk<A>, i: number, b: B): Chunk<B | A> => modify(self, i, () => b))

/**
 * @since 2.0.0
 */
export const replaceOption: {
  <B>(i: number, b: B): <A>(self: Chunk<A>) => Option<Chunk<B | A>>
  <A, B>(self: Chunk<A>, i: number, b: B): Option<Chunk<B | A>>
} = dual(3, <A, B>(self: Chunk<A>, i: number, b: B): Option<Chunk<B | A>> => modifyOption(self, i, () => b))

/**
 * Return a Chunk of length n with element i initialized with f(i).
 *
 * **Note**. `n` is normalized to an integer >= 1.
 *
 * @category constructors
 * @since 2.0.0
 */
export const makeBy: {
  <A>(f: (i: number) => A): (n: number) => NonEmptyChunk<A>
  <A>(n: number, f: (i: number) => A): NonEmptyChunk<A>
} = dual(2, (n, f) => fromIterable(RA.makeBy(n, f)))

/**
 * Create a non empty `Chunk` containing a range of integers, including both endpoints.
 *
 * @category constructors
 * @since 2.0.0
 */
export const range = (start: number, end: number): NonEmptyChunk<number> =>
  start <= end ? makeBy(end - start + 1, (i) => start + i) : of(start)

// -------------------------------------------------------------------------------------
// re-exports from ReadonlyArray
// -------------------------------------------------------------------------------------

/**
 * Returns a function that checks if a `Chunk` contains a given value using the default `Equivalence`.
 *
 * @category elements
 * @since 2.0.0
 */
export const contains: {
  <A>(a: A): (self: Chunk<A>) => boolean
  <A>(self: Chunk<A>, a: A): boolean
} = RA.contains

/**
 * Returns a function that checks if a `Chunk` contains a given value using a provided `isEquivalent` function.
 *
 * @category elements
 * @since 2.0.0
 */
export const containsWith: <A>(
  isEquivalent: (self: A, that: A) => boolean
) => {
  (a: A): (self: Chunk<A>) => boolean
  (self: Chunk<A>, a: A): boolean
} = RA.containsWith

/**
 * Returns the first element that satisfies the specified
 * predicate, or `None` if no such element exists.
 *
 * @category elements
 * @since 2.0.0
 */
export const findFirst: {
  <A, B extends A>(refinement: Refinement<A, B>): (self: Chunk<A>) => Option<B>
  <A>(predicate: Predicate<A>): <B extends A>(self: Chunk<B>) => Option<B>
  <A, B extends A>(self: Chunk<A>, refinement: Refinement<A, B>): Option<B>
  <B extends A, A>(self: Chunk<B>, predicate: Predicate<A>): Option<B>
} = RA.findFirst

/**
 * Return the first index for which a predicate holds.
 *
 * @category elements
 * @since 2.0.0
 */
export const findFirstIndex: {
  <A>(predicate: Predicate<A>): (self: Chunk<A>) => Option<number>
  <A>(self: Chunk<A>, predicate: Predicate<A>): Option<number>
} = RA.findFirstIndex

/**
 * Find the last element for which a predicate holds.
 *
 * @category elements
 * @since 2.0.0
 */
export const findLast: {
  <A, B extends A>(refinement: Refinement<A, B>): (self: Chunk<A>) => Option<B>
  <A>(predicate: Predicate<A>): <B extends A>(self: Chunk<B>) => Option<B>
  <A, B extends A>(self: Chunk<A>, refinement: Refinement<A, B>): Option<B>
  <B extends A, A>(self: Chunk<B>, predicate: Predicate<A>): Option<B>
} = RA.findLast

/**
 * Return the last index for which a predicate holds.
 *
 * @category elements
 * @since 2.0.0
 */
export const findLastIndex: {
  <A>(predicate: Predicate<A>): (self: Chunk<A>) => Option<number>
  <A>(self: Chunk<A>, predicate: Predicate<A>): Option<number>
} = RA.findLastIndex

/**
 * Check if a predicate holds true for every `Chunk` element.
 *
 * @category elements
 * @since 2.0.0
 */
export const every: {
  <A, B extends A>(refinement: Refinement<A, B>): (self: Chunk<A>) => self is Chunk<B>
  <A>(predicate: Predicate<A>): (self: Chunk<A>) => boolean
  <A, B extends A>(self: Chunk<A>, refinement: Refinement<A, B>): self is Chunk<B>
  <A>(self: Chunk<A>, predicate: Predicate<A>): boolean
} = dual(
  2,
  <A, B extends A>(self: Chunk<A>, refinement: Refinement<A, B>): self is Chunk<B> =>
    RA.fromIterable(self).every(refinement)
)

/**
 * Check if a predicate holds true for some `Chunk` element.
 *
 * @category elements
 * @since 2.0.0
 */
export const some: {
  <A>(predicate: Predicate<A>): <B extends A>(self: Chunk<B>) => self is NonEmptyChunk<B>
  <B extends A, A = B>(self: Chunk<B>, predicate: Predicate<A>): self is NonEmptyChunk<B>
} = dual(
  2,
  <B extends A, A = B>(self: Chunk<B>, predicate: Predicate<A>): self is NonEmptyChunk<B> =>
    RA.fromIterable(self).some(predicate)
)

/**
 * Joins the elements together with "sep" in the middle.
 *
 * @category folding
 * @since 2.0.0
 */
export const join: {
  (sep: string): (self: Chunk<string>) => string
  (self: Chunk<string>, sep: string): string
} = RA.join

/**
 * @category folding
 * @since 2.0.0
 */
export const reduce: {
  <B, A>(b: B, f: (b: B, a: A, i: number) => B): (self: Chunk<A>) => B
  <A, B>(self: Chunk<A>, b: B, f: (b: B, a: A, i: number) => B): B
} = RA.reduce

/**
 * @category folding
 * @since 2.0.0
 */
export const reduceRight: {
  <B, A>(b: B, f: (b: B, a: A, i: number) => B): (self: Chunk<A>) => B
  <A, B>(self: Chunk<A>, b: B, f: (b: B, a: A, i: number) => B): B
} = RA.reduceRight
