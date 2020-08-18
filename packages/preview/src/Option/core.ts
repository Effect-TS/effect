import { AnyK } from "../_abstract/Any"
import { AssociativeBothK } from "../_abstract/AssociativeBoth"
import { CovariantK } from "../_abstract/Covariant"
import { instance } from "../_abstract/HKT"
import * as O from "../_system/Option"

/**
 * Typelevel map entries
 */
export const OptionURI = "Option"
export type OptionURI = typeof OptionURI

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
    [OptionURI]: O.Option<Out>
  }
}

/**
 * The `Any` instance for `Option[+_]`
 */
export const Any = instance<AnyK<OptionURI>>({
  any: () => O.some({})
})

/**
 * The `Covariant` instance for `Option[+_]`
 */
export const Covariant = instance<CovariantK<OptionURI>>({
  map: O.map
})

/**
 * The `AssociativeBoth` instance for `Option[+_]`
 */
export const AssociativeBoth = instance<AssociativeBothK<OptionURI>>({
  both: O.zip
})
