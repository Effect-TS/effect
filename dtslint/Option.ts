import { pipe } from "effect/Function"
import * as Option from "effect/Option"

declare const n: number
declare const sn: string | number
declare const isString: (u: unknown) => u is string
declare const predicate: (sn: string | number) => boolean
declare const on: Option.Option<number>
declare const osn: Option.Option<string | number>

// -------------------------------------------------------------------------------------
// liftPredicate
// -------------------------------------------------------------------------------------

// $ExpectType Option<string>
pipe(sn, Option.liftPredicate(isString))
pipe(
  sn,
  Option.liftPredicate(
    (
      n // $ExpectType string | number
    ): n is number => typeof n === "number"
  )
)

// $ExpectType Option<string | number>
pipe(sn, Option.liftPredicate(predicate))
// $ExpectType Option<number>
pipe(n, Option.liftPredicate(predicate))
// $ExpectType Option<number>
pipe(
  n,
  Option.liftPredicate(
    (
      _n // $ExpectType number
    ) => true
  )
)

// -------------------------------------------------------------------------------------
// getOrElse
// -------------------------------------------------------------------------------------

// $ExpectType string | null
pipe(Option.some("a"), Option.getOrElse(() => null))

// -------------------------------------------------------------------------------------
// do notation
// -------------------------------------------------------------------------------------

// $ExpectType Option<{ a: number; b: string; }>
pipe(
  Option.Do,
  Option.bind("a", () => Option.some(1)),
  Option.bind("b", () => Option.some("b"))
)

// -------------------------------------------------------------------------------------
// filter
// -------------------------------------------------------------------------------------

// $ExpectType Option<number>
pipe(on, Option.filter(predicate))

// $ExpectType Option<number>
Option.filter(on, predicate)

// $ExpectType Option<string>
pipe(osn, Option.filter(isString))

// $ExpectType Option<string>
Option.filter(osn, isString)

// $ExpectType Option<number>
pipe(
  on,
  Option.filter(
    (
      x // $ExpectType number
    ): x is number => true
  )
)

// $ExpectType Option<number>
pipe(
  on,
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
