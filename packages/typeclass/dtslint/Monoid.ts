import * as _ from "@effect/data/typeclass/Monoid"
import * as Number from "@effect/data/Number"
import * as String from "@effect/data/String"

//
// tuple
//

// $ExpectType Monoid<readonly [string, number]>
_.tuple(
  String.Monoid,
  Number.MonoidSum
)

//
// struct
//

// $ExpectType Monoid<{ readonly a: string; readonly b: number; }>
_.struct({
  a: String.Monoid,
  b: Number.MonoidSum
})
