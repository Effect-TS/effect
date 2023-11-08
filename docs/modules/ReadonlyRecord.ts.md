---
title: ReadonlyRecord.ts
nav_order: 83
parent: Modules
---

## ReadonlyRecord overview

This module provides utility functions for working with records in TypeScript.

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [empty](#empty)
  - [singleton](#singleton)
- [conversions](#conversions)
  - [collect](#collect)
  - [fromEntries](#fromentries)
  - [fromIterable](#fromiterable)
  - [toEntries](#toentries)
- [filtering](#filtering)
  - [compact](#compact)
  - [filter](#filter)
  - [partition](#partition)
  - [partitionMap](#partitionmap)
  - [separate](#separate)
- [folding](#folding)
  - [reduce](#reduce)
- [guards](#guards)
  - [isEmptyReadonlyRecord](#isemptyreadonlyrecord)
  - [isEmptyRecord](#isemptyrecord)
- [instances](#instances)
  - [getEquivalence](#getequivalence)
- [models](#models)
  - [ReadonlyRecord (interface)](#readonlyrecord-interface)
- [record](#record)
  - [pop](#pop)
- [type lambdas](#type-lambdas)
  - [ReadonlyRecordTypeLambda (interface)](#readonlyrecordtypelambda-interface)
- [utils](#utils)
  - [difference](#difference)
  - [every](#every)
  - [filterMap](#filtermap)
  - [get](#get)
  - [has](#has)
  - [intersection](#intersection)
  - [isSubrecord](#issubrecord)
  - [isSubrecordBy](#issubrecordby)
  - [keys](#keys)
  - [map](#map)
  - [modifyOption](#modifyoption)
  - [remove](#remove)
  - [replaceOption](#replaceoption)
  - [size](#size)
  - [some](#some)
  - [union](#union)
  - [update](#update)
  - [upsert](#upsert)
  - [values](#values)

---

# constructors

## empty

Creates a new, empty record.

**Signature**

```ts
export declare const empty: <A>() => Record<string, A>
```

Added in v2.0.0

## singleton

Create a non-empty record from a single element.

**Signature**

```ts
export declare const singleton: <K extends string, A>(key: K, value: A) => Record<K, A>
```

Added in v2.0.0

# conversions

## collect

Transforms the values of a record into an `Array` with a custom mapping function.

**Signature**

```ts
export declare const collect: {
  <K extends string, A, B>(f: (key: K, a: A) => B): (self: Record<K, A>) => B[]
  <K extends string, A, B>(self: Record<K, A>, f: (key: K, a: A) => B): B[]
}
```

**Example**

```ts
import { collect } from "effect/ReadonlyRecord"

const x = { a: 1, b: 2, c: 3 }
assert.deepStrictEqual(
  collect(x, (key, n) => [key, n]),
  [
    ["a", 1],
    ["b", 2],
    ["c", 3]
  ]
)
```

Added in v2.0.0

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
import { fromEntries } from "effect/ReadonlyRecord"

const input: Array<[string, number]> = [
  ["a", 1],
  ["b", 2]
]

assert.deepStrictEqual(fromEntries(input), { a: 1, b: 2 })
```

Added in v2.0.0

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
import { fromIterable } from "effect/ReadonlyRecord"

const input = [1, 2, 3, 4]

assert.deepStrictEqual(
  fromIterable(input, (a) => [String(a), a * 2]),
  { "1": 2, "2": 4, "3": 6, "4": 8 }
)
```

Added in v2.0.0

## toEntries

Takes a record and returns an array of tuples containing its keys and values.

**Signature**

```ts
export declare const toEntries: <K extends string, A>(self: Record<K, A>) => [K, A][]
```

**Example**

```ts
import { toEntries } from "effect/ReadonlyRecord"

const x = { a: 1, b: 2, c: 3 }
assert.deepStrictEqual(toEntries(x), [
  ["a", 1],
  ["b", 2],
  ["c", 3]
])
```

Added in v2.0.0

# filtering

## compact

Given a record with `Option` values, returns a record with only the `Some` values, with the same keys.

**Signature**

```ts
export declare const compact: <A>(self: ReadonlyRecord<Option<A>>) => Record<string, A>
```

**Example**

```ts
import { compact } from "effect/ReadonlyRecord"
import { some, none } from "effect/Option"

assert.deepStrictEqual(compact({ a: some(1), b: none(), c: some(2) }), { a: 1, c: 2 })
```

Added in v2.0.0

## filter

Selects properties from a record whose values match the given predicate.

**Signature**

```ts
export declare const filter: {
  <K extends string, C extends A, B extends A, A = C>(
    refinement: (a: A, key: K) => a is B
  ): (self: Record<K, C>) => Record<string, B>
  <K extends string, B extends A, A = B>(
    predicate: (a: A, key: K) => boolean
  ): (self: Record<K, B>) => Record<string, B>
  <K extends string, C extends A, B extends A, A = C>(
    self: Record<K, C>,
    refinement: (a: A, key: K) => a is B
  ): Record<string, B>
  <K extends string, B extends A, A = B>(self: Record<K, B>, predicate: (a: A, key: K) => boolean): Record<string, B>
}
```

**Example**

```ts
import { filter } from "effect/ReadonlyRecord"

const x = { a: 1, b: 2, c: 3, d: 4 }
assert.deepStrictEqual(
  filter(x, (n) => n > 2),
  { c: 3, d: 4 }
)
```

Added in v2.0.0

## partition

Partitions a record into two separate records based on the result of a predicate function.

**Signature**

```ts
export declare const partition: {
  <K extends string, C extends A, B extends A, A = C>(
    refinement: (a: A, key: K) => a is B
  ): (self: Record<K, C>) => [Record<string, C>, Record<string, B>]
  <K extends string, B extends A, A = B>(
    predicate: (a: A, key: K) => boolean
  ): (self: Record<K, B>) => [Record<string, B>, Record<string, B>]
  <K extends string, C extends A, B extends A, A = C>(
    self: Record<K, C>,
    refinement: (a: A, key: K) => a is B
  ): [Record<string, C>, Record<string, B>]
  <K extends string, B extends A, A = B>(
    self: Record<K, B>,
    predicate: (a: A, key: K) => boolean
  ): [Record<string, B>, Record<string, B>]
}
```

**Example**

```ts
import { partition } from "effect/ReadonlyRecord"

assert.deepStrictEqual(
  partition({ a: 1, b: 3 }, (n) => n > 2),
  [{ a: 1 }, { b: 3 }]
)
```

Added in v2.0.0

## partitionMap

Partitions the elements of a record into two groups: those that match a predicate, and those that don't.

**Signature**

```ts
export declare const partitionMap: {
  <K extends string, A, B, C>(
    f: (a: A, key: K) => Either<B, C>
  ): (self: Record<K, A>) => [Record<string, B>, Record<string, C>]
  <K extends string, A, B, C>(
    self: Record<K, A>,
    f: (a: A, key: K) => Either<B, C>
  ): [Record<string, B>, Record<string, C>]
}
```

**Example**

```ts
import { partitionMap } from "effect/ReadonlyRecord"
import { left, right } from "effect/Either"

const x = { a: 1, b: 2, c: 3 }
const f = (n: number) => (n % 2 === 0 ? right(n) : left(n))
assert.deepStrictEqual(partitionMap(x, f), [{ a: 1, c: 3 }, { b: 2 }])
```

Added in v2.0.0

## separate

Partitions a record of `Either` values into two separate records,
one with the `Left` values and one with the `Right` values.

**Signature**

```ts
export declare const separate: <A, B>(self: ReadonlyRecord<Either<A, B>>) => [Record<string, A>, Record<string, B>]
```

**Example**

```ts
import { separate } from "effect/ReadonlyRecord"
import { left, right } from "effect/Either"

assert.deepStrictEqual(separate({ a: left("e"), b: right(1) }), [{ a: "e" }, { b: 1 }])
```

Added in v2.0.0

# folding

## reduce

Reduce a record to a single value by combining its entries with a specified function.

**Signature**

```ts
export declare const reduce: {
  <Z, V, K extends string>(zero: Z, f: (accumulator: Z, value: V, key: K) => Z): (self: Record<K, V>) => Z
  <K extends string, V, Z>(self: Record<K, V>, zero: Z, f: (accumulator: Z, value: V, key: K) => Z): Z
}
```

Added in v2.0.0

# guards

## isEmptyReadonlyRecord

Determine if a record is empty.

**Signature**

```ts
export declare const isEmptyReadonlyRecord: <A>(self: ReadonlyRecord<A>) => self is ReadonlyRecord<never>
```

**Example**

```ts
import { isEmptyReadonlyRecord } from "effect/ReadonlyRecord"

assert.deepStrictEqual(isEmptyReadonlyRecord({}), true)
assert.deepStrictEqual(isEmptyReadonlyRecord({ a: 3 }), false)
```

Added in v2.0.0

## isEmptyRecord

Determine if a record is empty.

**Signature**

```ts
export declare const isEmptyRecord: <A>(self: Record<string, A>) => self is Record<string, never>
```

**Example**

```ts
import { isEmptyRecord } from "effect/ReadonlyRecord"

assert.deepStrictEqual(isEmptyRecord({}), true)
assert.deepStrictEqual(isEmptyRecord({ a: 3 }), false)
```

Added in v2.0.0

# instances

## getEquivalence

Create an `Equivalence` for records using the provided `Equivalence` for values.

**Signature**

```ts
export declare const getEquivalence: <A>(equivalence: Equivalence<A>) => Equivalence<ReadonlyRecord<A>>
```

Added in v2.0.0

# models

## ReadonlyRecord (interface)

**Signature**

```ts
export interface ReadonlyRecord<A> {
  readonly [x: string]: A
}
```

Added in v2.0.0

# record

## pop

Retrieves the value of the property with the given `key` from a record and returns an `Option`
of a tuple with the value and the record with the removed property.
If the key is not present, returns `O.none`.

**Signature**

```ts
export declare const pop: {
  (key: string): <A>(self: ReadonlyRecord<A>) => Option<[A, Record<string, A>]>
  <A>(self: ReadonlyRecord<A>, key: string): Option<[A, Record<string, A>]>
}
```

**Example**

```ts
import { pop } from "effect/ReadonlyRecord"
import { some, none } from "effect/Option"

assert.deepStrictEqual(pop({ a: 1, b: 2 }, "a"), some([1, { b: 2 }]))
assert.deepStrictEqual(pop({ a: 1, b: 2 }, "c"), none())
```

Added in v2.0.0

# type lambdas

## ReadonlyRecordTypeLambda (interface)

**Signature**

```ts
export interface ReadonlyRecordTypeLambda extends TypeLambda {
  readonly type: ReadonlyRecord<this["Target"]>
}
```

Added in v2.0.0

# utils

## difference

Merge two records, preserving only the entries that are unique to each record.

**Signature**

```ts
export declare const difference: {
  <A>(that: ReadonlyRecord<A>): (self: ReadonlyRecord<A>) => Record<string, A>
  <A>(self: ReadonlyRecord<A>, that: ReadonlyRecord<A>): Record<string, A>
}
```

Added in v2.0.0

## every

Check if all entries in a record meet a specific condition.

**Signature**

```ts
export declare const every: {
  <A, K extends string>(predicate: (value: A, key: K) => boolean): (self: Record<K, A>) => boolean
  <K extends string, A>(self: Record<K, A>, predicate: (value: A, key: K) => boolean): boolean
}
```

Added in v2.0.0

## filterMap

Transforms a record into a record by applying the function `f` to each key and value in the original record.
If the function returns `Some`, the key-value pair is included in the output record.

**Signature**

```ts
export declare const filterMap: {
  <K extends string, A, B>(f: (a: A, key: K) => Option<B>): (self: Record<K, A>) => Record<string, B>
  <K extends string, A, B>(self: Record<K, A>, f: (a: A, key: K) => Option<B>): Record<string, B>
}
```

**Example**

```ts
import { filterMap } from "effect/ReadonlyRecord"
import { some, none } from "effect/Option"

const x = { a: 1, b: 2, c: 3 }
const f = (a: number, key: string) => (a > 2 ? some(a * 2) : none())
assert.deepStrictEqual(filterMap(x, f), { c: 6 })
```

Added in v2.0.0

## get

Retrieve a value at a particular key from a record, returning it wrapped in an `Option`.

**Signature**

```ts
export declare const get: {
  (key: string): <A>(self: ReadonlyRecord<A>) => Option<A>
  <A>(self: ReadonlyRecord<A>, key: string): Option<A>
}
```

**Example**

```ts
import { get } from "effect/ReadonlyRecord"
import { some, none } from "effect/Option"

const person = { name: "John Doe", age: 35 }

assert.deepStrictEqual(get(person, "name"), some("John Doe"))
assert.deepStrictEqual(get(person, "email"), none())
```

Added in v2.0.0

## has

Check if a given `key` exists in a record.

**Signature**

```ts
export declare const has: {
  (key: string): <A>(self: ReadonlyRecord<A>) => boolean
  <A>(self: ReadonlyRecord<A>, key: string): boolean
}
```

**Example**

```ts
import { has } from "effect/ReadonlyRecord"

assert.deepStrictEqual(has({ a: 1, b: 2 }, "a"), true)
assert.deepStrictEqual(has({ a: 1, b: 2 }, "c"), false)
```

Added in v2.0.0

## intersection

Merge two records, retaining only the entries that exist in both records.

**Signature**

```ts
export declare const intersection: {
  <A>(
    that: ReadonlyRecord<A>,
    combine: (selfValue: A, thatValue: A) => A
  ): (self: ReadonlyRecord<A>) => Record<string, A>
  <A>(self: ReadonlyRecord<A>, that: ReadonlyRecord<A>, combine: (selfValue: A, thatValue: A) => A): Record<string, A>
}
```

Added in v2.0.0

## isSubrecord

Check if one record is a subrecord of another, meaning it contains all the keys and values found in the second record.
This comparison uses default equality checks (`Equal.equivalence()`).

**Signature**

```ts
export declare const isSubrecord: {
  <A>(that: ReadonlyRecord<A>): (self: ReadonlyRecord<A>) => boolean
  <A>(self: ReadonlyRecord<A>, that: ReadonlyRecord<A>): boolean
}
```

Added in v2.0.0

## isSubrecordBy

Check if all the keys and values in one record are also found in another record.

**Signature**

```ts
export declare const isSubrecordBy: <A>(equivalence: Equivalence<A>) => {
  (that: ReadonlyRecord<A>): (self: ReadonlyRecord<A>) => boolean
  (self: ReadonlyRecord<A>, that: ReadonlyRecord<A>): boolean
}
```

Added in v2.0.0

## keys

Retrieve the keys of a given record as an array.

**Signature**

```ts
export declare const keys: <A>(self: ReadonlyRecord<A>) => Array<string>
```

Added in v2.0.0

## map

Maps a record into another record by applying a transformation function to each of its values.

**Signature**

```ts
export declare const map: {
  <K extends string, A, B>(f: (a: A, key: K) => B): (self: Record<K, A>) => Record<K, B>
  <K extends string, A, B>(self: Record<K, A>, f: (a: A, key: K) => B): Record<K, B>
}
```

**Example**

```ts
import { map } from "effect/ReadonlyRecord"

const f = (n: number) => `-${n}`

assert.deepStrictEqual(map({ a: 3, b: 5 }, f), { a: "-3", b: "-5" })

const g = (n: number, key: string) => `${key.toUpperCase()}-${n}`

assert.deepStrictEqual(map({ a: 3, b: 5 }, g), { a: "A-3", b: "B-5" })
```

Added in v2.0.0

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
import { modifyOption } from "effect/ReadonlyRecord"
import { some, none } from "effect/Option"

const f = (x: number) => x * 2

assert.deepStrictEqual(modifyOption({ a: 3 }, "a", f), some({ a: 6 }))
assert.deepStrictEqual(modifyOption({ a: 3 }, "b", f), none())
```

Added in v2.0.0

## remove

Removes a key from a record and returns a new record

**Signature**

```ts
export declare const remove: {
  (key: string): <A>(self: ReadonlyRecord<A>) => Record<string, A>
  <A>(self: ReadonlyRecord<A>, key: string): Record<string, A>
}
```

**Example**

```ts
import { remove } from "effect/ReadonlyRecord"

assert.deepStrictEqual(remove({ a: 1, b: 2 }, "a"), { b: 2 })
```

Added in v2.0.0

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
import { replaceOption } from "effect/ReadonlyRecord"
import { some, none } from "effect/Option"

assert.deepStrictEqual(replaceOption({ a: 1, b: 2, c: 3 }, "a", 10), some({ a: 10, b: 2, c: 3 }))
assert.deepStrictEqual(replaceOption({}, "a", 10), none())
```

Added in v2.0.0

## size

Returns the number of key/value pairs in a record.

**Signature**

```ts
export declare const size: <A>(self: ReadonlyRecord<A>) => number
```

**Example**

```ts
import { size } from "effect/ReadonlyRecord"

assert.deepStrictEqual(size({ a: "a", b: 1, c: true }), 3)
```

Added in v2.0.0

## some

Check if any entry in a record meets a specific condition.

**Signature**

```ts
export declare const some: {
  <A, K extends string>(predicate: (value: A, key: K) => boolean): (self: Record<K, A>) => boolean
  <K extends string, A>(self: Record<K, A>, predicate: (value: A, key: K) => boolean): boolean
}
```

Added in v2.0.0

## union

Merge two records, preserving entries that exist in either of the records.

**Signature**

```ts
export declare const union: {
  <K1 extends string, V0, V1>(
    that: Record<K1, V1>,
    combine: (selfValue: V0, thatValue: V1) => V0 | V1
  ): <K0 extends string>(self: Record<K0, V0>) => Record<K1 | K0, V0 | V1>
  <K0 extends string, V0, K1 extends string, V1>(
    self: Record<K0, V0>,
    that: Record<K1, V1>,
    combine: (selfValue: V0, thatValue: V1) => V0 | V1
  ): Record<K0 | K1, V0 | V1>
}
```

Added in v2.0.0

## update

Replace a key's value in a record and return the updated record.

**Signature**

```ts
export declare const update: {
  <B>(key: string, value: B): <A>(self: ReadonlyRecord<A>) => Record<string, B | A>
  <A, B>(self: ReadonlyRecord<A>, key: string, value: B): Record<string, A | B>
}
```

**Example**

```ts
import { update } from "effect/ReadonlyRecord"
import { some, none } from "effect/Option"

assert.deepStrictEqual(update("a", 3)({ a: 1, b: 2 }), { a: 3, b: 2 })
assert.deepStrictEqual(update("c", 3)({ a: 1, b: 2 }), { a: 1, b: 2 })
```

Added in v2.0.0

## upsert

Add a new key-value pair or update an existing key's value in a record.

**Signature**

```ts
export declare const upsert: {
  <B>(key: string, value: B): <A>(self: ReadonlyRecord<A>) => Record<string, B | A>
  <A, B>(self: ReadonlyRecord<A>, key: string, value: B): Record<string, A | B>
}
```

**Example**

```ts
import { upsert } from "effect/ReadonlyRecord"

assert.deepStrictEqual(upsert("a", 5)({ a: 1, b: 2 }), { a: 5, b: 2 })
assert.deepStrictEqual(upsert("c", 5)({ a: 1, b: 2 }), { a: 1, b: 2, c: 5 })
```

Added in v2.0.0

## values

Retrieve the values of a given record as an array.

**Signature**

```ts
export declare const values: <A>(self: ReadonlyRecord<A>) => A[]
```

Added in v2.0.0
