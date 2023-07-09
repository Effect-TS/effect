import * as Semigroup from "@effect/typeclass/Semigroup"

//
// tuple
//

// $ExpectType Semigroup<readonly [string, number]>
Semigroup.tuple(
  Semigroup.string,
  Semigroup.numberSum
)

//
// struct
//

// $ExpectType Semigroup<{ readonly a: string; readonly b: number; }>
Semigroup.struct({
  a: Semigroup.string,
  b: Semigroup.numberSum
})
