import type * as Brand from "effect/Brand"
import * as Either from "effect/Either"
import { hole, pipe } from "effect/Function"
import * as Option from "effect/Option"
import * as Predicate from "effect/Predicate"
import * as ReadonlyRecord from "effect/ReadonlyRecord"

declare const string$numbers: Record<string, number>
declare const string$numbersOrStrings: Record<string, number | string>
declare const string$structAB: Record<"a" | "b", number>
declare const string$structCD: Record<"c" | "d", string>

declare const predicateNumbersOrStrings: Predicate.Predicate<number | string>

const symA = Symbol.for("a")
const symB = Symbol.for("b")

declare const symbol$numbers: Record<symbol, number>

declare const template$numbers: Record<`a${string}`, number>

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

// -------------------------------------------------------------------------------------
// fromIterableWith
// -------------------------------------------------------------------------------------

// $ExpectType Record<string, number>
ReadonlyRecord.fromIterableWith([1, 2], (
  n // $ExpectType number
) => [String(n), n])

// $ExpectType Record<string, symbol>
ReadonlyRecord.fromIterableWith([symA, symB], (
  s // $ExpectType symbol
) => [String(s), s])

// $ExpectType Record<string | symbol, number | symbol>
ReadonlyRecord.fromIterableWith([1, symA], (
  ns // $ExpectType number | symbol
) => [Predicate.isNumber(ns) ? String(ns) : ns, ns])

// -------------------------------------------------------------------------------------
// fromIterableBy
// -------------------------------------------------------------------------------------

// $ExpectType Record<string, number>
ReadonlyRecord.fromIterableBy([1, 2], (
  n // $ExpectType number
) => String(n))

// $ExpectType Record<string, symbol>
ReadonlyRecord.fromIterableBy([symA, symB], (
  s // $ExpectType symbol
) => String(s))

// $ExpectType Record<string | symbol, number | symbol>
ReadonlyRecord.fromIterableBy([1, symA], (
  ns // $ExpectType number | symbol
) => Predicate.isNumber(ns) ? String(ns) : ns)

// -------------------------------------------------------------------------------------
// fromEntries
// -------------------------------------------------------------------------------------

// $ExpectType Record<string, number>
ReadonlyRecord.fromEntries([["a", 1], ["b", 2]])

// $ExpectType Record<symbol, number>
ReadonlyRecord.fromEntries([[symA, 1], [symB, 2]])

// $ExpectType Record<string | symbol, number>
ReadonlyRecord.fromEntries([["a", 1], [symB, 2]])

// -------------------------------------------------------------------------------------
// collect
// -------------------------------------------------------------------------------------

// $ExpectType number[]
ReadonlyRecord.collect(string$numbers, (
  _, // $ExpectType string
  a // $ExpectType number
) => a)

// $ExpectType number[]
ReadonlyRecord.collect(template$numbers, (
  _, // $ExpectType `a${string}`
  a // $ExpectType number
) => a)

// $ExpectType number[]
pipe(
  string$structAB,
  ReadonlyRecord.collect((
    _, // $ExpectType "a" | "b"
    a // $ExpectType number
  ) => a)
)

// $ExpectType number[]
ReadonlyRecord.collect(string$structAB, (
  _, // $ExpectType "a" | "b"
  a // $ExpectType number
) => a)

// -------------------------------------------------------------------------------------
// toEntries
// -------------------------------------------------------------------------------------

// $ExpectType [string, number][]
ReadonlyRecord.toEntries(string$numbers)

// $ExpectType [`a${string}`, number][]
ReadonlyRecord.toEntries(template$numbers)

// $ExpectType [string, number][]
ReadonlyRecord.toEntries(symbol$numbers)

declare const brandedRecord: Record<string & Brand.Brand<"brandedString">, number>

// should support brands
// $ExpectType [string & Brand<"brandedString">, number][]
ReadonlyRecord.toEntries(brandedRecord)

// $ExpectType ["a" | "b", number][]
ReadonlyRecord.toEntries(string$structAB)

// $ExpectType ["a" | "b", number][]
ReadonlyRecord.toEntries(string$structAB)

// -------------------------------------------------------------------------------------
// has
// -------------------------------------------------------------------------------------

// $ExpectType boolean
ReadonlyRecord.has(string$numbers, "a")

// @ts-expect-error
ReadonlyRecord.has(string$numbers, symA)

// $ExpectType boolean
ReadonlyRecord.has(template$numbers, "a")

