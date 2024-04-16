import type * as Brand from "effect/Brand"
import * as Either from "effect/Either"
import { hole, pipe } from "effect/Function"
import * as Option from "effect/Option"
import * as Predicate from "effect/Predicate"
import * as Record from "effect/Record"

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
hole<Record.ReadonlyRecord.NonLiteralKey<string>>()

// $ExpectType symbol
hole<Record.ReadonlyRecord.NonLiteralKey<symbol>>()

// $ExpectType string
hole<Record.ReadonlyRecord.NonLiteralKey<"">>()

// $ExpectType string
hole<Record.ReadonlyRecord.NonLiteralKey<"a">>()

// $ExpectType string
hole<Record.ReadonlyRecord.NonLiteralKey<"a" | "b">>()

// $ExpectType symbol
hole<Record.ReadonlyRecord.NonLiteralKey<typeof symA>>()

// $ExpectType symbol
hole<Record.ReadonlyRecord.NonLiteralKey<typeof symA | typeof symB>>()

// $ExpectType string | symbol
hole<Record.ReadonlyRecord.NonLiteralKey<"a" | typeof symA>>()

// $ExpectType string
hole<Record.ReadonlyRecord.NonLiteralKey<`${string}`>>()

// $ExpectType `a${string}`
hole<Record.ReadonlyRecord.NonLiteralKey<`a${string}`>>()

// $ExpectType `${string}a`
hole<Record.ReadonlyRecord.NonLiteralKey<`${string}a`>>()

// $ExpectType `a${string}b${string}`
hole<Record.ReadonlyRecord.NonLiteralKey<`a${string}b${string}`>>()

// $ExpectType `a${number}`
hole<Record.ReadonlyRecord.NonLiteralKey<`a${number}`>>()

// $ExpectType `a${number}b${string}c${number}`
hole<Record.ReadonlyRecord.NonLiteralKey<`a${number}b${string}c${number}`>>()

// -------------------------------------------------------------------------------------
// empty
// -------------------------------------------------------------------------------------

export const empty1: Record<string, number> = Record.empty()
export const empty2: Record<symbol, number> = Record.empty()
// @ts-expect-error
export const empty3: Record<"a", number> = Record.empty<never>()

// $ExpectType Record<never, never>
Record.empty()

// $ExpectType Record<string, never>
Record.empty<"a">()

// $ExpectType Record<`a${string}bc`, never>
Record.empty<`a${string}bc`>()

// $ExpectType Record<string, never>
Record.empty<string>()

// -------------------------------------------------------------------------------------
// fromIterableWith
// -------------------------------------------------------------------------------------

// $ExpectType Record<string, number>
Record.fromIterableWith([1, 2], (
  n // $ExpectType number
) => [String(n), n])

// $ExpectType Record<string, symbol>
Record.fromIterableWith([symA, symB], (
  s // $ExpectType symbol
) => [String(s), s])

// $ExpectType Record<string | symbol, number | symbol>
Record.fromIterableWith([1, symA], (
  ns // $ExpectType number | symbol
) => [Predicate.isNumber(ns) ? String(ns) : ns, ns])

// -------------------------------------------------------------------------------------
// fromIterableBy
// -------------------------------------------------------------------------------------

// $ExpectType Record<string, number>
Record.fromIterableBy([1, 2], (
  n // $ExpectType number
) => String(n))

// $ExpectType Record<string, symbol>
Record.fromIterableBy([symA, symB], (
  s // $ExpectType symbol
) => String(s))

// $ExpectType Record<string | symbol, number | symbol>
Record.fromIterableBy([1, symA], (
  ns // $ExpectType number | symbol
) => Predicate.isNumber(ns) ? String(ns) : ns)

// -------------------------------------------------------------------------------------
// fromEntries
// -------------------------------------------------------------------------------------

// $ExpectType Record<string, number>
Record.fromEntries([["a", 1], ["b", 2]])

// $ExpectType Record<symbol, number>
Record.fromEntries([[symA, 1], [symB, 2]])

// $ExpectType Record<string | symbol, number>
Record.fromEntries([["a", 1], [symB, 2]])

// -------------------------------------------------------------------------------------
// collect
// -------------------------------------------------------------------------------------

// $ExpectType number[]
Record.collect(string$numbers, (
  _, // $ExpectType string
  a // $ExpectType number
) => a)

