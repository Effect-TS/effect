import { Semigroup } from "fp-ts/lib/Semigroup"

import { Cause } from "../Exit"
import { EffectURI as URI } from "../Support/Common"
import { Effect } from "../Support/Common/effect"
import { Monad4EC, MonadThrow4EC, Alt4EC } from "../Support/Overloads"

import { chain_ } from "./chain"
import { foldExit_ } from "./foldExit"
import { map_ } from "./map"
import { pure } from "./pure"
import { raiseError } from "./raiseError"
import { raised } from "./raised"

export function getCauseValidationM<E>(
  S: Semigroup<Cause<E>>
): Monad4EC<URI, E> & MonadThrow4EC<URI, E> & Alt4EC<URI, E> {
  return {
    URI,
    _E: undefined as any,
    of: pure,
    map: map_,
    chain: chain_,
    ap: <S1, S2, R, R2, A, B>(
      fab: Effect<S1, R, E, (a: A) => B>,
      fa: Effect<S2, R2, E, A>
    ): Effect<S1 | S2, R & R2, E, B> =>
      foldExit_(
        fab,
        (fabe) =>
          foldExit_(
            fa,
            (fae) => raised(S.concat(fabe, fae)),
            (_) => raised(fabe)
          ),
        (f) => map_(fa, f)
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