// @ts-expect-error
ReadonlyRecord.has(template$numbers, "b")

// $ExpectType boolean
ReadonlyRecord.has(symbol$numbers, symA)

// @ts-expect-error
ReadonlyRecord.has(symbol$numbers, "a")

// @ts-expect-error
ReadonlyRecord.has(string$structAB, "c")

// @ts-expect-error
ReadonlyRecord.has(string$structAB, symA)

// -------------------------------------------------------------------------------------
// get
// -------------------------------------------------------------------------------------

// $ExpectType Option<number>
pipe(string$numbers, ReadonlyRecord.get("a"))

// @ts-expect-error
pipe(string$numbers, ReadonlyRecord.get(symA))

// $ExpectType Option<number>
pipe(template$numbers, ReadonlyRecord.get("a"))

// @ts-expect-error
pipe(template$numbers, ReadonlyRecord.get("b"))

// $ExpectType Option<number>
pipe(symbol$numbers, ReadonlyRecord.get(symA))

// @ts-expect-error
pipe(symbol$numbers, ReadonlyRecord.get("a"))

// $ExpectType Option<number>
pipe(string$structAB, ReadonlyRecord.get("a"))

// @ts-expect-error
pipe(string$structAB, ReadonlyRecord.get("c"))

// -------------------------------------------------------------------------------------
// modify
// -------------------------------------------------------------------------------------

// $ExpectType Record<string, number>
pipe(string$numbers, ReadonlyRecord.modify("a", () => 2))

// $ExpectType Record<string, number | boolean>
pipe(string$numbers, ReadonlyRecord.modify("a", () => true))

// $ExpectType Record<`a${string}`, number>
pipe(template$numbers, ReadonlyRecord.modify("a", () => 2))

// $ExpectType Record<`a${string}`, number | boolean>
pipe(template$numbers, ReadonlyRecord.modify("a", () => true))

// @ts-expect-error
pipe(template$numbers, ReadonlyRecord.modify("b", () => true))

// $ExpectType Record<symbol, number>
pipe(symbol$numbers, ReadonlyRecord.modify(symA, () => 2))

// $ExpectType Record<symbol, number | boolean>
pipe(symbol$numbers, ReadonlyRecord.modify(symA, () => true))

// $ExpectType Record<"a" | "b", number>
pipe(string$structAB, ReadonlyRecord.modify("a", () => 2))

// $ExpectType Record<"a" | "b", number | boolean>
pipe(string$structAB, ReadonlyRecord.modify("a", () => true))

// -------------------------------------------------------------------------------------
// modifyOption
// -------------------------------------------------------------------------------------

// $ExpectType Option<Record<string, number>>
pipe(string$numbers, ReadonlyRecord.modifyOption("a", () => 2))

// $ExpectType Option<Record<string, number | boolean>>
pipe(string$numbers, ReadonlyRecord.modifyOption("a", () => true))

// $ExpectType Option<Record<`a${string}`, number>>
pipe(template$numbers, ReadonlyRecord.modifyOption("a", () => 2))

// $ExpectType Option<Record<`a${string}`, number | boolean>>
pipe(template$numbers, ReadonlyRecord.modifyOption("a", () => true))

// @ts-expect-error
pipe(template$numbers, ReadonlyRecord.modifyOption("b", () => true))

// $ExpectType Option<Record<symbol, number>>
pipe(symbol$numbers, ReadonlyRecord.modifyOption(symA, () => 2))

// $ExpectType Option<Record<symbol, number | boolean>>
pipe(symbol$numbers, ReadonlyRecord.modifyOption(symA, () => true))

// $ExpectType Option<Record<"a" | "b", number>>
pipe(string$structAB, ReadonlyRecord.modifyOption("a", () => 2))

// $ExpectType Option<Record<"a" | "b", number | boolean>>
pipe(string$structAB, ReadonlyRecord.modifyOption("a", () => true))

// -------------------------------------------------------------------------------------
// replaceOption
// -------------------------------------------------------------------------------------

// $ExpectType Option<Record<string, number>>
pipe(string$numbers, ReadonlyRecord.replaceOption("a", 2))

// $ExpectType Option<Record<string, number | boolean>>
pipe(string$numbers, ReadonlyRecord.replaceOption("a", true))

// $ExpectType Option<Record<`a${string}`, number>>
pipe(template$numbers, ReadonlyRecord.replaceOption("a", 2))

