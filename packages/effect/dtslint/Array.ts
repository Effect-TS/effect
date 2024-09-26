import * as Array from "effect/Array"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import * as Equal from "effect/Equal"
import { hole, identity, pipe } from "effect/Function"
import * as Option from "effect/Option"
import * as Order from "effect/Order"
import * as Predicate from "effect/Predicate"

declare const nonEmptyReadonlyNumbers: Array.NonEmptyReadonlyArray<number>
declare const nonEmptyReadonlyStrings: Array.NonEmptyReadonlyArray<string>
declare const nonEmptyNumbers: Array.NonEmptyArray<number>
declare const nonEmptyStrings: Array.NonEmptyArray<string>
declare const readonlyNumbers: ReadonlyArray<number>
declare const numbers: Array<number>
declare const strings: Array<string>
declare const iterNumbers: Iterable<number>
declare const iterStrings: Iterable<string>
declare const numbersOrStrings: Array<number | string>

declare const primitiveNumber: number
declare const primitiveNumerOrString: string | number
declare const predicateNumbersOrStrings: Predicate.Predicate<number | string>

declare const unknownValue: unknown
declare const stringOrStringArrayOrUnion: string | Array<string> | null

const symA = Symbol.for("a")
const symB = Symbol.for("b")
const symC = Symbol.for("c")

// -------------------------------------------------------------------------------------
// isArray
// -------------------------------------------------------------------------------------

if (Array.isArray(unknownValue)) {
  // $ExpectType unknown[]
  unknownValue
}

if (Array.isArray(stringOrStringArrayOrUnion)) {
  // $ExpectType string[]
  stringOrStringArrayOrUnion
}

// -------------------------------------------------------------------------------------
// isEmptyReadonlyArray
// -------------------------------------------------------------------------------------

if (Array.isEmptyReadonlyArray(readonlyNumbers)) {
  // $ExpectType readonly []
  readonlyNumbers
}

// $ExpectType <A>(a: readonly A[]) => Option<readonly []>
Option.liftPredicate(Array.isEmptyReadonlyArray)

// -------------------------------------------------------------------------------------
// isEmptyArray
// -------------------------------------------------------------------------------------

if (Array.isEmptyArray(numbers)) {
  // $ExpectType []
  numbers
}

// $ExpectType <A>(a: A[]) => Option<[]>
Option.liftPredicate(Array.isEmptyArray)

// -------------------------------------------------------------------------------------
// isNonEmptyReadonlyArray
// -------------------------------------------------------------------------------------

if (Array.isNonEmptyReadonlyArray(readonlyNumbers)) {
  // $ExpectType readonly [number, ...number[]]
  readonlyNumbers
}

// $ExpectType <A>(a: readonly A[]) => Option<readonly [A, ...A[]]>
Option.liftPredicate(Array.isNonEmptyReadonlyArray)

// -------------------------------------------------------------------------------------
// isNonEmptyArray
// -------------------------------------------------------------------------------------

if (Array.isNonEmptyArray(numbers)) {
  // $ExpectType [number, ...number[]]
  numbers
}

// $ExpectType <A>(a: A[]) => Option<[A, ...A[]]>
Option.liftPredicate(Array.isNonEmptyArray)

// -------------------------------------------------------------------------------------
// map
// -------------------------------------------------------------------------------------

// $ExpectType number[]
Array.map(readonlyNumbers, (n) => n + 1)

// $ExpectType number[]
pipe(readonlyNumbers, Array.map((n) => n + 1))

// $ExpectType number[]
Array.map(numbers, (n) => n + 1)

// $ExpectType number[]
pipe(numbers, Array.map((n) => n + 1))

// $ExpectType [number, ...number[]]
Array.map(nonEmptyReadonlyNumbers, (n) => n + 1)

// $ExpectType [number, ...number[]]
pipe(nonEmptyReadonlyNumbers, Array.map((n) => n + 1))

// $ExpectType [number, ...number[]]
Array.map(nonEmptyNumbers, (n) => n + 1)

// $ExpectType [number, ...number[]]
pipe(nonEmptyNumbers, Array.map((n) => n + 1))

// -------------------------------------------------------------------------------------
// groupBy
// -------------------------------------------------------------------------------------

// $ExpectType Record<string, [number, ...number[]]>
Array.groupBy([1, 2, 3], String)

// $ExpectType Record<string, [number, ...number[]]>
Array.groupBy([1, 2, 3], (n) => n > 0 ? "positive" as const : "negative" as const)

// $ExpectType Record<symbol, [string, ...string[]]>
Array.groupBy(["a", "b"], Symbol.for)

// $ExpectType Record<symbol, [string, ...string[]]>
Array.groupBy(["a", "b"], (s) => s === "a" ? symA : s === "b" ? symB : symC)

// -------------------------------------------------------------------------------------
// some
// -------------------------------------------------------------------------------------

if (Array.some(numbersOrStrings, Predicate.isString)) {
  numbersOrStrings // $ExpectType (string | number)[] & readonly [string | number, ...(string | number)[]]
}

pipe(
  numbersOrStrings,
  Array.some((
    _item // $ExpectType string | number
  ) => true)
)

// -------------------------------------------------------------------------------------
// every
// -------------------------------------------------------------------------------------

if (Array.every(numbersOrStrings, Predicate.isString)) {
  numbersOrStrings // $ExpectType (string | number)[] & readonly string[]
}

if (Array.every(Predicate.isString)(numbersOrStrings)) {
  numbersOrStrings // $ExpectType (string | number)[] & readonly string[]
}

Array.every(numbersOrStrings, (
  _item // $ExpectType string | number
) => true)

Array.every(numbersOrStrings, (
  _item, // $ExpectType string | number
  _i // $ExpectType number
) => true)

