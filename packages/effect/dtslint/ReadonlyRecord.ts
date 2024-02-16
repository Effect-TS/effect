import type * as Brand from "effect/Brand"
import * as Either from "effect/Either"
import { hole, pipe } from "effect/Function"
import * as Option from "effect/Option"
import * as Predicate from "effect/Predicate"
import * as ReadonlyRecord from "effect/ReadonlyRecord"

declare const numbers: Record<string, number>
declare const numbersOrStrings: Record<string, number | string>
declare const structAB: Record<"a" | "b", number>
declare const structCD: Record<"c" | "d", string>

declare const predicateNumbersOrStrings: Predicate.Predicate<number | string>

const symA = Symbol.for("a")
const symB = Symbol.for("b")

// -------------------------------------------------------------------------------------
// NonLiteralKey
// -------------------------------------------------------------------------------------

// $ExpectType string
hole<ReadonlyRecord.ReadonlyRecord.NonLiteralKey<string>>()

// $ExpectType symbol
hole<ReadonlyRecord.ReadonlyRecord.NonLiteralKey<symbol>>()

// $ExpectType string
hole<ReadonlyRecord.ReadonlyRecord.NonLiteralKey<"a">>()

// $ExpectType string
hole<ReadonlyRecord.ReadonlyRecord.NonLiteralKey<"a" | "b">>()

// $ExpectType symbol
hole<ReadonlyRecord.ReadonlyRecord.NonLiteralKey<typeof symA>>()

// $ExpectType symbol
hole<ReadonlyRecord.ReadonlyRecord.NonLiteralKey<typeof symA | typeof symB>>()

// $ExpectType string | symbol
hole<ReadonlyRecord.ReadonlyRecord.NonLiteralKey<"a" | typeof symA>>()

// $ExpectType string
hole<ReadonlyRecord.ReadonlyRecord.NonLiteralKey<`${string}`>>()

// $ExpectType `a${string}`
hole<ReadonlyRecord.ReadonlyRecord.NonLiteralKey<`a${string}`>>()

// $ExpectType `${string}a`
hole<ReadonlyRecord.ReadonlyRecord.NonLiteralKey<`${string}a`>>()

// $ExpectType `a${string}b${string}`
hole<ReadonlyRecord.ReadonlyRecord.NonLiteralKey<`a${string}b${string}`>>()

// $ExpectType `a${number}`
hole<ReadonlyRecord.ReadonlyRecord.NonLiteralKey<`a${number}`>>()

// $ExpectType `a${number}b${string}c${number}`
hole<ReadonlyRecord.ReadonlyRecord.NonLiteralKey<`a${number}b${string}c${number}`>>()

// -------------------------------------------------------------------------------------
// map
// -------------------------------------------------------------------------------------

// $ExpectType Record<string, boolean>
ReadonlyRecord.map(numbers, (
  value, // $ExpectType number
  _key // $ExpectType string
) => value > 0)

// $ExpectType Record<string, boolean>
pipe(
  numbers,
  ReadonlyRecord.map((
    value, // $ExpectType number
    _key // $ExpectType string
  ) => value > 0)
)

// $ExpectType Record<"a" | "b", boolean>
ReadonlyRecord.map(structAB, (
  value, // $ExpectType number
  _key // $ExpectType "a" | "b"
) => value > 0)

// $ExpectType Record<"a" | "b", boolean>
pipe(
  structAB,
  ReadonlyRecord.map((
    value, // $ExpectType number
    _key // $ExpectType "a" | "b"
  ) => value > 0)
)

const constStruct = { a: 1, b: 2 } as const

function mapToBoolean(): { [K in keyof typeof constStruct]: boolean } {
  return ReadonlyRecord.map(constStruct, () => true)
}

// $ExpectType { readonly a: boolean; readonly b: boolean; }
mapToBoolean()

// -------------------------------------------------------------------------------------
// get
// -------------------------------------------------------------------------------------

// $ExpectType Option<number>
pipe(numbers, ReadonlyRecord.get("a"))

// -------------------------------------------------------------------------------------
// replaceOption
// -------------------------------------------------------------------------------------

