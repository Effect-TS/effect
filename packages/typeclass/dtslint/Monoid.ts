import * as Monoid from "@effect/typeclass/Monoid"
import * as StringInstances from "@effect/typeclass/data/String"
import * as NumberInstances from "@effect/typeclass/data/Number"

//
// tuple
//

// $ExpectType Monoid<readonly [string, number]>
Monoid.tuple(
  StringInstances.Monoid,
  NumberInstances.MonoidSum
)

//
// struct
//

// $ExpectType Monoid<{ readonly a: string; readonly b: number; }>
Monoid.struct({
  a: StringInstances.Monoid,
  b: NumberInstances.MonoidSum
})