pipe(
  numbersOrStrings,
  Array.every((
    _item // $ExpectType string | number
  ) => true)
)

pipe(
  numbersOrStrings,
  Array.every((
    _item, // $ExpectType string | number
    _i // $ExpectType number
  ) => true)
)

// -------------------------------------------------------------------------------------
// append
// -------------------------------------------------------------------------------------

// $ExpectType [string | number | boolean, ...(string | number | boolean)[]]
Array.append(numbersOrStrings, true)

// $ExpectType [string | number | boolean, ...(string | number | boolean)[]]
Array.append(true)(numbersOrStrings)

// -------------------------------------------------------------------------------------
// prepend
// -------------------------------------------------------------------------------------

// $ExpectType [string | number | boolean, ...(string | number | boolean)[]]
Array.prepend(numbersOrStrings, true)

// $ExpectType [string | number | boolean, ...(string | number | boolean)[]]
Array.prepend(true)(numbersOrStrings)

// -------------------------------------------------------------------------------------
// sort
// -------------------------------------------------------------------------------------

declare const ordera: Order.Order<{ readonly a: string }>
interface AB {
  readonly a: string
  readonly b: number
}
declare const abs: ReadonlyArray<AB>
declare const nonEmptyabs: Array.NonEmptyReadonlyArray<AB>

// $ExpectType AB[]
Array.sort(abs, ordera)

// $ExpectType AB[]
pipe(abs, Array.sort(ordera))

// $ExpectType AB[]
Array.sort(ordera)(abs)

// $ExpectType [AB, ...AB[]]
Array.sort(nonEmptyabs, ordera)

// $ExpectType [AB, ...AB[]]
pipe(nonEmptyabs, Array.sort(ordera))

// $ExpectType [AB, ...AB[]]
Array.sort(ordera)(nonEmptyabs)

// @ts-expect-error
pipe([1], Array.sort(Order.string))

// @ts-expect-error
Array.sort([1], Order.string)

// @ts-expect-error
Array.sort(Order.string)([1])

// -------------------------------------------------------------------------------------
// sortWith
// -------------------------------------------------------------------------------------

// $ExpectType AB[]
pipe(abs, Array.sortWith(identity, ordera))

// $ExpectType AB[]
Array.sortWith(abs, identity, ordera)

// $ExpectType [AB, ...AB[]]
pipe(nonEmptyabs, Array.sortWith(identity, ordera))

// $ExpectType [AB, ...AB[]]
Array.sortWith(nonEmptyabs, identity, ordera)

// -------------------------------------------------------------------------------------
// partition
// -------------------------------------------------------------------------------------

Array.partition(numbersOrStrings, (
  _item // $ExpectType string | number
) => true)

pipe(
  numbersOrStrings,
  Array.partition((
    _item // $ExpectType string | number
  ) => true)
)

// $ExpectType [excluded: (string | number)[], satisfying: (string | number)[]]
Array.partition(numbersOrStrings, predicateNumbersOrStrings)

// $ExpectType [excluded: (string | number)[], satisfying: (string | number)[]]
pipe(numbersOrStrings, Array.partition(predicateNumbersOrStrings))

// $ExpectType [excluded: string[], satisfying: number[]]
Array.partition(numbersOrStrings, Predicate.isNumber)

// $ExpectType [excluded: string[], satisfying: number[]]
pipe(numbersOrStrings, Array.partition(Predicate.isNumber))

// -------------------------------------------------------------------------------------
// filter
// -------------------------------------------------------------------------------------

Array.filter(numbersOrStrings, (
  _item // $ExpectType string | number
) => true)

// @ts-expect-error
Array.filter(numbersOrStrings, (
  _item: string
) => true)

pipe(
  numbersOrStrings,
  Array.filter((
    _item // $ExpectType string | number
  ) => true)
)

pipe(
  numbersOrStrings,
  // @ts-expect-error
  Array.filter((
    _item: string
  ) => true)
)

// $ExpectType (string | number)[]
Array.filter(numbersOrStrings, predicateNumbersOrStrings)

// $ExpectType number[]
Array.filter(numbers, predicateNumbersOrStrings)

// $ExpectType (string | number)[]
pipe(numbersOrStrings, Array.filter(predicateNumbersOrStrings))

// $ExpectType number[]
pipe(numbers, Array.filter(predicateNumbersOrStrings))

// $ExpectType number[]
Array.filter(numbersOrStrings, Predicate.isNumber)

// $ExpectType number[]
pipe(numbersOrStrings, Array.filter(Predicate.isNumber))

// -------------------------------------------------------------------------------------
// takeWhile
// -------------------------------------------------------------------------------------

Array.takeWhile(numbersOrStrings, (
  _item // $ExpectType string | number
) => true)

Array.takeWhile(numbersOrStrings, (
  _item, // $ExpectType string | number
  _i // $ExpectType number
) => true)

pipe(
  numbersOrStrings,
  Array.takeWhile((
    _item // $ExpectType string | number
  ) => true)
)

pipe(
  numbersOrStrings,
  Array.takeWhile((
    _item, // $ExpectType string | number
    _i // $ExpectType number
  ) => true)
)

// $ExpectType (string | number)[]
Array.takeWhile(numbersOrStrings, predicateNumbersOrStrings)

// $ExpectType number[]
Array.takeWhile(numbers, predicateNumbersOrStrings)

// $ExpectType (string | number)[]
pipe(numbersOrStrings, Array.takeWhile(predicateNumbersOrStrings))

// $ExpectType number[]
pipe(numbers, Array.takeWhile(predicateNumbersOrStrings))

// $ExpectType number[]
Array.takeWhile(numbersOrStrings, Predicate.isNumber)

