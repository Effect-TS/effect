import * as Exit from "effect/Exit"
import { pipe } from "effect/Function"
import * as Predicate from "effect/Predicate"

declare const number: Exit.Exit<number, string>
declare const numberOrString: Exit.Exit<string | number, string>

// -------------------------------------------------------------------------------------
// exists
// -------------------------------------------------------------------------------------

if (Exit.exists(Predicate.isString)(numberOrString)) {
  numberOrString // $ExpectType Exit<string, never>
}

if (Exit.exists(numberOrString, Predicate.isString)) {
  numberOrString // $ExpectType Exit<string, never>
}

if (
  pipe(
    number,
    Exit.exists((
      _n // $ExpectType number
    ) => true)
  )
) {
  number // $ExpectType Exit<number, string>
}

if (
  pipe(
    number,
    Exit.exists((
      _sn: string | number
    ) => true)
  )
) {
  number // $ExpectType Exit<number, string>
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