// $ExpectType Option<Record<`a${string}`, number | boolean>>
pipe(template$numbers, ReadonlyRecord.replaceOption("a", true))

// @ts-expect-error
pipe(template$numbers, ReadonlyRecord.replaceOption("b", true))

// $ExpectType Option<Record<symbol, number>>
pipe(symbol$numbers, ReadonlyRecord.replaceOption(symA, 2))

// $ExpectType Option<Record<symbol, number | boolean>>
pipe(symbol$numbers, ReadonlyRecord.replaceOption(symA, true))

// $ExpectType Option<Record<"a" | "b", number>>
pipe(string$structAB, ReadonlyRecord.replaceOption("a", 2))

// $ExpectType Option<Record<"a" | "b", number | boolean>>
pipe(string$structAB, ReadonlyRecord.replaceOption("a", true))

// -------------------------------------------------------------------------------------
// remove
// -------------------------------------------------------------------------------------

// $ExpectType Record<string, number>
pipe(string$numbers, ReadonlyRecord.remove("a"))

// $ExpectType Record<`a${string}`, number>
pipe(template$numbers, ReadonlyRecord.remove("a"))

// @ts-expect-error
pipe(template$numbers, ReadonlyRecord.remove("b"))

// $ExpectType Record<symbol, number>
pipe(symbol$numbers, ReadonlyRecord.remove(symA))

// $ExpectType Record<"b", number>
pipe(string$structAB, ReadonlyRecord.remove("a"))

// -------------------------------------------------------------------------------------
// pop
// -------------------------------------------------------------------------------------

// $ExpectType Option<[number, Record<string, number>]>
pipe(string$numbers, ReadonlyRecord.pop("a"))

// $ExpectType Option<[number, Record<`a${string}`, number>]>
pipe(template$numbers, ReadonlyRecord.pop("a"))

// @ts-expect-error
pipe(template$numbers, ReadonlyRecord.pop("b"))

// $ExpectType Option<[number, Record<symbol, number>]>
pipe(symbol$numbers, ReadonlyRecord.pop(symA))

// $ExpectType Option<[number, Record<"b", number>]>
pipe(string$structAB, ReadonlyRecord.pop("a"))

// -------------------------------------------------------------------------------------
// map
// -------------------------------------------------------------------------------------

// $ExpectType Record<string, boolean>
ReadonlyRecord.map(string$numbers, (
  a, // $ExpectType number
  _ // $ExpectType string
) => a > 0)

// $ExpectType Record<string, boolean>
pipe(
  string$numbers,
  ReadonlyRecord.map((
    a, // $ExpectType number
    _ // $ExpectType string
  ) => a > 0)
)

// $ExpectType Record<`a${string}`, boolean>
ReadonlyRecord.map(template$numbers, (
  a, // $ExpectType number
  _ // $ExpectType `a${string}`
) => a > 0)

// $ExpectType Record<string, number>
ReadonlyRecord.map(symbol$numbers, (
  a, // $ExpectType number
  _ // $ExpectType string
) => a + 1)

// $ExpectType Record<"a" | "b", boolean>
ReadonlyRecord.map(string$structAB, (
  a, // $ExpectType number
  _ // $ExpectType "a" | "b"
) => a > 0)

// $ExpectType Record<"a" | "b", boolean>
pipe(
  string$structAB,
  ReadonlyRecord.map((
    a, // $ExpectType number
    _ // $ExpectType "a" | "b"
  ) => a > 0)
)

// -------------------------------------------------------------------------------------
// filterMap
// -------------------------------------------------------------------------------------

// $ExpectType Record<string, string>
ReadonlyRecord.filterMap(string$numbers, (
  a,
  _ // $ExpectType string
) => a > 0 ? Option.some("positive") : Option.none())

// $ExpectType Record<`a${string}`, string>
ReadonlyRecord.filterMap(template$numbers, (
  a,
  _ // $ExpectType `a${string}`
) => a > 0 ? Option.some("positive") : Option.none())

// $ExpectType Record<string, string>
ReadonlyRecord.filterMap(symbol$numbers, (
  a,
  _ // $ExpectType string
) => a > 0 ? Option.some("positive") : Option.none())

// $ExpectType Record<string, number>
pipe(
  string$structAB,
  ReadonlyRecord.filterMap((
    a,
    key // $ExpectType "a" | "b"
  ) => key === "a" ? Option.some(a) : Option.none())
)

