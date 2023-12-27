import * as NumberInstances from "@effect/typeclass/data/Number"
import * as StringInstances from "@effect/typeclass/data/String"
import * as Semigroup from "@effect/typeclass/Semigroup"

//
// tuple
//

// $ExpectType Semigroup<readonly [string, number]>
Semigroup.tuple(
  StringInstances.Semigroup,
  NumberInstances.SemigroupSum
)

//
// struct
//

// $ExpectType Semigroup<{ readonly a: string; readonly b: number; }>
Semigroup.struct({
  a: StringInstances.Semigroup,
  b: NumberInstances.SemigroupSum
})
