import { AnyK } from "../_abstract/Any"
import { AssociativeBothK } from "../_abstract/AssociativeBoth"
import { CovariantK } from "../_abstract/Covariant"
import { instance } from "../_abstract/HKT"

import * as A from "@effect-ts/system/NonEmptyArray"

/**
 * Typelevel map entries
 */
export const NonEmptyArrayURI = "NonEmptyArray"
export type NonEmptyArrayURI = typeof NonEmptyArrayURI

declare module "../_abstract/HKT" {
  interface URItoKind<
    TL0,
    TL1,
    TL2,
    TL3,
    K,
    NK extends string,
    SI,
    SO,
    X,
    I,
    S,
    Env,
    Err,
    Out
  > {
    [NonEmptyArrayURI]: A.NonEmptyArray<Out>
  }
}

/**
 * The `Any` instance for `NonEmptyArray[+_]`
 */
export const Any = instance<AnyK<NonEmptyArrayURI>>({
  any: () => A.single({})
})

/**
 * The `Covariant` instance for `NonEmptyArray[+_]`
 */
export const Covariant = instance<CovariantK<NonEmptyArrayURI>>({
  map: A.map
})

/**
 * The `AssociativeBoth` instance for `NonEmptyArray[+_]`
 */
export const AssociativeBoth = instance<AssociativeBothK<NonEmptyArrayURI>>({
  both: A.zip
})