// $ExpectType number[]
Record.collect(template$numbers, (
  _, // $ExpectType `a${string}`
  a // $ExpectType number
) => a)

// $ExpectType number[]
pipe(
  string$structAB,
  Record.collect((
    _, // $ExpectType "a" | "b"
    a // $ExpectType number
  ) => a)
)

// $ExpectType number[]
Record.collect(string$structAB, (
  _, // $ExpectType "a" | "b"
  a // $ExpectType number
) => a)

// -------------------------------------------------------------------------------------
// toEntries
// -------------------------------------------------------------------------------------

// $ExpectType [string, number][]
Record.toEntries(string$numbers)

// $ExpectType [`a${string}`, number][]
Record.toEntries(template$numbers)

// $ExpectType [string, number][]
Record.toEntries(symbol$numbers)

declare const brandedRecord: Record<string & Brand.Brand<"brandedString">, number>

// should support brands
// $ExpectType [string & Brand<"brandedString">, number][]
Record.toEntries(brandedRecord)

// $ExpectType ["a" | "b", number][]
Record.toEntries(string$structAB)

// $ExpectType ["a" | "b", number][]
Record.toEntries(string$structAB)

// -------------------------------------------------------------------------------------
// has
// -------------------------------------------------------------------------------------

// $ExpectType boolean
Record.has(string$numbers, "a")

// @ts-expect-error
Record.has(string$numbers, symA)

// $ExpectType boolean
Record.has(template$numbers, "a")

// @ts-expect-error
Record.has(template$numbers, "b")

// $ExpectType boolean
Record.has(symbol$numbers, symA)

// @ts-expect-error
Record.has(symbol$numbers, "a")

// @ts-expect-error
Record.has(string$structAB, "c")

// @ts-expect-error
Record.has(string$structAB, symA)

// -------------------------------------------------------------------------------------
// get
// -------------------------------------------------------------------------------------

// $ExpectType Option<number>
pipe(string$numbers, Record.get("a"))

// @ts-expect-error
pipe(string$numbers, Record.get(symA))

// $ExpectType Option<number>
pipe(template$numbers, Record.get("a"))

// @ts-expect-error
pipe(template$numbers, Record.get("b"))

// $ExpectType Option<number>
pipe(symbol$numbers, Record.get(symA))

// @ts-expect-error
pipe(symbol$numbers, Record.get("a"))

// $ExpectType Option<number>
pipe(string$structAB, Record.get("a"))

// @ts-expect-error
pipe(string$structAB, Record.get("c"))

// -------------------------------------------------------------------------------------
// modify
// -------------------------------------------------------------------------------------

// $ExpectType Record<string, number>
pipe(string$numbers, Record.modify("a", () => 2))

// $ExpectType Record<string, number | boolean>
pipe(string$numbers, Record.modify("a", () => true))

// $ExpectType Record<`a${string}`, number>
pipe(template$numbers, Record.modify("a", () => 2))

// $ExpectType Record<`a${string}`, number | boolean>
pipe(template$numbers, Record.modify("a", () => true))

// @ts-expect-error
pipe(template$numbers, Record.modify("b", () => true))

// $ExpectType Record<symbol, number>
pipe(symbol$numbers, Record.modify(symA, () => 2))

// $ExpectType Record<symbol, number | boolean>
pipe(symbol$numbers, Record.modify(symA, () => true))

// $ExpectType Record<"a" | "b", number>
pipe(string$structAB, Record.modify("a", () => 2))

// $ExpectType Record<"a" | "b", number | boolean>
pipe(string$structAB, Record.modify("a", () => true))

// -------------------------------------------------------------------------------------
// modifyOption
// -------------------------------------------------------------------------------------

// $ExpectType Option<Record<string, number>>
pipe(string$numbers, Record.modifyOption("a", () => 2))

// $ExpectType Option<Record<string, number | boolean>>
pipe(string$numbers, Record.modifyOption("a", () => true))

// $ExpectType Option<Record<`a${string}`, number>>
pipe(template$numbers, Record.modifyOption("a", () => 2))

// $ExpectType Option<Record<`a${string}`, number | boolean>>
pipe(template$numbers, Record.modifyOption("a", () => true))

// @ts-expect-error
pipe(template$numbers, Record.modifyOption("b", () => true))

