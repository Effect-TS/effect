import * as Monoid from "@effect/typeclass/Monoid"

//
// tuple
//

// $ExpectType Monoid<readonly [string, number]>
Monoid.tuple(
  Monoid.string,
  Monoid.numberSum
)

//
// struct
//

// $ExpectType Monoid<{ readonly a: string; readonly b: number; }>
Monoid.struct({
  a: Monoid.string,
  b: Monoid.numberSum
})
