import { hole, pipe } from "effect/Function"
import * as HashMap from "effect/HashMap"
import * as Predicate from "effect/Predicate"
import type * as Types from "effect/Types"

declare const hmLiterals: HashMap.HashMap<"k", "v">
declare const numbers: HashMap.HashMap<string, number>
declare const numbersOrStrings: HashMap.HashMap<string, number | string>
declare const structNumbers: HashMap.HashMap<"a" | "b", number>

declare const predicateNumbersOrStrings: Predicate.Predicate<number | string>

// -------------------------------------------------------------------------------------
// HashMap.Key
// -------------------------------------------------------------------------------------

// $ExpectType "k"
export type K = HashMap.HashMap.Key<typeof hmLiterals>

// -------------------------------------------------------------------------------------
// HashMap.Value
// -------------------------------------------------------------------------------------

// $ExpectType "v"
export type V = HashMap.HashMap.Value<typeof hmLiterals>

// -------------------------------------------------------------------------------------
// HashMap.Entry
// -------------------------------------------------------------------------------------

// $ExpectType ["k", "v"]
hole<Types.Simplify<HashMap.HashMap.Entry<typeof hmLiterals>>>()

// -------------------------------------------------------------------------------------
// filter
// -------------------------------------------------------------------------------------

// $ExpectType HashMap<string, number>
HashMap.filter(numbers, (
  // $ExpectType number
  value,
  // $ExpectType string
  _key
) => value > 0)

// $ExpectType HashMap<"a" | "b", number>
pipe(
  structNumbers,
  HashMap.filter((
    // $ExpectType number
    _value,
    // $ExpectType "a" | "b"
    key
  ) => key === "a")
)

// $ExpectType HashMap<"a" | "b", number>
HashMap.filter(structNumbers, (
  // $ExpectType number
  _value,
  // $ExpectType "a" | "b"
  key
) => key === "a")

// $ExpectType HashMap<string, string | number>
HashMap.filter(numbersOrStrings, predicateNumbersOrStrings)

// $ExpectType HashMap<string, number>
HashMap.filter(numbers, predicateNumbersOrStrings)

// $ExpectType HashMap<string, string | number>
pipe(numbersOrStrings, HashMap.filter(predicateNumbersOrStrings))

// $ExpectType HashMap<string, number>
pipe(numbers, HashMap.filter(predicateNumbersOrStrings))

// $ExpectType HashMap<string, number>
HashMap.filter(numbersOrStrings, Predicate.isNumber)

// $ExpectType HashMap<string, number>
pipe(numbersOrStrings, HashMap.filter(Predicate.isNumber))

// -------------------------------------------------------------------------------------
// findFirst
// -------------------------------------------------------------------------------------

HashMap.findFirst(numbersOrStrings, (
  _item, // $ExpectType string | number
  _key // $ExpectType string
) => true)

pipe(
  numbersOrStrings,
  HashMap.findFirst((
    _item, // $ExpectType string | number
    _key // $ExpectType string
  ) => true)
)

// $ExpectType Option<[string, string | number]>
HashMap.findFirst(numbersOrStrings, predicateNumbersOrStrings)

// $ExpectType Option<[string, string | number]>
pipe(numbersOrStrings, HashMap.findFirst(predicateNumbersOrStrings))

// $ExpectType Option<[string, number]>
HashMap.findFirst(numbersOrStrings, Predicate.isNumber)

// $ExpectType Option<[string, number]>
pipe(numbersOrStrings, HashMap.findFirst(Predicate.isNumber))