// $ExpectType Option<Record<symbol, number>>
pipe(symbol$numbers, Record.modifyOption(symA, () => 2))

// $ExpectType Option<Record<symbol, number | boolean>>
pipe(symbol$numbers, Record.modifyOption(symA, () => true))

// $ExpectType Option<Record<"a" | "b", number>>
pipe(string$structAB, Record.modifyOption("a", () => 2))

// $ExpectType Option<Record<"a" | "b", number | boolean>>
pipe(string$structAB, Record.modifyOption("a", () => true))

// -------------------------------------------------------------------------------------
// replaceOption
// -------------------------------------------------------------------------------------

// $ExpectType Option<Record<string, number>>
pipe(string$numbers, Record.replaceOption("a", 2))

// $ExpectType Option<Record<string, number | boolean>>
pipe(string$numbers, Record.replaceOption("a", true))

// $ExpectType Option<Record<`a${string}`, number>>
pipe(template$numbers, Record.replaceOption("a", 2))

// $ExpectType Option<Record<`a${string}`, number | boolean>>
pipe(template$numbers, Record.replaceOption("a", true))

// @ts-expect-error
pipe(template$numbers, Record.replaceOption("b", true))

// $ExpectType Option<Record<symbol, number>>
pipe(symbol$numbers, Record.replaceOption(symA, 2))

// $ExpectType Option<Record<symbol, number | boolean>>
pipe(symbol$numbers, Record.replaceOption(symA, true))

// $ExpectType Option<Record<"a" | "b", number>>
pipe(string$structAB, Record.replaceOption("a", 2))

// $ExpectType Option<Record<"a" | "b", number | boolean>>
pipe(string$structAB, Record.replaceOption("a", true))

// -------------------------------------------------------------------------------------
// remove
// -------------------------------------------------------------------------------------

// $ExpectType Record<string, number>
pipe(string$numbers, Record.remove("a"))

// $ExpectType Record<`a${string}`, number>
pipe(template$numbers, Record.remove("a"))

// @ts-expect-error
pipe(template$numbers, Record.remove("b"))

// $ExpectType Record<symbol, number>
pipe(symbol$numbers, Record.remove(symA))

// $ExpectType Record<"b", number>
pipe(string$structAB, Record.remove("a"))

// -------------------------------------------------------------------------------------
// pop
// -------------------------------------------------------------------------------------

// $ExpectType Option<[number, Record<string, number>]>
pipe(string$numbers, Record.pop("a"))

// $ExpectType Option<[number, Record<`a${string}`, number>]>
pipe(template$numbers, Record.pop("a"))

// @ts-expect-error
pipe(template$numbers, Record.pop("b"))

// $ExpectType Option<[number, Record<symbol, number>]>
pipe(symbol$numbers, Record.pop(symA))

// $ExpectType Option<[number, Record<"b", number>]>
pipe(string$structAB, Record.pop("a"))

// -------------------------------------------------------------------------------------
// map
// -------------------------------------------------------------------------------------

// $ExpectType Record<string, boolean>
Record.map(string$numbers, (
  a, // $ExpectType number
  _ // $ExpectType string
) => a > 0)

// $ExpectType Record<string, boolean>
pipe(
  string$numbers,
  Record.map((
    a, // $ExpectType number
    _ // $ExpectType string
  ) => a > 0)
)

// $ExpectType Record<`a${string}`, boolean>
Record.map(template$numbers, (
  a, // $ExpectType number
  _ // $ExpectType `a${string}`
) => a > 0)

// $ExpectType Record<string, number>
Record.map(symbol$numbers, (
  a, // $ExpectType number
  _ // $ExpectType string
) => a + 1)

// $ExpectType Record<"a" | "b", boolean>
Record.map(string$structAB, (
  a, // $ExpectType number
  _ // $ExpectType "a" | "b"
) => a > 0)

// $ExpectType Record<"a" | "b", boolean>
pipe(
  string$structAB,
  Record.map((
    a, // $ExpectType number
    _ // $ExpectType "a" | "b"
  ) => a > 0)
)

// -------------------------------------------------------------------------------------
// filterMap
// -------------------------------------------------------------------------------------

// $ExpectType Record<string, string>
Record.filterMap(string$numbers, (
  a,
  _ // $ExpectType string
) => a > 0 ? Option.some("positive") : Option.none())