// $ExpectType Record<string, number>
ReadonlyRecord.filterMap(string$structAB, (
  a,
  key // $ExpectType "a" | "b"
) => key === "a" ? Option.some(a) : Option.none())

// -------------------------------------------------------------------------------------
// filter
// -------------------------------------------------------------------------------------

// $ExpectType Record<string, number>
ReadonlyRecord.filter(string$numbers, (
  a, // $ExpectType number
  _ // $ExpectType string
) => a > 0)

// $ExpectType Record<`a${string}`, number>
ReadonlyRecord.filter(template$numbers, (
  a, // $ExpectType number
  _ // $ExpectType `a${string}`
) => a > 0)

// $ExpectType Record<string, number>
pipe(
  string$structAB,
  ReadonlyRecord.filter((
    _, // $ExpectType number
    key // $ExpectType "a" | "b"
  ) => key === "a")
)

// $ExpectType Record<string, number>
ReadonlyRecord.filter(string$structAB, (
  _, // $ExpectType number
  key // $ExpectType "a" | "b"
) => key === "a")

// $ExpectType Record<string, string | number>
ReadonlyRecord.filter(string$numbersOrStrings, predicateNumbersOrStrings)

// $ExpectType Record<string, number>
ReadonlyRecord.filter(string$numbers, predicateNumbersOrStrings)

// $ExpectType Record<string, string | number>
pipe(string$numbersOrStrings, ReadonlyRecord.filter(predicateNumbersOrStrings))

// $ExpectType Record<string, number>
pipe(string$numbers, ReadonlyRecord.filter(predicateNumbersOrStrings))

// $ExpectType Record<string, number>
ReadonlyRecord.filter(string$numbersOrStrings, Predicate.isNumber)

// $ExpectType Record<string, number>
pipe(string$numbersOrStrings, ReadonlyRecord.filter(Predicate.isNumber))

// -------------------------------------------------------------------------------------
// partitionMap
// -------------------------------------------------------------------------------------

// $ExpectType [left: Record<string, boolean>, right: Record<string, string>]
ReadonlyRecord.partitionMap(string$numbers, (
  a,
  _ // $ExpectType string
) => a > 0 ? Either.right("positive") : Either.left(false))

// $ExpectType [left: Record<string, boolean>, right: Record<string, string>]
pipe(
  string$structAB,
  ReadonlyRecord.partitionMap((
    _,
    key // $ExpectType "a" | "b"
  ) => key === "a" ? Either.right("positive") : Either.left(false))
)

// $ExpectType [left: Record<string, boolean>, right: Record<string, string>]
ReadonlyRecord.partitionMap(string$structAB, (
  _a,
  key // $ExpectType "a" | "b"
) => key === "a" ? Either.right("positive") : Either.left(false))

// -------------------------------------------------------------------------------------
// partition
// -------------------------------------------------------------------------------------

// $ExpectType [excluded: Record<string, number>, satisfying: Record<string, number>]
ReadonlyRecord.partition(string$numbers, (
  a, // $ExpectType number
  _ // $ExpectType string
) => a > 0)

// $ExpectType [excluded: Record<string, number>, satisfying: Record<string, number>]
pipe(
  string$structAB,
  ReadonlyRecord.partition((
    _a, // $ExpectType number
    key // $ExpectType "a" | "b"
  ) => key === "a")
)

// $ExpectType [excluded: Record<string, number>, satisfying: Record<string, number>]
ReadonlyRecord.partition(string$structAB, (
  _a, // $ExpectType number
  key // $ExpectType "a" | "b"
) => key === "a")

// $ExpectType [excluded: Record<string, string | number>, satisfying: Record<string, string | number>]
ReadonlyRecord.partition(string$numbersOrStrings, predicateNumbersOrStrings)

// $ExpectType [excluded: Record<string, string | number>, satisfying: Record<string, string | number>]
pipe(string$numbersOrStrings, ReadonlyRecord.partition(predicateNumbersOrStrings))

// $ExpectType [excluded: Record<string, string>, satisfying: Record<string, number>]
ReadonlyRecord.partition(string$numbersOrStrings, Predicate.isNumber)

// $ExpectType [excluded: Record<string, string>, satisfying: Record<string, number>]
pipe(string$numbersOrStrings, ReadonlyRecord.partition(Predicate.isNumber))

// -------------------------------------------------------------------------------------
// keys
// -------------------------------------------------------------------------------------

// $ExpectType ("a" | "b")[]
ReadonlyRecord.keys(string$structAB)

