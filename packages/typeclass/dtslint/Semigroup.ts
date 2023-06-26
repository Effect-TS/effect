import * as _ from "@effect/data/typeclass/Semigroup"
import * as Number from "@effect/data/Number"
import * as String from "@effect/data/String"

//
// tuple
//

// $ExpectType Semigroup<readonly [string, number]>
_.tuple(
  String.Semigroup,
  Number.SemigroupSum
)

//
// struct
//

// $ExpectType Semigroup<{ readonly a: string; readonly b: number; }>
_.struct({
  a: String.Semigroup,
  b: Number.SemigroupSum
})
