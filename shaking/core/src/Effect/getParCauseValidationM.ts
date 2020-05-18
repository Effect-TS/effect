import { Semigroup } from "fp-ts/lib/Semigroup"

import { Cause } from "../Exit"
import { EffectURI as URI } from "../Support/Common"
import { Effect } from "../Support/Common/effect"
import { Monad4ECP, MonadThrow4ECP, Alt4EC } from "../Support/Overloads"

import { chain_ } from "./chain"
import { foldExit_ } from "./foldExit"
import { map_ } from "./map"
import { parZip } from "./parZip"
import { pure } from "./pure"
import { raiseError } from "./raiseError"
import { raised } from "./raised"
import { result } from "./result"

export function getParCauseValidationM<E>(
  S: Semigroup<Cause<E>>
): Monad4ECP<URI, E> & MonadThrow4ECP<URI, E> & Alt4EC<URI, E> {
  return {
    URI,
    _E: undefined as any,
    _CTX: "async",
    of: pure,
    map: map_,
    chain: chain_,
    ap: <S1, S2, R, R2, A, B>(
      fab: Effect<S1, R, E, (a: A) => B>,
      fa: Effect<S2, R2, E, A>
    ): Effect<unknown, R & R2, E, B> =>
      chain_(parZip(result(fa), result(fab)), ([faEx, fabEx]) =>
        fabEx._tag === "Done"
          ? faEx._tag === "Done"
            ? pure(fabEx.value(faEx.value))
            : raised(faEx)
          : faEx._tag === "Done"
          ? raised(fabEx)
          : raised(S.concat(fabEx, faEx))
      ),
    throwError: raiseError,
    alt: <S1, S2, R, R2, A>(
      fa: Effect<S1, R, E, A>,
      fb: () => Effect<S2, R2, E, A>
    ): Effect<S1 | S2, R & R2, E, A> =>
      foldExit_(
        fa,
        (e) => foldExit_(fb(), (fbe) => raised(S.concat(e, fbe)), pure),
        pure
      )
  }
}
