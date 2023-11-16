---
title: Chunk.ts
nav_order: 9
parent: Modules
---

## Chunk overview

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [combinators](#combinators)
  - [forEach](#foreach)
- [concatenating](#concatenating)
  - [append](#append)
  - [appendAll](#appendall)
  - [appendAllNonEmpty](#appendallnonempty)
  - [prepend](#prepend)
  - [prependAll](#prependall)
  - [prependAllNonEmpty](#prependallnonempty)
- [constructors](#constructors)
  - [empty](#empty)
  - [isChunk](#ischunk)
  - [make](#make)
  - [makeBy](#makeby)
  - [of](#of)
  - [range](#range)
- [conversions](#conversions)
  - [fromIterable](#fromiterable)
  - [toArray](#toarray)
  - [toReadonlyArray](#toreadonlyarray)
- [elements](#elements)
  - [chunksOf](#chunksof)
  - [contains](#contains)
  - [containsWith](#containswith)
  - [dedupe](#dedupe)
  - [every](#every)
  - [findFirst](#findfirst)
  - [findFirstIndex](#findfirstindex)
  - [findLast](#findlast)
  - [findLastIndex](#findlastindex)
  - [get](#get)
  - [head](#head)
  - [headNonEmpty](#headnonempty)
  - [intersection](#intersection)
  - [isEmpty](#isempty)
  - [isNonEmpty](#isnonempty)
  - [last](#last)
  - [reverse](#reverse)
  - [size](#size)
  - [some](#some)
  - [sort](#sort)
  - [sortWith](#sortwith)
  - [split](#split)
  - [splitAt](#splitat)
  - [splitWhere](#splitwhere)
  - [tail](#tail)
  - [tailNonEmpty](#tailnonempty)
  - [takeRight](#takeright)
  - [takeWhile](#takewhile)
  - [union](#union)
  - [unzip](#unzip)
  - [zip](#zip)
  - [zipWith](#zipwith)
- [equivalence](#equivalence)
  - [getEquivalence](#getequivalence)
- [filtering](#filtering)
  - [compact](#compact)
  - [dedupeAdjacent](#dedupeadjacent)
  - [filter](#filter)
  - [filterMap](#filtermap)
  - [filterMapWhile](#filtermapwhile)
  - [partition](#partition)
  - [partitionMap](#partitionmap)
  - [separate](#separate)
- [folding](#folding)
  - [join](#join)
  - [mapAccum](#mapaccum)
  - [reduce](#reduce)
  - [reduceRight](#reduceright)
- [mapping](#mapping)
  - [map](#map)
- [model](#model)
  - [NonEmptyChunk (interface)](#nonemptychunk-interface)
- [models](#models)
  - [Chunk (interface)](#chunk-interface)
- [sequencing](#sequencing)
  - [flatMap](#flatmap)
  - [flatMapNonEmpty](#flatmapnonempty)
  - [flatten](#flatten)
  - [flattenNonEmpty](#flattennonempty)
- [symbol](#symbol)
  - [TypeId (type alias)](#typeid-type-alias)
- [type lambdas](#type-lambdas)
  - [ChunkTypeLambda (interface)](#chunktypelambda-interface)
- [unsafe](#unsafe)
  - [unsafeFromArray](#unsafefromarray)
  - [unsafeFromNonEmptyArray](#unsafefromnonemptyarray)
  - [unsafeGet](#unsafeget)
  - [unsafeHead](#unsafehead)
  - [unsafeLast](#unsafelast)
- [utils](#utils)
  - [Chunk (namespace)](#chunk-namespace)
    - [Infer (type alias)](#infer-type-alias)
    - [With (type alias)](#with-type-alias)
  - [drop](#drop)
  - [dropRight](#dropright)
  - [dropWhile](#dropwhile)
  - [modify](#modify)
  - [modifyOption](#modifyoption)
  - [remove](#remove)
  - [replace](#replace)
  - [replaceOption](#replaceoption)
  - [take](#take)

---

# combinators

## forEach

Applies the specified function to each element of the `List`.

**Signature**

```ts
export declare const forEach: {
  <A, B>(f: (a: A) => B): (self: Chunk<A>) => void
  <A, B>(self: Chunk<A>, f: (a: A) => B): void
}
```

Added in v2.0.0

# concatenating

## append

Appends the specified element to the end of the `Chunk`.

**Signature**

```ts
export declare const append: {
  <A2>(a: A2): <A>(self: Chunk<A>) => NonEmptyChunk<A2 | A>
  <A, A2>(self: Chunk<A>, a: A2): NonEmptyChunk<A | A2>
}
```

Added in v2.0.0

## appendAll

Concatenates the two chunks

**Signature**

```ts
export declare const appendAll: {
  <B>(that: Chunk<B>): <A>(self: Chunk<A>) => Chunk<B | A>
  <A, B>(self: Chunk<A>, that: Chunk<B>): Chunk<A | B>
}
```

Added in v2.0.0

## appendAllNonEmpty

**Signature**

```ts
export declare const appendAllNonEmpty: {
  <B>(that: NonEmptyChunk<B>): <A>(self: Chunk<A>) => NonEmptyChunk<B | A>
  <B>(that: Chunk<B>): <A>(self: NonEmptyChunk<A>) => NonEmptyChunk<B | A>
  <A, B>(self: Chunk<A>, that: NonEmptyChunk<B>): NonEmptyChunk<A | B>
  <A, B>(self: NonEmptyChunk<A>, that: Chunk<B>): NonEmptyChunk<A | B>
}
```

Added in v2.0.0

## prepend

Prepend an element to the front of a `Chunk`, creating a new `NonEmptyChunk`.

**Signature**

```ts
export declare const prepend: {
  <B>(elem: B): <A>(self: Chunk<A>) => NonEmptyChunk<B | A>
  <A, B>(self: Chunk<A>, elem: B): NonEmptyChunk<A | B>
}
```

Added in v2.0.0

## prependAll

**Signature**

```ts
export declare const prependAll: {
  <B>(that: Chunk<B>): <A>(self: Chunk<A>) => Chunk<B | A>
  <A, B>(self: Chunk<A>, that: Chunk<B>): Chunk<A | B>
}
```

Added in v2.0.0

## prependAllNonEmpty

**Signature**

```ts
export declare const prependAllNonEmpty: {
  <B>(that: NonEmptyChunk<B>): <A>(self: Chunk<A>) => NonEmptyChunk<B | A>
  <B>(that: Chunk<B>): <A>(self: NonEmptyChunk<A>) => NonEmptyChunk<B | A>
  <A, B>(self: Chunk<A>, that: NonEmptyChunk<B>): NonEmptyChunk<A | B>
  <A, B>(self: NonEmptyChunk<A>, that: Chunk<B>): NonEmptyChunk<A | B>
}
```

Added in v2.0.0

# constructors

## empty

**Signature**

```ts
export declare const empty: <A = never>() => Chunk<A>
```

Added in v2.0.0

## isChunk

Checks if `u` is a `Chunk<unknown>`

**Signature**

```ts
export declare const isChunk: { <A>(u: Iterable<A>): u is Chunk<A>; (u: unknown): u is Chunk<unknown> }
```

Added in v2.0.0

## make

Builds a `NonEmptyChunk` from an non-empty collection of elements.

**Signature**

```ts
export declare const make: <As extends readonly [any, ...any[]]>(...as: As) => NonEmptyChunk<As[number]>
```

Added in v2.0.0

## makeBy

Return a Chunk of length n with element i initialized with f(i).

**Note**. `n` is normalized to an integer >= 1.

**Signature**

```ts
export declare const makeBy: {
  <A>(f: (i: number) => A): (n: number) => NonEmptyChunk<A>
  <A>(n: number, f: (i: number) => A): NonEmptyChunk<A>
}
```

Added in v2.0.0

## of

Builds a `NonEmptyChunk` from a single element.

**Signature**

```ts
export declare const of: <A>(a: A) => NonEmptyChunk<A>
```

Added in v2.0.0

## range

Create a non empty `Chunk` containing a range of integers, including both endpoints.

**Signature**

```ts
export declare const range: (start: number, end: number) => NonEmptyChunk<number>
```

Added in v2.0.0

# conversions

## fromIterable

Converts from an `Iterable<A>`

**Signature**

```ts
export declare const fromIterable: <A>(self: Iterable<A>) => Chunk<A>
```

Added in v2.0.0

## toArray

Converts the specified `Chunk` to a `Array`.

**Signature**

```ts
export declare const toArray: <A>(self: Chunk<A>) => A[]
```

Added in v2.0.0

## toReadonlyArray

Converts the specified `Chunk` to a `ReadonlyArray`.

**Signature**

```ts
export declare const toReadonlyArray: <A>(self: Chunk<A>) => readonly A[]
```

Added in v2.0.0

# elements

## chunksOf

Groups elements in chunks of up to `n` elements.

**Signature**

```ts
export declare const chunksOf: {
  (n: number): <A>(self: Chunk<A>) => Chunk<Chunk<A>>
  <A>(self: Chunk<A>, n: number): Chunk<Chunk<A>>
}
```

Added in v2.0.0

## contains

Returns a function that checks if a `Chunk` contains a given value using the default `Equivalence`.

**Signature**

```ts
export declare const contains: { <A>(a: A): (self: Chunk<A>) => boolean; <A>(self: Chunk<A>, a: A): boolean }
```

Added in v2.0.0

## containsWith

Returns a function that checks if a `Chunk` contains a given value using a provided `isEquivalent` function.

**Signature**

```ts
export declare const containsWith: <A>(isEquivalent: (self: A, that: A) => boolean) => {
  (a: A): (self: Chunk<A>) => boolean
  (self: Chunk<A>, a: A): boolean
}
```

Added in v2.0.0

## dedupe

Remove duplicates from an array, keeping the first occurrence of an element.

**Signature**

```ts
export declare const dedupe: <A>(self: Chunk<A>) => Chunk<A>
```

Added in v2.0.0

## every

Check if a predicate holds true for every `Chunk` element.

**Signature**

```ts
export declare const every: {
  <A, B extends A>(refinement: Refinement<A, B>): (self: Chunk<A>) => self is Chunk<B>
  <A>(predicate: Predicate<A>): (self: Chunk<A>) => boolean
  <A, B extends A>(self: Chunk<A>, refinement: Refinement<A, B>): self is Chunk<B>
  <A>(self: Chunk<A>, predicate: Predicate<A>): boolean
}
```

Added in v2.0.0

## findFirst

Returns the first element that satisfies the specified
predicate, or `None` if no such element exists.

**Signature**

```ts
export declare const findFirst: {
  <A, B extends A>(refinement: Refinement<A, B>): (self: Chunk<A>) => Option<B>
  <A>(predicate: Predicate<A>): <B extends A>(self: Chunk<B>) => Option<B>
  <A, B extends A>(self: Chunk<A>, refinement: Refinement<A, B>): Option<B>
  <B extends A, A>(self: Chunk<B>, predicate: Predicate<A>): Option<B>
}
```

Added in v2.0.0

## findFirstIndex

Return the first index for which a predicate holds.

**Signature**

```ts
export declare const findFirstIndex: {
  <A>(predicate: Predicate<A>): (self: Chunk<A>) => Option<number>
  <A>(self: Chunk<A>, predicate: Predicate<A>): Option<number>
}
```

Added in v2.0.0

## findLast

Find the last element for which a predicate holds.

**Signature**

```ts
export declare const findLast: {
  <A, B extends A>(refinement: Refinement<A, B>): (self: Chunk<A>) => Option<B>
  <A>(predicate: Predicate<A>): <B extends A>(self: Chunk<B>) => Option<B>
  <A, B extends A>(self: Chunk<A>, refinement: Refinement<A, B>): Option<B>
  <B extends A, A>(self: Chunk<B>, predicate: Predicate<A>): Option<B>
}
```

Added in v2.0.0

## findLastIndex

Return the last index for which a predicate holds.

**Signature**

```ts
export declare const findLastIndex: {
  <A>(predicate: Predicate<A>): (self: Chunk<A>) => Option<number>
  <A>(self: Chunk<A>, predicate: Predicate<A>): Option<number>
}
```

Added in v2.0.0

## get

This function provides a safe way to read a value at a particular index from a `Chunk`.

**Signature**

```ts
export declare const get: {
  (index: number): <A>(self: Chunk<A>) => Option<A>
  <A>(self: Chunk<A>, index: number): Option<A>
}
```

Added in v2.0.0

## head

Returns the first element of this chunk if it exists.

**Signature**

```ts
export declare const head: <A>(self: Chunk<A>) => Option<A>
```

Added in v2.0.0

## headNonEmpty

Returns the first element of this non empty chunk.

**Signature**

```ts
export declare const headNonEmpty: <A>(self: NonEmptyChunk<A>) => A
```

Added in v2.0.0

## intersection

Creates a Chunk of unique values that are included in all given Chunks.

The order and references of result values are determined by the Chunk.

**Signature**

```ts
export declare const intersection: {
  <A>(that: Chunk<A>): <B>(self: Chunk<B>) => Chunk<A & B>
  <A, B>(self: Chunk<A>, that: Chunk<B>): Chunk<A & B>
}
```

Added in v2.0.0

## isEmpty

Determines if the chunk is empty.

**Signature**

```ts
export declare const isEmpty: <A>(self: Chunk<A>) => boolean
```

Added in v2.0.0

## isNonEmpty

Determines if the chunk is not empty.

**Signature**

```ts
export declare const isNonEmpty: <A>(self: Chunk<A>) => self is NonEmptyChunk<A>
```

Added in v2.0.0

## last

Returns the last element of this chunk if it exists.

**Signature**

```ts
export declare const last: <A>(self: Chunk<A>) => Option<A>
```

Added in v2.0.0

## reverse

**Signature**

```ts
export declare const reverse: <A>(self: Chunk<A>) => Chunk<A>
```

Added in v2.0.0

## size

Retireves the size of the chunk

**Signature**

```ts
export declare const size: <A>(self: Chunk<A>) => number
```

Added in v2.0.0

## some

Check if a predicate holds true for some `Chunk` element.

**Signature**

```ts
export declare const some: {
  <A>(predicate: Predicate<A>): <B extends A>(self: Chunk<B>) => self is NonEmptyChunk<B>
  <B extends A, A = B>(self: Chunk<B>, predicate: Predicate<A>): self is NonEmptyChunk<B>
}
```

Added in v2.0.0

## sort

Sort the elements of a Chunk in increasing order, creating a new Chunk.

**Signature**

```ts
export declare const sort: {
  <B>(O: Order.Order<B>): <A extends B>(self: Chunk<A>) => Chunk<A>
  <A extends B, B>(self: Chunk<A>, O: Order.Order<B>): Chunk<A>
}
```

Added in v2.0.0

## sortWith

**Signature**

```ts
export declare const sortWith: {
  <A, B>(f: (a: A) => B, order: Order.Order<B>): (self: Chunk<A>) => Chunk<A>
  <A, B>(self: Chunk<A>, f: (a: A) => B, order: Order.Order<B>): Chunk<A>
}
```

Added in v2.0.0

## split

Splits this chunk into `n` equally sized chunks.

**Signature**

```ts
export declare const split: {
  (n: number): <A>(self: Chunk<A>) => Chunk<Chunk<A>>
  <A>(self: Chunk<A>, n: number): Chunk<Chunk<A>>
}
```

Added in v2.0.0

## splitAt

Returns two splits of this chunk at the specified index.

**Signature**

```ts
export declare const splitAt: {
  (n: number): <A>(self: Chunk<A>) => [Chunk<A>, Chunk<A>]
  <A>(self: Chunk<A>, n: number): [Chunk<A>, Chunk<A>]
}
```

Added in v2.0.0

## splitWhere

Splits this chunk on the first element that matches this predicate.

**Signature**

```ts
export declare const splitWhere: {
  <A>(predicate: Predicate<A>): (self: Chunk<A>) => [Chunk<A>, Chunk<A>]
  <A>(self: Chunk<A>, predicate: Predicate<A>): [Chunk<A>, Chunk<A>]
}
```

Added in v2.0.0

## tail

Returns every elements after the first.

**Signature**

```ts
export declare const tail: <A>(self: Chunk<A>) => Option<Chunk<A>>
```

Added in v2.0.0

## tailNonEmpty

Returns every elements after the first.

**Signature**

```ts
export declare const tailNonEmpty: <A>(self: NonEmptyChunk<A>) => Chunk<A>
```

Added in v2.0.0

## takeRight

Takes the last `n` elements.

**Signature**

```ts
export declare const takeRight: {
  (n: number): <A>(self: Chunk<A>) => Chunk<A>
  <A>(self: Chunk<A>, n: number): Chunk<A>
}
```

Added in v2.0.0

## takeWhile

Takes all elements so long as the predicate returns true.

**Signature**

```ts
export declare const takeWhile: {
  <A>(predicate: Predicate<A>): (self: Chunk<A>) => Chunk<A>
  <A>(self: Chunk<A>, predicate: Predicate<A>): Chunk<A>
}
```

Added in v2.0.0

## union

Creates a Chunks of unique values, in order, from all given Chunks.

**Signature**

```ts
export declare const union: {
  <A>(that: Chunk<A>): <B>(self: Chunk<B>) => Chunk<A | B>
  <A, B>(self: Chunk<A>, that: Chunk<B>): Chunk<A | B>
}
```

Added in v2.0.0

## unzip

Takes a `Chunk` of pairs and return two corresponding `Chunk`s.

Note: The function is reverse of `zip`.

**Signature**

```ts
export declare const unzip: <A, B>(self: Chunk<readonly [A, B]>) => [Chunk<A>, Chunk<B>]
```

Added in v2.0.0

## zip

Zips this chunk pointwise with the specified chunk.

**Signature**

```ts
export declare const zip: {
  <B>(that: Chunk<B>): <A>(self: Chunk<A>) => Chunk<[A, B]>
  <A, B>(self: Chunk<A>, that: Chunk<B>): Chunk<[A, B]>
}
```

Added in v2.0.0

## zipWith

Zips this chunk pointwise with the specified chunk using the specified combiner.

**Signature**

```ts
export declare const zipWith: {
  <A, B, C>(that: Chunk<B>, f: (a: A, b: B) => C): (self: Chunk<A>) => Chunk<C>
  <A, B, C>(self: Chunk<A>, that: Chunk<B>, f: (a: A, b: B) => C): Chunk<C>
}
```

Added in v2.0.0

# equivalence

## getEquivalence

Compares the two chunks of equal length using the specified function

**Signature**

```ts
export declare const getEquivalence: <A>(isEquivalent: Equivalence.Equivalence<A>) => Equivalence.Equivalence<Chunk<A>>
```

Added in v2.0.0

# filtering

## compact

Filter out optional values

**Signature**

```ts
export declare const compact: <A>(self: Chunk<Option<A>>) => Chunk<A>
```

Added in v2.0.0

## dedupeAdjacent

Deduplicates adjacent elements that are identical.

**Signature**

```ts
export declare const dedupeAdjacent: <A>(self: Chunk<A>) => Chunk<A>
```

Added in v2.0.0

## filter

Returns a filtered and mapped subset of the elements.

**Signature**

```ts
export declare const filter: {
  <A, B extends A>(refinement: Refinement<A, B>): (self: Chunk<A>) => Chunk<B>
  <A, B extends A>(predicate: Predicate<B>): (self: Chunk<A>) => Chunk<A>
  <A, B extends A>(self: Chunk<A>, refinement: Refinement<A, B>): Chunk<B>
  <A>(self: Chunk<A>, predicate: Predicate<A>): Chunk<A>
}
```

Added in v2.0.0

## filterMap

Returns a filtered and mapped subset of the elements.

**Signature**

```ts
export declare const filterMap: {
  <A, B>(f: (a: A, i: number) => Option<B>): (self: Chunk<A>) => Chunk<B>
  <A, B>(self: Chunk<A>, f: (a: A, i: number) => Option<B>): Chunk<B>
}
```

Added in v2.0.0

## filterMapWhile

Transforms all elements of the chunk for as long as the specified function returns some value

**Signature**

```ts
export declare const filterMapWhile: {
  <A, B>(f: (a: A) => Option<B>): (self: Chunk<A>) => Chunk<B>
  <A, B>(self: Chunk<A>, f: (a: A) => Option<B>): Chunk<B>
}
```

Added in v2.0.0

## partition

Separate elements based on a predicate that also exposes the index of the element.

**Signature**

```ts
export declare const partition: {
  <C extends A, B extends A, A = C>(refinement: Refinement<A, B>): (self: Chunk<C>) => [Chunk<Exclude<C, B>>, Chunk<B>]
  <B extends A, A = B>(predicate: (a: A) => boolean): (self: Chunk<B>) => [Chunk<B>, Chunk<B>]
  <C extends A, B extends A, A = C>(self: Chunk<C>, refinement: Refinement<A, B>): [Chunk<Exclude<C, B>>, Chunk<B>]
  <B extends A, A = B>(self: Chunk<B>, predicate: (a: A) => boolean): [Chunk<B>, Chunk<B>]
}
```

Added in v2.0.0

## partitionMap

Partitions the elements of this chunk into two chunks using f.

**Signature**

```ts
export declare const partitionMap: {
  <A, B, C>(f: (a: A) => Either<B, C>): (self: Chunk<A>) => [Chunk<B>, Chunk<C>]
  <A, B, C>(self: Chunk<A>, f: (a: A) => Either<B, C>): [Chunk<B>, Chunk<C>]
}
```

Added in v2.0.0

## separate

Partitions the elements of this chunk into two chunks.

**Signature**

```ts
export declare const separate: <A, B>(self: Chunk<Either<A, B>>) => [Chunk<A>, Chunk<B>]
```

Added in v2.0.0

# folding

## join

Joins the elements together with "sep" in the middle.

**Signature**

```ts
export declare const join: {
  (sep: string): (self: Chunk<string>) => string
  (self: Chunk<string>, sep: string): string
}
```

Added in v2.0.0

## mapAccum

Statefully maps over the chunk, producing new elements of type `B`.

**Signature**

```ts
export declare const mapAccum: {
  <S, A, B>(s: S, f: (s: S, a: A) => readonly [S, B]): (self: Chunk<A>) => [S, Chunk<B>]
  <S, A, B>(self: Chunk<A>, s: S, f: (s: S, a: A) => readonly [S, B]): [S, Chunk<B>]
}
```

Added in v2.0.0

## reduce

**Signature**

```ts
export declare const reduce: {
  <B, A>(b: B, f: (b: B, a: A, i: number) => B): (self: Chunk<A>) => B
  <A, B>(self: Chunk<A>, b: B, f: (b: B, a: A, i: number) => B): B
}
```

Added in v2.0.0

## reduceRight

**Signature**

```ts
export declare const reduceRight: {
  <B, A>(b: B, f: (b: B, a: A, i: number) => B): (self: Chunk<A>) => B
  <A, B>(self: Chunk<A>, b: B, f: (b: B, a: A, i: number) => B): B
}
```

Added in v2.0.0

# mapping

## map

Returns a chunk with the elements mapped by the specified f function.

**Signature**

```ts
export declare const map: {
  <T extends Chunk<any>, B>(f: (a: Chunk.Infer<T>, i: number) => B): (self: T) => Chunk.With<T, B>
  <T extends Chunk<any>, B>(self: T, f: (a: Chunk.Infer<T>, i: number) => B): Chunk.With<T, B>
}
```

Added in v2.0.0

# model

## NonEmptyChunk (interface)

**Signature**

```ts
export interface NonEmptyChunk<A> extends Chunk<A>, NonEmptyIterable<A> {}
```

Added in v2.0.0

# models

## Chunk (interface)

**Signature**

```ts
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
```

Added in v2.0.0

# sequencing

## flatMap

Returns a chunk with the elements mapped by the specified function.

**Signature**

```ts
export declare const flatMap: {
  <A, B>(f: (a: A, i: number) => Chunk<B>): (self: Chunk<A>) => Chunk<B>
  <A, B>(self: Chunk<A>, f: (a: A, i: number) => Chunk<B>): Chunk<B>
}
```

Added in v2.0.0

## flatMapNonEmpty

**Signature**

```ts
export declare const flatMapNonEmpty: {
  <A, B>(f: (a: A, i: number) => NonEmptyChunk<B>): (self: NonEmptyChunk<A>) => NonEmptyChunk<B>
  <A, B>(self: NonEmptyChunk<A>, f: (a: A, i: number) => NonEmptyChunk<B>): NonEmptyChunk<B>
}
```

Added in v2.0.0

## flatten

Flattens a chunk of chunks into a single chunk by concatenating all chunks.

**Signature**

```ts
export declare const flatten: <A>(self: Chunk<Chunk<A>>) => Chunk<A>
```

Added in v2.0.0

## flattenNonEmpty

**Signature**

```ts
export declare const flattenNonEmpty: <A>(self: NonEmptyChunk<NonEmptyChunk<A>>) => NonEmptyChunk<A>
```

Added in v2.0.0

# symbol

## TypeId (type alias)

**Signature**

```ts
export type TypeId = typeof TypeId
```

Added in v2.0.0

# type lambdas

## ChunkTypeLambda (interface)

**Signature**

```ts
export interface ChunkTypeLambda extends TypeLambda {
  readonly type: Chunk<this["Target"]>
}
```

Added in v2.0.0

# unsafe

## unsafeFromArray

Wraps an array into a chunk without copying, unsafe on mutable arrays

**Signature**

```ts
export declare const unsafeFromArray: <A>(self: readonly A[]) => Chunk<A>
```

Added in v2.0.0

## unsafeFromNonEmptyArray

Wraps an array into a chunk without copying, unsafe on mutable arrays

**Signature**

```ts
export declare const unsafeFromNonEmptyArray: <A>(self: readonly [A, ...A[]]) => NonEmptyChunk<A>
```

Added in v2.0.0

## unsafeGet

Gets an element unsafely, will throw on out of bounds

**Signature**

```ts
export declare const unsafeGet: { (index: number): <A>(self: Chunk<A>) => A; <A>(self: Chunk<A>, index: number): A }
```

Added in v2.0.0

## unsafeHead

Returns the first element of this chunk.

**Signature**

```ts
export declare const unsafeHead: <A>(self: Chunk<A>) => A
```

Added in v2.0.0

## unsafeLast

Returns the last element of this chunk.

**Signature**

```ts
export declare const unsafeLast: <A>(self: Chunk<A>) => A
```

Added in v2.0.0

# utils

## Chunk (namespace)

Added in v2.0.0

### Infer (type alias)

**Signature**

```ts
export type Infer<T extends Chunk<any>> = T extends Chunk<infer A> ? A : never
```

Added in v2.0.0

### With (type alias)

**Signature**

```ts
export type With<T extends Chunk<any>, A> = T extends NonEmptyChunk<any> ? NonEmptyChunk<A> : Chunk<A>
```

Added in v2.0.0

## drop

Drops the first up to `n` elements from the chunk

**Signature**

```ts
export declare const drop: { (n: number): <A>(self: Chunk<A>) => Chunk<A>; <A>(self: Chunk<A>, n: number): Chunk<A> }
```

Added in v2.0.0

## dropRight

Drops the last `n` elements.

**Signature**

```ts
export declare const dropRight: {
  (n: number): <A>(self: Chunk<A>) => Chunk<A>
  <A>(self: Chunk<A>, n: number): Chunk<A>
}
```

Added in v2.0.0

## dropWhile

Drops all elements so long as the predicate returns true.

**Signature**

```ts
export declare const dropWhile: {
  <A>(f: (a: A) => boolean): (self: Chunk<A>) => Chunk<A>
  <A>(self: Chunk<A>, f: (a: A) => boolean): Chunk<A>
}
```

Added in v2.0.0

## modify

Apply a function to the element at the specified index, creating a new `Chunk`,
or returning the input if the index is out of bounds.

**Signature**

```ts
export declare const modify: {
  <A, B>(i: number, f: (a: A) => B): (self: Chunk<A>) => Chunk<A | B>
  <A, B>(self: Chunk<A>, i: number, f: (a: A) => B): Chunk<A | B>
}
```

Added in v2.0.0

## modifyOption

**Signature**

```ts
export declare const modifyOption: {
  <A, B>(i: number, f: (a: A) => B): (self: Chunk<A>) => Option<Chunk<A | B>>
  <A, B>(self: Chunk<A>, i: number, f: (a: A) => B): Option<Chunk<A | B>>
}
```

Added in v2.0.0

## remove

Delete the element at the specified index, creating a new `Chunk`,
or returning the input if the index is out of bounds.

**Signature**

```ts
export declare const remove: { (i: number): <A>(self: Chunk<A>) => Chunk<A>; <A>(self: Chunk<A>, i: number): Chunk<A> }
```

Added in v2.0.0

## replace

Change the element at the specified index, creating a new `Chunk`,
or returning the input if the index is out of bounds.

**Signature**

```ts
export declare const replace: {
  <B>(i: number, b: B): <A>(self: Chunk<A>) => Chunk<B | A>
  <A, B>(self: Chunk<A>, i: number, b: B): Chunk<A | B>
}
```

Added in v2.0.0

## replaceOption

**Signature**

```ts
export declare const replaceOption: {
  <B>(i: number, b: B): <A>(self: Chunk<A>) => Option<Chunk<B | A>>
  <A, B>(self: Chunk<A>, i: number, b: B): Option<Chunk<A | B>>
}
```

Added in v2.0.0

## take

Takes the first up to `n` elements from the chunk

**Signature**

```ts
export declare const take: { (n: number): <A>(self: Chunk<A>) => Chunk<A>; <A>(self: Chunk<A>, n: number): Chunk<A> }
```

Added in v2.0.0
