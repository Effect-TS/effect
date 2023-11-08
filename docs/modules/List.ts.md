---
title: List.ts
nav_order: 48
parent: Modules
---

## List overview

A data type for immutable linked lists representing ordered collections of elements of type `A`.

This data type is optimal for last-in-first-out (LIFO), stack-like access patterns. If you need another access pattern, for example, random access or FIFO, consider using a collection more suited to this than `List`.

**Performance**

- Time: `List` has `O(1)` prepend and head/tail access. Most other operations are `O(n)` on the number of elements in the list. This includes the index-based lookup of elements, `length`, `append` and `reverse`.
- Space: `List` implements structural sharing of the tail list. This means that many operations are either zero- or constant-memory cost.

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [combinators](#combinators)
  - [compact](#compact)
  - [drop](#drop)
  - [filter](#filter)
  - [filterMap](#filtermap)
  - [forEach](#foreach)
  - [map](#map)
  - [partition](#partition)
  - [partitionMap](#partitionmap)
  - [splitAt](#splitat)
  - [take](#take)
- [concatenating](#concatenating)
  - [append](#append)
  - [appendAll](#appendall)
  - [appendAllNonEmpty](#appendallnonempty)
  - [prepend](#prepend)
  - [prependAll](#prependall)
  - [prependAllNonEmpty](#prependallnonempty)
  - [prependAllReversed](#prependallreversed)
- [constructors](#constructors)
  - [cons](#cons)
  - [empty](#empty)
  - [fromIterable](#fromiterable)
  - [make](#make)
  - [nil](#nil)
  - [of](#of)
- [conversions](#conversions)
  - [toChunk](#tochunk)
  - [toReadonlyArray](#toreadonlyarray)
- [elements](#elements)
  - [every](#every)
  - [findFirst](#findfirst)
  - [reverse](#reverse)
  - [some](#some)
- [equivalence](#equivalence)
  - [getEquivalence](#getequivalence)
- [folding](#folding)
  - [reduce](#reduce)
  - [reduceRight](#reduceright)
- [getters](#getters)
  - [head](#head)
  - [last](#last)
  - [size](#size)
  - [tail](#tail)
- [models](#models)
  - [Cons (interface)](#cons-interface)
  - [List (type alias)](#list-type-alias)
  - [Nil (interface)](#nil-interface)
- [refinements](#refinements)
  - [isCons](#iscons)
  - [isList](#islist)
  - [isNil](#isnil)
- [sequencing](#sequencing)
  - [flatMap](#flatmap)
  - [flatMapNonEmpty](#flatmapnonempty)
- [symbol](#symbol)
  - [TypeId](#typeid)
  - [TypeId (type alias)](#typeid-type-alias)
- [unsafe](#unsafe)
  - [unsafeHead](#unsafehead)
  - [unsafeLast](#unsafelast)
  - [unsafeTail](#unsafetail)
- [utils](#utils)
  - [List (namespace)](#list-namespace)
    - [Infer (type alias)](#infer-type-alias)
    - [With (type alias)](#with-type-alias)

---

# combinators

## compact

Removes all `None` values from the specified list.

**Signature**

```ts
export declare const compact: <A>(self: List<Option<A>>) => List<A>
```

Added in v2.0.0

## drop

Drops the first `n` elements from the specified list.

**Signature**

```ts
export declare const drop: { (n: number): <A>(self: List<A>) => List<A>; <A>(self: List<A>, n: number): List<A> }
```

Added in v2.0.0

## filter

Filters a list using the specified predicate.

**Signature**

```ts
export declare const filter: {
  <C extends A, B extends A, A = C>(refinement: Refinement<A, B>): (self: List<C>) => List<B>
  <B extends A, A = B>(predicate: Predicate<A>): (self: List<B>) => List<B>
  <C extends A, B extends A, A = C>(self: List<C>, refinement: Refinement<A, B>): List<B>
  <B extends A, A = B>(self: List<B>, predicate: Predicate<A>): List<B>
}
```

Added in v2.0.0

## filterMap

Filters and maps a list using the specified partial function. The resulting
list may be smaller than the input list due to the possibility of the partial
function not being defined for some elements.

**Signature**

```ts
export declare const filterMap: {
  <A, B>(f: (a: A) => Option<B>): (self: List<A>) => List<B>
  <A, B>(self: List<A>, f: (a: A) => Option<B>): List<B>
}
```

Added in v2.0.0

## forEach

Applies the specified function to each element of the `List`.

**Signature**

```ts
export declare const forEach: {
  <A, B>(f: (a: A) => B): (self: List<A>) => void
  <A, B>(self: List<A>, f: (a: A) => B): void
}
```

Added in v2.0.0

## map

Applies the specified mapping function to each element of the list.

**Signature**

```ts
export declare const map: {
  <T extends List<any>, B>(f: (a: List.Infer<T>, i: number) => B): (self: T) => List.With<T, B>
  <T extends List<any>, B>(self: T, f: (a: List.Infer<T>, i: number) => B): List.With<T, B>
}
```

Added in v2.0.0

## partition

Partition a list into two lists, where the first list contains all elements
that did not satisfy the specified predicate, and the second list contains
all elements that did satisfy the specified predicate.

**Signature**

```ts
export declare const partition: {
  <C extends A, B extends A, A = C>(refinement: Refinement<A, B>): (self: List<C>) => [List<Exclude<C, B>>, List<B>]
  <B extends A, A = B>(predicate: (a: A) => boolean): (self: List<B>) => [List<B>, List<B>]
  <C extends A, B extends A, A = C>(self: List<C>, refinement: Refinement<A, B>): [List<Exclude<C, B>>, List<B>]
  <B extends A, A = B>(self: List<B>, predicate: (a: A) => boolean): [List<B>, List<B>]
}
```

Added in v2.0.0

## partitionMap

Partition a list into two lists, where the first list contains all elements
for which the specified function returned a `Left`, and the second list
contains all elements for which the specified function returned a `Right`.

**Signature**

```ts
export declare const partitionMap: {
  <A, B, C>(f: (a: A) => Either<B, C>): (self: List<A>) => readonly [List<B>, List<C>]
  <A, B, C>(self: List<A>, f: (a: A) => Either<B, C>): readonly [List<B>, List<C>]
}
```

Added in v2.0.0

## splitAt

Splits the specified list into two lists at the specified index.

**Signature**

```ts
export declare const splitAt: {
  (n: number): <A>(self: List<A>) => readonly [List<A>, List<A>]
  <A>(self: List<A>, n: number): readonly [List<A>, List<A>]
}
```

Added in v2.0.0

## take

Takes the specified number of elements from the beginning of the specified
list.

**Signature**

```ts
export declare const take: { (n: number): <A>(self: List<A>) => List<A>; <A>(self: List<A>, n: number): List<A> }
```

Added in v2.0.0

# concatenating

## append

Appends the specified element to the end of the `List`, creating a new `Cons`.

**Signature**

```ts
export declare const append: {
  <B>(element: B): <A>(self: List<A>) => Cons<B | A>
  <A, B>(self: List<A>, element: B): Cons<A | B>
}
```

Added in v2.0.0

## appendAll

Concatentates the specified lists together.

**Signature**

```ts
export declare const appendAll: {
  <B>(that: List<B>): <A>(self: List<A>) => List<B | A>
  <A, B>(self: List<A>, that: List<B>): List<A | B>
}
```

Added in v2.0.0

## appendAllNonEmpty

**Signature**

```ts
export declare const appendAllNonEmpty: {
  <B>(that: Cons<B>): <A>(self: List<A>) => Cons<B | A>
  <B>(that: List<B>): <A>(self: Cons<A>) => Cons<B | A>
  <A, B>(self: List<A>, that: Cons<B>): Cons<A | B>
  <A, B>(self: Cons<A>, that: List<B>): Cons<A | B>
}
```

Added in v2.0.0

## prepend

Prepends the specified element to the beginning of the list.

**Signature**

```ts
export declare const prepend: {
  <B>(element: B): <A>(self: List<A>) => Cons<B | A>
  <A, B>(self: List<A>, element: B): Cons<A | B>
}
```

Added in v2.0.0

## prependAll

Prepends the specified prefix list to the beginning of the specified list.

**Signature**

```ts
export declare const prependAll: {
  <B>(prefix: List<B>): <A>(self: List<A>) => List<B | A>
  <A, B>(self: List<A>, prefix: List<B>): List<A | B>
}
```

Added in v2.0.0

## prependAllNonEmpty

**Signature**

```ts
export declare const prependAllNonEmpty: {
  <B>(that: Cons<B>): <A>(self: List<A>) => Cons<B | A>
  <B>(that: List<B>): <A>(self: Cons<A>) => Cons<B | A>
  <A, B>(self: List<A>, that: Cons<B>): Cons<A | B>
  <A, B>(self: Cons<A>, that: List<B>): Cons<A | B>
}
```

Added in v2.0.0

## prependAllReversed

Prepends the specified prefix list (in reverse order) to the beginning of the
specified list.

**Signature**

```ts
export declare const prependAllReversed: {
  <B>(prefix: List<B>): <A>(self: List<A>) => List<B | A>
  <A, B>(self: List<A>, prefix: List<B>): List<A | B>
}
```

Added in v2.0.0

# constructors

## cons

Constructs a new `List.Cons<A>` from the specified `head` and `tail` values.

**Signature**

```ts
export declare const cons: <A>(head: A, tail: List<A>) => Cons<A>
```

Added in v2.0.0

## empty

Constructs a new empty `List<A>`.

Alias of {@link nil}.

**Signature**

```ts
export declare const empty: <A = never>() => List<A>
```

Added in v2.0.0

## fromIterable

Constructs a new `List<A>` from the specified `Iterable<A>`.

**Signature**

```ts
export declare const fromIterable: <A>(prefix: Iterable<A>) => List<A>
```

Added in v2.0.0

## make

Constructs a new `List<A>` from the specified values.

**Signature**

```ts
export declare const make: <Elements extends readonly [any, ...any[]]>(...elements: Elements) => Cons<Elements[number]>
```

Added in v2.0.0

## nil

Constructs a new empty `List<A>`.

**Signature**

```ts
export declare const nil: <A = never>() => List<A>
```

Added in v2.0.0

## of

Constructs a new `List<A>` from the specified value.

**Signature**

```ts
export declare const of: <A>(value: A) => Cons<A>
```

Added in v2.0.0

# conversions

## toChunk

Converts the specified `List` to a `Chunk`.

**Signature**

```ts
export declare const toChunk: <A>(self: List<A>) => Chunk.Chunk<A>
```

Added in v2.0.0

## toReadonlyArray

Converts the specified `List` to a `ReadonlyArray`.

**Signature**

```ts
export declare const toReadonlyArray: <A>(self: List<A>) => readonly A[]
```

Added in v2.0.0

# elements

## every

Check if a predicate holds true for every `List` element.

**Signature**

```ts
export declare const every: {
  <A, B extends A>(refinement: Refinement<A, B>): (self: List<A>) => self is List<B>
  <A>(predicate: Predicate<A>): (self: List<A>) => boolean
  <A, B extends A>(self: List<A>, refinement: Refinement<A, B>): self is List<B>
  <A>(self: List<A>, predicate: Predicate<A>): boolean
}
```

Added in v2.0.0

## findFirst

Returns the first element that satisfies the specified
predicate, or `None` if no such element exists.

**Signature**

```ts
export declare const findFirst: {
  <A, B extends A>(refinement: Refinement<A, B>): (self: List<A>) => Option<B>
  <A>(predicate: Predicate<A>): (self: List<A>) => Option<A>
  <A, B extends A>(self: List<A>, refinement: Refinement<A, B>): Option<B>
  <A>(self: List<A>, predicate: Predicate<A>): Option<A>
}
```

Added in v2.0.0

## reverse

Returns a new list with the elements of the specified list in reverse order.

**Signature**

```ts
export declare const reverse: <A>(self: List<A>) => List<A>
```

Added in v2.0.0

## some

Check if a predicate holds true for some `List` element.

**Signature**

```ts
export declare const some: {
  <A>(predicate: Predicate<A>): <B extends A>(self: List<B>) => self is Cons<B>
  <B extends A, A = B>(self: List<B>, predicate: Predicate<A>): self is Cons<B>
}
```

Added in v2.0.0

# equivalence

## getEquivalence

**Signature**

```ts
export declare const getEquivalence: <A>(isEquivalent: Equivalence.Equivalence<A>) => Equivalence.Equivalence<List<A>>
```

Added in v2.0.0

# folding

## reduce

Folds over the elements of the list using the specified function, using the
specified initial value.

**Signature**

```ts
export declare const reduce: {
  <Z, A>(zero: Z, f: (b: Z, a: A) => Z): (self: List<A>) => Z
  <A, Z>(self: List<A>, zero: Z, f: (b: Z, a: A) => Z): Z
}
```

Added in v2.0.0

## reduceRight

Folds over the elements of the list using the specified function, beginning
with the last element of the list, using the specified initial value.

**Signature**

```ts
export declare const reduceRight: {
  <Z, A>(zero: Z, f: (accumulator: Z, value: A) => Z): (self: List<A>) => Z
  <Z, A>(self: List<A>, zero: Z, f: (accumulator: Z, value: A) => Z): Z
}
```

Added in v2.0.0

# getters

## head

Returns the first element of the specified list, or `None` if the list is
empty.

**Signature**

```ts
export declare const head: <A>(self: List<A>) => Option<A>
```

Added in v2.0.0

## last

Returns the last element of the specified list, or `None` if the list is
empty.

**Signature**

```ts
export declare const last: <A>(self: List<A>) => Option<A>
```

Added in v2.0.0

## size

Returns the number of elements contained in the specified `List`

**Signature**

```ts
export declare const size: <A>(self: List<A>) => number
```

Added in v2.0.0

## tail

Returns the tail of the specified list, or `None` if the list is empty.

**Signature**

```ts
export declare const tail: <A>(self: List<A>) => Option<List<A>>
```

Added in v2.0.0

# models

## Cons (interface)

**Signature**

```ts
export interface Cons<A> extends Iterable<A>, Equal.Equal, Pipeable, Inspectable {
  readonly [TypeId]: TypeId
  readonly _tag: "Cons"
  readonly head: A
  readonly tail: List<A>
}
```

Added in v2.0.0

## List (type alias)

Represents an immutable linked list of elements of type `A`.

A `List` is optimal for last-in-first-out (LIFO), stack-like access patterns.
If you need another access pattern, for example, random access or FIFO,
consider using a collection more suited for that other than `List`.

**Signature**

```ts
export type List<A> = Cons<A> | Nil<A>
```

Added in v2.0.0

## Nil (interface)

**Signature**

```ts
export interface Nil<A> extends Iterable<A>, Equal.Equal, Pipeable, Inspectable {
  readonly [TypeId]: TypeId
  readonly _tag: "Nil"
}
```

Added in v2.0.0

# refinements

## isCons

Returns `true` if the specified value is a `List.Cons<A>`, `false` otherwise.

**Signature**

```ts
export declare const isCons: <A>(self: List<A>) => self is Cons<A>
```

Added in v2.0.0

## isList

Returns `true` if the specified value is a `List`, `false` otherwise.

**Signature**

```ts
export declare const isList: { <A>(u: Iterable<A>): u is List<A>; (u: unknown): u is List<unknown> }
```

Added in v2.0.0

## isNil

Returns `true` if the specified value is a `List.Nil<A>`, `false` otherwise.

**Signature**

```ts
export declare const isNil: <A>(self: List<A>) => self is Nil<A>
```

Added in v2.0.0

# sequencing

## flatMap

Flat maps a list using the specified function.

**Signature**

```ts
export declare const flatMap: {
  <A, B>(f: (a: A) => List<B>): (self: List<A>) => List<B>
  <A, B>(self: List<A>, f: (a: A) => List<B>): List<B>
}
```

Added in v2.0.0

## flatMapNonEmpty

**Signature**

```ts
export declare const flatMapNonEmpty: {
  <A, B>(f: (a: A) => Cons<B>): (self: Cons<A>) => Cons<B>
  <A, B>(self: Cons<A>, f: (a: A) => Cons<B>): Cons<B>
}
```

Added in v2.0.0

# symbol

## TypeId

**Signature**

```ts
export declare const TypeId: typeof TypeId
```

Added in v2.0.0

## TypeId (type alias)

**Signature**

```ts
export type TypeId = typeof TypeId
```

Added in v2.0.0

# unsafe

## unsafeHead

Unsafely returns the first element of the specified `List`.

**Signature**

```ts
export declare const unsafeHead: <A>(self: List<A>) => A
```

Added in v2.0.0

## unsafeLast

Unsafely returns the last element of the specified `List`.

**Signature**

```ts
export declare const unsafeLast: <A>(self: List<A>) => A
```

Added in v2.0.0

## unsafeTail

Unsafely returns the tail of the specified `List`.

**Signature**

```ts
export declare const unsafeTail: <A>(self: List<A>) => List<A>
```

Added in v2.0.0

# utils

## List (namespace)

Added in v2.0.0

### Infer (type alias)

**Signature**

```ts
export type Infer<T extends List<any>> = T extends List<infer A> ? A : never
```

Added in v2.0.0

### With (type alias)

**Signature**

```ts
export type With<T extends List<any>, A> = T extends Cons<any> ? Cons<A> : List<A>
```

Added in v2.0.0
