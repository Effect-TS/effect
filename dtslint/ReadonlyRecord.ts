import type * as Brand from "effect/Brand"
import * as Either from "effect/Either"
import { pipe } from "effect/Function"
import * as Option from "effect/Option"
import * as Predicate from "effect/Predicate"
import * as ReadonlyRecord from "effect/ReadonlyRecord"

declare const numbers: Record<string, number>
declare const numbersOrStrings: Record<string, number | string>
declare const readonlyNumbers: Readonly<Record<string, number>>
declare const structNumbers: Record<"a" | "b", number>
declare const structStrings: Record<"c" | "d", string>
declare const readonlyStructNumbers: Readonly<Record<"a" | "b", number>>
declare const readonlyStructStrings: Readonly<Record<"c" | "d", string>>

declare const predicateNumbersOrStrings: Predicate.Predicate<number | string>

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

// $ExpectType Record<string, boolean>
ReadonlyRecord.map(readonlyNumbers, (
  value, // $ExpectType number
  _key // $ExpectType string
) => value > 0)

// $ExpectType Record<string, boolean>
pipe(
  readonlyNumbers,
  ReadonlyRecord.map((
    value, // $ExpectType number
    _key // $ExpectType string
  ) => value > 0)
)

// $ExpectType Record<"a" | "b", boolean>
ReadonlyRecord.map(structNumbers, (
  value, // $ExpectType number
  _key // $ExpectType "a" | "b"
) => value > 0)

// $ExpectType Record<"a" | "b", boolean>
pipe(
  structNumbers,
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
ReadonlyRecord.toEntries(structNumbers)
// $ExpectType ["a" | "b" | "c", string | number | boolean][]
ReadonlyRecord.toEntries({ a: "a", b: 2, c: true })

declare const brandedRecord: Record<string & Brand.Brand<"brandedString">, number>

// should support brands
// $ExpectType [string & Brand<"brandedString">, number][]
ReadonlyRecord.toEntries(brandedRecord)

// -------------------------------------------------------------------------------------
// collect
// -------------------------------------------------------------------------------------

// $ExpectType Either<never, number>[]
ReadonlyRecord.collect({ a: Either.right(1), b: Either.right(2), c: Either.right(3) }, (_, n) => n)

// $ExpectType Either<never, number>[]
pipe({ a: Either.right(1), b: Either.right(2), c: Either.right(3) }, ReadonlyRecord.collect((_, n) => n))

// $ExpectType number[]
ReadonlyRecord.collect(numbers, (_, a) => a)

// $ExpectType number[]
ReadonlyRecord.collect(readonlyNumbers, (_, a) => a)

// $ExpectType number[]
pipe(
  structNumbers,
  ReadonlyRecord.collect((
    _key, // $ExpectType "a" | "b"
    value
  ) => value)
)

// $ExpectType number[]
ReadonlyRecord.collect(structNumbers, (
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

// $ExpectType Record<string, string>
ReadonlyRecord.filterMap(readonlyNumbers, (
  value,
  // $ExpectType string
  _key
) => value > 0 ? Option.some("positive") : Option.none())

// $ExpectType Record<string, number>
pipe(
  structNumbers,
  ReadonlyRecord.filterMap((
    value,
    // $ExpectType "a" | "b"
    key
  ) => key === "a" ? Option.some(value) : Option.none())
)

// $ExpectType Record<string, number>
ReadonlyRecord.filterMap(structNumbers, (
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
ReadonlyRecord.filter(readonlyNumbers, (
  // $ExpectType number
  value,
  // $ExpectType string
  _key
) => value > 0)

// $ExpectType Record<string, number>
pipe(
  structNumbers,
  ReadonlyRecord.filter((
    // $ExpectType number
    _value,
    // $ExpectType "a" | "b"
    key
  ) => key === "a")
)

// $ExpectType Record<string, number>
ReadonlyRecord.filter(structNumbers, (
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
ReadonlyRecord.partitionMap(readonlyNumbers, (
  value,
  // $ExpectType string
  _key
) => value > 0 ? Either.right("positive") : Either.left(false))

// $ExpectType [left: Record<string, boolean>, right: Record<string, string>]
pipe(
  structNumbers,
  ReadonlyRecord.partitionMap((
    _value,
    // $ExpectType "a" | "b"
    key
  ) => key === "a" ? Either.right("positive") : Either.left(false))
)

// $ExpectType [left: Record<string, boolean>, right: Record<string, string>]
ReadonlyRecord.partitionMap(structNumbers, (
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
ReadonlyRecord.partition(readonlyNumbers, (
  // $ExpectType number
  value,
  // $ExpectType string
  _key
) => value > 0)

// $ExpectType [excluded: Record<string, number>, satisfying: Record<string, number>]
pipe(
  structNumbers,
  ReadonlyRecord.partition((
    // $ExpectType number
    _value,
    // $ExpectType "a" | "b"
    key
  ) => key === "a")
)

// $ExpectType [excluded: Record<string, number>, satisfying: Record<string, number>]
ReadonlyRecord.partition(structNumbers, (
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

// $ExpectType string[]
ReadonlyRecord.keys(structNumbers)

// -------------------------------------------------------------------------------------
// values
// -------------------------------------------------------------------------------------

// $ExpectType number[]
ReadonlyRecord.values(structNumbers)

// -------------------------------------------------------------------------------------
// upsert
// -------------------------------------------------------------------------------------
// $ExpectType Record<string, number | boolean>
ReadonlyRecord.upsert(numbers, "a", true)

// -------------------------------------------------------------------------------------
// update
// -------------------------------------------------------------------------------------
// $ExpectType Record<string, number | boolean>
ReadonlyRecord.update(numbers, "a", true)

// -------------------------------------------------------------------------------------
// reduce
// -------------------------------------------------------------------------------------

ReadonlyRecord.reduce(structNumbers, "", (
  // $ExpectType string
  _acc,
  // $ExpectType number
  _value,
  // $ExpectType "a" | "b"
  key
) => key)

// -------------------------------------------------------------------------------------
// some
// -------------------------------------------------------------------------------------

ReadonlyRecord.some(structNumbers, (
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
ReadonlyRecord.union(numbers, readonlyNumbers, (_, b) => b)

// $ExpectType Record<"a" | "b" | "c" | "d", string | number>
ReadonlyRecord.union(structNumbers, structStrings, (_, b) => b)

// $ExpectType Record<"a" | "b" | "c" | "d", string | number>
ReadonlyRecord.union(readonlyStructNumbers, readonlyStructStrings, (_, b) => b)

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

ReadonlyRecord.every(structNumbers, (
  // $ExpectType number
  _value,
  // $ExpectType "a" | "b"
  _key
) => false)

if (ReadonlyRecord.every(numbersOrStrings, Predicate.isString)) {
  numbersOrStrings // $ExpectType Readonly<Record<string, string>>
}

if (ReadonlyRecord.every(Predicate.isString)(numbersOrStrings)) {
  numbersOrStrings // $ExpectType Readonly<Record<string, string>>
}