// $ExpectType Option<Record<string, number>>
pipe(numbers, ReadonlyRecord.replaceOption("a", 2))

// $ExpectType Option<Record<string, number | boolean>>
pipe(numbers, ReadonlyRecord.replaceOption("a", true))

// -------------------------------------------------------------------------------------
// modify
// -------------------------------------------------------------------------------------

// $ExpectType Record<string, number>
pipe(numbers, ReadonlyRecord.modify("a", () => 2))

// $ExpectType Record<string, number | boolean>
pipe(numbers, ReadonlyRecord.modify("a", () => true))

// -------------------------------------------------------------------------------------
// modifyOption
// -------------------------------------------------------------------------------------

// $ExpectType Option<Record<string, number>>
pipe(numbers, ReadonlyRecord.modifyOption("a", () => 2))

// $ExpectType Option<Record<string, number | boolean>>
pipe(numbers, ReadonlyRecord.modifyOption("a", () => true))

// -------------------------------------------------------------------------------------
// toEntries
// -------------------------------------------------------------------------------------

// baseline
// $ExpectType [string, number][]
ReadonlyRecord.toEntries(numbers)
// $ExpectType ["a" | "b", number][]
ReadonlyRecord.toEntries(structAB)
// $ExpectType ["a" | "b" | "c", string | number | boolean][]
ReadonlyRecord.toEntries({ a: "a", b: 2, c: true })

declare const brandedRecord: Record<string & Brand.Brand<"brandedString">, number>

// should support brands
// $ExpectType [string & Brand<"brandedString">, number][]
ReadonlyRecord.toEntries(brandedRecord)

// -------------------------------------------------------------------------------------
// collect
// -------------------------------------------------------------------------------------

// $ExpectType Either<number, never>[]
ReadonlyRecord.collect({ a: Either.right(1), b: Either.right(2), c: Either.right(3) }, (_, n) => n)

// $ExpectType Either<number, never>[]
pipe({ a: Either.right(1), b: Either.right(2), c: Either.right(3) }, ReadonlyRecord.collect((_, n) => n))

// $ExpectType number[]
ReadonlyRecord.collect(numbers, (_, a) => a)

// $ExpectType number[]
pipe(
  structAB,
  ReadonlyRecord.collect((
    _key, // $ExpectType "a" | "b"
    value
  ) => value)
)

// $ExpectType number[]
ReadonlyRecord.collect(structAB, (
  _key, // $ExpectType "a" | "b"
  value
) => value)

// -------------------------------------------------------------------------------------
// filterMap
// -------------------------------------------------------------------------------------

// $ExpectType Record<string, string>
ReadonlyRecord.filterMap(numbers, (
  value,
  // $ExpectType string
  _key
) => value > 0 ? Option.some("positive") : Option.none())

// $ExpectType Record<string, number>
pipe(
  structAB,
  ReadonlyRecord.filterMap((
    value,
    // $ExpectType "a" | "b"
    key
  ) => key === "a" ? Option.some(value) : Option.none())
)

// $ExpectType Record<string, number>
ReadonlyRecord.filterMap(structAB, (
  value,
  // $ExpectType "a" | "b"
  key
) => key === "a" ? Option.some(value) : Option.none())

// -------------------------------------------------------------------------------------
// filter
// -------------------------------------------------------------------------------------

// $ExpectType Record<string, number>
ReadonlyRecord.filter(numbers, (
  // $ExpectType number
  value,
  // $ExpectType string
  _key
) => value > 0)

// $ExpectType Record<string, number>
pipe(
  structAB,
  ReadonlyRecord.filter((
    // $ExpectType number
    _value,
    // $ExpectType "a" | "b"
    key
  ) => key === "a")
)

// $ExpectType Record<string, number>
ReadonlyRecord.filter(structAB, (
  // $ExpectType number
  _value,
  // $ExpectType "a" | "b"
  key
) => key === "a")

// $ExpectType Record<string, string | number>
ReadonlyRecord.filter(numbersOrStrings, predicateNumbersOrStrings)

// $ExpectType Record<string, number>
ReadonlyRecord.filter(numbers, predicateNumbersOrStrings)

