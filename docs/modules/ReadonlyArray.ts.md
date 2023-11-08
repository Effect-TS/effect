---
title: ReadonlyArray.ts
nav_order: 82
parent: Modules
---

## ReadonlyArray overview

This module provides utility functions for working with arrays in TypeScript.

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [combining](#combining)
  - [flatMapNullable](#flatmapnullable)
- [concatenating](#concatenating)
  - [append](#append)
  - [appendAll](#appendall)
  - [appendAllNonEmpty](#appendallnonempty)
  - [prepend](#prepend)
  - [prependAll](#prependall)
  - [prependAllNonEmpty](#prependallnonempty)
- [constructors](#constructors)
  - [empty](#empty)
  - [make](#make)
  - [makeBy](#makeby)
  - [of](#of)
  - [range](#range)
  - [replicate](#replicate)
  - [unfold](#unfold)
- [conversions](#conversions)
  - [fromIterable](#fromiterable)
  - [fromNullable](#fromnullable)
  - [fromOption](#fromoption)
  - [fromRecord](#fromrecord)
- [elements](#elements)
  - [cartesian](#cartesian)
  - [cartesianWith](#cartesianwith)
  - [contains](#contains)
  - [containsWith](#containswith)
  - [every](#every)
  - [findFirst](#findfirst)
  - [findFirstIndex](#findfirstindex)
  - [findLast](#findlast)
  - [findLastIndex](#findlastindex)
  - [reverse](#reverse)
  - [reverseNonEmpty](#reversenonempty)
  - [some](#some)
  - [sortWith](#sortwith)
- [filtering](#filtering)
  - [compact](#compact)
  - [filter](#filter)
  - [filterMap](#filtermap)
  - [filterMapWhile](#filtermapwhile)
  - [partition](#partition)
  - [partitionMap](#partitionmap)
  - [separate](#separate)
  - [span](#span)
- [folding](#folding)
  - [join](#join)
  - [mapAccum](#mapaccum)
  - [reduce](#reduce)
  - [reduceRight](#reduceright)
  - [scan](#scan)
  - [scanRight](#scanright)
- [getters](#getters)
  - [chunksOf](#chunksof)
  - [chunksOfNonEmpty](#chunksofnonempty)
  - [drop](#drop)
  - [dropRight](#dropright)
  - [dropWhile](#dropwhile)
  - [get](#get)
  - [head](#head)
  - [headNonEmpty](#headnonempty)
  - [init](#init)
  - [initNonEmpty](#initnonempty)
  - [last](#last)
  - [lastNonEmpty](#lastnonempty)
  - [length](#length)
  - [splitAt](#splitat)
  - [splitNonEmptyAt](#splitnonemptyat)
  - [tail](#tail)
  - [tailNonEmpty](#tailnonempty)
  - [take](#take)
  - [takeRight](#takeright)
  - [takeWhile](#takewhile)
  - [unappend](#unappend)
  - [unprepend](#unprepend)
- [grouping](#grouping)
  - [group](#group)
  - [groupBy](#groupby)
  - [groupWith](#groupwith)
- [guards](#guards)
  - [isEmptyArray](#isemptyarray)
  - [isEmptyReadonlyArray](#isemptyreadonlyarray)
  - [isNonEmptyArray](#isnonemptyarray)
  - [isNonEmptyReadonlyArray](#isnonemptyreadonlyarray)
- [instances](#instances)
  - [getEquivalence](#getequivalence)
  - [getOrder](#getorder)
- [lifting](#lifting)
  - [liftEither](#lifteither)
  - [liftNullable](#liftnullable)
  - [liftOption](#liftoption)
  - [liftPredicate](#liftpredicate)
- [mapping](#mapping)
  - [map](#map)
- [models](#models)
  - [NonEmptyArray (type alias)](#nonemptyarray-type-alias)
  - [NonEmptyReadonlyArray (type alias)](#nonemptyreadonlyarray-type-alias)
- [pattern matching](#pattern-matching)
  - [match](#match)
  - [matchLeft](#matchleft)
  - [matchRight](#matchright)
- [sequencing](#sequencing)
  - [flatMap](#flatmap)
  - [flatMapNonEmpty](#flatmapnonempty)
  - [flatten](#flatten)
  - [flattenNonEmpty](#flattennonempty)
- [sorting](#sorting)
  - [sort](#sort)
  - [sortBy](#sortby)
  - [sortByNonEmpty](#sortbynonempty)
  - [sortNonEmpty](#sortnonempty)
- [type lambdas](#type-lambdas)
  - [ReadonlyArrayTypeLambda (interface)](#readonlyarraytypelambda-interface)
- [unsafe](#unsafe)
  - [unsafeGet](#unsafeget)
- [utils](#utils)
  - [ReadonlyArray (namespace)](#readonlyarray-namespace)
    - [Infer (type alias)](#infer-type-alias)
    - [With (type alias)](#with-type-alias)
  - [chop](#chop)
  - [chopNonEmpty](#chopnonempty)
  - [copy](#copy)
  - [dedupe](#dedupe)
  - [dedupeAdjacent](#dedupeadjacent)
  - [dedupeAdjacentWith](#dedupeadjacentwith)
  - [dedupeNonEmpty](#dedupenonempty)
  - [dedupeNonEmptyWith](#dedupenonemptywith)
  - [dedupeWith](#dedupewith)
  - [difference](#difference)
  - [differenceWith](#differencewith)
  - [extend](#extend)
  - [forEach](#foreach)
  - [insertAt](#insertat)
  - [intersection](#intersection)
  - [intersectionWith](#intersectionwith)
  - [intersperse](#intersperse)
  - [intersperseNonEmpty](#interspersenonempty)
  - [max](#max)
  - [min](#min)
  - [modify](#modify)
  - [modifyNonEmptyHead](#modifynonemptyhead)
  - [modifyNonEmptyLast](#modifynonemptylast)
  - [modifyOption](#modifyoption)
  - [remove](#remove)
  - [replace](#replace)
  - [replaceOption](#replaceoption)
  - [rotate](#rotate)
  - [rotateNonEmpty](#rotatenonempty)
  - [setNonEmptyHead](#setnonemptyhead)
  - [setNonEmptyLast](#setnonemptylast)
  - [union](#union)
  - [unionNonEmpty](#unionnonempty)
  - [unionNonEmptyWith](#unionnonemptywith)
  - [unionWith](#unionwith)
  - [unzip](#unzip)
  - [unzipNonEmpty](#unzipnonempty)
  - [zip](#zip)
  - [zipNonEmpty](#zipnonempty)
  - [zipNonEmptyWith](#zipnonemptywith)
  - [zipWith](#zipwith)

---

# combining

## flatMapNullable

**Signature**

```ts
export declare const flatMapNullable: {
  <A, B>(f: (a: A) => B | null | undefined): (self: readonly A[]) => NonNullable<B>[]
  <A, B>(self: readonly A[], f: (a: A) => B | null | undefined): NonNullable<B>[]
}
```

Added in v2.0.0

# concatenating

## append

Append an element to the end of an `Iterable`, creating a new `NonEmptyArray`.

**Signature**

```ts
export declare const append: {
  <B>(last: B): <A>(self: Iterable<A>) => [B | A, ...(B | A)[]]
  <A, B>(self: Iterable<A>, last: B): [A | B, ...(A | B)[]]
}
```

Added in v2.0.0

## appendAll

**Signature**

```ts
export declare const appendAll: {
  <B>(that: Iterable<B>): <A>(self: Iterable<A>) => (B | A)[]
  <A, B>(self: Iterable<A>, that: Iterable<B>): (A | B)[]
}
```

Added in v2.0.0

## appendAllNonEmpty

**Signature**

```ts
export declare const appendAllNonEmpty: {
  <B>(that: readonly [B, ...B[]]): <A>(self: Iterable<A>) => [B | A, ...(B | A)[]]
  <B>(that: Iterable<B>): <A>(self: readonly [A, ...A[]]) => [B | A, ...(B | A)[]]
  <A, B>(self: Iterable<A>, that: readonly [B, ...B[]]): [A | B, ...(A | B)[]]
  <A, B>(self: readonly [A, ...A[]], that: Iterable<B>): [A | B, ...(A | B)[]]
}
```

Added in v2.0.0

## prepend

Prepend an element to the front of an `Iterable`, creating a new `NonEmptyArray`.

**Signature**

```ts
export declare const prepend: {
  <B>(head: B): <A>(self: Iterable<A>) => [B | A, ...(B | A)[]]
  <A, B>(self: Iterable<A>, head: B): [A | B, ...(A | B)[]]
}
```

Added in v2.0.0

## prependAll

**Signature**

```ts
export declare const prependAll: {
  <B>(that: Iterable<B>): <A>(self: Iterable<A>) => (B | A)[]
  <A, B>(self: Iterable<A>, that: Iterable<B>): (A | B)[]
}
```

Added in v2.0.0

## prependAllNonEmpty

**Signature**

```ts
export declare const prependAllNonEmpty: {
  <B>(that: readonly [B, ...B[]]): <A>(self: Iterable<A>) => [B | A, ...(B | A)[]]
  <B>(that: Iterable<B>): <A>(self: readonly [A, ...A[]]) => [B | A, ...(B | A)[]]
  <A, B>(self: Iterable<A>, that: readonly [B, ...B[]]): [A | B, ...(A | B)[]]
  <A, B>(self: readonly [A, ...A[]], that: Iterable<B>): [A | B, ...(A | B)[]]
}
```

Added in v2.0.0

# constructors

## empty

**Signature**

```ts
export declare const empty: <A = never>() => A[]
```

Added in v2.0.0

## make

Builds a `NonEmptyArray` from an non-empty collection of elements.

**Signature**

```ts
export declare const make: <Elements extends [any, ...any[]]>(
  ...elements: Elements
) => [Elements[number], ...Elements[number][]]
```

Added in v2.0.0

## makeBy

Return a `NonEmptyArray` of length `n` with element `i` initialized with `f(i)`.

**Note**. `n` is normalized to an integer >= 1.

**Signature**

```ts
export declare const makeBy: <A>(n: number, f: (i: number) => A) => [A, ...A[]]
```

**Example**

```ts
import { makeBy } from "effect/ReadonlyArray"

assert.deepStrictEqual(
  makeBy(5, (n) => n * 2),
  [0, 2, 4, 6, 8]
)
```

Added in v2.0.0

## of

Constructs a new `NonEmptyArray<A>` from the specified value.

**Signature**

```ts
export declare const of: <A>(a: A) => [A, ...A[]]
```

Added in v2.0.0

## range

Return a `NonEmptyArray` containing a range of integers, including both endpoints.

**Signature**

```ts
export declare const range: (start: number, end: number) => [number, ...number[]]
```

**Example**

```ts
import { range } from "effect/ReadonlyArray"

assert.deepStrictEqual(range(1, 3), [1, 2, 3])
```

Added in v2.0.0

## replicate

Return a `NonEmptyArray` containing a value repeated the specified number of times.

**Note**. `n` is normalized to an integer >= 1.

**Signature**

```ts
export declare const replicate: { (n: number): <A>(a: A) => [A, ...A[]]; <A>(a: A, n: number): [A, ...A[]] }
```

**Example**

```ts
import { replicate } from "effect/ReadonlyArray"

assert.deepStrictEqual(replicate("a", 3), ["a", "a", "a"])
```

Added in v2.0.0

## unfold

**Signature**

```ts
export declare const unfold: <B, A>(b: B, f: (b: B) => Option<readonly [A, B]>) => A[]
```

Added in v2.0.0

# conversions

## fromIterable

**Signature**

```ts
export declare const fromIterable: <A>(collection: Iterable<A>) => A[]
```

Added in v2.0.0

## fromNullable

**Signature**

```ts
export declare const fromNullable: <A>(a: A) => NonNullable<A>[]
```

Added in v2.0.0

## fromOption

**Signature**

```ts
export declare const fromOption: <A>(self: Option<A>) => A[]
```

Added in v2.0.0

## fromRecord

Takes a record and returns an array of tuples containing its keys and values.

**Signature**

```ts
export declare const fromRecord: <K extends string, A>(self: Readonly<Record<K, A>>) => [K, A][]
```

**Example**

```ts
import { fromRecord } from "effect/ReadonlyArray"

const x = { a: 1, b: 2, c: 3 }
assert.deepStrictEqual(fromRecord(x), [
  ["a", 1],
  ["b", 2],
  ["c", 3]
])
```

Added in v2.0.0

# elements

## cartesian

Zips this chunk crosswise with the specified chunk.

**Signature**

```ts
export declare const cartesian: {
  <B>(that: readonly B[]): <A>(self: readonly A[]) => [A, B][]
  <A, B>(self: readonly A[], that: readonly B[]): [A, B][]
}
```

Added in v2.0.0

## cartesianWith

Zips this chunk crosswise with the specified chunk using the specified combiner.

**Signature**

```ts
export declare const cartesianWith: {
  <A, B, C>(that: readonly B[], f: (a: A, b: B) => C): (self: readonly A[]) => C[]
  <A, B, C>(self: readonly A[], that: readonly B[], f: (a: A, b: B) => C): C[]
}
```

Added in v2.0.0

## contains

Returns a function that checks if a `ReadonlyArray` contains a given value using the default `Equivalence`.

**Signature**

```ts
export declare const contains: { <A>(a: A): (self: Iterable<A>) => boolean; <A>(self: Iterable<A>, a: A): boolean }
```

Added in v2.0.0

## containsWith

Returns a function that checks if a `ReadonlyArray` contains a given value using a provided `isEquivalent` function.

**Signature**

```ts
export declare const containsWith: <A>(isEquivalent: (self: A, that: A) => boolean) => {
  (a: A): (self: Iterable<A>) => boolean
  (self: Iterable<A>, a: A): boolean
}
```

Added in v2.0.0

## every

Check if a predicate holds true for every `ReadonlyArray` element.

**Signature**

```ts
export declare const every: {
  <A, B extends A>(refinement: Refinement<A, B>): (self: readonly A[]) => self is readonly B[]
  <A>(predicate: Predicate<A>): (self: readonly A[]) => boolean
  <A, B extends A>(self: readonly A[], refinement: Refinement<A, B>): self is readonly B[]
  <A>(self: readonly A[], predicate: Predicate<A>): boolean
}
```

Added in v2.0.0

## findFirst

Returns the first element that satisfies the specified
predicate, or `None` if no such element exists.

**Signature**

```ts
export declare const findFirst: {
  <A, B extends A>(refinement: Refinement<A, B>): (self: Iterable<A>) => Option<B>
  <A>(predicate: Predicate<A>): <B extends A>(self: Iterable<B>) => Option<B>
  <A, B extends A>(self: Iterable<A>, refinement: Refinement<A, B>): Option<B>
  <B extends A, A>(self: Iterable<B>, predicate: Predicate<A>): Option<B>
}
```

Added in v2.0.0

## findFirstIndex

Return the first index for which a predicate holds.

**Signature**

```ts
export declare const findFirstIndex: {
  <A>(predicate: Predicate<A>): (self: Iterable<A>) => Option<number>
  <A>(self: Iterable<A>, predicate: Predicate<A>): Option<number>
}
```

Added in v2.0.0

## findLast

Find the last element for which a predicate holds.

**Signature**

```ts
export declare const findLast: {
  <A, B extends A>(refinement: Refinement<A, B>): (self: Iterable<A>) => Option<B>
  <A>(predicate: Predicate<A>): <B extends A>(self: Iterable<B>) => Option<B>
  <A, B extends A>(self: Iterable<A>, refinement: Refinement<A, B>): Option<B>
  <B extends A, A>(self: Iterable<B>, predicate: Predicate<A>): Option<B>
}
```

Added in v2.0.0

## findLastIndex

Return the last index for which a predicate holds.

**Signature**

```ts
export declare const findLastIndex: {
  <A>(predicate: Predicate<A>): (self: Iterable<A>) => Option<number>
  <A>(self: Iterable<A>, predicate: Predicate<A>): Option<number>
}
```

Added in v2.0.0

## reverse

Reverse an `Iterable`, creating a new `Array`.

**Signature**

```ts
export declare const reverse: <A>(self: Iterable<A>) => A[]
```

Added in v2.0.0

## reverseNonEmpty

**Signature**

```ts
export declare const reverseNonEmpty: <A>(self: readonly [A, ...A[]]) => [A, ...A[]]
```

Added in v2.0.0

## some

Check if a predicate holds true for some `ReadonlyArray` element.

**Signature**

```ts
export declare const some: {
  <A>(predicate: Predicate<A>): <B extends A>(self: readonly B[]) => self is readonly [B, ...B[]]
  <B extends A, A = B>(self: readonly B[], predicate: Predicate<A>): self is readonly [B, ...B[]]
}
```

Added in v2.0.0

## sortWith

**Signature**

```ts
export declare const sortWith: {
  <A, B>(f: (a: A) => B, order: Order<B>): (self: readonly A[]) => A[]
  <A, B>(self: readonly A[], f: (a: A) => B, order: Order<B>): A[]
}
```

Added in v2.0.0

# filtering

## compact

**Signature**

```ts
export declare const compact: <A>(self: Iterable<Option<A>>) => A[]
```

Added in v2.0.0

## filter

**Signature**

```ts
export declare const filter: {
  <C extends A, B extends A, A = C>(refinement: (a: A, i: number) => a is B): (self: Iterable<C>) => B[]
  <B extends A, A = B>(predicate: (a: A, i: number) => boolean): (self: Iterable<B>) => B[]
  <C extends A, B extends A, A = C>(self: Iterable<C>, refinement: (a: A, i: number) => a is B): B[]
  <B extends A, A = B>(self: Iterable<B>, predicate: (a: A, i: number) => boolean): B[]
}
```

Added in v2.0.0

## filterMap

**Signature**

```ts
export declare const filterMap: {
  <A, B>(f: (a: A, i: number) => Option<B>): (self: Iterable<A>) => B[]
  <A, B>(self: Iterable<A>, f: (a: A, i: number) => Option<B>): B[]
}
```

Added in v2.0.0

## filterMapWhile

Transforms all elements of the `readonlyArray` for as long as the specified function returns some value

**Signature**

```ts
export declare const filterMapWhile: {
  <A, B>(f: (a: A) => Option<B>): (self: Iterable<A>) => B[]
  <A, B>(self: Iterable<A>, f: (a: A) => Option<B>): B[]
}
```

Added in v2.0.0

## partition

**Signature**

```ts
export declare const partition: {
  <C extends A, B extends A, A = C>(refinement: (a: A, i: number) => a is B): (self: Iterable<C>) => [C[], B[]]
  <B extends A, A = B>(predicate: (a: A, i: number) => boolean): (self: Iterable<B>) => [B[], B[]]
  <C extends A, B extends A, A = C>(self: Iterable<C>, refinement: (a: A, i: number) => a is B): [C[], B[]]
  <B extends A, A = B>(self: Iterable<B>, predicate: (a: A, i: number) => boolean): [B[], B[]]
}
```

Added in v2.0.0

## partitionMap

**Signature**

```ts
export declare const partitionMap: {
  <A, B, C>(f: (a: A, i: number) => Either<B, C>): (self: Iterable<A>) => [B[], C[]]
  <A, B, C>(self: Iterable<A>, f: (a: A, i: number) => Either<B, C>): [B[], C[]]
}
```

Added in v2.0.0

## separate

**Signature**

```ts
export declare const separate: <E, A>(self: Iterable<Either<E, A>>) => [E[], A[]]
```

Added in v2.0.0

## span

Split an `Iterable` into two parts:

1. the longest initial subarray for which all elements satisfy the specified predicate
2. the remaining elements

**Signature**

```ts
export declare const span: {
  <A, B extends A>(refinement: Refinement<A, B>): (self: Iterable<A>) => [init: B[], rest: A[]]
  <A>(predicate: Predicate<A>): <B extends A>(self: Iterable<B>) => [init: B[], rest: B[]]
  <A, B extends A>(self: Iterable<A>, refinement: Refinement<A, B>): [init: B[], rest: A[]]
  <B extends A, A>(self: Iterable<B>, predicate: Predicate<A>): [init: B[], rest: B[]]
}
```

Added in v2.0.0

# folding

## join

Joins the elements together with "sep" in the middle.

**Signature**

```ts
export declare const join: {
  (sep: string): (self: Iterable<string>) => string
  (self: Iterable<string>, sep: string): string
}
```

Added in v2.0.0

## mapAccum

Statefully maps over the chunk, producing new elements of type `B`.

**Signature**

```ts
export declare const mapAccum: {
  <S, A, B>(s: S, f: (s: S, a: A) => readonly [S, B]): (self: Iterable<A>) => [S, B[]]
  <S, A, B>(self: Iterable<A>, s: S, f: (s: S, a: A) => readonly [S, B]): [S, B[]]
}
```

Added in v2.0.0

## reduce

**Signature**

```ts
export declare const reduce: {
  <B, A>(b: B, f: (b: B, a: A, i: number) => B): (self: Iterable<A>) => B
  <A, B>(self: Iterable<A>, b: B, f: (b: B, a: A, i: number) => B): B
}
```

Added in v2.0.0

## reduceRight

**Signature**

```ts
export declare const reduceRight: {
  <B, A>(b: B, f: (b: B, a: A, i: number) => B): (self: Iterable<A>) => B
  <A, B>(self: Iterable<A>, b: B, f: (b: B, a: A, i: number) => B): B
}
```

Added in v2.0.0

## scan

Reduce an `Iterable` from the left, keeping all intermediate results instead of only the final result.

**Signature**

```ts
export declare const scan: {
  <B, A>(b: B, f: (b: B, a: A) => B): (self: Iterable<A>) => [B, ...B[]]
  <A, B>(self: Iterable<A>, b: B, f: (b: B, a: A) => B): [B, ...B[]]
}
```

Added in v2.0.0

## scanRight

Reduce an `Iterable` from the right, keeping all intermediate results instead of only the final result.

**Signature**

```ts
export declare const scanRight: {
  <B, A>(b: B, f: (b: B, a: A) => B): (self: Iterable<A>) => [B, ...B[]]
  <A, B>(self: Iterable<A>, b: B, f: (b: B, a: A) => B): [B, ...B[]]
}
```

Added in v2.0.0

# getters

## chunksOf

Splits an `Iterable` into length-`n` pieces. The last piece will be shorter if `n` does not evenly divide the length of
the `Iterable`. Note that `chunksOf(n)([])` is `[]`, not `[[]]`. This is intentional, and is consistent with a recursive
definition of `chunksOf`; it satisfies the property that

```ts
chunksOf(n)(xs).concat(chunksOf(n)(ys)) == chunksOf(n)(xs.concat(ys)))
```

whenever `n` evenly divides the length of `self`.

**Signature**

```ts
export declare const chunksOf: {
  (n: number): <A>(self: Iterable<A>) => [A, ...A[]][]
  <A>(self: Iterable<A>, n: number): [A, ...A[]][]
}
```

Added in v2.0.0

## chunksOfNonEmpty

Splits a `NonEmptyReadonlyArray` into length-`n` pieces. The last piece will be shorter if `n` does not evenly divide the length of
the `NonEmptyReadonlyArray`.

**Signature**

```ts
export declare const chunksOfNonEmpty: {
  (n: number): <A>(self: readonly [A, ...A[]]) => [[A, ...A[]], ...[A, ...A[]][]]
  <A>(self: readonly [A, ...A[]], n: number): [[A, ...A[]], ...[A, ...A[]][]]
}
```

Added in v2.0.0

## drop

Drop a max number of elements from the start of an `Iterable`, creating a new `Array`.

**Note**. `n` is normalized to a non negative integer.

**Signature**

```ts
export declare const drop: { (n: number): <A>(self: Iterable<A>) => A[]; <A>(self: Iterable<A>, n: number): A[] }
```

Added in v2.0.0

## dropRight

Drop a max number of elements from the end of an `Iterable`, creating a new `Array`.

**Note**. `n` is normalized to a non negative integer.

**Signature**

```ts
export declare const dropRight: { (n: number): <A>(self: Iterable<A>) => A[]; <A>(self: Iterable<A>, n: number): A[] }
```

Added in v2.0.0

## dropWhile

Remove the longest initial subarray for which all element satisfy the specified predicate, creating a new `Array`.

**Signature**

```ts
export declare const dropWhile: {
  <A, B extends A>(refinement: Refinement<A, B>): (self: Iterable<A>) => B[]
  <A>(predicate: Predicate<A>): <B extends A>(self: Iterable<B>) => B[]
  <A, B extends A>(self: Iterable<A>, refinement: Refinement<A, B>): B[]
  <B extends A, A>(self: Iterable<B>, predicate: Predicate<A>): B[]
}
```

Added in v2.0.0

## get

This function provides a safe way to read a value at a particular index from a `ReadonlyArray`.

**Signature**

```ts
export declare const get: {
  (index: number): <A>(self: readonly A[]) => Option<A>
  <A>(self: readonly A[], index: number): Option<A>
}
```

Added in v2.0.0

## head

Get the first element of a `ReadonlyArray`, or `None` if the `ReadonlyArray` is empty.

**Signature**

```ts
export declare const head: <A>(self: readonly A[]) => Option<A>
```

Added in v2.0.0

## headNonEmpty

**Signature**

```ts
export declare const headNonEmpty: <A>(self: readonly [A, ...A[]]) => A
```

Added in v2.0.0

## init

Get all but the last element of an `Iterable`, creating a new `Array`, or `None` if the `Iterable` is empty.

**Signature**

```ts
export declare const init: <A>(self: Iterable<A>) => Option<A[]>
```

Added in v2.0.0

## initNonEmpty

Get all but the last element of a non empty array, creating a new array.

**Signature**

```ts
export declare const initNonEmpty: <A>(self: readonly [A, ...A[]]) => A[]
```

Added in v2.0.0

## last

Get the last element in a `ReadonlyArray`, or `None` if the `ReadonlyArray` is empty.

**Signature**

```ts
export declare const last: <A>(self: readonly A[]) => Option<A>
```

Added in v2.0.0

## lastNonEmpty

**Signature**

```ts
export declare const lastNonEmpty: <A>(self: readonly [A, ...A[]]) => A
```

Added in v2.0.0

## length

Return the number of elements in a `ReadonlyArray`.

**Signature**

```ts
export declare const length: <A>(self: readonly A[]) => number
```

Added in v2.0.0

## splitAt

Splits an `Iterable` into two pieces, the first piece has max `n` elements.

**Signature**

```ts
export declare const splitAt: {
  (n: number): <A>(self: Iterable<A>) => [A[], A[]]
  <A>(self: Iterable<A>, n: number): [A[], A[]]
}
```

Added in v2.0.0

## splitNonEmptyAt

Splits a `NonEmptyReadonlyArray` into two pieces, the first piece has max `n` elements.

**Signature**

```ts
export declare const splitNonEmptyAt: {
  (n: number): <A>(self: readonly [A, ...A[]]) => [[A, ...A[]], A[]]
  <A>(self: readonly [A, ...A[]], n: number): [[A, ...A[]], A[]]
}
```

Added in v2.0.0

## tail

Get all but the first element of an `Iterable`, creating a new `Array`, or `None` if the `Iterable` is empty.

**Signature**

```ts
export declare const tail: <A>(self: Iterable<A>) => Option<A[]>
```

Added in v2.0.0

## tailNonEmpty

**Signature**

```ts
export declare const tailNonEmpty: <A>(self: readonly [A, ...A[]]) => A[]
```

Added in v2.0.0

## take

Keep only a max number of elements from the start of an `Iterable`, creating a new `Array`.

**Note**. `n` is normalized to a non negative integer.

**Signature**

```ts
export declare const take: { (n: number): <A>(self: Iterable<A>) => A[]; <A>(self: Iterable<A>, n: number): A[] }
```

Added in v2.0.0

## takeRight

Keep only a max number of elements from the end of an `Iterable`, creating a new `Array`.

**Note**. `n` is normalized to a non negative integer.

**Signature**

```ts
export declare const takeRight: { (n: number): <A>(self: Iterable<A>) => A[]; <A>(self: Iterable<A>, n: number): A[] }
```

Added in v2.0.0

## takeWhile

Calculate the longest initial subarray for which all element satisfy the specified predicate, creating a new `Array`.

**Signature**

```ts
export declare const takeWhile: {
  <A, B extends A>(refinement: Refinement<A, B>): (self: Iterable<A>) => B[]
  <A>(predicate: Predicate<A>): <B extends A>(self: Iterable<B>) => B[]
  <A, B extends A>(self: Iterable<A>, refinement: Refinement<A, B>): B[]
  <B extends A, A>(self: Iterable<B>, predicate: Predicate<A>): B[]
}
```

Added in v2.0.0

## unappend

Return a tuple containing a copy of the `NonEmptyReadonlyArray` without its last element, and that last element.

**Signature**

```ts
export declare const unappend: <A>(self: readonly [A, ...A[]]) => [A[], A]
```

Added in v2.0.0

## unprepend

Return a tuple containing the first element, and a new `Array` of the remaining elements, if any.

**Signature**

```ts
export declare const unprepend: <A>(self: readonly [A, ...A[]]) => [A, A[]]
```

Added in v2.0.0

# grouping

## group

Group equal, consecutive elements of a `NonEmptyReadonlyArray` into `NonEmptyArray`s.

**Signature**

```ts
export declare const group: <A>(self: readonly [A, ...A[]]) => [[A, ...A[]], ...[A, ...A[]][]]
```

Added in v2.0.0

## groupBy

Splits an `Iterable` into sub-non-empty-arrays stored in an object, based on the result of calling a `string`-returning
function on each element, and grouping the results according to values returned

**Signature**

```ts
export declare const groupBy: {
  <A>(f: (a: A) => string): (self: Iterable<A>) => Record<string, [A, ...A[]]>
  <A>(self: Iterable<A>, f: (a: A) => string): Record<string, [A, ...A[]]>
}
```

Added in v2.0.0

## groupWith

Group equal, consecutive elements of a `NonEmptyReadonlyArray` into `NonEmptyArray`s using the provided `isEquivalent` function.

**Signature**

```ts
export declare const groupWith: {
  <A>(isEquivalent: (self: A, that: A) => boolean): (self: readonly [A, ...A[]]) => [[A, ...A[]], ...[A, ...A[]][]]
  <A>(self: readonly [A, ...A[]], isEquivalent: (self: A, that: A) => boolean): [[A, ...A[]], ...[A, ...A[]][]]
}
```

Added in v2.0.0

# guards

## isEmptyArray

Determine if an `Array` is empty narrowing down the type to `[]`.

**Signature**

```ts
export declare const isEmptyArray: <A>(self: A[]) => self is []
```

**Example**

```ts
import { isEmptyArray } from "effect/ReadonlyArray"

assert.deepStrictEqual(isEmptyArray([]), true)
assert.deepStrictEqual(isEmptyArray([1, 2, 3]), false)
```

Added in v2.0.0

## isEmptyReadonlyArray

Determine if a `ReadonlyArray` is empty narrowing down the type to `readonly []`.

**Signature**

```ts
export declare const isEmptyReadonlyArray: <A>(self: readonly A[]) => self is readonly []
```

**Example**

```ts
import { isEmptyReadonlyArray } from "effect/ReadonlyArray"

assert.deepStrictEqual(isEmptyReadonlyArray([]), true)
assert.deepStrictEqual(isEmptyReadonlyArray([1, 2, 3]), false)
```

Added in v2.0.0

## isNonEmptyArray

Determine if an `Array` is non empty narrowing down the type to `NonEmptyArray`.

An `Array` is considered to be a `NonEmptyArray` if it contains at least one element.

**Signature**

```ts
export declare const isNonEmptyArray: <A>(self: A[]) => self is [A, ...A[]]
```

**Example**

```ts
import { isNonEmptyArray } from "effect/ReadonlyArray"

assert.deepStrictEqual(isNonEmptyArray([]), false)
assert.deepStrictEqual(isNonEmptyArray([1, 2, 3]), true)
```

Added in v2.0.0

## isNonEmptyReadonlyArray

Determine if a `ReadonlyArray` is non empty narrowing down the type to `NonEmptyReadonlyArray`.

A `ReadonlyArray` is considered to be a `NonEmptyReadonlyArray` if it contains at least one element.

**Signature**

```ts
export declare const isNonEmptyReadonlyArray: <A>(self: readonly A[]) => self is readonly [A, ...A[]]
```

**Example**

```ts
import { isNonEmptyReadonlyArray } from "effect/ReadonlyArray"

assert.deepStrictEqual(isNonEmptyReadonlyArray([]), false)
assert.deepStrictEqual(isNonEmptyReadonlyArray([1, 2, 3]), true)
```

Added in v2.0.0

# instances

## getEquivalence

**Signature**

```ts
export declare const getEquivalence: <A>(
  isEquivalent: Equivalence<A>
) => Equivalence<readonly A[]>
```

Added in v2.0.0

## getOrder

This function creates and returns a new `Order` for an array of values based on a given `Order` for the elements of the array.
The returned `Order` compares two arrays by applying the given `Order` to each element in the arrays.
If all elements are equal, the arrays are then compared based on their length.
It is useful when you need to compare two arrays of the same type and you have a specific way of comparing each element of the array.

**Signature**

```ts
export declare const getOrder: <A>(O: Order<A>) => Order<readonly A[]>
```

Added in v2.0.0

# lifting

## liftEither

**Signature**

```ts
export declare const liftEither: <A extends unknown[], E, B>(f: (...a: A) => Either<E, B>) => (...a: A) => B[]
```

Added in v2.0.0

## liftNullable

**Signature**

```ts
export declare const liftNullable: <A extends unknown[], B>(
  f: (...a: A) => B | null | undefined
) => (...a: A) => NonNullable<B>[]
```

Added in v2.0.0

## liftOption

**Signature**

```ts
export declare const liftOption: <A extends unknown[], B>(f: (...a: A) => Option<B>) => (...a: A) => B[]
```

Added in v2.0.0

## liftPredicate

**Signature**

```ts
export declare const liftPredicate: {
  <C extends A, B extends A, A = C>(refinement: Refinement<A, B>): (c: C) => B[]
  <B extends A, A = B>(predicate: Predicate<A>): (b: B) => B[]
}
```

Added in v2.0.0

# mapping

## map

**Signature**

```ts
export declare const map: {
  <T extends readonly any[], B>(f: (a: ReadonlyArray.Infer<T>, i: number) => B): (self: T) => ReadonlyArray.With<T, B>
  <T extends readonly any[], B>(self: T, f: (a: ReadonlyArray.Infer<T>, i: number) => B): ReadonlyArray.With<T, B>
}
```

Added in v2.0.0

# models

## NonEmptyArray (type alias)

**Signature**

```ts
export type NonEmptyArray<A> = [A, ...Array<A>]
```

Added in v2.0.0

## NonEmptyReadonlyArray (type alias)

**Signature**

```ts
export type NonEmptyReadonlyArray<A> = readonly [A, ...Array<A>]
```

Added in v2.0.0

# pattern matching

## match

**Signature**

```ts
export declare const match: {
  <B, A, C = B>(options: {
    readonly onEmpty: LazyArg<B>
    readonly onNonEmpty: (self: readonly [A, ...A[]]) => C
  }): (self: readonly A[]) => B | C
  <A, B, C = B>(
    self: readonly A[],
    options: { readonly onEmpty: LazyArg<B>; readonly onNonEmpty: (self: readonly [A, ...A[]]) => C }
  ): B | C
}
```

Added in v2.0.0

## matchLeft

**Signature**

```ts
export declare const matchLeft: {
  <B, A, C = B>(options: {
    readonly onEmpty: LazyArg<B>
    readonly onNonEmpty: (head: A, tail: A[]) => C
  }): (self: readonly A[]) => B | C
  <A, B, C = B>(
    self: readonly A[],
    options: { readonly onEmpty: LazyArg<B>; readonly onNonEmpty: (head: A, tail: A[]) => C }
  ): B | C
}
```

Added in v2.0.0

## matchRight

**Signature**

```ts
export declare const matchRight: {
  <B, A, C = B>(options: {
    readonly onEmpty: LazyArg<B>
    readonly onNonEmpty: (init: A[], last: A) => C
  }): (self: readonly A[]) => B | C
  <A, B, C = B>(
    self: readonly A[],
    options: { readonly onEmpty: LazyArg<B>; readonly onNonEmpty: (init: A[], last: A) => C }
  ): B | C
}
```

Added in v2.0.0

# sequencing

## flatMap

**Signature**

```ts
export declare const flatMap: {
  <A, B>(f: (a: A, i: number) => readonly B[]): (self: readonly A[]) => B[]
  <A, B>(self: readonly A[], f: (a: A, i: number) => readonly B[]): B[]
}
```

Added in v2.0.0

## flatMapNonEmpty

**Signature**

```ts
export declare const flatMapNonEmpty: {
  <A, B>(f: (a: A, i: number) => readonly [B, ...B[]]): (self: readonly [A, ...A[]]) => [B, ...B[]]
  <A, B>(self: readonly [A, ...A[]], f: (a: A, i: number) => readonly [B, ...B[]]): [B, ...B[]]
}
```

Added in v2.0.0

## flatten

**Signature**

```ts
export declare const flatten: <A>(self: readonly (readonly A[])[]) => A[]
```

Added in v2.0.0

## flattenNonEmpty

**Signature**

```ts
export declare const flattenNonEmpty: <A>(
  self: readonly [readonly [A, ...A[]], ...(readonly [A, ...A[]])[]]
) => [A, ...A[]]
```

Added in v2.0.0

# sorting

## sort

Sort the elements of an `Iterable` in increasing order, creating a new `Array`.

**Signature**

```ts
export declare const sort: {
  <B>(O: Order<B>): <A extends B>(self: Iterable<A>) => A[]
  <A extends B, B>(self: Iterable<A>, O: Order<B>): A[]
}
```

Added in v2.0.0

## sortBy

Sort the elements of an `Iterable` in increasing order, where elements are compared
using first `orders[0]`, then `orders[1]`, etc...

**Signature**

```ts
export declare const sortBy: <B>(...orders: readonly Order<B>[]) => <A extends B>(self: Iterable<A>) => A[]
```

Added in v2.0.0

## sortByNonEmpty

**Signature**

```ts
export declare const sortByNonEmpty: <B>(
  ...orders: readonly Order<B>[]
) => <A extends B>(as: readonly [A, ...A[]]) => [A, ...A[]]
```

Added in v2.0.0

## sortNonEmpty

Sort the elements of a `NonEmptyReadonlyArray` in increasing order, creating a new `NonEmptyArray`.

**Signature**

```ts
export declare const sortNonEmpty: {
  <B>(O: Order<B>): <A extends B>(self: readonly [A, ...A[]]) => [A, ...A[]]
  <A extends B, B>(self: readonly [A, ...A[]], O: Order<B>): [A, ...A[]]
}
```

Added in v2.0.0

# type lambdas

## ReadonlyArrayTypeLambda (interface)

**Signature**

```ts
export interface ReadonlyArrayTypeLambda extends TypeLambda {
  readonly type: ReadonlyArray<this["Target"]>
}
```

Added in v2.0.0

# unsafe

## unsafeGet

Gets an element unsafely, will throw on out of bounds.

**Signature**

```ts
export declare const unsafeGet: {
  (index: number): <A>(self: readonly A[]) => A
  <A>(self: readonly A[], index: number): A
}
```

Added in v2.0.0

# utils

## ReadonlyArray (namespace)

Added in v2.0.0

### Infer (type alias)

**Signature**

```ts
export type Infer<T extends ReadonlyArray<any>> = T[number]
```

Added in v2.0.0

### With (type alias)

**Signature**

```ts
export type With<T extends ReadonlyArray<any>, A> = T extends NonEmptyReadonlyArray<any> ? NonEmptyArray<A> : Array<A>
```

Added in v2.0.0

## chop

A useful recursion pattern for processing an `Iterable` to produce a new `Array`, often used for "chopping" up the input
`Iterable`. Typically chop is called with some function that will consume an initial prefix of the `Iterable` and produce a
value and the rest of the `Array`.

**Signature**

```ts
export declare const chop: {
  <A, B>(f: (as: readonly [A, ...A[]]) => readonly [B, readonly A[]]): (self: Iterable<A>) => B[]
  <A, B>(self: Iterable<A>, f: (as: readonly [A, ...A[]]) => readonly [B, readonly A[]]): B[]
}
```

Added in v2.0.0

## chopNonEmpty

A useful recursion pattern for processing a `NonEmptyReadonlyArray` to produce a new `NonEmptyReadonlyArray`, often used for "chopping" up the input
`NonEmptyReadonlyArray`. Typically `chop` is called with some function that will consume an initial prefix of the `NonEmptyReadonlyArray` and produce a
value and the tail of the `NonEmptyReadonlyArray`.

**Signature**

```ts
export declare const chopNonEmpty: {
  <A, B>(f: (as: readonly [A, ...A[]]) => readonly [B, readonly A[]]): (self: readonly [A, ...A[]]) => [B, ...B[]]
  <A, B>(self: readonly [A, ...A[]], f: (as: readonly [A, ...A[]]) => readonly [B, readonly A[]]): [B, ...B[]]
}
```

Added in v2.0.0

## copy

**Signature**

```ts
export declare const copy: { <A>(self: readonly [A, ...A[]]): [A, ...A[]]; <A>(self: readonly A[]): A[] }
```

Added in v2.0.0

## dedupe

Remove duplicates from am `Iterable`, keeping the first occurrence of an element.

**Signature**

```ts
export declare const dedupe: <A>(self: Iterable<A>) => A[]
```

Added in v2.0.0

## dedupeAdjacent

Deduplicates adjacent elements that are identical.

**Signature**

```ts
export declare const dedupeAdjacent: <A>(self: Iterable<A>) => A[]
```

Added in v2.0.0

## dedupeAdjacentWith

Deduplicates adjacent elements that are identical using the provided `isEquivalent` function.

**Signature**

```ts
export declare const dedupeAdjacentWith: {
  <A>(isEquivalent: (self: A, that: A) => boolean): (self: Iterable<A>) => A[]
  <A>(self: Iterable<A>, isEquivalent: (self: A, that: A) => boolean): A[]
}
```

Added in v2.0.0

## dedupeNonEmpty

Remove duplicates from a `NonEmptyReadonlyArray`, keeping the first occurrence of an element.

**Signature**

```ts
export declare const dedupeNonEmpty: <A>(self: readonly [A, ...A[]]) => [A, ...A[]]
```

Added in v2.0.0

## dedupeNonEmptyWith

Remove duplicates from a `NonEmptyReadonlyArray`, keeping the first occurrence of an element using the provided `isEquivalent` function.

**Signature**

```ts
export declare const dedupeNonEmptyWith: {
  <A>(isEquivalent: (self: A, that: A) => boolean): (self: readonly [A, ...A[]]) => [A, ...A[]]
  <A>(self: readonly [A, ...A[]], isEquivalent: (self: A, that: A) => boolean): [A, ...A[]]
}
```

Added in v2.0.0

## dedupeWith

Remove duplicates from am `Iterable` using the provided `isEquivalent` function, keeping the first occurrence of an element.

**Signature**

```ts
export declare const dedupeWith: {
  <A>(isEquivalent: (self: A, that: A) => boolean): (self: Iterable<A>) => A[]
  <A>(self: Iterable<A>, isEquivalent: (self: A, that: A) => boolean): A[]
}
```

Added in v2.0.0

## difference

Creates a `Array` of values not included in the other given `Iterable` using the provided `isEquivalent` function.
The order and references of result values are determined by the first `Iterable`.

**Signature**

```ts
export declare const difference: {
  <A>(that: Iterable<A>): (self: Iterable<A>) => A[]
  <A>(self: Iterable<A>, that: Iterable<A>): A[]
}
```

Added in v2.0.0

## differenceWith

Creates a `Array` of values not included in the other given `Iterable` using the provided `isEquivalent` function.
The order and references of result values are determined by the first `Iterable`.

**Signature**

```ts
export declare const differenceWith: <A>(isEquivalent: (self: A, that: A) => boolean) => {
  (that: Iterable<A>): (self: Iterable<A>) => A[]
  (self: Iterable<A>, that: Iterable<A>): A[]
}
```

Added in v2.0.0

## extend

**Signature**

```ts
export declare const extend: {
  <A, B>(f: (as: readonly A[]) => B): (self: readonly A[]) => B[]
  <A, B>(self: readonly A[], f: (as: readonly A[]) => B): B[]
}
```

Added in v2.0.0

## forEach

Iterate over the `Iterable` applying `f`.

**Signature**

```ts
export declare const forEach: {
  <A>(f: (a: A, i: number) => void): (self: Iterable<A>) => void
  <A>(self: Iterable<A>, f: (a: A, i: number) => void): void
}
```

Added in v2.0.0

## insertAt

Insert an element at the specified index, creating a new `NonEmptyArray`,
or return `None` if the index is out of bounds.

**Signature**

```ts
export declare const insertAt: {
  <B>(i: number, b: B): <A>(self: Iterable<A>) => Option<[B | A, ...(B | A)[]]>
  <A, B>(self: Iterable<A>, i: number, b: B): Option<[A | B, ...(A | B)[]]>
}
```

Added in v2.0.0

## intersection

Creates an `Array` of unique values that are included in all given `Iterable`s.
The order and references of result values are determined by the first `Iterable`.

**Signature**

```ts
export declare const intersection: {
  <B>(that: Iterable<B>): <A>(self: Iterable<A>) => (A & B)[]
  <A, B>(self: Iterable<A>, that: Iterable<B>): (A & B)[]
}
```

Added in v2.0.0

## intersectionWith

Creates an `Array` of unique values that are included in all given `Iterable`s using the provided `isEquivalent` function.
The order and references of result values are determined by the first `Iterable`.

**Signature**

```ts
export declare const intersectionWith: <A>(isEquivalent: (self: A, that: A) => boolean) => {
  (that: Iterable<A>): (self: Iterable<A>) => A[]
  (self: Iterable<A>, that: Iterable<A>): A[]
}
```

Added in v2.0.0

## intersperse

Places an element in between members of an `Iterable`

**Signature**

```ts
export declare const intersperse: {
  <B>(middle: B): <A>(self: Iterable<A>) => (B | A)[]
  <A, B>(self: Iterable<A>, middle: B): (A | B)[]
}
```

Added in v2.0.0

## intersperseNonEmpty

Places an element in between members of a `NonEmptyReadonlyArray`

**Signature**

```ts
export declare const intersperseNonEmpty: {
  <B>(middle: B): <A>(self: readonly [A, ...A[]]) => [B | A, ...(B | A)[]]
  <A, B>(self: readonly [A, ...A[]], middle: B): [A | B, ...(A | B)[]]
}
```

Added in v2.0.0

## max

**Signature**

```ts
export declare const max: {
  <A>(O: Order<A>): (self: readonly [A, ...A[]]) => A
  <A>(self: readonly [A, ...A[]], O: Order<A>): A
}
```

Added in v2.0.0

## min

**Signature**

```ts
export declare const min: {
  <A>(O: Order<A>): (self: readonly [A, ...A[]]) => A
  <A>(self: readonly [A, ...A[]], O: Order<A>): A
}
```

Added in v2.0.0

## modify

Apply a function to the element at the specified index, creating a new `Array`,
or return a copy of the input if the index is out of bounds.

**Signature**

```ts
export declare const modify: {
  <A, B>(i: number, f: (a: A) => B): (self: Iterable<A>) => (A | B)[]
  <A, B>(self: Iterable<A>, i: number, f: (a: A) => B): (A | B)[]
}
```

Added in v2.0.0

## modifyNonEmptyHead

Apply a function to the head, creating a new `NonEmptyReadonlyArray`.

**Signature**

```ts
export declare const modifyNonEmptyHead: {
  <A, B>(f: (a: A) => B): (self: readonly [A, ...A[]]) => [A | B, ...(A | B)[]]
  <A, B>(self: readonly [A, ...A[]], f: (a: A) => B): [A | B, ...(A | B)[]]
}
```

Added in v2.0.0

## modifyNonEmptyLast

Apply a function to the last element, creating a new `NonEmptyReadonlyArray`.

**Signature**

```ts
export declare const modifyNonEmptyLast: {
  <A, B>(f: (a: A) => B): (self: readonly [A, ...A[]]) => [A | B, ...(A | B)[]]
  <A, B>(self: readonly [A, ...A[]], f: (a: A) => B): [A | B, ...(A | B)[]]
}
```

Added in v2.0.0

## modifyOption

Apply a function to the element at the specified index, creating a new `Array`,
or return `None` if the index is out of bounds.

**Signature**

```ts
export declare const modifyOption: {
  <A, B>(i: number, f: (a: A) => B): (self: Iterable<A>) => Option<(A | B)[]>
  <A, B>(self: Iterable<A>, i: number, f: (a: A) => B): Option<(A | B)[]>
}
```

Added in v2.0.0

## remove

Delete the element at the specified index, creating a new `Array`,
or return a copy of the input if the index is out of bounds.

**Signature**

```ts
export declare const remove: { (i: number): <A>(self: Iterable<A>) => A[]; <A>(self: Iterable<A>, i: number): A[] }
```

Added in v2.0.0

## replace

Change the element at the specified index, creating a new `Array`,
or return a copy of the input if the index is out of bounds.

**Signature**

```ts
export declare const replace: {
  <B>(i: number, b: B): <A>(self: Iterable<A>) => (B | A)[]
  <A, B>(self: Iterable<A>, i: number, b: B): (A | B)[]
}
```

Added in v2.0.0

## replaceOption

**Signature**

```ts
export declare const replaceOption: {
  <B>(i: number, b: B): <A>(self: Iterable<A>) => Option<(B | A)[]>
  <A, B>(self: Iterable<A>, i: number, b: B): Option<(A | B)[]>
}
```

Added in v2.0.0

## rotate

Rotate an `Iterable` by `n` steps.

**Signature**

```ts
export declare const rotate: { (n: number): <A>(self: Iterable<A>) => A[]; <A>(self: Iterable<A>, n: number): A[] }
```

Added in v2.0.0

## rotateNonEmpty

Rotate a `NonEmptyReadonlyArray` by `n` steps.

**Signature**

```ts
export declare const rotateNonEmpty: {
  (n: number): <A>(self: readonly [A, ...A[]]) => [A, ...A[]]
  <A>(self: readonly [A, ...A[]], n: number): [A, ...A[]]
}
```

Added in v2.0.0

## setNonEmptyHead

Change the head, creating a new `NonEmptyReadonlyArray`.

**Signature**

```ts
export declare const setNonEmptyHead: {
  <B>(b: B): <A>(self: readonly [A, ...A[]]) => [B | A, ...(B | A)[]]
  <A, B>(self: readonly [A, ...A[]], b: B): [A | B, ...(A | B)[]]
}
```

Added in v2.0.0

## setNonEmptyLast

Change the last element, creating a new `NonEmptyReadonlyArray`.

**Signature**

```ts
export declare const setNonEmptyLast: {
  <B>(b: B): <A>(self: readonly [A, ...A[]]) => [B | A, ...(B | A)[]]
  <A, B>(self: readonly [A, ...A[]], b: B): [A | B, ...(A | B)[]]
}
```

Added in v2.0.0

## union

**Signature**

```ts
export declare const union: {
  <B>(that: Iterable<B>): <A>(self: Iterable<A>) => (B | A)[]
  <A, B>(self: Iterable<A>, that: Iterable<B>): (A | B)[]
}
```

Added in v2.0.0

## unionNonEmpty

**Signature**

```ts
export declare const unionNonEmpty: {
  <A>(that: readonly [A, ...A[]]): (self: readonly A[]) => [A, ...A[]]
  <A>(that: readonly A[]): (self: readonly [A, ...A[]]) => [A, ...A[]]
  <A>(self: readonly A[], that: readonly [A, ...A[]]): [A, ...A[]]
  <A>(self: readonly [A, ...A[]], that: readonly A[]): [A, ...A[]]
}
```

Added in v2.0.0

## unionNonEmptyWith

**Signature**

```ts
export declare const unionNonEmptyWith: <A>(isEquivalent: (self: A, that: A) => boolean) => {
  (that: readonly [A, ...A[]]): (self: readonly A[]) => [A, ...A[]]
  (that: readonly A[]): (self: readonly [A, ...A[]]) => [A, ...A[]]
  (self: readonly A[], that: readonly [A, ...A[]]): [A, ...A[]]
  (self: readonly [A, ...A[]], that: readonly A[]): [A, ...A[]]
}
```

Added in v2.0.0

## unionWith

**Signature**

```ts
export declare const unionWith: <A>(isEquivalent: (self: A, that: A) => boolean) => {
  (that: Iterable<A>): (self: Iterable<A>) => A[]
  (self: Iterable<A>, that: Iterable<A>): A[]
}
```

Added in v2.0.0

## unzip

This function is the inverse of `zip`. Takes an `Iterable` of pairs and return two corresponding `Array`s.

**Signature**

```ts
export declare const unzip: <A, B>(self: Iterable<readonly [A, B]>) => [A[], B[]]
```

Added in v2.0.0

## unzipNonEmpty

**Signature**

```ts
export declare const unzipNonEmpty: <A, B>(
  self: readonly [readonly [A, B], ...(readonly [A, B])[]]
) => [[A, ...A[]], [B, ...B[]]]
```

Added in v2.0.0

## zip

Takes two `Iterable`s and returns an `Array` of corresponding pairs.
If one input `Iterable` is short, excess elements of the
longer `Iterable` are discarded.

**Signature**

```ts
export declare const zip: {
  <B>(that: Iterable<B>): <A>(self: Iterable<A>) => [A, B][]
  <A, B>(self: Iterable<A>, that: Iterable<B>): [A, B][]
}
```

Added in v2.0.0

## zipNonEmpty

**Signature**

```ts
export declare const zipNonEmpty: {
  <B>(that: readonly [B, ...B[]]): <A>(self: readonly [A, ...A[]]) => [[A, B], ...[A, B][]]
  <A, B>(self: readonly [A, ...A[]], that: readonly [B, ...B[]]): [[A, B], ...[A, B][]]
}
```

Added in v2.0.0

## zipNonEmptyWith

**Signature**

```ts
export declare const zipNonEmptyWith: {
  <B, A, C>(that: readonly [B, ...B[]], f: (a: A, b: B) => C): (self: readonly [A, ...A[]]) => [C, ...C[]]
  <A, B, C>(self: readonly [A, ...A[]], that: readonly [B, ...B[]], f: (a: A, b: B) => C): [C, ...C[]]
}
```

Added in v2.0.0

## zipWith

Apply a function to pairs of elements at the same index in two `Iterable`s, collecting the results in a new `Array`. If one
input `Iterable` is short, excess elements of the longer `Iterable` are discarded.

**Signature**

```ts
export declare const zipWith: {
  <B, A, C>(that: Iterable<B>, f: (a: A, b: B) => C): (self: Iterable<A>) => C[]
  <B, A, C>(self: Iterable<A>, that: Iterable<B>, f: (a: A, b: B) => C): C[]
}
```

Added in v2.0.0