// $ExpectType number[]
pipe(numbersOrStrings, Array.takeWhile(Predicate.isNumber))

// -------------------------------------------------------------------------------------
// findFirst
// -------------------------------------------------------------------------------------

Array.findFirst(numbersOrStrings, (
  _item // $ExpectType string | number
) => true)

Array.findFirst(numbersOrStrings, (
  _item, // $ExpectType string | number
  _i // $ExpectType number
) => true)

// $ExpectType Option<number>
Array.findFirst(numbersOrStrings, (
  _item, // $ExpectType string | number
  _i // $ExpectType number
): _item is number => true)

// $ExpectType Option<boolean>
Array.findFirst(numbersOrStrings, (
  _item, // $ExpectType string | number
  _i // $ExpectType number
) => Option.some(true))

pipe(
  numbersOrStrings,
  Array.findFirst((
    _item // $ExpectType string | number
  ) => true)
)

pipe(
  numbersOrStrings,
  Array.findFirst((
    _item, // $ExpectType string | number
    _i // $ExpectType number
  ) => true)
)

// $ExpectType Option<number>
pipe(
  numbersOrStrings,
  Array.findFirst((
    _item, // $ExpectType string | number
    _i // $ExpectType number
  ): _item is number => true)
)

// $ExpectType Option<boolean>
pipe(
  numbersOrStrings,
  Array.findFirst((
    _item, // $ExpectType string | number
    _i // $ExpectType number
  ) => Option.some(true))
)

// $ExpectType Option<string | number>
Array.findFirst(numbersOrStrings, predicateNumbersOrStrings)

// $ExpectType Option<string | number>
pipe(numbersOrStrings, Array.findFirst(predicateNumbersOrStrings))

// $ExpectType Option<number>
Array.findFirst(numbersOrStrings, Predicate.isNumber)

// $ExpectType Option<number>
pipe(numbersOrStrings, Array.findFirst(Predicate.isNumber))

// -------------------------------------------------------------------------------------
// findLast
// -------------------------------------------------------------------------------------

Array.findLast(numbersOrStrings, (
  _item // $ExpectType string | number
) => true)

Array.findLast(numbersOrStrings, (
  _item, // $ExpectType string | number
  _i // $ExpectType number
) => true)

// $ExpectType Option<number>
Array.findLast(numbersOrStrings, (
  _item, // $ExpectType string | number
  _i // $ExpectType number
): _item is number => true)

// $ExpectType Option<boolean>
Array.findLast(numbersOrStrings, (
  _item, // $ExpectType string | number
  _i // $ExpectType number
) => Option.some(true))

pipe(
  numbersOrStrings,
  Array.findLast((
    _item // $ExpectType string | number
  ) => true)
)

pipe(
  numbersOrStrings,
  Array.findLast((
    _item, // $ExpectType string | number
    _i // $ExpectType number
  ) => true)
)

// $ExpectType Option<number>
pipe(
  numbersOrStrings,
  Array.findLast((
    _item, // $ExpectType string | number
    _i // $ExpectType number
  ): _item is number => true)
)

// $ExpectType Option<boolean>
pipe(
  numbersOrStrings,
  Array.findLast((
    _item, // $ExpectType string | number
    _i // $ExpectType number
  ) => Option.some(true))
)

// $ExpectType Option<string | number>
Array.findLast(numbersOrStrings, predicateNumbersOrStrings)

// $ExpectType Option<string | number>
pipe(numbersOrStrings, Array.findLast(predicateNumbersOrStrings))

// $ExpectType Option<number>
Array.findLast(numbersOrStrings, Predicate.isNumber)

// $ExpectType Option<number>
pipe(numbersOrStrings, Array.findLast(Predicate.isNumber))

// -------------------------------------------------------------------------------------
// liftPredicate
// -------------------------------------------------------------------------------------

// $ExpectType string[]
pipe(primitiveNumerOrString, Array.liftPredicate(Predicate.isString))

pipe(
  primitiveNumerOrString,
  Array.liftPredicate(
    (
      n // $ExpectType string | number
    ): n is number => typeof n === "number"
  )
)

// $ExpectType (string | number)[]
pipe(primitiveNumerOrString, Array.liftPredicate(predicateNumbersOrStrings))

// $ExpectType number[]
pipe(primitiveNumber, Array.liftPredicate(predicateNumbersOrStrings))

// $ExpectType number[]
pipe(
  primitiveNumber,
  Array.liftPredicate(
    (
      _n // $ExpectType number
    ) => true
  )
)

// -------------------------------------------------------------------------------------
// span
// -------------------------------------------------------------------------------------

Array.span(numbersOrStrings, (
  _item // $ExpectType string | number
) => true)

Array.span(numbersOrStrings, (
  _item, // $ExpectType string | number
  _i // $ExpectType number
) => true)

pipe(
  numbersOrStrings,
  Array.span((
    _item // $ExpectType string | number
  ) => true)
)

pipe(
  numbersOrStrings,
  Array.span((
    _item, // $ExpectType string | number
    _i // $ExpectType number
  ) => true)
)

// $ExpectType [init: (string | number)[], rest: (string | number)[]]
Array.span(numbersOrStrings, predicateNumbersOrStrings)

// $ExpectType [init: number[], rest: number[]]
Array.span(numbers, predicateNumbersOrStrings)

// $ExpectType [init: (string | number)[], rest: (string | number)[]]
pipe(numbersOrStrings, Array.span(predicateNumbersOrStrings))

// $ExpectType [init: number[], rest: number[]]
pipe(numbers, Array.span(predicateNumbersOrStrings))

// $ExpectType [init: number[], rest: string[]]
Array.span(numbersOrStrings, Predicate.isNumber)

