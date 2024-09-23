import { hole, pipe } from "effect/Function"
import * as T from "effect/Tuple"

// -------------------------------------------------------------------------------------
// make
// -------------------------------------------------------------------------------------

// $ExpectType [string, number, boolean]
T.make("a", 1, true)

// -------------------------------------------------------------------------------------
// appendElement
// -------------------------------------------------------------------------------------

// $ExpectType [string, number, boolean]
pipe(T.make("a", 1), T.appendElement(true))

// $ExpectType [string, number, boolean]
T.appendElement(T.make("a", 1), true)

// -------------------------------------------------------------------------------------
// at
// -------------------------------------------------------------------------------------

// $ExpectType <A extends ReadonlyArray<unknown>>(self: A) => A[0]
const at0 = T.at(0)

// $ExpectType undefined
pipe(hole<[]>(), at0)

// $ExpectType undefined
pipe(hole<readonly []>(), at0)

// $ExpectType string
pipe(hole<[string, number]>(), at0)

// $ExpectType string
pipe(hole<readonly [string, number]>(), at0)

// $ExpectType number
pipe(hole<[string, number]>(), T.at(1))

// $ExpectType number
pipe(hole<readonly [string, number]>(), T.at(1))

// $ExpectType undefined
pipe(hole<[string, number]>(), T.at(2))

// $ExpectType undefined
pipe(hole<readonly [string, number]>(), T.at(2))

// $ExpectType string | number
pipe(hole<[string, number]>(), T.at(-1))

// $ExpectType string | number
pipe(hole<readonly [string, number]>(), T.at(-1))

// $ExpectType number
pipe(hole<Array<number>>(), T.at(1))

// $ExpectType number
pipe(hole<Array<number>>(), T.at(-1))

// -------------------------------------------------------------------------------------
// map
// -------------------------------------------------------------------------------------

// $ExpectType [false, false, false]
pipe(
  T.make("a", 1),
  T.appendElement(true),
  T.map((x) => {
    // $ExpectType string | number | boolean
    x
    return false as const
  })
)

// $ExpectType [false, false, false]
T.map(["a", 1, false], (x) => {
  // $ExpectType string | number | boolean
  x
  return false as const
})