// $ExpectType Record<`a${string}`, string>
Record.filterMap(template$numbers, (
  a,
  _ // $ExpectType `a${string}`
) => a > 0 ? Option.some("positive") : Option.none())

// $ExpectType Record<string, string>
Record.filterMap(symbol$numbers, (
  a,
  _ // $ExpectType string
) => a > 0 ? Option.some("positive") : Option.none())

// $ExpectType Record<string, number>
pipe(
  string$structAB,
  Record.filterMap((
    a,
    key // $ExpectType "a" | "b"
  ) => key === "a" ? Option.some(a) : Option.none())
)

// $ExpectType Record<string, number>
Record.filterMap(string$structAB, (
  a,
  key // $ExpectType "a" | "b"
) => key === "a" ? Option.some(a) : Option.none())

// -------------------------------------------------------------------------------------
// filter
// -------------------------------------------------------------------------------------

// $ExpectType Record<string, number>
Record.filter(string$numbers, (
  a, // $ExpectType number
  _ // $ExpectType string
) => a > 0)

// $ExpectType Record<`a${string}`, number>
Record.filter(template$numbers, (
  a, // $ExpectType number
  _ // $ExpectType `a${string}`
) => a > 0)

// $ExpectType Record<string, number>
pipe(
  string$structAB,
  Record.filter((
    _, // $ExpectType number
    key // $ExpectType "a" | "b"
  ) => key === "a")
)

// $ExpectType Record<string, number>
Record.filter(string$structAB, (
  _, // $ExpectType number
  key // $ExpectType "a" | "b"
) => key === "a")

// $ExpectType Record<string, string | number>
Record.filter(string$numbersOrStrings, predicateNumbersOrStrings)

// $ExpectType Record<string, number>
Record.filter(string$numbers, predicateNumbersOrStrings)

// $ExpectType Record<string, string | number>
pipe(string$numbersOrStrings, Record.filter(predicateNumbersOrStrings))

// $ExpectType Record<string, number>
pipe(string$numbers, Record.filter(predicateNumbersOrStrings))

// $ExpectType Record<string, number>
Record.filter(string$numbersOrStrings, Predicate.isNumber)

// $ExpectType Record<string, number>
pipe(string$numbersOrStrings, Record.filter(Predicate.isNumber))

// -------------------------------------------------------------------------------------
// partitionMap
// -------------------------------------------------------------------------------------

// $ExpectType [left: Record<string, boolean>, right: Record<string, string>]
Record.partitionMap(string$numbers, (
  a,
  _ // $ExpectType string
) => a > 0 ? Either.right("positive") : Either.left(false))

// $ExpectType [left: Record<string, boolean>, right: Record<string, string>]
pipe(
  string$structAB,
  Record.partitionMap((
    _,
    key // $ExpectType "a" | "b"
  ) => key === "a" ? Either.right("positive") : Either.left(false))
)

// $ExpectType [left: Record<string, boolean>, right: Record<string, string>]
Record.partitionMap(string$structAB, (
  _a,
  key // $ExpectType "a" | "b"
) => key === "a" ? Either.right("positive") : Either.left(false))

// -------------------------------------------------------------------------------------
// partition
// -------------------------------------------------------------------------------------

// $ExpectType [excluded: Record<string, number>, satisfying: Record<string, number>]
Record.partition(string$numbers, (
  a, // $ExpectType number
  _ // $ExpectType string
) => a > 0)

// $ExpectType [excluded: Record<string, number>, satisfying: Record<string, number>]
pipe(
  string$structAB,
  Record.partition((
    _a, // $ExpectType number
    key // $ExpectType "a" | "b"
  ) => key === "a")
)

// $ExpectType [excluded: Record<string, number>, satisfying: Record<string, number>]
Record.partition(string$structAB, (
  _a, // $ExpectType number
  key // $ExpectType "a" | "b"
) => key === "a")

// $ExpectType [excluded: Record<string, string | number>, satisfying: Record<string, string | number>]
Record.partition(string$numbersOrStrings, predicateNumbersOrStrings)

// $ExpectType [excluded: Record<string, string | number>, satisfying: Record<string, string | number>]
pipe(string$numbersOrStrings, Record.partition(predicateNumbersOrStrings))

// $ExpectType [excluded: Record<string, string>, satisfying: Record<string, number>]
Record.partition(string$numbersOrStrings, Predicate.isNumber)