// $ExpectType [init: number[], rest: string[]]
pipe(numbersOrStrings, Array.span(Predicate.isNumber))

// -------------------------------------------------------------------------------------
// dropWhile
// -------------------------------------------------------------------------------------

// $ExpectType number[]
Array.dropWhile(numbers, predicateNumbersOrStrings)

// $ExpectType number[]
pipe(numbers, Array.dropWhile(predicateNumbersOrStrings))

// $ExpectType (string | number)[]
Array.dropWhile(numbersOrStrings, Predicate.isNumber)

// $ExpectType (string | number)[]
pipe(numbersOrStrings, Array.dropWhile(Predicate.isNumber))

// -------------------------------------------------------------------------------------
// flatMap
// -------------------------------------------------------------------------------------

// $ExpectType number[]
Array.flatMap(strings, (
  _s, // $ExpectType string
  _i // $ExpectType number
) => Array.empty<number>())

// $ExpectType number[]
pipe(
  strings,
  Array.flatMap((
    _s, // $ExpectType string
    _i // $ExpectType number
  ) => Array.empty<number>())
)

// $ExpectType number[]
Array.flatMap(strings, (
  s, // $ExpectType string
  _i // $ExpectType number
) => Array.of(s.length))

// $ExpectType number[]
pipe(
  strings,
  Array.flatMap((
    s, // $ExpectType string
    _i // $ExpectType number
  ) => Array.of(s.length))
)

// $ExpectType number[]
Array.flatMap(nonEmptyReadonlyStrings, (
  _s, // $ExpectType string
  _i // $ExpectType number
) => Array.empty<number>())

// $ExpectType number[]
pipe(
  nonEmptyReadonlyStrings,
  Array.flatMap((
    _s, // $ExpectType string
    _i // $ExpectType number
  ) => Array.empty<number>())
)

// $ExpectType [number, ...number[]]
Array.flatMap(nonEmptyReadonlyStrings, (
  s, // $ExpectType string
  _i // $ExpectType number
) => Array.of(s.length))

// $ExpectType [number, ...number[]]
pipe(
  nonEmptyReadonlyStrings,
  Array.flatMap((
    s, // $ExpectType string
    _i // $ExpectType number
  ) => Array.of(s.length))
)

// -------------------------------------------------------------------------------------
// flatten
// -------------------------------------------------------------------------------------

// $ExpectType number[]
Array.flatten(hole<Array<Array<number>>>())

// $ExpectType number[]
Array.flatten(hole<Array<Array.NonEmptyArray<number>>>())

// $ExpectType number[]
Array.flatten(hole<Array.NonEmptyArray<Array<number>>>())

// $ExpectType [number, ...number[]]
Array.flatten(hole<Array.NonEmptyReadonlyArray<Array.NonEmptyReadonlyArray<number>>>())

declare const flattenArray: Effect.Effect<ReadonlyArray<ReadonlyArray<number>>>
declare const flattenNonEmptyArray: Effect.Effect<
  Array.NonEmptyReadonlyArray<Array.NonEmptyReadonlyArray<number>>
>

// $ExpectType Effect<number[], never, never>
flattenArray.pipe(Effect.map((_) => Array.flatten(_)))

// $ExpectType Effect<number[], never, never>
flattenArray.pipe(Effect.map(Array.flatten))

// $ExpectType Effect<[number, ...number[]], never, never>
flattenNonEmptyArray.pipe(Effect.map((_) => Array.flatten(_)))

// $ExpectType Effect<[number, ...number[]], never, never>
flattenNonEmptyArray.pipe(Effect.map(Array.flatten))

// -------------------------------------------------------------------------------------
// prependAll
// -------------------------------------------------------------------------------------

// Array + Array

// $ExpectType (string | number)[]
Array.prependAll(strings, numbers)

// $ExpectType (string | number)[]
pipe(strings, Array.prependAll(numbers))

// NonEmptyArray + Array

// $ExpectType [string | number, ...(string | number)[]]
Array.prependAll(nonEmptyStrings, numbers)

// $ExpectType [string | number, ...(string | number)[]]
pipe(nonEmptyStrings, Array.prependAll(numbers))

// Array + NonEmptyArray

// $ExpectType [string | number, ...(string | number)[]]
Array.prependAll(strings, nonEmptyNumbers)

// $ExpectType [string | number, ...(string | number)[]]
pipe(strings, Array.prependAll(nonEmptyNumbers))

// NonEmptyArray + NonEmptyArray

// $ExpectType [string | number, ...(string | number)[]]
Array.prependAll(nonEmptyStrings, nonEmptyNumbers)

// $ExpectType [string | number, ...(string | number)[]]
pipe(nonEmptyStrings, Array.prependAll(nonEmptyNumbers))

// Iterable + Array

// $ExpectType (string | number)[]
Array.prependAll(iterStrings, numbers)

// $ExpectType (string | number)[]
pipe(iterStrings, Array.prependAll(numbers))

// Iterable + NonEmptyArray

// $ExpectType [string | number, ...(string | number)[]]
Array.prependAll(iterStrings, nonEmptyNumbers)

// $ExpectType [string | number, ...(string | number)[]]
pipe(iterStrings, Array.prependAll(nonEmptyNumbers))

// NonEmptyArray + Iterable

// $ExpectType [string | number, ...(string | number)[]]
Array.prependAll(nonEmptyStrings, iterNumbers)

// $ExpectType [string | number, ...(string | number)[]]
pipe(nonEmptyStrings, Array.prependAll(iterNumbers))

// -------------------------------------------------------------------------------------
// appendAll
// -------------------------------------------------------------------------------------

// $ExpectType (string | number)[]
Array.appendAll(strings, numbers)

// $ExpectType (string | number)[]
pipe(strings, Array.appendAll(numbers))

