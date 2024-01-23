import * as Exit from "effect/Exit"
import { pipe } from "effect/Function"
import * as Predicate from "effect/Predicate"

declare const number: Exit.Exit<string, number>
declare const numberOrString: Exit.Exit<string, string | number>

// -------------------------------------------------------------------------------------
// exists
// -------------------------------------------------------------------------------------

if (Exit.exists(Predicate.isString)(numberOrString)) {
  numberOrString // $ExpectType Exit<never, string>
}

if (Exit.exists(numberOrString, Predicate.isString)) {
  numberOrString // $ExpectType Exit<never, string>
}

if (
  pipe(
    number,
    Exit.exists((
      _n // $ExpectType number
    ) => true)
  )
) {
  number // $ExpectType Exit<string, number>
}

if (
  pipe(
    number,
    Exit.exists((
      _sn: string | number
    ) => true)
  )
) {
  number // $ExpectType Exit<string, number>
}

// $ExpectType boolean
pipe(
  number,
  Exit.exists(
    (
      _x // $ExpectType number
    ): _x is number => true
  )
)

// $ExpectType boolean
pipe(
  number,
  Exit.exists(
    (
      _x // $ExpectType number
    ) => true
  )
)
