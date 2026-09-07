---
title: Array.ts
nav_order: 1
parent: Modules
---

## Array.ts overview

Works with JavaScript arrays, readonly arrays, and non-empty arrays.

The helpers cover common collection work such as creating arrays, reading
elements, transforming values, sorting, grouping, splitting, combining, and
reducing many values to one result. Helpers that change contents return new
arrays and preserve non-empty array types when the result is guaranteed to
contain values.

Since v2.0.0

---

## Exports Grouped by Category

- [combining](#combining)
  - [append](#append)
  - [appendAll](#appendall)
  - [cartesian](#cartesian)
  - [cartesianWith](#cartesianwith)
  - [prepend](#prepend)
  - [prependAll](#prependall)
- [constructors](#constructors)
  - [Array](#array)
  - [Do](#do)
  - [allocate](#allocate)
  - [empty](#empty)
  - [ensure](#ensure)
  - [fromIterable](#fromiterable)
  - [make](#make)
  - [makeBy](#makeby)
  - [of](#of)
  - [range](#range)
  - [replicate](#replicate)
  - [unfold](#unfold)
- [converting](#converting)
  - [fromNullishOr](#fromnullishor)
  - [fromOption](#fromoption)
  - [fromRecord](#fromrecord)
- [deduplication](#deduplication)
  - [dedupe](#dedupe)
  - [dedupeAdjacent](#dedupeadjacent)
  - [dedupeAdjacentWith](#dedupeadjacentwith)
  - [dedupeWith](#dedupewith)
- [filtering](#filtering)
  - [filter](#filter)
  - [filterMap](#filtermap)
  - [getFailures](#getfailures)
  - [getSomes](#getsomes)
  - [getSuccesses](#getsuccesses)
  - [partition](#partition)
  - [separate](#separate)
- [folding](#folding)
  - [countBy](#countby)
  - [getReadonlyReducerConcat](#getreadonlyreducerconcat)
  - [join](#join)
  - [makeReducerConcat](#makereducerconcat)
  - [mapAccum](#mapaccum)
  - [reduce](#reduce)
  - [reduceRight](#reduceright)
  - [scan](#scan)
  - [scanRight](#scanright)
- [getters](#getters)
  - [drop](#drop)
  - [dropRight](#dropright)
  - [dropWhile](#dropwhile)
  - [dropWhileFilter](#dropwhilefilter)
  - [get](#get)
  - [head](#head)
  - [headNonEmpty](#headnonempty)
  - [init](#init)
  - [initNonEmpty](#initnonempty)
  - [last](#last)
  - [lastNonEmpty](#lastnonempty)
  - [length](#length)
  - [max](#max)
  - [min](#min)
  - [tail](#tail)
  - [tailNonEmpty](#tailnonempty)
  - [take](#take)
  - [takeRight](#takeright)
  - [takeWhile](#takewhile)
  - [takeWhileFilter](#takewhilefilter)
- [grouping](#grouping)
  - [group](#group)
  - [groupBy](#groupby)
  - [groupWith](#groupwith)
- [guards](#guards)
  - [every](#every)
  - [isArray](#isarray)
  - [isArrayEmpty](#isarrayempty)
  - [isArrayNonEmpty](#isarraynonempty)
  - [isReadonlyArrayEmpty](#isreadonlyarrayempty)
  - [isReadonlyArrayNonEmpty](#isreadonlyarraynonempty)
  - [some](#some)
- [instances](#instances)
  - [makeEquivalence](#makeequivalence)
  - [makeOrder](#makeorder)
- [lifting](#lifting)
  - [liftNullishOr](#liftnullishor)
  - [liftOption](#liftoption)
  - [liftPredicate](#liftpredicate)
  - [liftResult](#liftresult)
- [mapping](#mapping)
  - [bindTo](#bindto)
  - [extend](#extend)
  - [let](#let)
  - [map](#map)
- [models](#models)
  - [NonEmptyArray (type alias)](#nonemptyarray-type-alias)
  - [NonEmptyReadonlyArray (type alias)](#nonemptyreadonlyarray-type-alias)
- [pattern matching](#pattern-matching)
  - [match](#match)
  - [matchLeft](#matchleft)
  - [matchRight](#matchright)
- [predicates](#predicates)
  - [contains](#contains)
  - [containsWith](#containswith)
- [searching](#searching)
  - [findFirst](#findfirst)
  - [findFirstIndex](#findfirstindex)
  - [findFirstWithIndex](#findfirstwithindex)
  - [findLast](#findlast)
  - [findLastIndex](#findlastindex)
- [sequencing](#sequencing)
  - [bind](#bind)
  - [flatMap](#flatmap)
  - [flatMapNullishOr](#flatmapnullishor)
  - [flatten](#flatten)
- [set operations](#set-operations)
  - [difference](#difference)
  - [differenceWith](#differencewith)
  - [intersection](#intersection)
  - [intersectionWith](#intersectionwith)
  - [union](#union)
  - [unionWith](#unionwith)
- [sorting](#sorting)
  - [sort](#sort)
  - [sortBy](#sortby)
  - [sortWith](#sortwith)
- [splitting](#splitting)
  - [chop](#chop)
  - [chunksOf](#chunksof)
  - [span](#span)
  - [split](#split)
  - [splitAt](#splitat)
  - [splitAtNonEmpty](#splitatnonempty)
  - [splitWhere](#splitwhere)
  - [unappend](#unappend)
  - [unprepend](#unprepend)
  - [window](#window)
- [transforming](#transforming)
  - [copy](#copy)
  - [insertAt](#insertat)
  - [intersperse](#intersperse)
  - [modify](#modify)
  - [modifyHeadNonEmpty](#modifyheadnonempty)
  - [modifyLastNonEmpty](#modifylastnonempty)
  - [pad](#pad)
  - [remove](#remove)
  - [replace](#replace)
  - [reverse](#reverse)
  - [rotate](#rotate)
  - [setHeadNonEmpty](#setheadnonempty)
  - [setLastNonEmpty](#setlastnonempty)
- [traversing](#traversing)
  - [forEach](#foreach)
- [unsafe](#unsafe)
  - [getUnsafe](#getunsafe)
- [utility types](#utility-types)
  - [ReadonlyArrayTypeLambda (interface)](#readonlyarraytypelambda-interface)
- [utils](#utils)
  - [ReadonlyArray (namespace)](#readonlyarray-namespace)
    - [Infer (type alias)](#infer-type-alias)
    - [With (type alias)](#with-type-alias)
    - [OrNonEmpty (type alias)](#ornonempty-type-alias)
    - [AndNonEmpty (type alias)](#andnonempty-type-alias)
    - [Flatten (type alias)](#flatten-type-alias)
- [zipping](#zipping)
  - [unzip](#unzip)
  - [zip](#zip)
  - [zipWith](#zipwith)

---

# combining

## append

Adds a single element to the end of an iterable, returning a `NonEmptyArray`.

**When to use**

Use when you need to guarantee a non-empty result after adding a required
trailing value.

**Example** (Appending an element)

```ts
import { Array } from "effect"

Array.append([1, 2, 3], 4) // => [1, 2, 3, 4]
```

**See**

- `prepend` — add to the front
- `appendAll` — append multiple elements

**Signature**

```ts
declare const append: {
  <B>(last: B): <A>(self: Iterable<A>) => NonEmptyArray<A | B>
  <A, B>(self: Iterable<A>, last: B): NonEmptyArray<A | B>
}
```

[Source](https://effect.website/blob/main/src/Array.ts#L644)

Since v2.0.0

## appendAll

Concatenates two iterables into a single array.

**When to use**

Use to combine two iterable inputs into a new array with the second input's
elements after the first.

**Details**

If either input is non-empty, the result is a `NonEmptyArray`.

**Example** (Concatenating arrays)

```ts
import { Array } from "effect"

Array.appendAll([1, 2], [3, 4]) // => [1, 2, 3, 4]
```

**See**

- `append` — add a single element to the end
- `prependAll` — add elements to the front

**Signature**

```ts
declare const appendAll: {
  <S extends Iterable<any>, T extends Iterable<any>>(
    that: T
  ): (self: S) => ReadonlyArray.OrNonEmpty<S, T, ReadonlyArray.Infer<S> | ReadonlyArray.Infer<T>>
  <A, B>(self: Iterable<A>, that: NonEmptyReadonlyArray<B>): NonEmptyArray<A | B>
  <A, B>(self: NonEmptyReadonlyArray<A>, that: Iterable<B>): NonEmptyArray<A | B>
  <A, B>(self: Iterable<A>, that: Iterable<B>): Array<A | B>
}
```

[Source](https://effect.website/blob/main/src/Array.ts#L675)

Since v2.0.0

## cartesian

Computes the cartesian product of two arrays, returning all pairs as tuples.

**When to use**

Use when you need every `[a, b]` pair from two arrays as tuples.

**Details**

Produces every `[a, b]` combination of an element from `self` with an element
from `that`, so the result length is `self.length * that.length`.

**Example** (Generating all pairs from two arrays)

```ts
import { Array } from "effect"

Array.cartesian([1, 2], ["a", "b"]) // => [[1, "a"], [1, "b"], [2, "a"], [2, "b"]]
```

**See**

- `cartesianWith` — apply a combiner to each pair

**Signature**

```ts
declare const cartesian: {
  <B>(that: ReadonlyArray<B>): <A>(self: ReadonlyArray<A>) => Array<[A, B]>
  <A, B>(self: ReadonlyArray<A>, that: ReadonlyArray<B>): Array<[A, B]>
}
```

[Source](https://effect.website/blob/main/src/Array.ts#L4753)

Since v2.0.0

## cartesianWith

Computes the cartesian product of two arrays, applying a combiner to each pair.

**When to use**

Use to compute every combination from two arrays and immediately transform
each pair into a custom result.

**Details**

Produces every combination of an element from `self` with an element from
`that`, so the result length is `self.length * that.length`. Iteration visits
every element of `that` for each element of `self`.

**Example** (Combining numbers and letters)

```ts
import { Array } from "effect"

Array.cartesianWith([1, 2], ["a", "b"], (a, b) => `${a}-${b}`) // => ["1-a", "1-b", "2-a", "2-b"]
```

**See**

- `cartesian` for returning tuples instead of applying a combiner

**Signature**

```ts
declare const cartesianWith: {
  <A, B, C>(that: ReadonlyArray<B>, f: (a: A, b: B) => C): (self: ReadonlyArray<A>) => Array<C>
  <A, B, C>(self: ReadonlyArray<A>, that: ReadonlyArray<B>, f: (a: A, b: B) => C): Array<C>
}
```

[Source](https://effect.website/blob/main/src/Array.ts#L4719)

Since v2.0.0

## prepend

Adds a single element to the front of an iterable, returning a `NonEmptyArray`.

**When to use**

Use when you need to guarantee a non-empty result after adding a required
leading value.

**Example** (Prepending an element)

```ts
import { Array } from "effect"

Array.prepend([2, 3, 4], 1) // => [1, 2, 3, 4]
```

**See**

- `append` — add to the end
- `prependAll` — prepend multiple elements

**Signature**

```ts
declare const prepend: {
  <B>(head: B): <A>(self: Iterable<A>) => NonEmptyArray<A | B>
  <A, B>(self: Iterable<A>, head: B): NonEmptyArray<A | B>
}
```

[Source](https://effect.website/blob/main/src/Array.ts#L580)

Since v2.0.0

## prependAll

Prepends all elements from a prefix iterable to the front of an array.

**When to use**

Use to prepend multiple elements from an iterable to the front of an array.

**Details**

If either input is non-empty, the result is a `NonEmptyArray`.

**Example** (Prepending multiple elements)

```ts
import { Array } from "effect"

Array.prependAll([2, 3], [0, 1]) // => [0, 1, 2, 3]
```

**See**

- `prepend` — add a single element to the front
- `appendAll` — add elements to the end

**Signature**

```ts
declare const prependAll: {
  <S extends Iterable<any>, T extends Iterable<any>>(
    that: T
  ): (self: S) => ReadonlyArray.OrNonEmpty<S, T, ReadonlyArray.Infer<S> | ReadonlyArray.Infer<T>>
  <A, B>(self: Iterable<A>, that: NonEmptyReadonlyArray<B>): NonEmptyArray<A | B>
  <A, B>(self: NonEmptyReadonlyArray<A>, that: Iterable<B>): NonEmptyArray<A | B>
  <A, B>(self: Iterable<A>, that: Iterable<B>): Array<A | B>
}
```

[Source](https://effect.website/blob/main/src/Array.ts#L610)

Since v2.0.0

# constructors

## Array

Exposes the global array constructor.

**When to use**

Use to access native JavaScript array constructor methods such as `isArray`
or `from` from the Effect module namespace.

**Example** (Accessing the Array constructor)

```ts
import { Array } from "effect"

Array.Array === globalThis.Array // => true
```

**Signature**

```ts
declare const Array: ArrayConstructor
```

[Source](https://effect.website/blob/main/src/Array.ts#L51)

Since v4.0.0

## Do

Provides the starting point for the "do simulation" — an array comprehension pattern.

**When to use**

Use when you want array-comprehension style code with do notation.

**Details**

Use `bind` to introduce array variables and `let` for plain
values. Each `bind` produces the cartesian product of all bound variables,
like nested loops. Use `filter` and `map` in the pipeline to add conditions
and transformations.

**Example** (Building array comprehensions with do notation)

```ts
import { Array, pipe } from "effect"

pipe(
  Array.Do,
  Array.bind("x", () => [1, 3, 5]),
  Array.bind("y", () => [2, 4, 6]),
  Array.filter(({ x, y }) => x < y),
  Array.map(({ x, y }) => [x, y] as const)
) // => [[1, 2], [1, 4], [1, 6], [3, 4], [3, 6], [5, 6]]
```

**See**

- `bind` — introduce an array variable into the scope
- `bindTo` — start a pipeline by naming the first array
- `let` — introduce a plain computed value

**Signature**

```ts
declare const Do: ReadonlyArray<{}>
```

[Source](https://effect.website/blob/main/src/Array.ts#L4800)

Since v3.2.0

## allocate

Creates a new `Array` of the specified length with all slots uninitialized.

**When to use**

Use when you need a pre-sized array that will be filled imperatively.

**Details**

`n` is rounded down. `NaN` and non-positive values are treated as `0`.
Elements are typed as `A | undefined` because the slots are empty.

**Example** (Allocating a fixed-size array)

```ts
import { Array } from "effect"

Array.allocate<number>(3).length // => 3
```

**See**

- `makeBy` — create an array by computing each element

**Signature**

```ts
declare const allocate: <A = never>(n: number) => Array<A | undefined>
```

[Source](https://effect.website/blob/main/src/Array.ts#L178)

Since v2.0.0

## empty

Creates an empty array.

**When to use**

Use to create a typed empty array without allocating placeholder elements.

**Example** (Creating an empty array)

```ts
import { Array } from "effect"

Array.empty<number>() // => []
```

**See**

- `of` — create a single-element array
- `make` — create from multiple values

**Signature**

```ts
declare const empty: <A = never>() => Array<A>
```

[Source](https://effect.website/blob/main/src/Array.ts#L3424)

Since v2.0.0

## ensure

Normalizes a value that is either a single element or an array into an array.

**When to use**

Use to normalize input that may be a single value or an array into a consistent
array.

**Details**

If the input is already an array, this returns it by reference. If the input
is a single value, this wraps it in a one-element array. This is useful for
APIs that accept `A | Array<A>`.

**Example** (Normalizing input)

```ts
import { Array } from "effect"

Array.ensure("a") // => ["a"]
Array.ensure(["a", "b", "c"]) // => ["a", "b", "c"]
```

**See**

- `of` — always wrap in a single-element array
- `fromIterable` — convert any iterable

**Signature**

```ts
declare const ensure: <A>(self: ReadonlyArray<A> | A) => Array<A>
```

[Source](https://effect.website/blob/main/src/Array.ts#L337)

Since v3.3.0

## fromIterable

Converts an `Iterable` to an `Array`.

**When to use**

Use to convert any `Iterable` (Set, Generator, etc.) into an array.

**Details**

If the input is already an array, this returns it by reference without
copying. Otherwise, it creates a new array from the iterable. Use `copy` if
you need a fresh array even when the input is already an array.

**Example** (Converting a Set to an array)

```ts
import { Array } from "effect"

Array.fromIterable(new Set([1, 2, 3])) // => [1, 2, 3]
```

**See**

- `ensure` — wrap a single value or return an existing array
- `copy` — create a shallow copy of an array

**Signature**

```ts
declare const fromIterable: <A>(collection: Iterable<A>) => Array<A>
```

[Source](https://effect.website/blob/main/src/Array.ts#L305)

Since v2.0.0

## make

Creates a `NonEmptyArray` from one or more elements.

**When to use**

Use when you need to create a typed non-empty array from literal values.

**Details**

The element type is inferred as the union of all arguments. Because at least
one argument is required, this always returns a `NonEmptyArray`.

**Example** (Creating an array from values)

```ts
import { Array } from "effect"

Array.make(1, 2, 3) // => [1, 2, 3]
```

**See**

- `of` — create a single-element array
- `fromIterable` — create from any iterable

**Signature**

```ts
declare const make: <Elements extends NonEmptyArray<unknown>>(...elements: Elements) => NonEmptyArray<Elements[number]>
```

[Source](https://effect.website/blob/main/src/Array.ts#L149)

Since v2.0.0

## makeBy

Creates a `NonEmptyArray` of length `n` where element `i` is computed by `f(i)`.

**When to use**

Use when you need to compute each array element from its index.

**Details**

`n` is rounded down and normalized to an integer greater than or equal to 1.
`NaN` is treated as `1`, so this function always returns at least one
element. Supports both data-first and data-last usage.

**Example** (Generating values from indices)

```ts
import { Array } from "effect"

Array.makeBy(5, (n) => n * 2) // => [0, 2, 4, 6, 8]
```

**See**

- `range` — create a range of integers
- `replicate` — repeat a single value

**Signature**

```ts
declare const makeBy: {
  <A>(f: (i: number) => A): (n: number) => NonEmptyArray<A>
  <A>(n: number, f: (i: number) => A): NonEmptyArray<A>
}
```

[Source](https://effect.website/blob/main/src/Array.ts#L207)

Since v2.0.0

## of

Wraps a single value in a `NonEmptyArray`.

**Example** (Creating a single-element array)

```ts
import { Array } from "effect"

Array.of(1) // => [1]
```

**See**

- `make` — create from multiple values
- `empty` — create an empty array

**Signature**

```ts
declare const of: <A>(a: A) => NonEmptyArray<A>
```

[Source](https://effect.website/blob/main/src/Array.ts#L3443)

Since v2.0.0

## range

Creates a `NonEmptyArray` containing a range of integers, inclusive on both
ends.

**When to use**

Use when you need a non-empty sequence of consecutive integers.

**Details**

If `start > end`, returns `[start]`.

**Example** (Creating a range)

```ts
import { Array } from "effect"

Array.range(1, 3) // => [1, 2, 3]
```

**See**

- `makeBy` — generate values from a function

**Signature**

```ts
declare const range: (start: number, end: number) => NonEmptyArray<number>
```

[Source](https://effect.website/blob/main/src/Array.ts#L244)

Since v2.0.0

## replicate

Creates a `NonEmptyArray` containing a value repeated `n` times.

**When to use**

Use when you need a non-empty array containing repeated copies of one value.

**Details**

`n` is normalized to an integer greater than or equal to 1, so this function
always returns at least one element. Supports both data-first and data-last
usage.

**Example** (Repeating a value)

```ts
import { Array } from "effect"

Array.replicate("a", 3) // => ["a", "a", "a"]
```

**See**

- `makeBy` — vary values based on index

**Signature**

```ts
declare const replicate: { (n: number): <A>(a: A) => NonEmptyArray<A>; <A>(a: A, n: number): NonEmptyArray<A> }
```

[Source](https://effect.website/blob/main/src/Array.ts#L273)

Since v2.0.0

## unfold

Builds an array by repeatedly applying a function to a seed value. The
function returns `Option.some([element, nextSeed])` to continue, or
`Option.none()` to stop.

**Example** (Generating a sequence)

```ts
import { Array, Option } from "effect"

Array.unfold(1, (n) => (n <= 5 ? Option.some([n, n + 1]) : Option.none())) // => [1, 2, 3, 4, 5]
```

**See**

- `makeBy` — generate from index
- `range` — generate a numeric range

**Signature**

```ts
declare const unfold: <B, A>(b: B, f: (b: B) => Option.Option<readonly [A, B]>) => Array<A>
```

[Source](https://effect.website/blob/main/src/Array.ts#L4373)

Since v2.0.0

# converting

## fromNullishOr

Converts a nullable value to an array: `null`/`undefined` becomes `[]`,
anything else becomes `[value]`.

**When to use**

Use to treat a nullable single value as zero or one array element.

**Example** (Converting nullable values to an array)

```ts
import { Array } from "effect"

Array.fromNullishOr(1) // => [1]
Array.fromNullishOr(null) // => []
Array.fromNullishOr(undefined) // => []
```

**See**

- `liftNullishOr` — lift a nullable-returning function
- `fromOption` — convert from Option

**Signature**

```ts
declare const fromNullishOr: <A>(a: A) => Array<NonNullable<A>>
```

[Source](https://effect.website/blob/main/src/Array.ts#L4107)

Since v4.0.0

## fromOption

Converts an `Option` to an array: `Some(a)` becomes `[a]`, `None` becomes `[]`.

**When to use**

Use to convert a single `Option` into an array for downstream array operations.

**Example** (Converting an Option to an array)

```ts
import { Array, Option } from "effect"

Array.fromOption(Option.some(1)) // => [1]
Array.fromOption(Option.none()) // => []
```

**See**

- `getSomes` — extract `Some` values from an array of Options

**Signature**

```ts
declare const fromOption: <A>(self: Option.Option<A>) => Array<A>
```

[Source](https://effect.website/blob/main/src/Array.ts#L389)

Since v2.0.0

## fromRecord

Converts a record into an array of `[key, value]` tuples.

**When to use**

Use to convert a record into an array of key-value tuples for iteration or
transformation.

**Details**

Key order follows `Object.entries` semantics. Empty records produce an empty
array.

**Example** (Converting a record to entries)

```ts
import { Array } from "effect"

Array.fromRecord({ a: 1, b: 2, c: 3 }) // => [["a", 1], ["b", 2], ["c", 3]]
```

**See**

- `Record.toEntries` the equivalent function from the Record module
- `Record.fromEntries` to build a record from an array of tuples

**Signature**

```ts
declare const fromRecord: <K extends string, A>(self: Readonly<Record<K, A>>) => Array<[K, A]>
```

[Source](https://effect.website/blob/main/src/Array.ts#L366)

Since v2.0.0

# deduplication

## dedupe

Removes duplicates using `Equal.equivalence()`, preserving the order of the
first occurrence.

**When to use**

Use to remove repeated values from an iterable when Effect's default equality
is the right comparison, preserving the first occurrence.

**Example** (Removing duplicates)

```ts
import { Array } from "effect"

Array.dedupe([1, 2, 1, 3, 2, 4]) // => [1, 2, 3, 4]
```

**See**

- `dedupeWith` — use custom equality
- `dedupeAdjacent` — only dedupes consecutive elements

**Signature**

```ts
declare const dedupe: <S extends Iterable<any>>(
  self: S
) => S extends NonEmptyReadonlyArray<infer A> ? NonEmptyArray<A> : S extends Iterable<infer A> ? Array<A> : never
```

[Source](https://effect.website/blob/main/src/Array.ts#L4533)

Since v2.0.0

## dedupeAdjacent

Removes consecutive duplicate elements using `Equal.equivalence()`.

**When to use**

Use when you need to collapse consecutive duplicates while preserving later
non-consecutive repeats, and the default equality is sufficient.

**Example** (Removing adjacent duplicates)

```ts
import { Array } from "effect"

Array.dedupeAdjacent([1, 1, 2, 2, 3, 3]) // => [1, 2, 3]
```

**See**

- `dedupeAdjacentWith` — use custom equality
- `dedupe` — remove all duplicates

**Signature**

```ts
declare const dedupeAdjacent: <A>(self: Iterable<A>) => Array<A>
```

[Source](https://effect.website/blob/main/src/Array.ts#L4614)

Since v2.0.0

## dedupeAdjacentWith

Removes consecutive duplicate elements using a custom equivalence.

**When to use**

Use when consecutive duplicates should be collapsed using a custom
equivalence, while equivalent values that appear later should remain in the
result.

**Details**

Non-adjacent duplicates are preserved.

**Example** (Deduplicating adjacent elements)

```ts
import { Array } from "effect"

Array.dedupeAdjacentWith([1, 1, 2, 2, 3, 3], (a, b) => a === b) // => [1, 2, 3]
```

**See**

- `dedupeAdjacent` — uses default equality
- `dedupeWith` — dedupes all duplicates, not just adjacent

**Signature**

```ts
declare const dedupeAdjacentWith: {
  <A>(isEquivalent: (self: A, that: A) => boolean): (self: Iterable<A>) => Array<A>
  <A>(self: Iterable<A>, isEquivalent: (self: A, that: A) => boolean): Array<A>
}
```

[Source](https://effect.website/blob/main/src/Array.ts#L4577)

Since v2.0.0

## dedupeWith

Removes duplicates using a custom equivalence, preserving the order of the
first occurrence.

**When to use**

Use to remove all duplicate elements with a custom equivalence when default
equality is not appropriate.

**Example** (Deduplicating with custom equality)

```ts
import { Array } from "effect"

Array.dedupeWith([1, 2, 2, 3, 3, 3], (a, b) => a === b) // => [1, 2, 3]
```

**See**

- `dedupe` — uses default equality
- `dedupeAdjacentWith` — only dedupes consecutive elements

**Signature**

```ts
declare const dedupeWith: {
  <S extends Iterable<any>>(
    isEquivalent: (self: ReadonlyArray.Infer<S>, that: ReadonlyArray.Infer<S>) => boolean
  ): (self: S) => ReadonlyArray.With<S, ReadonlyArray.Infer<S>>
  <A>(self: NonEmptyReadonlyArray<A>, isEquivalent: (self: A, that: A) => boolean): NonEmptyArray<A>
  <A>(self: Iterable<A>, isEquivalent: (self: A, that: A) => boolean): Array<A>
}
```

[Source](https://effect.website/blob/main/src/Array.ts#L4486)

Since v2.0.0

# filtering

## filter

Keeps only elements satisfying a predicate (or refinement).

**When to use**

Use to filter an iterable into a new array of original elements that satisfy
a boolean predicate or refinement.

**Details**

The predicate receives `(element, index)`. Refinements are supported for type
narrowing.

**Example** (Filtering even numbers)

```ts
import { Array } from "effect"

Array.filter([1, 2, 3, 4], (x) => x % 2 === 0) // => [2, 4]
```

**See**

- `partition` — split into matching and non-matching
- `filterMap` for transforming while filtering

**Signature**

```ts
declare const filter: {
  <A, B extends A>(refinement: (a: NoInfer<A>, i: number) => a is B): (self: Iterable<A>) => Array<B>
  <A>(predicate: (a: NoInfer<A>, i: number) => boolean): (self: Iterable<A>) => Array<A>
  <A, B extends A>(self: Iterable<A>, refinement: (a: A, i: number) => a is B): Array<B>
  <A>(self: Iterable<A>, predicate: (a: A, i: number) => boolean): Array<A>
}
```

[Source](https://effect.website/blob/main/src/Array.ts#L3845)

Since v2.0.0

## filterMap

Keeps transformed values for elements where a `Filter` succeeds.

**When to use**

Use to filter an iterable with a `Result`-returning transformation while
discarding failures.

**Details**

The filter receives `(element, index)`. Failures are discarded.

**Example** (Filtering and transforming)

```ts
import { Array, Result } from "effect"

Array.filterMap([1, 2, 3, 4], (n) => (n % 2 === 0 ? Result.succeed(n * 10) : Result.failVoid)) // => [20, 40]
```

**See**

- `filter` — keep original elements matching a predicate
- `partition` for keeping both failures and successes

**Signature**

```ts
declare const filterMap: {
  <A, B, X>(f: (input: NoInfer<A>, i: number) => Result.Result<B, X>): (self: Iterable<A>) => Array<B>
  <A, B, X>(self: Iterable<A>, f: (input: A, i: number) => Result.Result<B, X>): Array<B>
}
```

[Source](https://effect.website/blob/main/src/Array.ts#L3803)

Since v2.0.0

## getFailures

Extracts all failure values from an iterable of `Result`s, discarding
successes.

**When to use**

Use when you can drop the success channel and only need the failure
payloads, not the original result wrappers.

**Example** (Extracting failures)

```ts
import { Array, Result } from "effect"

Array.getFailures([Result.succeed(1), Result.fail("err"), Result.succeed(2)]) // => ["err"]
```

**See**

- `getSuccesses` — extract success values
- `separate` — split into failures and successes

**Signature**

```ts
declare const getFailures: <T extends Iterable<Result.Result<any, any>>>(
  self: T
) => Array<Result.Result.Failure<ReadonlyArray.Infer<T>>>
```

[Source](https://effect.website/blob/main/src/Array.ts#L3728)

Since v4.0.0

## getSomes

Extracts all `Some` values from an iterable of `Option`s, discarding `None`s.

**When to use**

Use to collect only present values from an iterable of `Option` values while
discarding `None` values.

**Example** (Extracting Some values)

```ts
import { Array, Option } from "effect"

Array.getSomes([Option.some(1), Option.none(), Option.some(2)]) // => [1, 2]
```

**See**

- `fromOption` — convert a single Option
- `getSuccesses` — extract successes from Results

**Signature**

```ts
declare const getSomes: <T extends Iterable<Option.Option<X>>, X = any>(
  self: T
) => Array<Option.Option.Value<ReadonlyArray.Infer<T>>>
```

[Source](https://effect.website/blob/main/src/Array.ts#L3693)

Since v2.0.0

## getSuccesses

Extracts all success values from an iterable of `Result`s, discarding
failures.

**When to use**

Use when you can drop the failure channel and only need the success
payloads, not the original result wrappers.

**Example** (Extracting successes)

```ts
import { Array, Result } from "effect"

Array.getSuccesses([Result.succeed(1), Result.fail("err"), Result.succeed(2)]) // => [1, 2]
```

**See**

- `getFailures` — extract failure values
- `separate` — split into failures and successes

**Signature**

```ts
declare const getSuccesses: <T extends Iterable<Result.Result<any, any>>>(
  self: T
) => Array<Result.Result.Success<ReadonlyArray.Infer<T>>>
```

[Source](https://effect.website/blob/main/src/Array.ts#L3764)

Since v4.0.0

## partition

Splits an iterable using a `Filter` into failures and successes.

**When to use**

Use to partition an iterable by evaluating each element with a
`Result`-returning filter and keeping both failure and success values.

**Details**

Returns `[excluded, satisfying]`. The filter receives `(element, index)`.

**Example** (Partitioning with a filter)

```ts
import { Array, Result } from "effect"

Array.partition([1, -2, 3], (n, i) => (n > 0 ? Result.succeed(n + i) : Result.fail(`negative:${n}`))) // => [["negative:-2"], [1, 5]]
```

**See**

- `filter` — keep only matching elements
- `filterMap` for discarding failures
- `separate` — split an iterable of `Result` values

**Signature**

```ts
declare const partition: {
  <A, Pass, Fail>(
    f: (input: NoInfer<A>, i: number) => Result.Result<Pass, Fail>
  ): (self: Iterable<A>) => [excluded: Array<Fail>, satisfying: Array<Pass>]
  <A, Pass, Fail>(
    self: Iterable<A>,
    f: (input: A, i: number) => Result.Result<Pass, Fail>
  ): [excluded: Array<Fail>, satisfying: Array<Pass>]
}
```

[Source](https://effect.website/blob/main/src/Array.ts#L3893)

Since v2.0.0

## separate

Separates an iterable of `Result`s into failure values and success values.

**When to use**

Use to split an iterable of `Result` values into failure and success arrays.

**Details**

Returns `[failures, successes]`. This is equivalent to
`partition(identity)`.

**Example** (Separating Results)

```ts
import { Array, Result } from "effect"

Array.separate([Result.succeed(1), Result.fail("error"), Result.succeed(2)]) // => [["error"], [1, 2]]
```

**See**

- `getFailures` — extract only failures
- `getSuccesses` — extract only successes
- `partition` for computing `Result` values while splitting

**Signature**

```ts
declare const separate: <T extends Iterable<Result.Result<any, any>>>(
  self: T
) => [
  failures: Array<Result.Result.Failure<ReadonlyArray.Infer<T>>>,
  successes: Array<Result.Result.Success<ReadonlyArray.Infer<T>>>
]
```

[Source](https://effect.website/blob/main/src/Array.ts#L3949)

Since v2.0.0

# folding

## countBy

Computes the number of elements in an iterable that satisfy a predicate.

**When to use**

Use when you need to count how many elements of an iterable satisfy a
predicate.

**Details**

The predicate receives both the element and its index. Empty iterables return
`0`.

**Example** (Counting even numbers)

```ts
import { Array } from "effect"

Array.countBy([1, 2, 3, 4, 5], (n) => n % 2 === 0) // => 2
```

**See**

- `filter` — when you need the matching elements, not just the count

**Signature**

```ts
declare const countBy: {
  <A>(predicate: (a: NoInfer<A>, i: number) => boolean): (self: Iterable<A>) => number
  <A>(self: Iterable<A>, predicate: (a: A, i: number) => boolean): number
}
```

[Source](https://effect.website/blob/main/src/Array.ts#L4981)

Since v3.16.0

## getReadonlyReducerConcat

Returns a `Reducer` that combines `ReadonlyArray` values by concatenation.

**See**

- `makeReducerConcat` — mutable `Array` variant

**Signature**

```ts
declare const getReadonlyReducerConcat: <A>() => Reducer.Reducer<ReadonlyArray<A>>
```

[Source](https://effect.website/blob/main/src/Array.ts#L4939)

Since v4.0.0

## join

Joins string elements with a separator.

**Example** (Joining strings)

```ts
import { Array } from "effect"

Array.join(["a", "b", "c"], "-") // => "a-b-c"
```

**See**

- `intersperse` — insert separator elements without joining

**Signature**

```ts
declare const join: { (sep: string): (self: Iterable<string>) => string; (self: Iterable<string>, sep: string): string }
```

[Source](https://effect.website/blob/main/src/Array.ts#L4632)

Since v2.0.0

## makeReducerConcat

Returns a `Reducer` that combines `Array` values by concatenation.

**See**

- `getReadonlyReducerConcat` — readonly variant

**Signature**

```ts
declare const makeReducerConcat: <A>() => Reducer.Reducer<Array<A>>
```

[Source](https://effect.website/blob/main/src/Array.ts#L4951)

Since v4.0.0

## mapAccum

Maps over an array while threading an accumulator through each step, returning both the final state and the mapped array.

**When to use**

Use when you need to map while threading state through each element and keep
the final state.

**Details**

Combines `map` and `reduce` in a single pass. The callback receives the
current state, element, and index, and returns `[nextState, mappedValue]`.
The result is `[finalState, mappedArray]`. This can be used in both
data-first and data-last style.

**Example** (Running sum alongside mapped values)

```ts
import { Array } from "effect"

Array.mapAccum([1, 2, 3], 0, (acc, n) => [acc + n, acc + n]) // => [6, [1, 3, 6]]
```

**See**

- `scan` — when you only need the accumulated results (not the final state)
- `reduce` — when you only need the final accumulated value

**Signature**

```ts
declare const mapAccum: {
  <S, A, B, I extends Iterable<A> = Iterable<A>>(
    s: S,
    f: (s: S, a: ReadonlyArray.Infer<I>, i: number) => readonly [S, B]
  ): (self: I) => [state: S, mappedArray: ReadonlyArray.With<I, B>]
  <S, A, B, I extends Iterable<A> = Iterable<A>>(
    self: I,
    s: S,
    f: (s: S, a: ReadonlyArray.Infer<I>, i: number) => readonly [S, B]
  ): [state: S, mappedArray: ReadonlyArray.With<I, B>]
}
```

[Source](https://effect.website/blob/main/src/Array.ts#L4666)

Since v2.0.0

## reduce

Folds an iterable from left to right into a single value.

**When to use**

Use to combine all elements into one accumulated value from left to right.

**Details**

The function receives `(accumulator, element, index)`.

**Example** (Summing an array)

```ts
import { Array } from "effect"

Array.reduce([1, 2, 3], 0, (acc, n) => acc + n) // => 6
```

**See**

- `reduceRight` — fold from right to left
- `scan` — fold keeping intermediate values

**Signature**

```ts
declare const reduce: {
  <B, A>(b: B, f: (b: B, a: A, i: number) => B): (self: Iterable<A>) => B
  <A, B>(self: Iterable<A>, b: B, f: (b: B, a: A, i: number) => B): B
}
```

[Source](https://effect.website/blob/main/src/Array.ts#L3981)

Since v2.0.0

## reduceRight

Folds an iterable from right to left into a single value.

**When to use**

Use when you need to fold values from right to left.

**Details**

The function receives `(accumulator, element, index)`.

**Example** (Folding from right to left)

```ts
import { Array } from "effect"

Array.reduceRight([1, 2, 3], 0, (acc, n) => acc + n) // => 6
```

**See**

- `reduce` — fold from left to right
- `scanRight` — fold keeping intermediate values

**Signature**

```ts
declare const reduceRight: {
  <B, A>(b: B, f: (b: B, a: A, i: number) => B): (self: Iterable<A>) => B
  <A, B>(self: Iterable<A>, b: B, f: (b: B, a: A, i: number) => B): B
}
```

[Source](https://effect.website/blob/main/src/Array.ts#L4015)

Since v2.0.0

## scan

Folds left-to-right while keeping every intermediate accumulator value.

**When to use**

Use to compute a running accumulator where each intermediate value is needed.

**Details**

The output length is `input.length + 1` because it starts with the initial
value. The result is always a `NonEmptyArray`. Use `reduce` if you only need
the final accumulated value.

**Example** (Running totals)

```ts
import { Array } from "effect"

Array.scan([1, 2, 3, 4], 0, (acc, value) => acc + value) // => [0, 1, 3, 6, 10]
```

**See**

- `scanRight` — right-to-left scan
- `reduce` — fold without intermediate values

**Signature**

```ts
declare const scan: {
  <B, A>(b: B, f: (b: B, a: A) => B): (self: Iterable<A>) => NonEmptyArray<B>
  <A, B>(self: Iterable<A>, b: B, f: (b: B, a: A) => B): NonEmptyArray<B>
}
```

[Source](https://effect.website/blob/main/src/Array.ts#L714)

Since v2.0.0

## scanRight

Folds right-to-left while keeping every intermediate accumulator value.

**When to use**

Use to compute a running accumulator from right to left where each intermediate
value is needed.

**Details**

The output length is `input.length + 1` because it ends with the initial
value. The result is always a `NonEmptyArray`.

**Example** (Scanning running totals in reverse)

```ts
import { Array } from "effect"

Array.scanRight([1, 2, 3, 4], 0, (acc, value) => acc + value) // => [10, 9, 7, 4, 0]
```

**See**

- `scan` — left-to-right scan
- `reduceRight` — fold without intermediate values

**Signature**

```ts
declare const scanRight: {
  <B, A>(b: B, f: (b: B, a: A) => B): (self: Iterable<A>) => NonEmptyArray<B>
  <A, B>(self: Iterable<A>, b: B, f: (b: B, a: A) => B): NonEmptyArray<B>
}
```

[Source](https://effect.website/blob/main/src/Array.ts#L754)

Since v2.0.0

# getters

## drop

Removes the first `n` elements, creating a new array.

**When to use**

Use to keep the suffix of an iterable after skipping a fixed number of
leading elements.

**Details**

`n` is rounded down and clamped to `[0, length]`. `NaN` is treated as `0`.
When `n <= 0`, this returns a copy of the full array.

**Example** (Dropping from the start)

```ts
import { Array } from "effect"

Array.drop([1, 2, 3, 4, 5], 2) // => [3, 4, 5]
```

**See**

- `dropRight` for removing a fixed number of elements from the end
- `dropWhile` for removing a prefix based on a predicate instead of a fixed count
- `take` for keeping a fixed number of elements from the start

**Signature**

```ts
declare const drop: { (n: number): <A>(self: Iterable<A>) => Array<A>; <A>(self: Iterable<A>, n: number): Array<A> }
```

[Source](https://effect.website/blob/main/src/Array.ts#L1517)

Since v2.0.0

## dropRight

Removes the last `n` elements, creating a new array.

**When to use**

Use to remove the last `n` elements from an iterable.

**Details**

`n` is rounded down and clamped to `[0, length]`. `NaN` is treated as `0`.

**Example** (Dropping from the end)

```ts
import { Array } from "effect"

Array.dropRight([1, 2, 3, 4, 5], 2) // => [1, 2, 3]
```

**See**

- `drop` — remove from the start
- `takeRight` — keep from the end

**Signature**

```ts
declare const dropRight: {
  (n: number): <A>(self: Iterable<A>) => Array<A>
  <A>(self: Iterable<A>, n: number): Array<A>
}
```

[Source](https://effect.website/blob/main/src/Array.ts#L1550)

Since v2.0.0

## dropWhile

Drops elements from the start while the predicate holds, returning the rest.

**When to use**

Use to remove a leading prefix of elements that satisfy a predicate.

**Details**

The predicate receives `(element, index)`.

**Example** (Dropping while condition holds)

```ts
import { Array } from "effect"

Array.dropWhile([1, 2, 3, 4, 5], (x) => x < 4) // => [4, 5]
```

**See**

- `takeWhile` — keep the matching prefix instead
- `drop` — drop a fixed count

**Signature**

```ts
declare const dropWhile: {
  <A>(predicate: (a: NoInfer<A>, i: number) => boolean): (self: Iterable<A>) => Array<A>
  <A>(self: Iterable<A>, predicate: (a: A, i: number) => boolean): Array<A>
}
```

[Source](https://effect.website/blob/main/src/Array.ts#L1583)

Since v2.0.0

## dropWhileFilter

Drops elements from the start while a `Filter` succeeds.

**When to use**

Use when you need to drop a prefix from an iterable by computing a `Result`
per element instead of using a simple boolean predicate.

**Details**

The filter receives `(element, index)`. The result contains the remaining
original elements after the first filter failure.

**See**

- `dropWhile` for dropping a prefix with a simple boolean predicate
- `takeWhileFilter` for keeping only the matching prefix

**Signature**

```ts
declare const dropWhileFilter: {
  <A, B, X>(f: (input: NoInfer<A>, i: number) => Result.Result<B, X>): (self: Iterable<A>) => Array<A>
  <A, B, X>(self: Iterable<A>, f: (input: A, i: number) => Result.Result<B, X>): Array<A>
}
```

[Source](https://effect.website/blob/main/src/Array.ts#L1617)

Since v4.0.0

## get

Reads an element at the given index safely, returning `Option.some` or
`Option.none` if the index is out of bounds.

**When to use**

Use when you need to read an array element by index and handle an
out-of-bounds index as `Option.none`.

**Details**

The index is floored to an integer. This never throws.

**Example** (Accessing indexes safely)

```ts
import { Array, Option } from "effect"

Array.get([1, 2, 3], 1) // => Option.some(2)
Array.get([1, 2, 3], 10) // => Option.none()
```

**See**

- `getUnsafe` for indexed access that throws when the index is out of bounds
- `head` for reading the first element as an `Option`
- `last` for reading the last element as an `Option`

**Signature**

```ts
declare const get: {
  (index: number): <A>(self: ReadonlyArray<A>) => Option.Option<A>
  <A>(self: ReadonlyArray<A>, index: number): Option.Option<A>
}
```

[Source](https://effect.website/blob/main/src/Array.ts#L958)

Since v2.0.0

## head

Returns the first element of an array safely wrapped in `Option.some`, or
`Option.none` if the array is empty.

**When to use**

Use to safely get the first element of an array that may be empty.

**Example** (Getting the first element)

```ts
import { Array, Option } from "effect"

Array.head([1, 2, 3]) // => Option.some(1)
Array.head([]) // => Option.none()
```

**See**

- `headNonEmpty` — direct access when array is known non-empty
- `last` — get the last element

**Signature**

```ts
declare const head: <A>(self: ReadonlyArray<A>) => Option.Option<A>
```

[Source](https://effect.website/blob/main/src/Array.ts#L1090)

Since v2.0.0

## headNonEmpty

Returns the first element of a `NonEmptyReadonlyArray` directly (no `Option`
wrapper).

**When to use**

Use to get the first element without `Option` wrapping when the array is known
to be non-empty.

**Example** (Getting the head of a non-empty array)

```ts
import { Array } from "effect"

Array.headNonEmpty([1, 2, 3, 4]) // => 1
```

**See**

- `head` — safe version for possibly-empty arrays

**Signature**

```ts
declare const headNonEmpty: <A>(self: NonEmptyReadonlyArray<A>) => A
```

[Source](https://effect.website/blob/main/src/Array.ts#L1114)

Since v2.0.0

## init

Returns all elements except the last safely, wrapped in an `Option`.

**When to use**

Use to safely get all elements before the last when the iterable may be empty.

**Details**

Allocates a new array via `slice(0, -1)`. Empty inputs return
`Option.none()`.

**Example** (Getting init)

```ts
import { Array, Option } from "effect"

Array.init([1, 2, 3, 4]) // => Option.some([1, 2, 3])
Array.init([]) // => Option.none()
```

**See**

- `initNonEmpty` — when the array is known non-empty
- `tail` — all elements except the first

**Signature**

```ts
declare const init: <A>(self: Iterable<A>) => Option.Option<Array<A>>
```

[Source](https://effect.website/blob/main/src/Array.ts#L1247)

Since v2.0.0

## initNonEmpty

Returns all elements except the last of a `NonEmptyReadonlyArray`.

**When to use**

Use to get all elements before the last when the array is known to be non-empty.

**Example** (Getting init of a non-empty array)

```ts
import { Array } from "effect"

Array.initNonEmpty([1, 2, 3, 4]) // => [1, 2, 3]
```

**See**

- `init` — safe version for possibly-empty arrays
- `tailNonEmpty` — all elements except the first

**Signature**

```ts
declare const initNonEmpty: <A>(self: NonEmptyReadonlyArray<A>) => Array<A>
```

[Source](https://effect.website/blob/main/src/Array.ts#L1273)

Since v2.0.0

## last

Returns the last element of an array safely wrapped in `Option.some`, or
`Option.none` if the array is empty.

**When to use**

Use to safely get the last element of an array that may be empty.

**Example** (Getting the last element)

```ts
import { Array, Option } from "effect"

Array.last([1, 2, 3]) // => Option.some(3)
Array.last([]) // => Option.none()
```

**See**

- `lastNonEmpty` — direct access when array is known non-empty
- `head` — get the first element

**Signature**

```ts
declare const last: <A>(self: ReadonlyArray<A>) => Option.Option<A>
```

[Source](https://effect.website/blob/main/src/Array.ts#L1139)

Since v2.0.0

## lastNonEmpty

Returns the last element of a `NonEmptyReadonlyArray` directly (no `Option`
wrapper).

**When to use**

Use to get the last element without `Option` wrapping when the array is known
to be non-empty.

**Example** (Getting the last of a non-empty array)

```ts
import { Array } from "effect"

Array.lastNonEmpty([1, 2, 3, 4]) // => 4
```

**See**

- `last` — safe version for possibly-empty arrays

**Signature**

```ts
declare const lastNonEmpty: <A>(self: NonEmptyReadonlyArray<A>) => A
```

[Source](https://effect.website/blob/main/src/Array.ts#L1164)

Since v2.0.0

## length

Returns the number of elements in a `ReadonlyArray`.

**When to use**

Use when you need length as a composable function rather than a property access.

**Example** (Getting the length)

```ts
import { Array } from "effect"

Array.length([1, 2, 3]) // => 3
```

**Signature**

```ts
declare const length: <A>(self: ReadonlyArray<A>) => number
```

[Source](https://effect.website/blob/main/src/Array.ts#L910)

Since v2.0.0

## max

Returns the maximum element of a non-empty array according to the given
`Order`.

**Example** (Finding the maximum)

```ts
import { Array, Order } from "effect"

Array.max([3, 1, 2], Order.Number) // => 3
```

**See**

- `min` — find the minimum
- `sort` — sort the entire array

**Signature**

```ts
declare const max: {
  <A>(O: Order.Order<A>): (self: NonEmptyReadonlyArray<A>) => A
  <A>(self: NonEmptyReadonlyArray<A>, O: Order.Order<A>): A
}
```

[Source](https://effect.website/blob/main/src/Array.ts#L4349)

Since v2.0.0

## min

Returns the minimum element of a non-empty array according to the given
`Order`.

**Example** (Finding the minimum)

```ts
import { Array, Order } from "effect"

Array.min([3, 1, 2], Order.Number) // => 1
```

**See**

- `max` — find the maximum
- `sort` — sort the entire array

**Signature**

```ts
declare const min: {
  <A>(O: Order.Order<A>): (self: NonEmptyReadonlyArray<A>) => A
  <A>(self: NonEmptyReadonlyArray<A>, O: Order.Order<A>): A
}
```

[Source](https://effect.website/blob/main/src/Array.ts#L4326)

Since v2.0.0

## tail

Returns all elements except the first safely, wrapped in an `Option`.

**When to use**

Use to safely get all elements after the first when the iterable may be empty.

**Details**

Allocates a new array via `slice(1)`. Empty inputs return `Option.none()`.

**Example** (Getting the tail)

```ts
import { Array, Option } from "effect"

Array.tail([1, 2, 3, 4]) // => Option.some([2, 3, 4])
Array.tail([]) // => Option.none()
```

**See**

- `tailNonEmpty` — when the array is known non-empty
- `init` — all elements except the last

**Signature**

```ts
declare const tail: <A>(self: Iterable<A>) => Option.Option<Array<A>>
```

[Source](https://effect.website/blob/main/src/Array.ts#L1192)

Since v2.0.0

## tailNonEmpty

Returns all elements except the first of a `NonEmptyReadonlyArray`.

**When to use**

Use to get all elements after the first when the array is known to be non-empty.

**Example** (Getting the tail of a non-empty array)

```ts
import { Array } from "effect"

Array.tailNonEmpty([1, 2, 3, 4]) // => [2, 3, 4]
```

**See**

- `tail` — safe version for possibly-empty arrays
- `initNonEmpty` — all elements except the last

**Signature**

```ts
declare const tailNonEmpty: <A>(self: NonEmptyReadonlyArray<A>) => Array<A>
```

[Source](https://effect.website/blob/main/src/Array.ts#L1218)

Since v2.0.0

## take

Keeps the first `n` elements, creating a new array.

**When to use**

Use to keep up to the first `n` elements from an iterable as a new array.

**Details**

`n` is rounded down and clamped to `[0, length]`. `NaN` is treated as `0`.
Returns an empty array when `n <= 0`.

**Example** (Taking from the start)

```ts
import { Array } from "effect"

Array.take([1, 2, 3, 4, 5], 3) // => [1, 2, 3]
```

**See**

- `takeRight` for keeping elements from the end
- `takeWhile` for keeping an initial prefix while a predicate holds
- `drop` for removing elements from the start

**Signature**

```ts
declare const take: { (n: number): <A>(self: Iterable<A>) => Array<A>; <A>(self: Iterable<A>, n: number): Array<A> }
```

[Source](https://effect.website/blob/main/src/Array.ts#L1304)

Since v2.0.0

## takeRight

Keeps the last `n` elements, creating a new array.

**When to use**

Use to keep the last `n` elements of an iterable.

**Details**

`n` is rounded down and clamped to `[0, length]`. `NaN` is treated as `0`.
Returns an empty array when `n <= 0`.

**Example** (Taking from the end)

```ts
import { Array } from "effect"

Array.takeRight([1, 2, 3, 4, 5], 3) // => [3, 4, 5]
```

**See**

- `take` — keep from the start
- `dropRight` — remove from the end

**Signature**

```ts
declare const takeRight: {
  (n: number): <A>(self: Iterable<A>) => Array<A>
  <A>(self: Iterable<A>, n: number): Array<A>
}
```

[Source](https://effect.website/blob/main/src/Array.ts#L1338)

Since v2.0.0

## takeWhile

Takes elements from the start while the predicate holds, stopping at the
first element that fails.

**When to use**

Use to keep the leading elements of an iterable while each element satisfies
a predicate, returning the retained prefix as an array.

**Details**

Supports refinements for type narrowing. The predicate receives
`(element, index)`.

**Example** (Taking while condition holds)

```ts
import { Array } from "effect"

Array.takeWhile([1, 3, 2, 4, 1, 2], (x) => x < 4) // => [1, 3, 2]
```

**See**

- `take` for keeping a fixed number of leading elements
- `dropWhile` for removing the matching prefix and keeping the rest
- `span` for splitting the matching prefix from the remaining elements

**Signature**

```ts
declare const takeWhile: {
  <A, B extends A>(refinement: (a: NoInfer<A>, i: number) => a is B): (self: Iterable<A>) => Array<B>
  <A>(predicate: (a: NoInfer<A>, i: number) => boolean): (self: Iterable<A>) => Array<A>
  <A, B extends A>(self: Iterable<A>, refinement: (a: A, i: number) => a is B): Array<B>
  <A>(self: Iterable<A>, predicate: (a: A, i: number) => boolean): Array<A>
}
```

[Source](https://effect.website/blob/main/src/Array.ts#L1376)

Since v2.0.0

## takeWhileFilter

Takes elements from the start while a `Filter` succeeds, collecting transformed values.

**When to use**

Use when you need to take a prefix from an iterable while a function can
successfully extract or transform elements, stopping at the first element
that produces a failure result.

**Details**

The filter receives `(element, index)` and processing stops at the first
filter failure.

**See**

- `takeWhile` for taking a prefix based on a boolean predicate

**Signature**

```ts
declare const takeWhileFilter: {
  <A, B, X>(f: (input: NoInfer<A>, i: number) => Result.Result<B, X>): (self: Iterable<A>) => Array<B>
  <A, B, X>(self: Iterable<A>, f: (input: NoInfer<A>, i: number) => Result.Result<B, X>): Array<B>
}
```

[Source](https://effect.website/blob/main/src/Array.ts#L1413)

Since v4.0.0

# grouping

## group

Groups consecutive equal elements using `Equal.equivalence()`.

**When to use**

Use when you already have adjacent equal values and Effect's default equality
is the right comparison.

**Details**

Only adjacent elements are grouped.

**Example** (Grouping adjacent equal elements)

```ts
import { Array } from "effect"

Array.group([1, 1, 2, 2, 2, 3, 1]) // => [[1, 1], [2, 2, 2], [3], [1]]
```

**See**

- `groupWith` — use custom equality
- `groupBy` — group by a key function into a record

**Signature**

```ts
declare const group: <A>(self: NonEmptyReadonlyArray<A>) => NonEmptyArray<NonEmptyArray<A>>
```

[Source](https://effect.website/blob/main/src/Array.ts#L3045)

Since v2.0.0

## groupBy

Groups elements into a record by a key-returning function. Each key maps
to a `NonEmptyArray` of elements that produced that key.

**When to use**

Use to build buckets of elements indexed by a computed string or symbol key.

**Details**

Unlike `group` and `groupWith`, elements do not need to be adjacent to be
grouped together. The key function must return a `string` or `symbol`.

**Gotchas**

When the key function returns a finite union of string literals or unique
symbols, the result preserves those keys as optional properties because the
input may not produce every key. Open `string` and `symbol` key types retain
their record index signatures.

**Example** (Grouping by a property)

```ts
import { Array } from "effect"

const people = [
  { name: "Alice", group: "A" },
  { name: "Bob", group: "B" },
  { name: "Charlie", group: "A" }
]

Object.keys(Array.groupBy(people, (person) => person.group)).join(",") // => "A,B"
```

**See**

- `group` — group adjacent equal elements
- `groupWith` — group adjacent elements by custom equality

**Signature**

```ts
declare const groupBy: {
  <A, K extends string | symbol>(
    f: (a: A) => K
  ): (self: Iterable<A>) => Record.ReadonlyRecord.GroupByResult<K, NonEmptyArray<A>>
  <A, K extends string | symbol>(
    self: Iterable<A>,
    f: (a: A) => K
  ): Record.ReadonlyRecord.GroupByResult<K, NonEmptyArray<A>>
}
```

[Source](https://effect.website/blob/main/src/Array.ts#L3089)

Since v2.0.0

## groupWith

Groups consecutive equal elements using a custom equivalence function.

**When to use**

Use when you already have a non-empty array arranged so matching elements are
adjacent and need a custom equivalence function.

**Details**

Only adjacent elements are grouped. Non-adjacent duplicates stay separate.
Requires a `NonEmptyReadonlyArray`.

**Example** (Grouping consecutive equal elements)

```ts
import { Array } from "effect"

Array.groupWith(["a", "a", "b", "b", "b", "c", "a"], (x, y) => x === y) // => [["a", "a"], ["b", "b", "b"], ["c"], ["a"]]
```

**See**

- `group` for grouping adjacent elements with `Equal.equivalence()`
- `groupBy` for grouping all elements into a record by key, regardless of adjacency

**Signature**

```ts
declare const groupWith: {
  <A>(isEquivalent: (self: A, that: A) => boolean): (self: NonEmptyReadonlyArray<A>) => NonEmptyArray<NonEmptyArray<A>>
  <A>(self: NonEmptyReadonlyArray<A>, isEquivalent: (self: A, that: A) => boolean): NonEmptyArray<NonEmptyArray<A>>
}
```

[Source](https://effect.website/blob/main/src/Array.ts#L2997)

Since v2.0.0

# guards

## every

Checks whether all elements satisfy the predicate. Supports refinements for
type narrowing.

**When to use**

Use to check whether every array element satisfies a predicate, including
refinement-based type narrowing.

**Example** (Testing all elements)

```ts
import { Array } from "effect"

Array.every([2, 4, 6], (x) => x % 2 === 0) // => true
Array.every([2, 3, 6], (x) => x % 2 === 0) // => false
```

**See**

- `some` — test if any element matches

**Signature**

```ts
declare const every: {
  <A, B extends A>(
    refinement: (a: NoInfer<A>, i: number) => a is B
  ): (self: ReadonlyArray<A>) => self is ReadonlyArray<B>
  <A>(predicate: (a: NoInfer<A>, i: number) => boolean): (self: ReadonlyArray<A>) => boolean
  <A, B extends A>(self: ReadonlyArray<A>, refinement: (a: A, i: number) => a is B): self is ReadonlyArray<B>
  <A>(self: ReadonlyArray<A>, predicate: (a: A, i: number) => boolean): boolean
}
```

[Source](https://effect.website/blob/main/src/Array.ts#L4231)

Since v2.0.0

## isArray

Checks whether a value is an `Array`.

**When to use**

Use to verify a value is a mutable array, narrowing its type to `Array<unknown>`.

**Details**

Acts as a type guard narrowing the input to `Array<unknown>` and delegates to
`globalThis.Array.isArray`.

**Example** (Type-guarding an unknown value)

```ts
import { Array } from "effect"

Array.isArray(null) // => false
Array.isArray([1, 2, 3]) // => true
```

**See**

- `isArrayEmpty` — check for an empty array
- `isArrayNonEmpty` — check for a non-empty array

**Signature**

```ts
declare const isArray: { (self: unknown): self is Array<unknown>; <T>(self: T): self is Extract<T, ReadonlyArray<any>> }
```

[Source](https://effect.website/blob/main/src/Array.ts#L794)

Since v2.0.0

## isArrayEmpty

Checks whether a mutable `Array` is empty, narrowing the type to `[]`.

**Example** (Checking for an empty array)

```ts
import { Array } from "effect"

Array.isArrayEmpty([]) // => true
Array.isArrayEmpty([1, 2, 3]) // => false
```

**See**

- `isReadonlyArrayEmpty` — readonly variant
- `isArrayNonEmpty` — opposite check

**Signature**

```ts
declare const isArrayEmpty: <A>(self: Array<A>) => self is []
```

[Source](https://effect.website/blob/main/src/Array.ts#L817)

Since v4.0.0

## isArrayNonEmpty

Checks whether a mutable `Array` is non-empty, narrowing the type to
`NonEmptyArray`.

**When to use**

Use when you need the narrowed value to remain a mutable `Array` after proving
it has at least one element.

**Example** (Checking for a non-empty array)

```ts
import { Array } from "effect"

Array.isArrayNonEmpty([]) // => false
Array.isArrayNonEmpty([1, 2, 3]) // => true
```

**See**

- `isReadonlyArrayNonEmpty` — readonly variant
- `isArrayEmpty` — opposite check

**Signature**

```ts
declare const isArrayNonEmpty: <A>(self: Array<A>) => self is NonEmptyArray<A>
```

[Source](https://effect.website/blob/main/src/Array.ts#L863)

Since v4.0.0

## isReadonlyArrayEmpty

Checks whether a `ReadonlyArray` is empty, narrowing the type to `readonly []`.

**Example** (Checking for an empty readonly array)

```ts
import { Array } from "effect"

Array.isReadonlyArrayEmpty([]) // => true
Array.isReadonlyArrayEmpty([1, 2, 3]) // => false
```

**See**

- `isArrayEmpty` — mutable variant
- `isReadonlyArrayNonEmpty` — opposite check

**Signature**

```ts
declare const isReadonlyArrayEmpty: <A>(self: ReadonlyArray<A>) => self is readonly []
```

[Source](https://effect.website/blob/main/src/Array.ts#L837)

Since v4.0.0

## isReadonlyArrayNonEmpty

Checks whether a `ReadonlyArray` is non-empty, narrowing the type to
`NonEmptyReadonlyArray`.

**When to use**

Use when you need to prove a readonly array has at least one element without
requiring mutable array methods afterward.

**Example** (Checking for a non-empty readonly array)

```ts
import { Array } from "effect"

Array.isReadonlyArrayNonEmpty([]) // => false
Array.isReadonlyArrayNonEmpty([1, 2, 3]) // => true
```

**See**

- `isArrayNonEmpty` — mutable variant
- `isReadonlyArrayEmpty` — opposite check

**Signature**

```ts
declare const isReadonlyArrayNonEmpty: <A>(self: ReadonlyArray<A>) => self is NonEmptyReadonlyArray<A>
```

[Source](https://effect.website/blob/main/src/Array.ts#L889)

Since v4.0.0

## some

Checks whether at least one element satisfies the predicate. Narrows the type
to `NonEmptyReadonlyArray` on success.

**Example** (Testing for any match)

```ts
import { Array } from "effect"

Array.some([1, 3, 4], (x) => x % 2 === 0) // => true
Array.some([1, 3, 5], (x) => x % 2 === 0) // => false
```

**See**

- `every` — test if all elements match
- `contains` — test for a specific value

**Signature**

```ts
declare const some: {
  <A>(predicate: (a: NoInfer<A>, i: number) => boolean): (self: ReadonlyArray<A>) => self is NonEmptyReadonlyArray<A>
  <A>(self: ReadonlyArray<A>, predicate: (a: A, i: number) => boolean): self is NonEmptyReadonlyArray<A>
}
```

[Source](https://effect.website/blob/main/src/Array.ts#L4263)

Since v2.0.0

# instances

## makeEquivalence

Creates an `Equivalence` for arrays based on an element `Equivalence`. Two
arrays are equivalent when they have the same length and all elements are
pairwise equivalent.

**Example** (Comparing arrays for equality)

```ts
import { Array } from "effect"

const eq = Array.makeEquivalence<number>((a, b) => a === b)

eq([1, 2, 3], [1, 2, 3]) // => true
```

**See**

- `makeOrder` — create an ordering for arrays

**Signature**

```ts
declare const makeEquivalence: <A>(
  isEquivalent: Equivalence.Equivalence<A>
) => Equivalence.Equivalence<ReadonlyArray<A>>
```

[Source](https://effect.website/blob/main/src/Array.ts#L4430)

Since v4.0.0

## makeOrder

Creates an `Order` for arrays based on an element `Order`. Arrays are
compared element-wise; if all compared elements are equal, shorter arrays
come first.

**Example** (Comparing arrays)

```ts
import { Array, Order } from "effect"

const arrayOrder = Array.makeOrder(Order.Number)

arrayOrder([1, 2], [1, 3]) // => -1
```

**See**

- `makeEquivalence` — create an equivalence for arrays

**Signature**

```ts
declare const makeOrder: <A>(O: Order.Order<A>) => Order.Order<ReadonlyArray<A>>
```

[Source](https://effect.website/blob/main/src/Array.ts#L4408)

Since v4.0.0

# lifting

## liftNullishOr

Lifts a nullable-returning function into one that returns an array:
`null`/`undefined` becomes `[]`, anything else becomes `[value]`.

**Example** (Lifting a nullable function)

```ts
import { Array } from "effect"

const parseNumber = Array.liftNullishOr((s: string) => {
  const n = Number(s)
  return isNaN(n) ? null : n
})

parseNumber("123") // => [123]
parseNumber("abc") // => []
```

**See**

- `fromNullishOr` — convert a single nullable value
- `liftOption` — lift an Option-returning function

**Signature**

```ts
declare const liftNullishOr: <A extends Array<unknown>, B>(f: (...a: A) => B) => (...a: A) => Array<NonNullable<B>>
```

[Source](https://effect.website/blob/main/src/Array.ts#L4133)

Since v4.0.0

## liftOption

Lifts an `Option`-returning function into one that returns an array:
`Some(a)` becomes `[a]`, `None` becomes `[]`.

**When to use**

Use when an optional parser or lookup should participate in array pipelines
as zero-or-one results.

**Example** (Lifting an Option function)

```ts
import { Array, Option } from "effect"

const parseNumber = Array.liftOption((s: string) => {
  const n = Number(s)
  return isNaN(n) ? Option.none() : Option.some(n)
})

parseNumber("123") // => [123]
parseNumber("abc") // => []
```

**See**

- `liftPredicate` — lift a boolean predicate
- `liftResult` — lift a Result-returning function

**Signature**

```ts
declare const liftOption: <A extends Array<unknown>, B>(f: (...a: A) => Option.Option<B>) => (...a: A) => Array<B>
```

[Source](https://effect.website/blob/main/src/Array.ts#L4078)

Since v2.0.0

## liftPredicate

Lifts a predicate into an array: returns `[value]` if the predicate holds,
`[]` otherwise.

**Example** (Wrapping values conditionally)

```ts
import { Array } from "effect"

const fromEven = Array.liftPredicate((n: number) => n % 2 === 0)

fromEven(1) // => []
fromEven(2) // => [2]
```

**See**

- `liftOption` — lift an Option-returning function

**Signature**

```ts
declare const liftPredicate: {
  <A, B extends A>(refinement: Predicate.Refinement<A, B>): (a: A) => Array<B>
  <A>(predicate: Predicate.Predicate<A>): <B extends A>(b: B) => Array<B>
}
```

[Source](https://effect.website/blob/main/src/Array.ts#L4044)

Since v2.0.0

## liftResult

Lifts a `Result`-returning function into one that returns an array: failures
produce `[]`, successes produce `[value]`.

**When to use**

Use when a fallible parser or lookup should participate in array pipelines as
zero-or-one results and the failure value should be discarded.

**Example** (Lifting a Result function)

```ts
import { Array, Result } from "effect"

const parseNumber = (s: string): Result.Result<number, Error> =>
  isNaN(Number(s)) ? Result.fail(new Error("Not a number")) : Result.succeed(Number(s))

const liftedParseNumber = Array.liftResult(parseNumber)

liftedParseNumber("42") // => [42]
liftedParseNumber("not a number") // => []
```

**See**

- `liftOption` — lift an Option-returning function
- `liftPredicate` — lift a boolean predicate

**Signature**

```ts
declare const liftResult: <A extends Array<unknown>, E, B>(f: (...a: A) => Result.Result<B, E>) => (...a: A) => Array<B>
```

[Source](https://effect.website/blob/main/src/Array.ts#L4200)

Since v4.0.0

# mapping

## bindTo

Wraps each array element in an object with the given key, starting a do-notation scope.

**When to use**

Use when you already have an array and want to start a do-notation pipeline
by naming each element.

**Details**

Equivalent to `Array.map(self, (a) => ({ [tag]: a }))`. This is an
alternative to starting with `Do` plus `bind` when you already have an array.

**Example** (Naming an existing array)

```ts
import { Array } from "effect"

Array.bindTo([1, 2, 3], "x") // => [{ x: 1 }, { x: 2 }, { x: 3 }]
```

**See**

- `Do` — start with an empty scope
- `bind` — add another array variable to the scope

**Signature**

```ts
declare const bindTo: {
  <N extends string>(tag: N): <A>(self: ReadonlyArray<A>) => Array<{ [K in N]: A }>
  <A, N extends string>(self: ReadonlyArray<A>, tag: N): Array<{ [K in N]: A }>
}
```

[Source](https://effect.website/blob/main/src/Array.ts#L4876)

Since v3.2.0

## extend

Applies a function to each suffix of the array (starting from each index),
collecting the results.

**When to use**

Use when you need to compute a result from every suffix of an array, such as
cumulative aggregations from each position.

**Details**

For index `i`, the function receives `self.slice(i)`.

**Example** (Computing suffix lengths)

```ts
import { Array } from "effect"

Array.extend([1, 2, 3], (as) => as.length) // => [3, 2, 1]
```

**See**

- `scan` for keeping intermediate accumulator values during a fold

**Signature**

```ts
declare const extend: {
  <A, B>(f: (as: ReadonlyArray<A>) => B): (self: ReadonlyArray<A>) => Array<B>
  <A, B>(self: ReadonlyArray<A>, f: (as: ReadonlyArray<A>) => B): Array<B>
}
```

[Source](https://effect.website/blob/main/src/Array.ts#L4300)

Since v2.0.0

## let

Adds a computed plain value to the do-notation scope without introducing a new array dimension.

**When to use**

Use when each do-notation branch needs a derived field from the current
bindings without multiplying the number of branches.

**Details**

Unlike `bind`, the callback returns a single value instead of an array, so
no cartesian product occurs. Use this for derived or intermediate values
that depend on previously bound variables.

**Example** (Adding a computed value)

```ts
import { Array, pipe } from "effect"

pipe(
  Array.Do,
  Array.bind("x", () => [1, 2, 3]),
  Array.let("doubled", ({ x }) => x * 2)
) // => [{ x: 1, doubled: 2 }, { x: 2, doubled: 4 }, { x: 3, doubled: 6 }]
```

**See**

- `Do` — start a do-notation pipeline
- `bind` — introduce an array variable (produces cartesian product)

**Signature**

```ts
declare const let: {
  <N extends string, B, A extends object>(
    tag: Exclude<N, keyof A>,
    f: (a: NoInfer<A>) => B
  ): (self: ReadonlyArray<A>) => Array<{ [K in N | keyof A]: K extends keyof A ? A[K] : B }>
  <N extends string, A extends object, B>(
    self: ReadonlyArray<A>,
    tag: Exclude<N, keyof A>,
    f: (a: NoInfer<A>) => B
  ): Array<{ [K in N | keyof A]: K extends keyof A ? A[K] : B }>
}
```

[Source](https://effect.website/blob/main/src/Array.ts#L4926)

Since v3.2.0

## map

Transforms each element using a function, returning a new array.

**When to use**

Use to transform each element independently while preserving the array shape.

**Details**

The function receives `(element, index)`. The return type preserves
`NonEmptyArray`.

**Example** (Doubling values)

```ts
import { Array } from "effect"

Array.map([1, 2, 3], (x) => x * 2) // => [2, 4, 6]
```

**See**

- `flatMap` — map and flatten

**Signature**

```ts
declare const map: {
  <S extends ReadonlyArray<any>, B>(
    f: (a: ReadonlyArray.Infer<S>, i: number) => B
  ): (self: S) => ReadonlyArray.With<S, B>
  <S extends ReadonlyArray<any>, B>(self: S, f: (a: ReadonlyArray.Infer<S>, i: number) => B): ReadonlyArray.With<S, B>
}
```

[Source](https://effect.website/blob/main/src/Array.ts#L3589)

Since v2.0.0

# models

## NonEmptyArray (type alias)

A mutable array guaranteed to have at least one element.

**When to use**

Use when mutation is acceptable and non-emptiness must be tracked at the type
level.

**Details**

This is the mutable counterpart of `NonEmptyReadonlyArray`. Most Array
module functions return `NonEmptyArray` when the result is guaranteed
non-empty.

**Example** (Typing a mutable non-empty array)

```ts
import type { Array } from "effect"

const nonEmpty: Array.NonEmptyArray<number> = [1, 2, 3]
nonEmpty.push(4)

nonEmpty // => [1, 2, 3, 4]
```

**See**

- `NonEmptyReadonlyArray` — readonly counterpart
- `isArrayNonEmpty` — narrow an `Array` to this type

**Signature**

```ts
type NonEmptyArray<A> = [A, ...Array<A>]
```

[Source](https://effect.website/blob/main/src/Array.ts#L121)

Since v2.0.0

## NonEmptyReadonlyArray (type alias)

A readonly array guaranteed to have at least one element.

**When to use**

Use when non-emptiness must be tracked at the type level while preventing mutation.
Many Array module functions accept or return this type.

**Example** (Typing a non-empty array)

```ts
import type { Array } from "effect"

const nonEmpty: Array.NonEmptyReadonlyArray<number> = [1, 2, 3]
const head: number = nonEmpty[0] // guaranteed to exist

head // => 1
```

**See**

- `NonEmptyArray` — mutable counterpart
- `isReadonlyArrayNonEmpty` — narrow a `ReadonlyArray` to this type

**Signature**

```ts
type NonEmptyReadonlyArray<A> = readonly [A, ...Array<A>]
```

[Source](https://effect.website/blob/main/src/Array.ts#L88)

Since v2.0.0

# pattern matching

## match

Pattern-matches on an array, handling empty and non-empty cases separately.

**When to use**

Use when you need to branch on whether an array is empty.

**Details**

`onNonEmpty` receives a `NonEmptyReadonlyArray`. Supports both data-first and
data-last usage.

**Example** (Branching on emptiness)

```ts
import { Array } from "effect"

const describe = Array.match({
  onEmpty: () => "empty",
  onNonEmpty: ([head, ...tail]) => `head: ${head}, tail: ${tail.length}`
})

describe([]) // => "empty"
describe([1, 2, 3]) // => "head: 1, tail: 2"
```

**See**

- `matchLeft` — destructures into head + tail
- `matchRight` — destructures into init + last

**Signature**

```ts
declare const match: {
  <B, A, C = B>(options: {
    readonly onEmpty: LazyArg<B>
    readonly onNonEmpty: (self: NonEmptyReadonlyArray<A>) => C
  }): (self: ReadonlyArray<A>) => B | C
  <A, B, C = B>(
    self: ReadonlyArray<A>,
    options: { readonly onEmpty: LazyArg<B>; readonly onNonEmpty: (self: NonEmptyReadonlyArray<A>) => C }
  ): B | C
}
```

[Source](https://effect.website/blob/main/src/Array.ts#L423)

Since v2.0.0

## matchLeft

Pattern-matches on an array from the left, providing the first element and
the remaining elements separately.

**When to use**

Use when you need to branch on an array and handle the non-empty case as the
first element plus the remaining elements.

**Details**

`onNonEmpty` receives `(head, tail)` where `tail` is the rest of the array.

**Example** (Destructuring head and tail)

```ts
import { Array } from "effect"

const matchLeft = Array.matchLeft({
  onEmpty: () => "empty",
  onNonEmpty: (head, tail) => `head: ${head}, tail: ${tail.length}`
})

matchLeft([]) // => "empty"
matchLeft([1, 2, 3]) // => "head: 1, tail: 2"
```

**See**

- `match` — receives the full non-empty array
- `matchRight` — destructures into init + last

**Signature**

```ts
declare const matchLeft: {
  <B, A, C = B>(options: {
    readonly onEmpty: LazyArg<B>
    readonly onNonEmpty: (head: A, tail: Array<A>) => C
  }): (self: ReadonlyArray<A>) => B | C
  <A, B, C = B>(
    self: ReadonlyArray<A>,
    options: { readonly onEmpty: LazyArg<B>; readonly onNonEmpty: (head: A, tail: Array<A>) => C }
  ): B | C
}
```

[Source](https://effect.website/blob/main/src/Array.ts#L478)

Since v2.0.0

## matchRight

Pattern-matches on an array from the right, providing all elements except the
last and the last element separately.

**When to use**

Use when you need to branch on an array and handle the non-empty case as the
elements before the last plus the last element.

**Details**

`onNonEmpty` receives `(init, last)` where `init` is everything but the last element.

**Example** (Destructuring init and last)

```ts
import { Array } from "effect"

const matchRight = Array.matchRight({
  onEmpty: () => "empty",
  onNonEmpty: (init, last) => `init: ${init.length}, last: ${last}`
})

matchRight([]) // => "empty"
matchRight([1, 2, 3]) // => "init: 2, last: 3"
```

**See**

- `match` — receives the full non-empty array
- `matchLeft` — destructures into head + tail

**Signature**

```ts
declare const matchRight: {
  <B, A, C = B>(options: {
    readonly onEmpty: LazyArg<B>
    readonly onNonEmpty: (init: Array<A>, last: A) => C
  }): (self: ReadonlyArray<A>) => B | C
  <A, B, C = B>(
    self: ReadonlyArray<A>,
    options: { readonly onEmpty: LazyArg<B>; readonly onNonEmpty: (init: Array<A>, last: A) => C }
  ): B | C
}
```

[Source](https://effect.website/blob/main/src/Array.ts#L533)

Since v2.0.0

# predicates

## contains

Checks whether an array contains a value, using `Equal.equivalence()` for
comparison.

**When to use**

Use to check whether an iterable contains a value using Effect's default
equality instead of providing a comparison function.

**Example** (Checking membership)

```ts
import { Array, pipe } from "effect"

pipe(["a", "b", "c", "d"], Array.contains("c")) // => true
```

**See**

- `containsWith` — use custom equality

**Signature**

```ts
declare const contains: { <A>(a: A): (self: Iterable<A>) => boolean; <A>(self: Iterable<A>, a: A): boolean }
```

[Source](https://effect.website/blob/main/src/Array.ts#L2588)

Since v2.0.0

## containsWith

Returns a membership-test function using a custom equivalence.

**When to use**

Use when checking membership with caller-provided equality instead of
`Equal.equivalence()`.

**Example** (Checking with custom equality)

```ts
import { Array, pipe } from "effect"

const containsNumber = Array.containsWith((a: number, b: number) => a === b)

pipe([1, 2, 3, 4], containsNumber(3)) // => true
```

**See**

- `contains` for the `Equal.equivalence()` variant

**Signature**

```ts
declare const containsWith: <A>(isEquivalent: (self: A, that: A) => boolean) => {
  (a: A): (self: Iterable<A>) => boolean
  (self: Iterable<A>, a: A): boolean
}
```

[Source](https://effect.website/blob/main/src/Array.ts#L2553)

Since v2.0.0

# searching

## findFirst

Returns the first element matching a predicate, refinement, or mapping
function, wrapped in `Option`.

**When to use**

Use to scan an iterable in iteration order and return the first selected
element or mapped value as an `Option`.

**Details**

Accepts a predicate `(a, i) => boolean`, a refinement, or a function
`(a, i) => Option<B>` for simultaneous find-and-transform. If no element
matches, this returns `Option.none()`.

**Example** (Finding the first match)

```ts
import { Array, Option } from "effect"

Array.findFirst([1, 2, 3, 4, 5], (x) => x > 3) // => Option.some(4)
```

**See**

- `findLast` — search from the end
- `findFirstIndex` — get the index instead
- `findFirstWithIndex` — get both element and index

**Signature**

```ts
declare const findFirst: {
  <A, B>(f: (a: NoInfer<A>, i: number) => Option.Option<B>): (self: Iterable<A>) => Option.Option<B>
  <A, B extends A>(refinement: (a: NoInfer<A>, i: number) => a is B): (self: Iterable<A>) => Option.Option<B>
  <A>(predicate: (a: NoInfer<A>, i: number) => boolean): (self: Iterable<A>) => Option.Option<A>
  <A, B>(self: Iterable<A>, f: (a: A, i: number) => Option.Option<B>): Option.Option<B>
  <A, B extends A>(self: Iterable<A>, refinement: (a: A, i: number) => a is B): Option.Option<B>
  <A>(self: Iterable<A>, predicate: (a: A, i: number) => boolean): Option.Option<A>
}
```

[Source](https://effect.website/blob/main/src/Array.ts#L1737)

Since v2.0.0

## findFirstIndex

Returns the index of the first element matching the predicate, wrapped in an
`Option`.

**When to use**

Use to find the index of the first matching element from the start of an
iterable.

**Example** (Finding an index)

```ts
import { Array, Option } from "effect"

Array.findFirstIndex([5, 3, 8, 9], (x) => x > 5) // => Option.some(2)
```

**See**

- `findLastIndex` — search from the end
- `findFirst` — get the element itself

**Signature**

```ts
declare const findFirstIndex: {
  <A>(predicate: (a: NoInfer<A>, i: number) => boolean): (self: Iterable<A>) => Option.Option<number>
  <A>(self: Iterable<A>, predicate: (a: A, i: number) => boolean): Option.Option<number>
}
```

[Source](https://effect.website/blob/main/src/Array.ts#L1658)

Since v2.0.0

## findFirstWithIndex

Returns the first selected value together with its index, wrapped in an
`Option`.

**When to use**

Use to find both the first matching element and its index in one pass.

**Details**

Accepts a predicate, a refinement, or a function returning `Option`. For an
`Option`-returning function, returns `[mappedValue, index]` for the first
`Some`, or `Option.none()` if no element is selected.

**Example** (Finding element with its index)

```ts
import { Array, Option } from "effect"

Array.findFirstWithIndex([1, 2, 3, 4, 5], (x) => x > 3) // => Option.some([4, 3])
```

**See**

- `findFirst` — get only the element
- `findFirstIndex` — get only the index

**Signature**

```ts
declare const findFirstWithIndex: {
  <A, B>(f: (a: NoInfer<A>, i: number) => Option.Option<B>): (self: Iterable<A>) => Option.Option<[B, number]>
  <A, B extends A>(refinement: (a: NoInfer<A>, i: number) => a is B): (self: Iterable<A>) => Option.Option<[B, number]>
  <A>(predicate: (a: NoInfer<A>, i: number) => boolean): (self: Iterable<A>) => Option.Option<[A, number]>
  <A, B>(self: Iterable<A>, f: (a: A, i: number) => Option.Option<B>): Option.Option<[B, number]>
  <A, B extends A>(self: Iterable<A>, refinement: (a: A, i: number) => a is B): Option.Option<[B, number]>
  <A>(self: Iterable<A>, predicate: (a: A, i: number) => boolean): Option.Option<[A, number]>
}
```

[Source](https://effect.website/blob/main/src/Array.ts#L1774)

Since v3.17.0

## findLast

Returns the last element matching a predicate, refinement, or mapping
function, wrapped in `Option`.

**When to use**

Use to find the last matching element from the end of an array.

**Details**

Searches from the end of the array. If no element matches, this returns
`Option.none()`.

**Example** (Finding the last match)

```ts
import { Array, Option } from "effect"

Array.findLast([1, 2, 3, 4, 5], (n) => n % 2 === 0) // => Option.some(4)
```

**See**

- `findFirst` — search from the start
- `findLastIndex` — get the index instead

**Signature**

```ts
declare const findLast: {
  <A, B>(f: (a: NoInfer<A>, i: number) => Option.Option<B>): (self: Iterable<A>) => Option.Option<B>
  <A, B extends A>(refinement: (a: NoInfer<A>, i: number) => a is B): (self: Iterable<A>) => Option.Option<B>
  <A>(predicate: (a: NoInfer<A>, i: number) => boolean): (self: Iterable<A>) => Option.Option<A>
  <A, B>(self: Iterable<A>, f: (a: A, i: number) => Option.Option<B>): Option.Option<B>
  <A, B extends A>(self: Iterable<A>, refinement: (a: A, i: number) => a is B): Option.Option<B>
  <A>(self: Iterable<A>, predicate: (a: A, i: number) => boolean): Option.Option<A>
}
```

[Source](https://effect.website/blob/main/src/Array.ts#L1832)

Since v2.0.0

## findLastIndex

Returns the index of the last element matching the predicate, wrapped in an
`Option`.

**When to use**

Use to find the index of the last matching element from the end of an array.

**Example** (Finding the last matching index)

```ts
import { Array, Option } from "effect"

Array.findLastIndex([1, 3, 8, 9], (x) => x < 5) // => Option.some(1)
```

**See**

- `findFirstIndex` — search from the start
- `findLast` — get the element itself

**Signature**

```ts
declare const findLastIndex: {
  <A>(predicate: (a: NoInfer<A>, i: number) => boolean): (self: Iterable<A>) => Option.Option<number>
  <A>(self: Iterable<A>, predicate: (a: A, i: number) => boolean): Option.Option<number>
}
```

[Source](https://effect.website/blob/main/src/Array.ts#L1694)

Since v2.0.0

# sequencing

## bind

Adds a new array variable to a do-notation scope, producing the cartesian product with all previous bindings.

**When to use**

Use to add another array-producing binding to an `Array.Do` pipeline, pairing
each existing scope with every value returned by the callback.

**Details**

Each `bind` call adds a named property to the accumulated object. The
callback receives the current scope and must return an array. This is
equivalent to `flatMap` plus merging the new value into the scope object.

**Example** (Binding two arrays)

```ts
import { Array, pipe } from "effect"

pipe(
  Array.Do,
  Array.bind("x", () => [1, 2]),
  Array.bind("y", () => ["a", "b"])
) // => [{ x: 1, y: "a" }, { x: 1, y: "b" }, { x: 2, y: "a" }, { x: 2, y: "b" }]
```

**See**

- `Do` — start a do-notation pipeline
- `bindTo` — name the first array in a pipeline
- `let` — add a plain computed value

**Signature**

```ts
declare const bind: {
  <A extends object, N extends string, B>(
    tag: Exclude<N, keyof A>,
    f: (a: NoInfer<A>) => ReadonlyArray<B>
  ): (self: ReadonlyArray<A>) => Array<{ [K in N | keyof A]: K extends keyof A ? A[K] : B }>
  <A extends object, N extends string, B>(
    self: ReadonlyArray<A>,
    tag: Exclude<N, keyof A>,
    f: (a: NoInfer<A>) => ReadonlyArray<B>
  ): Array<{ [K in N | keyof A]: K extends keyof A ? A[K] : B }>
}
```

[Source](https://effect.website/blob/main/src/Array.ts#L4835)

Since v3.2.0

## flatMap

Maps each element to an array and flattens the results into a single array.

**When to use**

Use to map each array element to zero or more values and concatenate the
results in one pass.

**Details**

The function receives `(element, index)`. This returns `NonEmptyArray` when
both the input and mapped arrays are non-empty.

**Example** (Flat mapping an array)

```ts
import { Array } from "effect"

Array.flatMap([1, 2, 3], (x) => [x, x * 2]) // => [1, 2, 2, 4, 3, 6]
```

**See**

- `map` — transform without flattening
- `flatten` — flatten without mapping

**Signature**

```ts
declare const flatMap: {
  <S extends ReadonlyArray<any>, T extends ReadonlyArray<any>>(
    f: (a: ReadonlyArray.Infer<S>, i: number) => T
  ): (self: S) => ReadonlyArray.AndNonEmpty<S, T, ReadonlyArray.Infer<T>>
  <A, B>(self: NonEmptyReadonlyArray<A>, f: (a: A, i: number) => NonEmptyReadonlyArray<B>): NonEmptyArray<B>
  <A, B>(self: ReadonlyArray<A>, f: (a: A, i: number) => ReadonlyArray<B>): Array<B>
}
```

[Source](https://effect.website/blob/main/src/Array.ts#L3623)

Since v2.0.0

## flatMapNullishOr

Maps each element with a nullable-returning function, keeping only non-null /
non-undefined results.

**When to use**

Use when you need to map and filter in one step, where the mapper can return
`null` or `undefined` to skip elements.

**Example** (Flat mapping with nullable values)

```ts
import { Array } from "effect"

Array.flatMapNullishOr([1, 2, 3], (n) => (n % 2 === 0 ? null : n)) // => [1, 3]
```

**See**

- `flatMap` for mapping each element to an array and flattening
- `fromNullishOr` for converting a single nullable value to an array

**Signature**

```ts
declare const flatMapNullishOr: {
  <A, B>(f: (a: A) => B): (self: ReadonlyArray<A>) => Array<NonNullable<B>>
  <A, B>(self: ReadonlyArray<A>, f: (a: A) => B): Array<NonNullable<B>>
}
```

[Source](https://effect.website/blob/main/src/Array.ts#L4161)

Since v4.0.0

## flatten

Flattens a nested array of arrays into a single array.

**When to use**

Use to collapse one level of nested arrays when no per-element mapping is
needed.

**Example** (Flattening nested arrays)

```ts
import { Array } from "effect"

Array.flatten([[1, 2], [], [3, 4], [], [5, 6]]) // => [1, 2, 3, 4, 5, 6]
```

**See**

- `flatMap` — map then flatten in one step

**Signature**

```ts
declare const flatten: <const S extends ReadonlyArray<ReadonlyArray<any>>>(self: S) => ReadonlyArray.Flatten<S>
```

[Source](https://effect.website/blob/main/src/Array.ts#L3667)

Since v2.0.0

# set operations

## difference

Computes elements in the first array that are not in the second, using
`Equal.equivalence()`.

**When to use**

Use when you need to keep values from the first array that are absent from
the second and the default `Equal.equivalence()` comparison is appropriate.

**Example** (Computing array differences)

```ts
import { Array } from "effect"

Array.difference([1, 2, 3], [2, 3, 4]) // => [1]
```

**See**

- `differenceWith` — use custom equality
- `union` — elements in either array
- `intersection` — elements in both arrays

**Signature**

```ts
declare const difference: {
  <A>(that: Iterable<A>): (self: Iterable<A>) => Array<A>
  <A>(self: Iterable<A>, that: Iterable<A>): Array<A>
}
```

[Source](https://effect.website/blob/main/src/Array.ts#L3387)

Since v2.0.0

## differenceWith

Computes elements in the first array that are not in the second, using a
custom equivalence.

**When to use**

Use when you need to keep only values from the first array and equality must
be defined by a custom comparator, such as matching objects by id.

**Example** (Computing differences with custom equality)

```ts
import { Array } from "effect"

Array.differenceWith<number>((a, b) => a === b)([1, 2, 3], [2, 3, 4]) // => [1]
```

**See**

- `difference` for the `Equal.equivalence()` variant
- `unionWith` for keeping values from either array with custom equality
- `intersectionWith` for keeping values present in both arrays with custom equality

**Signature**

```ts
declare const differenceWith: <A>(isEquivalent: (self: A, that: A) => boolean) => {
  (that: Iterable<A>): (self: Iterable<A>) => Array<A>
  (self: Iterable<A>, that: Iterable<A>): Array<A>
}
```

[Source](https://effect.website/blob/main/src/Array.ts#L3349)

Since v2.0.0

## intersection

Computes the intersection of two arrays using `Equal.equivalence()`. Order is
determined by the first array.

**When to use**

Use when Effect equality is the right membership test and you want to keep
values present in both inputs while preserving the first input's order.

**Example** (Computing array intersections)

```ts
import { Array } from "effect"

Array.intersection([1, 2, 3], [3, 4, 1]) // => [1, 3]
```

**See**

- `intersectionWith` — use custom equality
- `union` — elements in either array
- `difference` — elements only in the first array

**Signature**

```ts
declare const intersection: {
  <B>(that: Iterable<B>): <A>(self: Iterable<A>) => Array<A & B>
  <A, B>(self: Iterable<A>, that: Iterable<B>): Array<A & B>
}
```

[Source](https://effect.website/blob/main/src/Array.ts#L3312)

Since v2.0.0

## intersectionWith

Computes the intersection of two arrays using a custom equivalence. Order is
determined by the first array.

**When to use**

Use when you need to keep only values present in both arrays and equality
must be defined by a custom comparator, such as matching objects by id.

**Example** (Computing intersections with custom equality)

```ts
import { Array } from "effect"

const array1 = [{ id: 1 }, { id: 2 }, { id: 3 }]
const array2 = [{ id: 3 }, { id: 4 }, { id: 1 }]
const isEquivalent = (a: { id: number }, b: { id: number }) => a.id === b.id

Array.intersectionWith(isEquivalent)(array2)(array1) // => [{ id: 1 }, { id: 3 }]
```

**See**

- `intersection` for the `Equal.equivalence()` variant
- `unionWith` for keeping values from either array with custom equality
- `differenceWith` for keeping values only from the first array with custom equality

**Signature**

```ts
declare const intersectionWith: <A>(isEquivalent: (self: A, that: A) => boolean) => {
  (that: Iterable<A>): (self: Iterable<A>) => Array<A>
  (self: Iterable<A>, that: Iterable<A>): Array<A>
}
```

[Source](https://effect.website/blob/main/src/Array.ts#L3274)

Since v2.0.0

## union

Computes the union of two arrays, removing duplicates using
`Equal.equivalence()`.

**Example** (Computing array unions)

```ts
import { Array } from "effect"

Array.union([1, 2], [2, 3]) // => [1, 2, 3]
```

**See**

- `unionWith` — use custom equality
- `intersection` — elements in both arrays
- `difference` — elements only in the first array

**Signature**

```ts
declare const union: {
  <T extends Iterable<any>>(
    that: T
  ): <S extends Iterable<any>>(
    self: S
  ) => ReadonlyArray.OrNonEmpty<S, T, ReadonlyArray.Infer<S> | ReadonlyArray.Infer<T>>
  <A, B>(self: NonEmptyReadonlyArray<A>, that: ReadonlyArray<B>): NonEmptyArray<A | B>
  <A, B>(self: ReadonlyArray<A>, that: NonEmptyReadonlyArray<B>): NonEmptyArray<A | B>
  <A, B>(self: Iterable<A>, that: Iterable<B>): Array<A | B>
}
```

[Source](https://effect.website/blob/main/src/Array.ts#L3225)

Since v2.0.0

## unionWith

Computes the union of two arrays using a custom equivalence, removing
duplicates.

**When to use**

Use when you need the union of two arrays but duplicate detection must use a
custom equivalence instead of the default `Equal.equivalence()`.

**Example** (Computing unions with custom equality)

```ts
import { Array } from "effect"

Array.unionWith([1, 2], [2, 3], (a, b) => a === b) // => [1, 2, 3]
```

**See**

- `union` for the `Equal.equivalence()` variant
- `intersectionWith` for keeping elements present in both arrays
- `differenceWith` for keeping elements present only in the first array

**Signature**

```ts
declare const unionWith: {
  <S extends Iterable<any>, T extends Iterable<any>>(
    that: T,
    isEquivalent: (self: ReadonlyArray.Infer<S>, that: ReadonlyArray.Infer<T>) => boolean
  ): (self: S) => ReadonlyArray.OrNonEmpty<S, T, ReadonlyArray.Infer<S> | ReadonlyArray.Infer<T>>
  <A, B>(
    self: NonEmptyReadonlyArray<A>,
    that: Iterable<B>,
    isEquivalent: (self: A, that: B) => boolean
  ): NonEmptyArray<A | B>
  <A, B>(
    self: Iterable<A>,
    that: NonEmptyReadonlyArray<B>,
    isEquivalent: (self: A, that: B) => boolean
  ): NonEmptyArray<A | B>
  <A, B>(self: Iterable<A>, that: Iterable<B>, isEquivalent: (self: A, that: B) => boolean): Array<A | B>
}
```

[Source](https://effect.website/blob/main/src/Array.ts#L3177)

Since v2.0.0

# sorting

## sort

Sorts an array by the given `Order`, returning a new array.

**When to use**

Use to sort an array using a single `Order` comparator.

**Details**

Preserves `NonEmptyArray` in the return type. Use `sortWith` to sort by a
derived key, or `sortBy` for multi-key sorting.

**Example** (Sorting numbers)

```ts
import { Array, Order } from "effect"

Array.sort([3, 1, 4, 1, 5], Order.Number) // => [1, 1, 3, 4, 5]
```

**See**

- `sortWith` — sort by a mapping function
- `sortBy` — sort by multiple orders

**Signature**

```ts
declare const sort: {
  <B>(O: Order.Order<B>): <A extends B, S extends Iterable<A>>(self: S) => ReadonlyArray.With<S, ReadonlyArray.Infer<S>>
  <A extends B, B>(self: NonEmptyReadonlyArray<A>, O: Order.Order<B>): NonEmptyArray<A>
  <A extends B, B>(self: Iterable<A>, O: Order.Order<B>): Array<A>
}
```

[Source](https://effect.website/blob/main/src/Array.ts#L2087)

Since v2.0.0

## sortBy

Sorts an array by multiple `Order`s applied in sequence: the first order is
used first; ties are broken by the second order, and so on.

**When to use**

Use to sort by multiple criteria where later orders break ties from earlier
ones.

**Details**

This is data-last only and returns a function. The return type preserves
`NonEmptyArray`.

**Example** (Sorting by multiple keys)

```ts
import { Array, Order, pipe } from "effect"

const users = [
  { name: "Alice", age: 30 },
  { name: "Bob", age: 25 },
  { name: "Charlie", age: 30 }
]

const sortedUsers = pipe(
  users,
  Array.sortBy(
    Order.mapInput(Order.Number, (user: (typeof users)[number]) => user.age),
    Order.mapInput(Order.String, (user: (typeof users)[number]) => user.name)
  )
)

sortedUsers.map((user) => user.name).join(",") // => "Bob,Alice,Charlie"
```

**See**

- `sort` — sort by a single `Order`
- `sortWith` — sort by a derived key

**Signature**

```ts
declare const sortBy: <S extends Iterable<any>>(
  ...orders: ReadonlyArray<Order.Order<ReadonlyArray.Infer<S>>>
) => (
  self: S
) => S extends NonEmptyReadonlyArray<infer A> ? NonEmptyArray<A> : S extends Iterable<infer A> ? Array<A> : never
```

[Source](https://effect.website/blob/main/src/Array.ts#L2181)

Since v2.0.0

## sortWith

Sorts an array by a derived key using a mapping function and an `Order` for
that key.

**When to use**

Use when you need to sort values by a derived key, such as a string length or
object field, while keeping the original values.

**Details**

Equivalent to `sort(Order.mapInput(order, f))`, but more convenient.

**Example** (Sorting strings by length)

```ts
import { Array, Order } from "effect"

Array.sortWith(["aaa", "b", "cc"], (s) => s.length, Order.Number) // => ["b", "cc", "aaa"]
```

**See**

- `sort` for sorting with an `Order` that compares the elements directly
- `sortBy` for sorting with multiple `Order`s applied in sequence

**Signature**

```ts
declare const sortWith: {
  <S extends Iterable<any>, B>(
    f: (a: ReadonlyArray.Infer<S>) => B,
    order: Order.Order<B>
  ): (self: S) => ReadonlyArray.With<S, ReadonlyArray.Infer<S>>
  <A, B>(self: NonEmptyReadonlyArray<A>, f: (a: A) => B, O: Order.Order<B>): NonEmptyArray<A>
  <A, B>(self: Iterable<A>, f: (a: A) => B, order: Order.Order<B>): Array<A>
}
```

[Source](https://effect.website/blob/main/src/Array.ts#L2126)

Since v2.0.0

# splitting

## chop

Applies a function repeatedly to consume prefixes of the array and collect
the values it produces.

**When to use**

Use when you need custom grouping logic where each step returns both a value
and the remaining input.

**Details**

The function receives a `NonEmptyReadonlyArray` and returns `[value, rest]`.
Processing continues until the remaining array is empty.

**Example** (Chopping an array)

```ts
import { Array } from "effect"

Array.chop([1, 2, 3, 4, 5], (as): [number, Array<number>] => [as[0] * 2, as.slice(1)]) // => [2, 4, 6, 8, 10]
```

**See**

- `chunksOf` — split into fixed-size chunks
- `splitAt` — split at an index

**Signature**

```ts
declare const chop: {
  <S extends Iterable<any>, B>(
    f: (as: NonEmptyReadonlyArray<ReadonlyArray.Infer<S>>) => readonly [B, ReadonlyArray<ReadonlyArray.Infer<S>>]
  ): (self: S) => ReadonlyArray.With<S, ReadonlyArray.Infer<S>>
  <A, B>(
    self: NonEmptyReadonlyArray<A>,
    f: (as: NonEmptyReadonlyArray<A>) => readonly [B, ReadonlyArray<A>]
  ): NonEmptyArray<B>
  <A, B>(self: Iterable<A>, f: (as: NonEmptyReadonlyArray<A>) => readonly [B, ReadonlyArray<A>]): Array<B>
}
```

[Source](https://effect.website/blob/main/src/Array.ts#L2621)

Since v2.0.0

## chunksOf

Splits an iterable into chunks of length `n`. The last chunk may be shorter
if `n` does not evenly divide the length.

**When to use**

Use to divide an iterable into a new array of non-overlapping chunks with a
maximum chunk size.

**Details**

`n` is rounded down and normalized to at least `1`; `NaN` and non-positive
values therefore produce singleton chunks. `chunksOf(n)([])` is `[]`, not
`[[]]`. Each chunk is a `NonEmptyArray`, and the outer return type preserves
`NonEmptyArray`.

**Example** (Chunking an array)

```ts
import { Array } from "effect"

Array.chunksOf([1, 2, 3, 4, 5], 2) // => [[1, 2], [3, 4], [5]]
```

**See**

- `split` — split into a given number of groups
- `window` — sliding windows

**Signature**

```ts
declare const chunksOf: {
  (n: number): <S extends Iterable<any>>(self: S) => ReadonlyArray.With<S, NonEmptyArray<ReadonlyArray.Infer<S>>>
  <A>(self: NonEmptyReadonlyArray<A>, n: number): NonEmptyArray<NonEmptyArray<A>>
  <A>(self: Iterable<A>, n: number): Array<NonEmptyArray<A>>
}
```

[Source](https://effect.website/blob/main/src/Array.ts#L2907)

Since v2.0.0

## span

Splits an iterable into two arrays: the longest prefix where the predicate
holds, and the remaining elements.

**When to use**

Use when you need both the longest predicate-matching prefix and the
remaining elements.

**Details**

Equivalent to `[takeWhile(pred), dropWhile(pred)]`, but more efficient
because it runs in a single pass. Supports refinements for type narrowing of
the prefix.

**Example** (Splitting at predicate boundary)

```ts
import { Array } from "effect"

Array.span([1, 3, 2, 4, 5], (x) => x % 2 === 1) // => [[1, 3], [2, 4, 5]]
```

**See**

- `takeWhile` for keeping only the matching prefix
- `dropWhile` for keeping only the elements after the matching prefix
- `splitWhere` for splitting at the first element that satisfies a predicate

**Signature**

```ts
declare const span: {
  <A, B extends A>(
    refinement: (a: NoInfer<A>, i: number) => a is B
  ): (self: Iterable<A>) => [init: Array<B>, rest: Array<Exclude<A, B>>]
  <A>(predicate: (a: NoInfer<A>, i: number) => boolean): (self: Iterable<A>) => [init: Array<A>, rest: Array<A>]
  <A, B extends A>(
    self: Iterable<A>,
    refinement: (a: A, i: number) => a is B
  ): [init: Array<B>, rest: Array<Exclude<A, B>>]
  <A>(self: Iterable<A>, predicate: (a: A, i: number) => boolean): [init: Array<A>, rest: Array<A>]
}
```

[Source](https://effect.website/blob/main/src/Array.ts#L1471)

Since v2.0.0

## split

Splits an iterable into `n` roughly equal-sized chunks.

**When to use**

Use to distribute elements across a fixed number of groups, such as when splitting work across threads.

**Details**

`n` is rounded down and normalized to at least `1`, with `NaN` treated as
`1`. The last chunk may be shorter.

**Example** (Splitting into groups)

```ts
import { Array } from "effect"

Array.split([1, 2, 3, 4, 5, 6, 7, 8], 3) // => [[1, 2, 3], [4, 5, 6], [7, 8]]
```

**See**

- `chunksOf` — split into fixed-size chunks

**Signature**

```ts
declare const split: {
  (n: number): <A>(self: Iterable<A>) => Array<Array<A>>
  <A>(self: Iterable<A>, n: number): Array<Array<A>>
}
```

[Source](https://effect.website/blob/main/src/Array.ts#L2754)

Since v2.0.0

## splitAt

Splits an iterable into two arrays at the given index.

**When to use**

Use to divide an array into a prefix and suffix at a specific position.

**Details**

`n` is rounded down and clamped to `[0, length]`. `NaN` is treated as `0`,
which places all elements in the second array.

**Example** (Splitting at an index)

```ts
import { Array } from "effect"

Array.splitAt([1, 2, 3, 4, 5], 3) // => [[1, 2, 3], [4, 5]]
```

**See**

- `splitAtNonEmpty` — for non-empty arrays
- `splitWhere` — split at a predicate boundary

**Signature**

```ts
declare const splitAt: {
  (n: number): <A>(self: Iterable<A>) => [beforeIndex: Array<A>, fromIndex: Array<A>]
  <A>(self: Iterable<A>, n: number): [beforeIndex: Array<A>, fromIndex: Array<A>]
}
```

[Source](https://effect.website/blob/main/src/Array.ts#L2678)

Since v2.0.0

## splitAtNonEmpty

Splits a non-empty array into two parts at the given index. The first part
is guaranteed to be non-empty (`n` is clamped to >= 1).

**When to use**

Use when downstream code requires the left side of the split to contain at
least one element.

**Details**

`n` is rounded down and clamped to `[1, length]`. `NaN` is treated as `1`.

**Example** (Splitting a non-empty array)

```ts
import { Array } from "effect"

Array.splitAtNonEmpty(["a", "b", "c", "d", "e"], 3) // => [["a", "b", "c"], ["d", "e"]]
```

**See**

- `splitAt` — for possibly-empty arrays

**Signature**

```ts
declare const splitAtNonEmpty: {
  (n: number): <A>(self: NonEmptyReadonlyArray<A>) => [beforeIndex: NonEmptyArray<A>, fromIndex: Array<A>]
  <A>(self: NonEmptyReadonlyArray<A>, n: number): [beforeIndex: NonEmptyArray<A>, fromIndex: Array<A>]
}
```

[Source](https://effect.website/blob/main/src/Array.ts#L2719)

Since v4.0.0

## splitWhere

Splits an iterable at the first element matching the predicate. The matching
element is included in the second array.

**When to use**

Use when you need to split an array at the first element that marks a
condition boundary.

**Example** (Splitting at a condition)

```ts
import { Array } from "effect"

Array.splitWhere([1, 2, 3, 4, 5], (n) => n > 3) // => [[1, 2, 3], [4, 5]]
```

**See**

- `span` — splits at the first element that fails the predicate
- `splitAt` — split at a fixed index

**Signature**

```ts
declare const splitWhere: {
  <A>(
    predicate: (a: NoInfer<A>, i: number) => boolean
  ): (self: Iterable<A>) => [beforeMatch: Array<A>, fromMatch: Array<A>]
  <A>(self: Iterable<A>, predicate: (a: A, i: number) => boolean): [beforeMatch: Array<A>, fromMatch: Array<A>]
}
```

[Source](https://effect.website/blob/main/src/Array.ts#L2785)

Since v2.0.0

## unappend

Splits a non-empty array into all elements except the last, and the last
element.

**When to use**

Use when you need to split a non-empty array into the elements before the
last element and the last element.

**Details**

Returns a tuple `[init, last]` and requires a `NonEmptyReadonlyArray`.

**Example** (Destructuring init and last)

```ts
import { Array } from "effect"

Array.unappend([1, 2, 3, 4]) // => [[1, 2, 3], 4]
```

**See**

- `unprepend` for splitting a non-empty array into head and tail
- `initNonEmpty` for getting only the elements before the last
- `lastNonEmpty` for getting only the last element

**Signature**

```ts
declare const unappend: <A>(self: NonEmptyReadonlyArray<A>) => [arrayWithoutLastElement: Array<A>, lastElement: A]
```

[Source](https://effect.website/blob/main/src/Array.ts#L1063)

Since v2.0.0

## unprepend

Splits a non-empty array into its first element and the remaining elements.

**When to use**

Use when you have a `NonEmptyReadonlyArray` and need both its first element
and the remaining elements as separate values.

**Details**

Returns a tuple `[head, tail]` and requires a `NonEmptyReadonlyArray`.

**Example** (Destructuring head and tail)

```ts
import { Array } from "effect"

Array.unprepend([1, 2, 3, 4]) // => [1, [2, 3, 4]]
```

**See**

- `unappend` for splitting a non-empty array into init and last
- `headNonEmpty` for getting only the first element
- `tailNonEmpty` for getting only the elements after the first

**Signature**

```ts
declare const unprepend: <A>(self: NonEmptyReadonlyArray<A>) => [firstElement: A, remainingElements: Array<A>]
```

[Source](https://effect.website/blob/main/src/Array.ts#L1031)

Since v2.0.0

## window

Creates overlapping sliding windows of size `n`.

**When to use**

Use to process sequences with a moving window, such as for computing running averages or detecting patterns.

**Details**

`n` is rounded down, with `NaN` and non-positive values treated as `0`.
Returns an empty array if the normalized size is `0` or exceeds the array
length. Each window is a tuple of exactly the normalized size.

**Example** (Creating sliding windows)

```ts
import { Array } from "effect"

const values = [1, 2, 3, 4, 5]

Array.window(values, 3) // => [[1, 2, 3], [2, 3, 4], [3, 4, 5]]
Array.window(values, 6) // => []
```

**See**

- `chunksOf` — non-overlapping chunks

**Signature**

```ts
declare const window: {
  <N extends number>(n: N): <A>(self: Iterable<A>) => Array<TupleOf<N, A>>
  <A, N extends number>(self: Iterable<A>, n: N): Array<TupleOf<N, A>>
}
```

[Source](https://effect.website/blob/main/src/Array.ts#L2952)

Since v3.13.2

# transforming

## copy

Creates a shallow copy of an array.

**When to use**

Use to create a distinct array reference for an existing array, for example
before mutating the returned array.

**Details**

The return type preserves `NonEmptyArray`. Use this when you need a distinct
reference, for example before mutating the returned array.

**Example** (Copying an array)

```ts
import { Array } from "effect"

const original = [1, 2, 3]
const copied = Array.copy(original)

copied // => [1, 2, 3]
original === copied // => false
```

**See**

- `fromIterable` — returns the same reference for arrays

**Signature**

```ts
declare const copy: { <A>(self: NonEmptyReadonlyArray<A>): NonEmptyArray<A>; <A>(self: ReadonlyArray<A>): Array<A> }
```

[Source](https://effect.website/blob/main/src/Array.ts#L2826)

Since v2.0.0

## insertAt

Inserts an element at the specified index safely, returning a new `NonEmptyArray`
wrapped in an `Option`.

**When to use**

Use to insert a single element at a specific position in an array.

**Details**

Valid indices are `0` to `length`, inclusive. Inserting at `length` appends.

**Example** (Inserting at an index)

```ts
import { Array, Option } from "effect"

Array.insertAt(["a", "b", "c", "e"], 3, "d") // => Option.some(["a", "b", "c", "d", "e"])
```

**See**

- `replace` — replace an existing element
- `modify` — transform an element at an index

**Signature**

```ts
declare const insertAt: {
  <B>(i: number, b: B): <A>(self: Iterable<A>) => Option.Option<NonEmptyArray<A | B>>
  <A, B>(self: Iterable<A>, i: number, b: B): Option.Option<NonEmptyArray<A | B>>
}
```

[Source](https://effect.website/blob/main/src/Array.ts#L1889)

Since v2.0.0

## intersperse

Places a separator element between every pair of elements.

**When to use**

Use to insert a separator between elements, for example when preparing data for display or concatenation.

**Details**

The return type preserves `NonEmptyArray`. Empty inputs produce an empty
result.

**Example** (Interspersing a separator)

```ts
import { Array } from "effect"

Array.intersperse([1, 2, 3], 0) // => [1, 0, 2, 0, 3]
```

**See**

- `join` — intersperse and join into a string

**Signature**

```ts
declare const intersperse: {
  <B>(middle: B): <S extends Iterable<any>>(self: S) => ReadonlyArray.With<S, ReadonlyArray.Infer<S> | B>
  <A, B>(self: NonEmptyReadonlyArray<A>, middle: B): NonEmptyArray<A | B>
  <A, B>(self: Iterable<A>, middle: B): Array<A | B>
}
```

[Source](https://effect.website/blob/main/src/Array.ts#L2332)

Since v2.0.0

## modify

Applies a function to the element at the specified index safely, returning the
updated array in `Option.some`.

**When to use**

Use to derive a replacement value from an array element at a specific index
while leaving the other elements unchanged.

**Details**

Returns `Option.none()` when the index is out of bounds.

**Example** (Modifying an element)

```ts
import { Array, Option } from "effect"

const values = [1, 2, 3, 4]
const double = (n: number) => n * 2

Array.modify(values, 2, double) // => Option.some([1, 2, 6, 4])
Array.modify(values, 5, double) // => Option.none()
```

**See**

- `replace` — set a fixed value at an index
- `modifyHeadNonEmpty` — modify the first element
- `modifyLastNonEmpty` — modify the last element

**Signature**

```ts
declare const modify: {
  <A, B, S extends Iterable<A> = Iterable<A>>(
    i: number,
    f: (a: ReadonlyArray.Infer<S>) => B
  ): (self: S) => Option.Option<ReadonlyArray.With<S, ReadonlyArray.Infer<S> | B>>
  <A, B, S extends Iterable<A> = Iterable<A>>(
    self: S,
    i: number,
    f: (a: ReadonlyArray.Infer<S>) => B
  ): Option.Option<ReadonlyArray.With<S, ReadonlyArray.Infer<S> | B>>
}
```

[Source](https://effect.website/blob/main/src/Array.ts#L1974)

Since v2.0.0

## modifyHeadNonEmpty

Applies a function to the first element of a non-empty array, returning a
new array.

**When to use**

Use to transform the first element of a non-empty array while preserving the rest.

**Example** (Modifying the head)

```ts
import { Array } from "effect"

Array.modifyHeadNonEmpty([1, 2, 3], (n) => n * 10) // => [10, 2, 3]
```

**See**

- `setHeadNonEmpty` — replace with a fixed value
- `modifyLastNonEmpty` — modify the last element

**Signature**

```ts
declare const modifyHeadNonEmpty: {
  <A, B>(f: (a: A) => B): (self: NonEmptyReadonlyArray<A>) => NonEmptyArray<A | B>
  <A, B>(self: NonEmptyReadonlyArray<A>, f: (a: A) => B): NonEmptyArray<A | B>
}
```

[Source](https://effect.website/blob/main/src/Array.ts#L2376)

Since v4.0.0

## modifyLastNonEmpty

Applies a function to the last element of a non-empty array, returning a
new array.

**When to use**

Use when you already know the array is non-empty and the new last element
depends on the current last element.

**Example** (Modifying the last element)

```ts
import { Array } from "effect"

Array.modifyLastNonEmpty([1, 2, 3], (n) => n * 2) // => [1, 2, 6]
```

**See**

- `setLastNonEmpty` — replace with a fixed value
- `modifyHeadNonEmpty` — modify the first element

**Signature**

```ts
declare const modifyLastNonEmpty: {
  <A, B>(f: (a: A) => B): (self: NonEmptyReadonlyArray<A>) => NonEmptyArray<A | B>
  <A, B>(self: NonEmptyReadonlyArray<A>, f: (a: A) => B): NonEmptyArray<A | B>
}
```

[Source](https://effect.website/blob/main/src/Array.ts#L2440)

Since v4.0.0

## pad

Pads or truncates an array to exactly `n` elements, filling with `fill`
if the array is shorter, or slicing if longer.

**When to use**

Use to ensure an array has a specific length, padding with a fill value or truncating as needed.

**Details**

`n` is rounded down. `NaN` and non-positive values are treated as `0`, which
returns an empty array.

**Example** (Padding an array)

```ts
import { Array } from "effect"

Array.pad([1, 2, 3], 6, 0) // => [1, 2, 3, 0, 0, 0]
```

**See**

- `take` — truncate without padding
- `replicate` — create an array of a single repeated value

**Signature**

```ts
declare const pad: {
  <A, T>(n: number, fill: T): (self: Array<A>) => Array<A | T>
  <A, T>(self: Array<A>, n: number, fill: T): Array<A | T>
}
```

[Source](https://effect.website/blob/main/src/Array.ts#L2858)

Since v3.8.4

## remove

Removes the element at the specified index, returning a new array. If the
index is out of bounds, returns a copy of the original.

**When to use**

Use when you want a missing index to be a no-op and need a fresh array result
instead of an optional failure.

**Example** (Removing an element)

```ts
import { Array } from "effect"

Array.remove([1, 2, 3, 4], 2) // => [1, 2, 4]
Array.remove([1, 2, 3, 4], 5) // => [1, 2, 3, 4]
```

**See**

- `insertAt` — insert an element
- `filter` — remove elements by predicate

**Signature**

```ts
declare const remove: { (i: number): <A>(self: Iterable<A>) => Array<A>; <A>(self: Iterable<A>, i: number): Array<A> }
```

[Source](https://effect.website/blob/main/src/Array.ts#L2020)

Since v2.0.0

## replace

Replaces the element at the specified index safely with a new value, returning the
updated array in `Option.some`.

**When to use**

Use to set a fixed replacement value at a specific index.

**Details**

Returns `Option.none()` when the index is out of bounds.

**Example** (Replacing an element)

```ts
import { Array, Option } from "effect"

Array.replace([1, 2, 3], 1, 4) // => Option.some([1, 4, 3])
```

**See**

- `modify` — transform an element with a function
- `insertAt` — insert without removing

**Signature**

```ts
declare const replace: {
  <B>(
    i: number,
    b: B
  ): <A, S extends Iterable<A> = Iterable<A>>(
    self: S
  ) => Option.Option<ReadonlyArray.With<S, ReadonlyArray.Infer<S> | B>>
  <A, B, S extends Iterable<A> = Iterable<A>>(
    self: S,
    i: number,
    b: B
  ): Option.Option<ReadonlyArray.With<S, ReadonlyArray.Infer<S> | B>>
}
```

[Source](https://effect.website/blob/main/src/Array.ts#L1928)

Since v2.0.0

## reverse

Reverses an iterable into a new array.

**When to use**

Use to reverse an iterable into a new array without mutating the original
input.

**Details**

Preserves `NonEmptyArray` in the return type.

**Example** (Reversing an array)

```ts
import { Array } from "effect"

Array.reverse([1, 2, 3, 4]) // => [4, 3, 2, 1]
```

**Signature**

```ts
declare const reverse: <S extends Iterable<any>>(
  self: S
) => S extends NonEmptyReadonlyArray<infer A> ? NonEmptyArray<A> : S extends Iterable<infer A> ? Array<A> : never
```

[Source](https://effect.website/blob/main/src/Array.ts#L2056)

Since v2.0.0

## rotate

Transforms an array by rotating it `n` steps. Positive `n` rotates right; negative `n`
rotates left.

**When to use**

Use when elements should wrap around the end of the array rather than being
dropped.

**Details**

`n` is rounded to the nearest integer before rotating. The return type
preserves `NonEmptyArray`. Empty arrays, or rotations normalized to `0`,
return a copy.

**Example** (Rotating elements)

```ts
import { Array } from "effect"

Array.rotate(["a", "b", "c", "d"], 2) // => ["c", "d", "a", "b"]
```

**See**

- `take` for taking a fixed number of elements from the start
- `drop` for dropping a fixed number of elements from the start

**Signature**

```ts
declare const rotate: {
  (n: number): <S extends Iterable<any>>(self: S) => ReadonlyArray.With<S, ReadonlyArray.Infer<S>>
  <A>(self: NonEmptyReadonlyArray<A>, n: number): NonEmptyArray<A>
  <A>(self: Iterable<A>, n: number): Array<A>
}
```

[Source](https://effect.website/blob/main/src/Array.ts#L2508)

Since v2.0.0

## setHeadNonEmpty

Replaces the first element of a non-empty array with a new value.

**When to use**

Use when you already know the array is non-empty and the replacement value
does not depend on the current first element.

**Example** (Setting the head)

```ts
import { Array } from "effect"

Array.setHeadNonEmpty([1, 2, 3], 10) // => [10, 2, 3]
```

**See**

- `modifyHeadNonEmpty` — transform the head with a function
- `setLastNonEmpty` — replace the last element

**Signature**

```ts
declare const setHeadNonEmpty: {
  <B>(b: B): <A>(self: NonEmptyReadonlyArray<A>) => NonEmptyArray<A | B>
  <A, B>(self: NonEmptyReadonlyArray<A>, b: B): NonEmptyArray<A | B>
}
```

[Source](https://effect.website/blob/main/src/Array.ts#L2409)

Since v4.0.0

## setLastNonEmpty

Replaces the last element of a non-empty array with a new value.

**When to use**

Use when you already know the array is non-empty and the replacement value
does not depend on the current last element.

**Example** (Setting the last element)

```ts
import { Array } from "effect"

Array.setLastNonEmpty([1, 2, 3], 4) // => [1, 2, 4]
```

**See**

- `modifyLastNonEmpty` — transform the last element with a function
- `setHeadNonEmpty` — replace the first element

**Signature**

```ts
declare const setLastNonEmpty: {
  <B>(b: B): <A>(self: NonEmptyReadonlyArray<A>) => NonEmptyArray<A | B>
  <A, B>(self: NonEmptyReadonlyArray<A>, b: B): NonEmptyArray<A | B>
}
```

[Source](https://effect.website/blob/main/src/Array.ts#L2471)

Since v4.0.0

# traversing

## forEach

Runs a side-effect for each element. The callback receives `(element, index)`.

**When to use**

Use to iterate over an array for side-effects only, when no transformed
result is needed.

**Example** (Iterating with side-effects)

```ts
import { Array } from "effect"

const visited: Array<number> = []
Array.forEach([1, 2, 3], (n) => visited.push(n))

visited // => [1, 2, 3]
```

**See**

- `map` for transforming each element into a new array

**Signature**

```ts
declare const forEach: {
  <A>(f: (a: A, i: number) => void): (self: Iterable<A>) => void
  <A>(self: Iterable<A>, f: (a: A, i: number) => void): void
}
```

[Source](https://effect.website/blob/main/src/Array.ts#L4458)

Since v2.0.0

# unsafe

## getUnsafe

Reads an element at the given index, throwing if the index is out of bounds.

**When to use**

Use to read an array element at a known valid index when out-of-bounds would
be a programming error.

**Details**

Throws an `Error` with the message `"Index out of bounds: <i>"`. Prefer
`get` for safe access.

**Example** (Accessing indexes unsafely)

```ts
import { Array } from "effect"

Array.getUnsafe([1, 2, 3], 1) // => 2
// Array.getUnsafe([1, 2, 3], 10) // throws Error
```

**See**

- `get` — safe version returning `Option`

**Signature**

```ts
declare const getUnsafe: {
  (index: number): <A>(self: ReadonlyArray<A>) => A
  <A>(self: ReadonlyArray<A>, index: number): A
}
```

[Source](https://effect.website/blob/main/src/Array.ts#L993)

Since v4.0.0

# utility types

## ReadonlyArrayTypeLambda (interface)

Type lambda for `ReadonlyArray`, used for higher-kinded type operations.

**Signature**

```ts
export interface ReadonlyArrayTypeLambda extends TypeLambda {
  readonly type: ReadonlyArray<this["Target"]>
}
```

[Source](https://effect.website/blob/main/src/Array.ts#L59)

Since v2.0.0

# utils

## ReadonlyArray (namespace)

Utility types for working with `ReadonlyArray` at the type level. Use these
to infer element types, preserve non-emptiness, and flatten nested arrays.

[Source](https://effect.website/blob/main/src/Array.ts#L3451)

Since v2.0.0

### Infer (type alias)

Infers the element type of an iterable.

**Example** (Inferring an element type)

```ts
import type { Array } from "effect"

type StringArrayType = Array.ReadonlyArray.Infer<ReadonlyArray<string>>
// StringArrayType is string
```

**Signature**

```ts
type Infer<S extends Iterable<any>> = S extends ReadonlyArray<infer A> ? A : S extends Iterable<infer A> ? A : never
```

[Source](https://effect.website/blob/main/src/Array.ts#L3467)

Since v2.0.0

### With (type alias)

Constructs an array type preserving non-emptiness.

**Example** (Preserving non-emptiness)

```ts
import type { Array } from "effect"

type Result = Array.ReadonlyArray.With<readonly [number], string>
// Result is NonEmptyArray<string>
```

**Signature**

```ts
type With<S extends Iterable<any>, A> = S extends NonEmptyReadonlyArray<any> ? NonEmptyArray<A> : Array<A>
```

[Source](https://effect.website/blob/main/src/Array.ts#L3486)

Since v2.0.0

### OrNonEmpty (type alias)

Creates a non-empty array if either input is non-empty.

**Example** (Preserving non-emptiness from either input)

```ts
import type { Array } from "effect"

type Result = Array.ReadonlyArray.OrNonEmpty<readonly [number], ReadonlyArray<string>, number>
// Result is NonEmptyArray<number>
```

**Signature**

```ts
type OrNonEmpty<S extends Iterable<any>, T extends Iterable<any>, A> =
  S extends NonEmptyReadonlyArray<any>
    ? NonEmptyArray<A>
    : T extends NonEmptyReadonlyArray<any>
      ? NonEmptyArray<A>
      : Array<A>
```

[Source](https://effect.website/blob/main/src/Array.ts#L3508)

Since v2.0.0

### AndNonEmpty (type alias)

Creates a non-empty array only if both inputs are non-empty.

**Example** (Preserving non-emptiness from both inputs)

```ts
import type { Array } from "effect"

type Result = Array.ReadonlyArray.AndNonEmpty<readonly [number], readonly [string], boolean>
// Result is NonEmptyArray<boolean>
```

**Signature**

```ts
type AndNonEmpty<S extends Iterable<any>, T extends Iterable<any>, A> =
  S extends NonEmptyReadonlyArray<any> ? (T extends NonEmptyReadonlyArray<any> ? NonEmptyArray<A> : Array<A>) : Array<A>
```

[Source](https://effect.website/blob/main/src/Array.ts#L3535)

Since v2.0.0

### Flatten (type alias)

Flattens a nested array type.

**Example** (Flattening nested array types)

```ts
import type { Array } from "effect"

type Nested = ReadonlyArray<ReadonlyArray<number>>
type Flattened = Array.ReadonlyArray.Flatten<Nested>
// Flattened is Array<number>
```

**Signature**

```ts
type Flatten<T extends ReadonlyArray<ReadonlyArray<any>>> =
  T extends NonEmptyReadonlyArray<NonEmptyReadonlyArray<any>>
    ? NonEmptyArray<T[number][number]>
    : Array<T[number][number]>
```

[Source](https://effect.website/blob/main/src/Array.ts#L3559)

Since v2.0.0

# zipping

## unzip

Splits an array of pairs into two arrays. Inverse of `zip`.

**Example** (Unzipping pairs)

```ts
import { Array } from "effect"

Array.unzip([
  [1, "a"],
  [2, "b"],
  [3, "c"]
]) // => [[1, 2, 3], ["a", "b", "c"]]
```

**See**

- `zip` — combine two arrays into pairs

**Signature**

```ts
declare const unzip: <S extends Iterable<readonly [any, any]>>(
  self: S
) => S extends NonEmptyReadonlyArray<readonly [infer A, infer B]>
  ? [NonEmptyArray<A>, NonEmptyArray<B>]
  : S extends Iterable<readonly [infer A, infer B]>
    ? [Array<A>, Array<B>]
    : never
```

[Source](https://effect.website/blob/main/src/Array.ts#L2289)

Since v2.0.0

## zip

Pairs elements from two iterables by position. If the iterables differ in
length, the extra elements from the longer one are discarded.

**When to use**

Use when you need simple pairs of corresponding elements from two iterables.

**Details**

Returns `NonEmptyArray` when both inputs are non-empty.

**Example** (Zipping two arrays)

```ts
import { Array } from "effect"

Array.zip([1, 2, 3], ["a", "b"]) // => [[1, "a"], [2, "b"]]
```

**See**

- `zipWith` — zip with a combiner function
- `unzip` — inverse operation

**Signature**

```ts
declare const zip: {
  <B>(that: NonEmptyReadonlyArray<B>): <A>(self: NonEmptyReadonlyArray<A>) => NonEmptyArray<[A, B]>
  <B>(that: Iterable<B>): <A>(self: Iterable<A>) => Array<[A, B]>
  <A, B>(self: NonEmptyReadonlyArray<A>, that: NonEmptyReadonlyArray<B>): NonEmptyArray<[A, B]>
  <A, B>(self: Iterable<A>, that: Iterable<B>): Array<[A, B]>
}
```

[Source](https://effect.website/blob/main/src/Array.ts#L2222)

Since v2.0.0

## zipWith

Combines elements from two iterables pairwise using a function. If the
iterables differ in length, extra elements are discarded.

**When to use**

Use when zipping two iterables in an array pipeline and each pair should
become a computed array element instead of a tuple.

**Example** (Zipping with addition)

```ts
import { Array } from "effect"

Array.zipWith([1, 2, 3], [4, 5, 6], (a, b) => a + b) // => [5, 7, 9]
```

**See**

- `zip` — zip into tuples

**Signature**

```ts
declare const zipWith: {
  <B, A, C>(that: NonEmptyReadonlyArray<B>, f: (a: A, b: B) => C): (self: NonEmptyReadonlyArray<A>) => NonEmptyArray<C>
  <B, A, C>(that: Iterable<B>, f: (a: A, b: B) => C): (self: Iterable<A>) => Array<C>
  <A, B, C>(self: NonEmptyReadonlyArray<A>, that: NonEmptyReadonlyArray<B>, f: (a: A, b: B) => C): NonEmptyArray<C>
  <B, A, C>(self: Iterable<A>, that: Iterable<B>, f: (a: A, b: B) => C): Array<C>
}
```

[Source](https://effect.website/blob/main/src/Array.ts#L2254)

Since v2.0.0