// $ExpectType [string | number, ...(string | number)[]]
Array.appendAll(nonEmptyStrings, numbers)

// $ExpectType [string | number, ...(string | number)[]]
pipe(nonEmptyStrings, Array.appendAll(numbers))

// $ExpectType [string | number, ...(string | number)[]]
Array.appendAll(strings, nonEmptyNumbers)

// $ExpectType [string | number, ...(string | number)[]]
pipe(strings, Array.appendAll(nonEmptyNumbers))

// $ExpectType [string | number, ...(string | number)[]]
Array.appendAll(nonEmptyStrings, nonEmptyNumbers)

// $ExpectType [string | number, ...(string | number)[]]
pipe(nonEmptyStrings, Array.appendAll(nonEmptyNumbers))

// -------------------------------------------------------------------------------------
// zip
// -------------------------------------------------------------------------------------

// $ExpectType [string, number][]
Array.zip(strings, numbers)

// $ExpectType [string, number][]
pipe(strings, Array.zip(numbers))

// $ExpectType [string, number][]
Array.zip(numbers)(strings)

// $ExpectType [[string, number], ...[string, number][]]
Array.zip(nonEmptyStrings, nonEmptyNumbers)

// $ExpectType [[string, number], ...[string, number][]]
pipe(nonEmptyStrings, Array.zip(nonEmptyNumbers))

// $ExpectType [[string, number], ...[string, number][]]
Array.zip(nonEmptyNumbers)(nonEmptyStrings)

// -------------------------------------------------------------------------------------
// intersperse
// -------------------------------------------------------------------------------------

// $ExpectType string[]
Array.intersperse(strings, "a")

// $ExpectType (string | number)[]
Array.intersperse(strings, 1)

// $ExpectType string[]
pipe(strings, Array.intersperse("a"))

// $ExpectType (string | number)[]
pipe(strings, Array.intersperse(1))

// $ExpectType string[]
Array.intersperse("a")(strings)

// $ExpectType (string | number)[]
Array.intersperse(1)(strings)

// $ExpectType [string, ...string[]]
Array.intersperse(nonEmptyStrings, "a")

// $ExpectType [string | number, ...(string | number)[]]
Array.intersperse(nonEmptyStrings, 1)

// $ExpectType [string, ...string[]]
pipe(nonEmptyStrings, Array.intersperse("a"))

// $ExpectType [string | number, ...(string | number)[]]
pipe(nonEmptyStrings, Array.intersperse(1))

// $ExpectType [string, ...string[]]
Array.intersperse("a")(nonEmptyStrings)

// $ExpectType [string | number, ...(string | number)[]]
Array.intersperse(1)(nonEmptyStrings)

// -------------------------------------------------------------------------------------
// rotate
// -------------------------------------------------------------------------------------

// $ExpectType string[]
Array.rotate(strings, 10)

// $ExpectType string[]
pipe(strings, Array.rotate(10))

// $ExpectType string[]
Array.rotate(10)(strings)

// $ExpectType [string, ...string[]]
Array.rotate(nonEmptyStrings, 10)

// $ExpectType [string, ...string[]]
pipe(nonEmptyStrings, Array.rotate(10))

// $ExpectType [string, ...string[]]
Array.rotate(10)(nonEmptyStrings)

// -------------------------------------------------------------------------------------
// union
// -------------------------------------------------------------------------------------

// $ExpectType (string | number)[]
Array.union(strings, numbers)

// $ExpectType (string | number)[]
pipe(strings, Array.union(numbers))

// $ExpectType (string | number)[]
Array.union(numbers)(strings)

// $ExpectType [string | number, ...(string | number)[]]
Array.union(nonEmptyStrings, numbers)

// $ExpectType [string | number, ...(string | number)[]]
Array.union(strings, nonEmptyNumbers)

// $ExpectType [string | number, ...(string | number)[]]
Array.union(nonEmptyStrings, nonEmptyNumbers)

// $ExpectType [string | number, ...(string | number)[]]
pipe(nonEmptyStrings, Array.union(numbers))

// $ExpectType [string | number, ...(string | number)[]]
pipe(strings, Array.union(nonEmptyNumbers))

// $ExpectType [string | number, ...(string | number)[]]
pipe(nonEmptyStrings, Array.union(nonEmptyNumbers))

// $ExpectType [string | number, ...(string | number)[]]
Array.union(numbers)(nonEmptyStrings)

// $ExpectType [string | number, ...(string | number)[]]
Array.union(nonEmptyNumbers)(strings)

// $ExpectType [string | number, ...(string | number)[]]
Array.union(nonEmptyNumbers)(nonEmptyStrings)

// -------------------------------------------------------------------------------------
// unionWith
// -------------------------------------------------------------------------------------

// $ExpectType (string | number)[]
Array.unionWith(strings, numbers, Equal.equivalence<string | number>())

// $ExpectType (string | number)[]
Array.unionWith(strings, numbers, (
  _a, // $ExpectType string
  _b // $ExpectType number
) => true)

// $ExpectType (string | number)[]
pipe(strings, Array.unionWith(numbers, Equal.equivalence<string | number>()))

// $ExpectType (string | number)[]
pipe(
  strings,
  Array.unionWith(numbers, (
    _a, // $ExpectType string
    _b // $ExpectType number
  ) => true)
)

// $ExpectType [string | number, ...(string | number)[]]
Array.unionWith(nonEmptyStrings, numbers, Equal.equivalence<string | number>())

// $ExpectType [string | number, ...(string | number)[]]
Array.unionWith(nonEmptyStrings, numbers, (
  _a, // $ExpectType string
  _b // $ExpectType number
) => true)