// $ExpectType [excluded: Record<string, string>, satisfying: Record<string, number>]
pipe(string$numbersOrStrings, Record.partition(Predicate.isNumber))

// -------------------------------------------------------------------------------------
// keys
// -------------------------------------------------------------------------------------

// $ExpectType ("a" | "b")[]
Record.keys(string$structAB)

// -------------------------------------------------------------------------------------
// values
// -------------------------------------------------------------------------------------

// $ExpectType number[]
Record.values(string$structAB)

// -------------------------------------------------------------------------------------
// set
// -------------------------------------------------------------------------------------

// $ExpectType Record<string, number>
Record.set(string$numbers, "a", 2)

// $ExpectType Record<string, number | boolean>
Record.set(string$numbers, "a", true)

// $ExpectType Record<`a${string}`, number>
Record.set(template$numbers, "a", 2)

// $ExpectType Record<`a${string}`, number | boolean>
Record.set(template$numbers, "a", true)

// $ExpectType Record<"b" | `a${string}`, number | boolean>
Record.set(template$numbers, "b", true)

// $ExpectType Record<"a" | "b", number>
Record.set(string$structAB, "a", 2)

// $ExpectType Record<"a" | "b", number | boolean>
Record.set(string$structAB, "a", true)

// $ExpectType Record<"a" | "b" | "c", number | boolean>
Record.set(string$structAB, "c", true)

// -------------------------------------------------------------------------------------
// reduce
// -------------------------------------------------------------------------------------

Record.reduce(string$structAB, "", (
  _acc, // $ExpectType string
  _value, // $ExpectType number
  key // $ExpectType "a" | "b"
) => typeof key === "string" ? key : _acc)

// -------------------------------------------------------------------------------------
// some
// -------------------------------------------------------------------------------------

Record.some(string$structAB, (
  _value,
  _key // $ExpectType "a" | "b"
) => false)

pipe(
  string$numbersOrStrings,
  Record.some((
    _item // $ExpectType string | number
  ) => true)
)

// -------------------------------------------------------------------------------------
// union
// -------------------------------------------------------------------------------------

// $ExpectType Record<string, number>
Record.union(string$numbers, string$numbers, (_, b) => b)

// $ExpectType Record<string, string | number>
Record.union(string$numbers, string$numbersOrStrings, (_, b) => b)

// $ExpectType Record<"a" | "b" | "c" | "d", string | number>
Record.union(string$structAB, string$structCD, (_, b) => b)

// -------------------------------------------------------------------------------------
// singleton
// -------------------------------------------------------------------------------------

// $ExpectType Record<"a", number>
Record.singleton("a", 1)

// -------------------------------------------------------------------------------------
// every
// -------------------------------------------------------------------------------------

pipe(
  string$numbersOrStrings,
  Record.every((
    _item // $ExpectType string | number
  ) => true)
)

Record.every(string$structAB, (
  _value, // $ExpectType number
  _key // $ExpectType "a" | "b"
) => false)

if (Record.every(string$numbersOrStrings, Predicate.isString)) {
  string$numbersOrStrings // $ExpectType ReadonlyRecord<string, string>
}

if (Record.every(string$numbersOrStrings, Predicate.isString)) {
  string$numbersOrStrings // $ExpectType ReadonlyRecord<string, string>
}

// -------------------------------------------------------------------------------------
// intersection
// -------------------------------------------------------------------------------------

// $ExpectType Record<string, number>
Record.intersection(string$numbers, string$numbersOrStrings, (a, _) => a)

// $ExpectType Record<string, string | number>
Record.intersection(string$numbers, string$numbersOrStrings, (_, b) => b)

// $ExpectType Record<never, string>
Record.intersection(string$structAB, string$structCD, (_, b) => b)

// $ExpectType Record<never, number>
Record.intersection(string$structAB, string$structCD, (a, _) => a)

// $ExpectType Record<string, number>
Record.intersection(string$numbers, string$numbers, (a, _) => a)

// $ExpectType Record<string, number>
Record.intersection(string$numbers, string$structCD, (a, _) => a)

// $ExpectType Record<never, number>
Record.intersection(string$structAB, {
  c: 2
}, (a, _) => a)

// $ExpectType Record<"b", number>
Record.intersection(string$structAB, {
  b: 2
}, (a, _) => a)
