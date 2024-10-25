import { hole, pipe } from "effect/Function"
import * as Option from "effect/Option"
import * as Predicate from "effect/Predicate"

declare const number: Option.Option<number>
declare const string: Option.Option<string>
declare const numberOrString: Option.Option<string | number>

declare const pimitiveNumber: number
declare const pimitiveNumerOrString: string | number
declare const predicateNumbersOrStrings: Predicate.Predicate<number | string>

// -------------------------------------------------------------------------------------
// liftPredicate
// -------------------------------------------------------------------------------------

// $ExpectType Option<string>
pipe(pimitiveNumerOrString, Option.liftPredicate(Predicate.isString))

// $ExpectType Option<number>
pipe(
  pimitiveNumerOrString,
  Option.liftPredicate(
    (
      n // $ExpectType string | number
    ): n is number => typeof n === "number"
  )
)

// $ExpectType Option<string | number>
pipe(pimitiveNumerOrString, Option.liftPredicate(predicateNumbersOrStrings))

// $ExpectType Option<number>
pipe(pimitiveNumber, Option.liftPredicate(predicateNumbersOrStrings))

// $ExpectType Option<number>
pipe(
  pimitiveNumber,
  Option.liftPredicate(
    (
      _n // $ExpectType number
    ) => true
  )
)

// $ExpectType Option<string>
Option.liftPredicate(pimitiveNumerOrString, Predicate.isString)

// $ExpectType Option<number>
Option.liftPredicate(
  pimitiveNumerOrString,
  (
    n // $ExpectType string | number
  ): n is number => typeof n === "number"
)

// $ExpectType Option<string | number>
Option.liftPredicate(pimitiveNumerOrString, predicateNumbersOrStrings)

// $ExpectType Option<number>
Option.liftPredicate(pimitiveNumber, predicateNumbersOrStrings)

// $ExpectType Option<number>
Option.liftPredicate(
  pimitiveNumber,
  (
    _n // $ExpectType number
  ) => true
)

// -------------------------------------------------------------------------------------
// getOrElse
// -------------------------------------------------------------------------------------

// $ExpectType string | null
pipe(Option.some("a"), Option.getOrElse(() => null))

// -------------------------------------------------------------------------------------
// filter
// -------------------------------------------------------------------------------------

// $ExpectType Option<number>
pipe(number, Option.filter(predicateNumbersOrStrings))

// $ExpectType Option<number>
Option.filter(number, predicateNumbersOrStrings)

// $ExpectType Option<string>
pipe(numberOrString, Option.filter(Predicate.isString))

// $ExpectType Option<string>
Option.filter(numberOrString, Predicate.isString)

// $ExpectType Option<number>
pipe(
  number,
  Option.filter(
    (
      _x // $ExpectType number
    ): _x is number => true
  )
)

// $ExpectType Option<number>
pipe(
  number,
  Option.filter(
    (
      _x // $ExpectType number
    ) => true
  )
)

// -------------------------------------------------------------------------------------
// all - tuple
// -------------------------------------------------------------------------------------

// $ExpectType Option<[]>
Option.all([])

// $ExpectType Option<[number]>
Option.all([Option.some(1)])

// $ExpectType Option<[number, string]>
Option.all([Option.some(1), Option.some("b")])

// $ExpectType Option<[number, string]>
pipe([Option.some(1), Option.some("b")] as const, Option.all)

// -------------------------------------------------------------------------------------
// all - struct
// -------------------------------------------------------------------------------------

// $ExpectType Option<{}>
Option.all({})

// $ExpectType Option<{ a: number; }>
Option.all({ a: Option.some(1) })

// $ExpectType Option<{ a: number; b: string; }>
Option.all({ a: Option.some(1), b: Option.some("b") })

// $ExpectType Option<{ a: number; b: string; }>
pipe({ a: Option.some(1), b: Option.some("b") }, Option.all)

// -------------------------------------------------------------------------------------
// all - array
// -------------------------------------------------------------------------------------

declare const optionArray: Array<Option.Option<string>>

// $ExpectType Option<string[]>
Option.all(optionArray)

// $ExpectType Option<string[]>
pipe(optionArray, Option.all)

// -------------------------------------------------------------------------------------
// all - record
// -------------------------------------------------------------------------------------

declare const optionRecord: Record<string, Option.Option<string>>

// $ExpectType Option<{ [x: string]: string; }>
Option.all(optionRecord)

// -------------------------------------------------------------------------------------
// exists
// -------------------------------------------------------------------------------------

if (Option.exists(Predicate.isString)(numberOrString)) {
  numberOrString // $ExpectType Option<string>
}

if (Option.exists(numberOrString, Predicate.isString)) {
  numberOrString // $ExpectType Option<string>
}

// $ExpectType boolean
pipe(
  number,
  Option.exists(
    (
      _x // $ExpectType number
    ): _x is number => true
  )
)

// $ExpectType boolean
pipe(
  number,
  Option.exists(
    (
      _x // $ExpectType number
    ) => true
  )
)

// -------------------------------------------------------------------------------------
// andThen
// -------------------------------------------------------------------------------------

// $ExpectType Option<string | number>
Option.andThen(numberOrString, numberOrString)

// $ExpectType Option<string | number>
Option.andThen(numberOrString, () => numberOrString)

// $ExpectType Option<string | number>
numberOrString.pipe(Option.andThen(numberOrString))

// $ExpectType Option<string | number>
numberOrString.pipe(Option.andThen(() => numberOrString))

// $ExpectType string | number
export type V = Option.Option.Value<typeof numberOrString>

// -------------------------------------------------------------------------------------
// do notation
// -------------------------------------------------------------------------------------

// $ExpectType Option<{ a: number; b: string; c: boolean; }>
pipe(
  Option.Do,
  Option.bind("a", (
    _scope // $ExpectType {}
  ) => Option.some(1)),
  Option.bind("b", (
    _scope // $ExpectType { a: number; }
  ) => Option.some("b")),
  Option.let("c", (
    _scope // $ExpectType { a: number; b: string; }
  ) => true)
)

// $ExpectType Option<{ a: number; b: string; c: boolean; }>
pipe(
  Option.some(1),
  Option.bindTo("a"),
  Option.bind("b", (
    _scope // $ExpectType { a: number; }
  ) => Option.some("b")),
  Option.let("c", (
    _scope // $ExpectType { a: number; b: string; }
  ) => true)
)

// -------------------------------------------------------------------------------------
// firstSomeOf
// -------------------------------------------------------------------------------------

// @ts-expect-error
Option.firstSomeOf<number>([number, string])

pipe(
  // @ts-expect-error
  [number, string],
  Option.firstSomeOf<number>
)

// heterogenous usage
// $ExpectType Option<string | number>
Option.firstSomeOf([number, string])

// heterogenous tacit usage
// $ExpectType Option<string | number>
pipe(
  [number, string],
  Option.firstSomeOf
)

// heterogenous usage of iterable's union
// $ExpectType Option<string | number>
Option.firstSomeOf(
  hole<
    | Iterable<Option.Option<number>>
    | [Option.Option<string>]
  >()
)

// heterogenous tacit usage of iterable's union
// $ExpectType Option<string | number>
pipe(
  hole<
    | Iterable<Option.Option<number>>
    | [Option.Option<string>]
  >(),
  Option.firstSomeOf
)