// $ExpectType [string | number, ...(string | number)[]]
Array.unionWith(strings, nonEmptyNumbers, Equal.equivalence<string | number>())

// $ExpectType [string | number, ...(string | number)[]]
Array.unionWith(strings, nonEmptyNumbers, (
  _a, // $ExpectType string
  _b // $ExpectType number
) => true)

// $ExpectType [string | number, ...(string | number)[]]
Array.unionWith(nonEmptyStrings, nonEmptyNumbers, Equal.equivalence<string | number>())

// $ExpectType [string | number, ...(string | number)[]]
Array.unionWith(nonEmptyStrings, nonEmptyNumbers, (
  _a, // $ExpectType string
  _b // $ExpectType number
) => true)

// $ExpectType [string | number, ...(string | number)[]]
pipe(nonEmptyStrings, Array.unionWith(numbers, Equal.equivalence<string | number>()))

// $ExpectType [string | number, ...(string | number)[]]
pipe(
  nonEmptyStrings,
  Array.unionWith(numbers, (
    _a, // $ExpectType string
    _b // $ExpectType number
  ) => true)
)

// $ExpectType [string | number, ...(string | number)[]]
pipe(strings, Array.unionWith(nonEmptyNumbers, Equal.equivalence<string | number>()))

// $ExpectType [string | number, ...(string | number)[]]
pipe(
  strings,
  Array.unionWith(nonEmptyNumbers, (
    _a, // $ExpectType string
    _b // $ExpectType number
  ) => true)
)

// $ExpectType [string | number, ...(string | number)[]]
pipe(nonEmptyStrings, Array.unionWith(nonEmptyNumbers, Equal.equivalence<string | number>()))

// $ExpectType [string | number, ...(string | number)[]]
pipe(
  nonEmptyStrings,
  Array.unionWith(nonEmptyNumbers, (
    _a, // $ExpectType string
    _b // $ExpectType number
  ) => true)
)

// -------------------------------------------------------------------------------------
// dedupe
// -------------------------------------------------------------------------------------

// $ExpectType string[]
Array.dedupe(strings)

// $ExpectType string[]
pipe(strings, Array.dedupe)

// $ExpectType [string, ...string[]]
Array.dedupe(nonEmptyStrings)

// $ExpectType [string, ...string[]]
pipe(nonEmptyStrings, Array.dedupe)

// -------------------------------------------------------------------------------------
// dedupeWith
// -------------------------------------------------------------------------------------

// $ExpectType string[]
Array.dedupeWith(strings, Equal.equivalence())

// $ExpectType string[]
Array.dedupeWith(strings, (
  _a, // $ExpectType string
  _b // $ExpectType string
) => true)

// $ExpectType string[]
pipe(strings, Array.dedupeWith(Equal.equivalence()))

// $ExpectType string[]
pipe(
  strings,
  Array.dedupeWith((
    _a, // $ExpectType string
    _b // $ExpectType string
  ) => true)
)

// $ExpectType [string, ...string[]]
Array.dedupeWith(nonEmptyStrings, Equal.equivalence())

// $ExpectType [string, ...string[]]
Array.dedupeWith(nonEmptyStrings, (
  _a, // $ExpectType string
  _b // $ExpectType string
) => true)

// $ExpectType [string, ...string[]]
pipe(nonEmptyStrings, Array.dedupeWith(Equal.equivalence()))

// $ExpectType [string, ...string[]]
pipe(
  nonEmptyStrings,
  Array.dedupeWith((
    _a, // $ExpectType string
    _b // $ExpectType string
  ) => true)
)

// -------------------------------------------------------------------------------------
// chop
// -------------------------------------------------------------------------------------

// $ExpectType string[]
Array.chop(strings, ([
  head, // $ExpectType string
  ...tail // $ExpectType string[]
]) => [head, tail])

// $ExpectType string[]
pipe(
  strings,
  Array.chop(([
    head, // $ExpectType string
    ...tail // $ExpectType string[]
  ]) => [head, tail])
)

// $ExpectType [string, ...string[]]
Array.chop(nonEmptyStrings, ([
  head, // $ExpectType string
  ...tail // $ExpectType string[]
]) => [head, tail])

// $ExpectType [string, ...string[]]
pipe(
  nonEmptyStrings,
  Array.chop(([
    head, // $ExpectType string
    ...tail // $ExpectType string[]
  ]) => [head, tail])
)

// -------------------------------------------------------------------------------------
// chunksOf
// -------------------------------------------------------------------------------------

// $ExpectType [string, ...string[]][]
Array.chunksOf(strings, 10)

// $ExpectType [string, ...string[]][]
pipe(strings, Array.chunksOf(10))

// $ExpectType [string, ...string[]][]
Array.chunksOf(10)(strings)

// $ExpectType [[string, ...string[]], ...[string, ...string[]][]]
Array.chunksOf(nonEmptyStrings, 10)

// $ExpectType [[string, ...string[]], ...[string, ...string[]][]]
pipe(nonEmptyStrings, Array.chunksOf(10))

// $ExpectType [[string, ...string[]], ...[string, ...string[]][]]
Array.chunksOf(10)(nonEmptyStrings)

// -------------------------------------------------------------------------------------
// reverse
// -------------------------------------------------------------------------------------

// $ExpectType string[]
Array.reverse(strings)

// $ExpectType string[]
pipe(strings, Array.reverse)

// $ExpectType [string, ...string[]]
Array.reverse(nonEmptyStrings)

// $ExpectType [string, ...string[]]
pipe(nonEmptyStrings, Array.reverse)

// -------------------------------------------------------------------------------------
// sortBy
// -------------------------------------------------------------------------------------

// $ExpectType AB[]
pipe(abs, Array.sortBy(ordera))