// $ExpectType Record<string, string | number>
pipe(numbersOrStrings, ReadonlyRecord.filter(predicateNumbersOrStrings))

// $ExpectType Record<string, number>
pipe(numbers, ReadonlyRecord.filter(predicateNumbersOrStrings))

// $ExpectType Record<string, number>
ReadonlyRecord.filter(numbersOrStrings, Predicate.isNumber)

// $ExpectType Record<string, number>
pipe(numbersOrStrings, ReadonlyRecord.filter(Predicate.isNumber))

// -------------------------------------------------------------------------------------
// partitionMap
// -------------------------------------------------------------------------------------

// $ExpectType [left: Record<string, boolean>, right: Record<string, string>]
ReadonlyRecord.partitionMap(numbers, (
  value,
  // $ExpectType string
  _key
) => value > 0 ? Either.right("positive") : Either.left(false))

// $ExpectType [left: Record<string, boolean>, right: Record<string, string>]
pipe(
  structAB,
  ReadonlyRecord.partitionMap((
    _value,
    // $ExpectType "a" | "b"
    key
  ) => key === "a" ? Either.right("positive") : Either.left(false))
)

// $ExpectType [left: Record<string, boolean>, right: Record<string, string>]
ReadonlyRecord.partitionMap(structAB, (
  _value,
  // $ExpectType "a" | "b"
  key
) => key === "a" ? Either.right("positive") : Either.left(false))

// -------------------------------------------------------------------------------------
// partition
// -------------------------------------------------------------------------------------

// $ExpectType [excluded: Record<string, number>, satisfying: Record<string, number>]
ReadonlyRecord.partition(numbers, (
  // $ExpectType number
  value,
  // $ExpectType string
  _key
) => value > 0)

// $ExpectType [excluded: Record<string, number>, satisfying: Record<string, number>]
pipe(
  structAB,
  ReadonlyRecord.partition((
    // $ExpectType number
    _value,
    // $ExpectType "a" | "b"
    key
  ) => key === "a")
)

// $ExpectType [excluded: Record<string, number>, satisfying: Record<string, number>]
ReadonlyRecord.partition(structAB, (
  // $ExpectType number
  _value,
  // $ExpectType "a" | "b"
  key
) => key === "a")

// $ExpectType [excluded: Record<string, string | number>, satisfying: Record<string, string | number>]
ReadonlyRecord.partition(numbersOrStrings, predicateNumbersOrStrings)

// $ExpectType [excluded: Record<string, string | number>, satisfying: Record<string, string | number>]
pipe(numbersOrStrings, ReadonlyRecord.partition(predicateNumbersOrStrings))

// $ExpectType [excluded: Record<string, string>, satisfying: Record<string, number>]
ReadonlyRecord.partition(numbersOrStrings, Predicate.isNumber)

// $ExpectType [excluded: Record<string, string>, satisfying: Record<string, number>]
pipe(numbersOrStrings, ReadonlyRecord.partition(Predicate.isNumber))

// -------------------------------------------------------------------------------------
// keys
// -------------------------------------------------------------------------------------

// $ExpectType ("a" | "b")[]
ReadonlyRecord.keys(structAB)

// -------------------------------------------------------------------------------------
// values
// -------------------------------------------------------------------------------------

// $ExpectType number[]
ReadonlyRecord.values(structAB)

// -------------------------------------------------------------------------------------
// set
// -------------------------------------------------------------------------------------
// $ExpectType Record<string, number | boolean>
ReadonlyRecord.set(numbers, "a", true)

// -------------------------------------------------------------------------------------
// set
// -------------------------------------------------------------------------------------

// $ExpectType Record<string, number | boolean>
ReadonlyRecord.set(numbers, "a", true)

// $ExpectType Record<"a" | "b" | "c", number | boolean>
ReadonlyRecord.set(structAB, "c", true)

// -------------------------------------------------------------------------------------
// remove
// -------------------------------------------------------------------------------------

// $ExpectType Record<string, number>
ReadonlyRecord.remove(numbers, "a")

// $ExpectType Record<"b", number>
ReadonlyRecord.remove(structAB, "a")

