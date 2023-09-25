---
title: ReadonlyRecord.ts
nav_order: 36
parent: Modules
---

## ReadonlyRecord overview

This module provides utility functions for working with records in TypeScript.

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [empty](#empty)
- [conversions](#conversions)
  - [collect](#collect)
  - [fromEntries](#fromentries)
  - [fromIterable](#fromiterable)
  - [toArray](#toarray)
  - [toEntries](#toentries)
- [filtering](#filtering)
  - [compact](#compact)
  - [filter](#filter)
  - [partition](#partition)
  - [partitionMap](#partitionmap)
  - [separate](#separate)
- [guards](#guards)
  - [isEmptyReadonlyRecord](#isemptyreadonlyrecord)
  - [isEmptyRecord](#isemptyrecord)
- [models](#models)
  - [ReadonlyRecord (interface)](#readonlyrecord-interface)
- [record](#record)
  - [pop](#pop)
- [type lambdas](#type-lambdas)
  - [ReadonlyRecordTypeLambda (interface)](#readonlyrecordtypelambda-interface)
- [utils](#utils)
  - [filterMap](#filtermap)
  - [get](#get)
  - [has](#has)
  - [map](#map)
  - [modifyOption](#modifyoption)
  - [remove](#remove)
  - [replaceOption](#replaceoption)
  - [size](#size)

---

# constructors

## empty

Creates a new, empty record.

**Signature**

```ts
export declare const empty: <A>() => Record<string, A>
```

Added in v1.0.0

# conversions

## collect

Transforms the values of a `ReadonlyRecord` into an `Array` with a custom mapping function.

**Signature**

```ts
export declare const collect: {
  <K extends string, A, B>(f: (key: K, a: A) => B): (self: Record<K, A>) => B[]
  <K extends string, A, B>(self: Record<K, A>, f: (key: K, a: A) => B): B[]
}
```

**Example**

```ts
import { collect } from 'effect/ReadonlyRecord'

const x = { a: 1, b: 2, c: 3 }
assert.deepStrictEqual(
  collect(x, (key, n) => [key, n]),
  [
    ['a', 1],
    ['b', 2],
    ['c', 3],
  ]
)
```

Added in v1.0.0

## fromEntries

Builds a record from an iterable of key-value pairs.

If there are conflicting keys when using `fromEntries`, the last occurrence of the key/value pair will overwrite the
previous ones. So the resulting record will only have the value of the last occurrence of each key.

**Signature**

```ts
export declare const fromEntries: <A>(self: Iterable<readonly [string, A]>) => Record<string, A>
```

**Example**

```ts
import { fromEntries } from 'effect/ReadonlyRecord'

const input: Array<[string, number]> = [
  ['a', 1],
  ['b', 2],
]

assert.deepStrictEqual(fromEntries(input), { a: 1, b: 2 })
```

Added in v1.0.0

## fromIterable

Takes an iterable and a projection function and returns a record.
The projection function maps each value of the iterable to a tuple of a key and a value, which is then added to the resulting record.

**Signature**

```ts
export declare const fromIterable: {
  <A, B>(f: (a: A) => readonly [string, B]): (self: Iterable<A>) => Record<string, B>
  <A, B>(self: Iterable<A>, f: (a: A) => readonly [string, B]): Record<string, B>
}
```

**Example**

```ts
import { fromIterable } from 'effect/ReadonlyRecord'

const input = [1, 2, 3, 4]

assert.deepStrictEqual(
  fromIterable(input, (a) => [String(a), a * 2]),
  { '1': 2, '2': 4, '3': 6, '4': 8 }
)
```

Added in v1.0.0

## toArray

Takes a record and returns an array of tuples containing its keys and values.

Alias of {@link toEntries}.

**Signature**

```ts
export declare const toArray: <K extends string, A>(self: Record<K, A>) => [K, A][]
```

**Example**

```ts
import { toArray } from 'effect/ReadonlyRecord'

const x = { a: 1, b: 2, c: 3 }
assert.deepStrictEqual(toArray(x), [
  ['a', 1],
  ['b', 2],
  ['c', 3],
])
```

Added in v1.0.0

## toEntries

Takes a record and returns an array of tuples containing its keys and values.

**Signature**

```ts
export declare const toEntries: <K extends string, A>(self: Record<K, A>) => [K, A][]
```

**Example**

```ts
import { toEntries } from 'effect/ReadonlyRecord'

const x = { a: 1, b: 2, c: 3 }
assert.deepStrictEqual(toEntries(x), [
  ['a', 1],
  ['b', 2],
  ['c', 3],
])
```

Added in v1.0.0

# filtering

## compact

Given a `ReadonlyRecord` with `Option` values, returns a `Record` with only the `Some` values, with the same keys.

**Signature**

```ts
export declare const compact: <A>(self: ReadonlyRecord<Option<A>>) => Record<string, A>
```

**Example**

```ts
import { compact } from 'effect/ReadonlyRecord'
import { some, none } from 'effect/Option'

assert.deepStrictEqual(compact({ a: some(1), b: none(), c: some(2) }), { a: 1, c: 2 })
```

Added in v1.0.0

## filter

Selects properties from a record whose values match the given predicate.

**Signature**

```ts
export declare const filter: {
  <K extends string, C extends A, B extends A, A = C>(refinement: (a: A, key: K) => a is B): (
    self: Record<K, C>
  ) => Record<string, B>
  <K extends string, B extends A, A = B>(predicate: (a: A, key: K) => boolean): (
    self: Record<K, B>
  ) => Record<string, B>
  <K extends string, C extends A, B extends A, A = C>(self: Record<K, C>, refinement: (a: A, key: K) => a is B): Record<
    string,
    B
  >
  <K extends string, B extends A, A = B>(self: Record<K, B>, predicate: (a: A, key: K) => boolean): Record<string, B>
}
```

**Example**

```ts
import { filter } from 'effect/ReadonlyRecord'

const x = { a: 1, b: 2, c: 3, d: 4 }
assert.deepStrictEqual(
  filter(x, (n) => n > 2),
  { c: 3, d: 4 }
)
```

Added in v1.0.0

## partition

Partitions a `ReadonlyRecord` into two separate `Record`s based on the result of a predicate function.

**Signature**

```ts
export declare const partition: {
  <K extends string, C extends A, B extends A, A = C>(refinement: (a: A, key: K) => a is B): (
    self: Record<K, C>
  ) => [Record<string, C>, Record<string, B>]
  <K extends string, B extends A, A = B>(predicate: (a: A, key: K) => boolean): (
    self: Record<K, B>
  ) => [Record<string, B>, Record<string, B>]
  <K extends string, C extends A, B extends A, A = C>(self: Record<K, C>, refinement: (a: A, key: K) => a is B): [
    Record<string, C>,
    Record<string, B>
  ]
  <K extends string, B extends A, A = B>(self: Record<K, B>, predicate: (a: A, key: K) => boolean): [
    Record<string, B>,
    Record<string, B>
  ]
}
```

**Example**

```ts
import { partition } from 'effect/ReadonlyRecord'

assert.deepStrictEqual(
  partition({ a: 1, b: 3 }, (n) => n > 2),
  [{ a: 1 }, { b: 3 }]
)
```

Added in v1.0.0

## partitionMap

Partitions the elements of a `ReadonlyRecord` into two groups: those that match a predicate, and those that don't.

**Signature**

```ts
export declare const partitionMap: {
  <K extends string, A, B, C>(f: (a: A, key: K) => Either<B, C>): (
    self: Record<K, A>
  ) => [Record<string, B>, Record<string, C>]
  <K extends string, A, B, C>(self: Record<K, A>, f: (a: A, key: K) => Either<B, C>): [
    Record<string, B>,
    Record<string, C>
  ]
}
```

**Example**

```ts
import { partitionMap } from 'effect/ReadonlyRecord'
import { left, right } from 'effect/Either'

const x = { a: 1, b: 2, c: 3 }
const f = (n: number) => (n % 2 === 0 ? right(n) : left(n))
assert.deepStrictEqual(partitionMap(x, f), [{ a: 1, c: 3 }, { b: 2 }])
```

Added in v1.0.0

## separate

Partitions a `ReadonlyRecord` of `Either` values into two separate records,
one with the `Left` values and one with the `Right` values.

**Signature**

```ts
export declare const separate: <A, B>(self: ReadonlyRecord<Either<A, B>>) => [Record<string, A>, Record<string, B>]
```

**Example**

```ts
import { separate } from 'effect/ReadonlyRecord'
import { left, right } from 'effect/Either'

assert.deepStrictEqual(separate({ a: left('e'), b: right(1) }), [{ a: 'e' }, { b: 1 }])
```

Added in v1.0.0

# guards

## isEmptyReadonlyRecord

Determine if a `ReadonlyRecord` is empty.

**Signature**

```ts
export declare const isEmptyReadonlyRecord: <A>(self: ReadonlyRecord<A>) => self is ReadonlyRecord<never>
```

**Example**

```ts
import { isEmptyReadonlyRecord } from 'effect/ReadonlyRecord'

assert.deepStrictEqual(isEmptyReadonlyRecord({}), true)
assert.deepStrictEqual(isEmptyReadonlyRecord({ a: 3 }), false)
```

Added in v1.0.0

## isEmptyRecord

Determine if a `Record` is empty.

**Signature**

```ts
export declare const isEmptyRecord: <A>(self: Record<string, A>) => self is Record<string, never>
```

**Example**

```ts
import { isEmptyRecord } from 'effect/ReadonlyRecord'

assert.deepStrictEqual(isEmptyRecord({}), true)
assert.deepStrictEqual(isEmptyRecord({ a: 3 }), false)
```

Added in v1.0.0

# models

## ReadonlyRecord (interface)

**Signature**

```ts
export interface ReadonlyRecord<A> {
  readonly [x: string]: A
}
```

Added in v1.0.0

# record

## pop

Retrieves the value of the property with the given `key` from a `ReadonlyRecord` and returns an `Option`
of a tuple with the value and the `ReadonlyRecord` with the removed property.
If the key is not present, returns `O.none`.

**Signature**

```ts
export declare const pop: {
  (key: string): <A>(self: ReadonlyRecord<A>) => Option<readonly [A, ReadonlyRecord<A>]>
  <A>(self: ReadonlyRecord<A>, key: string): Option<readonly [A, ReadonlyRecord<A>]>
}
```

**Example**

```ts
import { pop } from 'effect/ReadonlyRecord'
import { some, none } from 'effect/Option'

assert.deepStrictEqual(pop({ a: 1, b: 2 }, 'a'), some([1, { b: 2 }]))
assert.deepStrictEqual(pop({ a: 1, b: 2 }, 'c'), none())
```

Added in v1.0.0

# type lambdas

## ReadonlyRecordTypeLambda (interface)

**Signature**

```ts
export interface ReadonlyRecordTypeLambda extends TypeLambda {
  readonly type: ReadonlyRecord<this['Target']>
}
```

Added in v1.0.0

# utils

## filterMap

Transforms a `ReadonlyRecord` into a `Record` by applying the function `f` to each key and value in the original `ReadonlyRecord`.
If the function returns `Some`, the key-value pair is included in the output `Record`.

**Signature**

```ts
export declare const filterMap: {
  <K extends string, A, B>(f: (a: A, key: K) => Option<B>): (self: Record<K, A>) => Record<string, B>
  <K extends string, A, B>(self: Record<K, A>, f: (a: A, key: K) => Option<B>): Record<string, B>
}
```

**Example**

```ts
import { filterMap } from 'effect/ReadonlyRecord'
import { some, none } from 'effect/Option'

const x = { a: 1, b: 2, c: 3 }
const f = (a: number, key: string) => (a > 2 ? some(a * 2) : none())
assert.deepStrictEqual(filterMap(x, f), { c: 6 })
```

Added in v1.0.0

## get

Retrieve a value at a particular key from a `ReadonlyRecord`, returning it wrapped in an `Option`.

**Signature**

```ts
export declare const get: {
  (key: string): <A>(self: ReadonlyRecord<A>) => Option<A>
  <A>(self: ReadonlyRecord<A>, key: string): Option<A>
}
```

**Example**

```ts
import { get } from 'effect/ReadonlyRecord'
import { some, none } from 'effect/Option'

const person = { name: 'John Doe', age: 35 }

assert.deepStrictEqual(get(person, 'name'), some('John Doe'))
assert.deepStrictEqual(get(person, 'email'), none())
```

Added in v1.0.0

## has

Check if a given `key` exists in a `ReadonlyRecord`.

**Signature**

```ts
export declare const has: {
  (key: string): <A>(self: ReadonlyRecord<A>) => boolean
  <A>(self: ReadonlyRecord<A>, key: string): boolean
}
```

**Example**

```ts
import { has } from 'effect/ReadonlyRecord'

assert.deepStrictEqual(has({ a: 1, b: 2 }, 'a'), true)
assert.deepStrictEqual(has({ a: 1, b: 2 }, 'c'), false)
```

Added in v1.0.0

## map

Maps a `ReadonlyRecord` into another `Record` by applying a transformation function to each of its values.

**Signature**

```ts
export declare const map: {
  <K extends string, A, B>(f: (a: A, key: K) => B): (self: Record<K, A>) => Record<K, B>
  <K extends string, A, B>(self: Record<K, A>, f: (a: A, key: K) => B): Record<K, B>
}
```

**Example**

```ts
import { map } from 'effect/ReadonlyRecord'

const f = (n: number) => `-${n}`

assert.deepStrictEqual(map({ a: 3, b: 5 }, f), { a: '-3', b: '-5' })

const g = (n: number, key: string) => `${key.toUpperCase()}-${n}`

assert.deepStrictEqual(map({ a: 3, b: 5 }, g), { a: 'A-3', b: 'B-5' })
```

Added in v1.0.0

## modifyOption

Apply a function to the element at the specified key, creating a new record,
or return `None` if the key doesn't exist.

**Signature**

```ts
export declare const modifyOption: {
  <A, B>(key: string, f: (a: A) => B): (self: ReadonlyRecord<A>) => Option<Record<string, A | B>>
  <A, B>(self: ReadonlyRecord<A>, key: string, f: (a: A) => B): Option<Record<string, A | B>>
}
```

**Example**

```ts
import { modifyOption } from 'effect/ReadonlyRecord'
import { some, none } from 'effect/Option'

const f = (x: number) => x * 2

assert.deepStrictEqual(modifyOption({ a: 3 }, 'a', f), some({ a: 6 }))
assert.deepStrictEqual(modifyOption({ a: 3 }, 'b', f), none())
```

Added in v1.0.0

## remove

Removes a key from a `ReadonlyRecord` and returns a new `Record`

**Signature**

```ts
export declare const remove: {
  (key: string): <A>(self: ReadonlyRecord<A>) => Record<string, A>
  <A>(self: ReadonlyRecord<A>, key: string): Record<string, A>
}
```

**Example**

```ts
import { remove } from 'effect/ReadonlyRecord'

assert.deepStrictEqual(remove({ a: 1, b: 2 }, 'a'), { b: 2 })
```

Added in v1.0.0

## replaceOption

Replaces a value in the record with the new value passed as parameter.

**Signature**

```ts
export declare const replaceOption: {
  <B>(key: string, b: B): <A>(self: ReadonlyRecord<A>) => Option<Record<string, B | A>>
  <A, B>(self: ReadonlyRecord<A>, key: string, b: B): Option<Record<string, A | B>>
}
```

**Example**

```ts
import { replaceOption } from 'effect/ReadonlyRecord'
import { some, none } from 'effect/Option'

assert.deepStrictEqual(replaceOption({ a: 1, b: 2, c: 3 }, 'a', 10), some({ a: 10, b: 2, c: 3 }))
assert.deepStrictEqual(replaceOption({}, 'a', 10), none())
```

Added in v1.0.0

## size

Returns the number of key/value pairs in a `ReadonlyRecord`.

**Signature**

```ts
export declare const size: <A>(self: ReadonlyRecord<A>) => number
```

**Example**

```ts
import { size } from 'effect/ReadonlyRecord'

assert.deepStrictEqual(size({ a: 'a', b: 1, c: true }), 3)
```

Added in v1.0.0