// $ExpectType AB[]
pipe(
  abs,
  Array.sortBy((
    _a, // $ExpectType AB
    _b // $ExpectType AB
  ) => 0)
)

// $ExpectType [AB, ...AB[]]
pipe(nonEmptyabs, Array.sortBy(ordera))

// $ExpectType [AB, ...AB[]]
pipe(
  nonEmptyabs,
  Array.sortBy((
    _a, // $ExpectType AB
    _b // $ExpectType AB
  ) => 0)
)

// -------------------------------------------------------------------------------------
// unzip
// -------------------------------------------------------------------------------------

// $ExpectType [string[], number[]]
Array.unzip(hole<Iterable<[string, number]>>())

// $ExpectType [string[], number[]]
pipe(hole<Iterable<[string, number]>>(), Array.unzip)

// $ExpectType [[string, ...string[]], [number, ...number[]]]
Array.unzip(hole<Array.NonEmptyReadonlyArray<[string, number]>>())

// $ExpectType [[string, ...string[]], [number, ...number[]]]
pipe(hole<Array.NonEmptyReadonlyArray<[string, number]>>(), Array.unzip)

// -------------------------------------------------------------------------------------
// zipWith
// -------------------------------------------------------------------------------------

// $ExpectType [string, number][]
Array.zipWith(strings, numbers, (
  a, // $ExpectType string
  b // $ExpectType number
) => [a, b] as [string, number])

// $ExpectType [string, number][]
pipe(
  strings,
  Array.zipWith(numbers, (
    a, // $ExpectType string
    b // $ExpectType number
  ) => [a, b] as [string, number])
)

// $ExpectType [[string, number], ...[string, number][]]
Array.zipWith(nonEmptyStrings, nonEmptyNumbers, (
  a, // $ExpectType string
  b // $ExpectType number
) => [a, b] as [string, number])

// $ExpectType [[string, number], ...[string, number][]]
pipe(
  nonEmptyStrings,
  Array.zipWith(nonEmptyNumbers, (
    a, // $ExpectType string
    b // $ExpectType number
  ) => [a, b] as [string, number])
)

// -------------------------------------------------------------------------------------
// separate
// -------------------------------------------------------------------------------------

// $ExpectType [unknown[], unknown[]]
Array.separate([])

// $ExpectType [never[], number[]]
Array.separate([Either.right(1)])

// $ExpectType [string[], never[]]
Array.separate([Either.left("a")])

// $ExpectType [string[], number[]]
Array.separate([Either.left("a"), Either.right(1)])

// $ExpectType [string[], number[]]
Array.separate(hole<Array<Either.Either<number, string>>>())

// $ExpectType [string[], number[]]
Array.separate(hole<Iterable<Either.Either<number, string>>>())

// $ExpectType [(string | Date)[], (number | boolean)[]]
Array.separate(hole<Iterable<Either.Either<number, string> | Either.Either<boolean, Date>>>())

// $ExpectType [(string | Date)[], (number | boolean)[]]
Array.separate(hole<Iterable<Either.Either<number, string>> | Iterable<Either.Either<boolean, Date>>>())

// -------------------------------------------------------------------------------------
// getRights
// -------------------------------------------------------------------------------------

// $ExpectType unknown[]
Array.getRights([])

// $ExpectType never[]
Array.getRights([Either.left("a")])

// $ExpectType number[]
Array.getRights([Either.right(1)])

// $ExpectType number[]
Array.getRights([Either.left("a"), Either.right(1)])

// $ExpectType number[]
Array.getRights(hole<Array<Either.Either<number, string>>>())

// $ExpectType number[]
Array.getRights(hole<Iterable<Either.Either<number, string>>>())

// $ExpectType (number | boolean)[]
Array.getRights(hole<Iterable<Either.Either<number, string> | Either.Either<boolean, Date>>>())

// $ExpectType (number | boolean)[]
Array.getRights(hole<Iterable<Either.Either<number, string>> | Iterable<Either.Either<boolean, Date>>>())

// -------------------------------------------------------------------------------------
// getLefts
// -------------------------------------------------------------------------------------

// $ExpectType unknown[]
Array.getLefts([])

// $ExpectType string[]
Array.getLefts([Either.left("a")])

// $ExpectType never[]
Array.getLefts([Either.right(1)])

// $ExpectType string[]
Array.getLefts([Either.left("a"), Either.right(1)])

// $ExpectType string[]
Array.getLefts(hole<Array<Either.Either<number, string>>>())

// $ExpectType string[]
Array.getLefts(hole<Iterable<Either.Either<number, string>>>())

// $ExpectType (string | Date)[]
Array.getLefts(hole<Iterable<Either.Either<number, string> | Either.Either<boolean, Date>>>())

// $ExpectType (string | Date)[]
Array.getLefts(hole<Iterable<Either.Either<number, string>> | Iterable<Either.Either<boolean, Date>>>())

// -------------------------------------------------------------------------------------
// getSomes
// -------------------------------------------------------------------------------------

// $ExpectType unknown[]
Array.getSomes([])

// $ExpectType never[]
Array.getSomes([Option.none()])

// $ExpectType number[]
Array.getSomes([Option.some(1)])

// $ExpectType number[]
Array.getSomes([Option.none(), Option.some(1)])

// $ExpectType number[]
Array.getSomes(hole<Array<Option.Option<number>>>())

// $ExpectType number[]
Array.getSomes(hole<Iterable<Option.Option<number>>>())

// $ExpectType (string | number)[]
Array.getSomes(hole<Iterable<Option.Option<number> | Option.Option<string>>>())

// $ExpectType (string | number)[]
Array.getSomes(hole<Iterable<Option.Option<number>> | Iterable<Option.Option<string>>>())