// -------------------------------------------------------------------------------------
// values
// -------------------------------------------------------------------------------------

// $ExpectType number[]
ReadonlyRecord.values(string$structAB)

// -------------------------------------------------------------------------------------
// set
// -------------------------------------------------------------------------------------

// $ExpectType Record<string, number>
ReadonlyRecord.set(string$numbers, "a", 2)

// $ExpectType Record<string, number | boolean>
ReadonlyRecord.set(string$numbers, "a", true)

// $ExpectType Record<`a${string}`, number>
ReadonlyRecord.set(template$numbers, "a", 2)

// $ExpectType Record<`a${string}`, number | boolean>
ReadonlyRecord.set(template$numbers, "a", true)

// $ExpectType Record<"b" | `a${string}`, number | boolean>
ReadonlyRecord.set(template$numbers, "b", true)

// $ExpectType Record<"a" | "b", number>
ReadonlyRecord.set(string$structAB, "a", 2)

// $ExpectType Record<"a" | "b", number | boolean>
ReadonlyRecord.set(string$structAB, "a", true)

// $ExpectType Record<"a" | "b" | "c", number | boolean>
ReadonlyRecord.set(string$structAB, "c", true)

// -------------------------------------------------------------------------------------
// reduce
// -------------------------------------------------------------------------------------

ReadonlyRecord.reduce(string$structAB, "", (
  _acc, // $ExpectType string
  _value, // $ExpectType number
  key // $ExpectType "a" | "b"
) => typeof key === "string" ? key : _acc)

// -------------------------------------------------------------------------------------
// some
// -------------------------------------------------------------------------------------

ReadonlyRecord.some(string$structAB, (
  _value,
  _key // $ExpectType "a" | "b"
) => false)

pipe(
  string$numbersOrStrings,
  ReadonlyRecord.some((
    _item // $ExpectType string | number
  ) => true)
)

// -------------------------------------------------------------------------------------
// union
// -------------------------------------------------------------------------------------

// $ExpectType Record<string, number>
ReadonlyRecord.union(string$numbers, string$numbers, (_, b) => b)

// $ExpectType Record<string, string | number>
ReadonlyRecord.union(string$numbers, string$numbersOrStrings, (_, b) => b)

// $ExpectType Record<"a" | "b" | "c" | "d", string | number>
ReadonlyRecord.union(string$structAB, string$structCD, (_, b) => b)

// -------------------------------------------------------------------------------------
// singleton
// -------------------------------------------------------------------------------------

// $ExpectType Record<"a", number>
ReadonlyRecord.singleton("a", 1)

// -------------------------------------------------------------------------------------
// every
// -------------------------------------------------------------------------------------

pipe(
  string$numbersOrStrings,
  ReadonlyRecord.every((
    _item // $ExpectType string | number
  ) => true)
)

ReadonlyRecord.every(string$structAB, (
  _value, // $ExpectType number
  _key // $ExpectType "a" | "b"
) => false)

if (ReadonlyRecord.every(string$numbersOrStrings, Predicate.isString)) {
  string$numbersOrStrings // $ExpectType ReadonlyRecord<string, string>
}

if (ReadonlyRecord.every(string$numbersOrStrings, Predicate.isString)) {
  string$numbersOrStrings // $ExpectType ReadonlyRecord<string, string>
}

// -------------------------------------------------------------------------------------
// intersection
// -------------------------------------------------------------------------------------

// $ExpectType Record<string, number>
ReadonlyRecord.intersection(string$numbers, string$numbersOrStrings, (a, _) => a)

// $ExpectType Record<string, string | number>
ReadonlyRecord.intersection(string$numbers, string$numbersOrStrings, (_, b) => b)

// $ExpectType Record<never, string>
ReadonlyRecord.intersection(string$structAB, string$structCD, (_, b) => b)

// $ExpectType Record<never, number>
ReadonlyRecord.intersection(string$structAB, string$structCD, (a, _) => a)

// $ExpectType Record<string, number>
ReadonlyRecord.intersection(string$numbers, string$numbers, (a, _) => a)

// $ExpectType Record<string, number>
ReadonlyRecord.intersection(string$numbers, string$structCD, (a, _) => a)

// $ExpectType Record<never, number>
ReadonlyRecord.intersection(string$structAB, {
  c: 2
}, (a, _) => a)

// $ExpectType Record<"b", number>
ReadonlyRecord.intersection(string$structAB, {
  b: 2
}, (a, _) => a)
