import * as C from "@effect-ts/system/Cause"

import type { AnyK } from "../_abstract/Any"
import type { AssociativeBothK } from "../_abstract/AssociativeBoth"
import type { CovariantK } from "../_abstract/Covariant"
import { instance } from "../_abstract/HKT"
import { pipe, tuple } from "../Function"

/**
 * Typelevel map entries
 */
export const CauseURI = "Cause"
export type CauseURI = typeof CauseURI

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
    [CauseURI]: C.Cause<Out>
  }
}

/**
 * The `Any` instance for `Cause[+_]`
 */
export const Any = instance<AnyK<CauseURI>>({
  any: () => C.Empty
})

/**
 * The `Covariant` instance for `Cause[+_]`
 */
export const Covariant = instance<CovariantK<CauseURI>>({
  map: C.map
})

/**
 * The `AssociativeBoth` instance for `Cause[+_]`
 */
export const AssociativeBoth = instance<AssociativeBothK<CauseURI>>({
  both: (fb) => (fa) =>
    pipe(
      fa,
      C.chain((a) =>
        pipe(
          fb,
          C.map((b) => tuple(a, b))
        )
      )
    )
})