// -------------------------------------------------------------------------------------
// reduce
// -------------------------------------------------------------------------------------

ReadonlyRecord.reduce(structAB, "", (
  // $ExpectType string
  _acc,
  // $ExpectType number
  _value,
  // $ExpectType "a" | "b"
  key
) => typeof key === "string" ? key : _acc)

// -------------------------------------------------------------------------------------
// some
// -------------------------------------------------------------------------------------

ReadonlyRecord.some(structAB, (
  _value,
  // $ExpectType "a" | "b"
  _key
) => false)

pipe(
  numbersOrStrings,
  ReadonlyRecord.some((
    _item // $ExpectType string | number
  ) => true)
)

// -------------------------------------------------------------------------------------
// union
// -------------------------------------------------------------------------------------

// $ExpectType Record<string, number>
ReadonlyRecord.union(numbers, numbers, (_, b) => b)

// $ExpectType Record<string, string | number>
ReadonlyRecord.union(numbers, numbersOrStrings, (_, b) => b)

// $ExpectType Record<"a" | "b" | "c" | "d", string | number>
ReadonlyRecord.union(structAB, structCD, (_, b) => b)

// -------------------------------------------------------------------------------------
// singleton
// -------------------------------------------------------------------------------------

// $ExpectType Record<"a", number>
ReadonlyRecord.singleton("a", 1)

// -------------------------------------------------------------------------------------
// every
// -------------------------------------------------------------------------------------

pipe(
  numbersOrStrings,
  ReadonlyRecord.every((
    _item // $ExpectType string | number
  ) => true)
)

ReadonlyRecord.every(structAB, (
  // $ExpectType number
  _value,
  // $ExpectType "a" | "b"
  _key
) => false)

if (ReadonlyRecord.every(numbersOrStrings, Predicate.isString)) {
  numbersOrStrings // $ExpectType ReadonlyRecord<string, string>
}

if (ReadonlyRecord.every(numbersOrStrings, Predicate.isString)) {
  numbersOrStrings // $ExpectType ReadonlyRecord<string, string>
}

// -------------------------------------------------------------------------------------
// intersection
// -------------------------------------------------------------------------------------

// $ExpectType Record<string, number>
ReadonlyRecord.intersection(numbers, numbersOrStrings, (a, _) => a)

// $ExpectType Record<string, string | number>
ReadonlyRecord.intersection(numbers, numbersOrStrings, (_, b) => b)

// $ExpectType Record<never, string>
ReadonlyRecord.intersection(structAB, structCD, (_, b) => b)

// $ExpectType Record<never, number>
ReadonlyRecord.intersection(structAB, structCD, (a, _) => a)

// $ExpectType Record<string, number>
ReadonlyRecord.intersection(numbers, numbers, (a, _) => a)

// $ExpectType Record<string, number>
ReadonlyRecord.intersection(numbers, structCD, (a, _) => a)

// $ExpectType Record<never, number>
ReadonlyRecord.intersection(structAB, {
  c: 2
}, (a, _) => a)

// $ExpectType Record<"b", number>
ReadonlyRecord.intersection(structAB, {
  b: 2
}, (a, _) => a)

// -------------------------------------------------------------------------------------
// has
// -------------------------------------------------------------------------------------

if (ReadonlyRecord.has(numbers, "a")) {
  // $ExpectType Record<string, number>
  numbers
}

// @ts-expect-error
ReadonlyRecord.has(structAB, "c")

// -------------------------------------------------------------------------------------
// empty
// -------------------------------------------------------------------------------------

export const empty1: Record<string, number> = ReadonlyRecord.empty()
export const empty2: Record<symbol, number> = ReadonlyRecord.empty()
// @ts-expect-error
export const empty3: Record<"a", number> = ReadonlyRecord.empty<never>()

// $ExpectType Record<never, never>
ReadonlyRecord.empty()

// $ExpectType Record<string, never>
ReadonlyRecord.empty<"a">()

// $ExpectType Record<`a${string}bc`, never>
ReadonlyRecord.empty<`a${string}bc`>()

// $ExpectType Record<string, never>
ReadonlyRecord.empty<string>()