// -------------------------------------------------------------------------------------
// replace
// -------------------------------------------------------------------------------------

// $ExpectType string[]
Array.replace([], 0, "a")

// $ExpectType (string | number)[]
Array.replace(numbers, 0, "a")

// $ExpectType [number | "a", ...(number | "a")[]]
Array.replace(nonEmptyNumbers, 0, "a" as const)

// $ExpectType ("a" | 1 | 2)[]
Array.replace(new Set([1, 2] as const), 0, "a" as const)

// $ExpectType string[]
pipe([], Array.replace(0, "a"))

// $ExpectType (string | number)[]
pipe(numbers, Array.replace(0, "a"))

// $ExpectType [number | "a", ...(number | "a")[]]
pipe(nonEmptyNumbers, Array.replace(0, "a" as const))

// $ExpectType ("a" | 1 | 2)[]
pipe(new Set([1, 2] as const), Array.replace(0, "a" as const))

// $ExpectType [number | "a", ...(number | "a")[]]
pipe(Array.of(1), Array.replace(0, "a" as const))

// -------------------------------------------------------------------------------------
// replaceOption
// -------------------------------------------------------------------------------------

// $ExpectType Option<string[]>
Array.replaceOption([], 0, "a")

// $ExpectType Option<(string | number)[]>
Array.replaceOption(numbers, 0, "a")

// $ExpectType Option<[number | "a", ...(number | "a")[]]>
Array.replaceOption(nonEmptyNumbers, 0, "a" as const)

// $ExpectType Option<("a" | 1 | 2)[]>
Array.replaceOption(new Set([1, 2] as const), 0, "a" as const)

// $ExpectType Option<string[]>
pipe([], Array.replaceOption(0, "a"))

// $ExpectType Option<(string | number)[]>
pipe(numbers, Array.replaceOption(0, "a"))

// $ExpectType Option<[number | "a", ...(number | "a")[]]>
pipe(nonEmptyNumbers, Array.replaceOption(0, "a" as const))

// $ExpectType Option<("a" | 1 | 2)[]>
pipe(new Set([1, 2] as const), Array.replaceOption(0, "a" as const))

// -------------------------------------------------------------------------------------
// modify
// -------------------------------------------------------------------------------------

// $ExpectType string[]
Array.modify([], 0, (
  _n // $ExpectType never
) => "a")
// $ExpectType (string | number)[]
Array.modify(numbers, 0, (
  _n // $ExpectType number
) => "a")

// $ExpectType [number | "a", ...(number | "a")[]]
Array.modify(nonEmptyNumbers, 0, (
  _n // $ExpectType number
) => "a" as const)

// $ExpectType ("a" | 1 | 2)[]
Array.modify(new Set([1, 2] as const), 0, (
  _n // $ExpectType 1 | 2
) => "a" as const)

// $ExpectType string[]
pipe(
  [],
  Array.modify(0, (
    _n // $ExpectType never
  ) => "a")
)

// $ExpectType (string | number)[]
pipe(
  numbers,
  Array.modify(0, (
    _n // $ExpectType number
  ) => "a")
)

// $ExpectType [number | "a", ...(number | "a")[]]
pipe(
  nonEmptyNumbers,
  Array.modify(0, (
    _n // $ExpectType number
  ) => "a" as const)
)

// $ExpectType ("a" | 1 | 2)[]
pipe(
  new Set([1, 2] as const),
  Array.modify(0, (
    _n // $ExpectType 1 | 2
  ) => "a" as const)
)

// -------------------------------------------------------------------------------------
// modifyOption
// -------------------------------------------------------------------------------------

// $ExpectType Option<string[]>
Array.modifyOption([], 0, (
  _n // $ExpectType never
) => "a")

// $ExpectType Option<(string | number)[]>
Array.modifyOption(numbers, 0, (
  _n // $ExpectType number
) => "a")

// $ExpectType Option<[number | "a", ...(number | "a")[]]>
Array.modifyOption(nonEmptyNumbers, 0, (
  _n // $ExpectType number
) => "a" as const)

// $ExpectType Option<("a" | 1 | 2)[]>
Array.modifyOption(new Set([1, 2] as const), 0, (
  _n // $ExpectType 1 | 2
) => "a" as const)

// $ExpectType Option<string[]>
pipe(
  [],
  Array.modifyOption(0, (
    _n // $ExpectType never
  ) => "a")
)

// $ExpectType Option<(string | number)[]>
pipe(
  numbers,
  Array.modifyOption(0, (
    _n // $ExpectType number
  ) => "a")
)

// $ExpectType Option<[number | "a", ...(number | "a")[]]>
pipe(
  nonEmptyNumbers,
  Array.modifyOption(0, (
    _n // $ExpectType number
  ) => "a" as const)
)

// $ExpectType Option<("a" | 1 | 2)[]>
pipe(
  new Set([1, 2] as const),
  Array.modifyOption(0, (
    _n // $ExpectType 1 | 2
  ) => "a" as const)
)

// -------------------------------------------------------------------------------------
// mapAccum
// -------------------------------------------------------------------------------------

// $ExpectType [state: number, mappedArray: string[]]
Array.mapAccum(strings, 0, (s, a, i) => [s + i, a])

// $ExpectType [state: number, mappedArray: [string, ...string[]]]
Array.mapAccum(nonEmptyReadonlyStrings, 0, (s, a, i) => [s + i, a])

// $ExpectType [state: number, mappedArray: string[]]
pipe(
  strings,
  Array.mapAccum(0, (s, a, i) => [s + i, a])
)
// $ExpectType [state: number, mappedArray: [string, ...string[]]]
pipe(
  nonEmptyReadonlyStrings,
  Array.mapAccum(0, (s, a, i) => [s + i, a])
)
