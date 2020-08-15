import { pipe, tuple } from "../Function"
import { makeAny } from "../_abstract/Any"
import { makeAssociativeBoth } from "../_abstract/AssociativeBoth"
import { makeCovariant } from "../_abstract/Covariant"
import * as C from "../_system/Cause"

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
export const Any = makeAny<CauseURI>()()({
  any: () => C.Empty
})

/**
 * The `Covariant` instance for `Cause[+_]`
 */
export const Covariant = makeCovariant<CauseURI>()()({
  map: C.map
})

/**
 * The `AssociativeBoth` instance for `Cause[+_]`
 */
export const AssociativeBoth = makeAssociativeBoth<CauseURI>()()({
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
