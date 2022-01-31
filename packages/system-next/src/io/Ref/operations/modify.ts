import { Tuple } from "../../../collection/immutable/Tuple"
import { Either } from "../../../data/Either"
import { matchTag_ } from "../../../data/Utils"
import { Effect } from "../../Effect"
import * as A from "../Atomic/operations/modify"
import type { XRef } from "../definition"
import { concrete } from "../definition"
import * as S from "../Synchronized/operations/modifyEffect"

/**
 * Atomically modifies the `XRef` with the specified function, which
 * computes a return value for the modification. This is a more powerful
 * version of `update`.
 */
export function modify_<RA, RB, EA, EB, A, B>(
  self: XRef<RA, RB, EA, EB, A, A>,
  f: (a: A) => Tuple<[B, A]>,
  __etsTrace?: string
): Effect<RA & RB, EA | EB, B> {
  return matchTag_(concrete(self), {
    Atomic: (_) => A.modify_(_, f),
    Derived: (_) =>
      _.use((value, getEither, setEither) =>
        A.modify_(value, (s) =>
          getEither(s).fold(
            (e) => Tuple(Either.left(e), s),
            (a1) => {
              const {
                tuple: [b, a2]
              } = f(a1)
              return setEither(a2).fold(
                (e) => Tuple(Either.left(e), s),
                (s) => Tuple(Either.rightW<B, EA | EB>(b), s)
              )
            }
          )
        ).absolve()
      ),
    DerivedAll: (_) =>
      _.use((value, getEither, setEither) =>
        A.modify_(value, (s) =>
          getEither(s).fold(
            (e) => Tuple(Either.left(e), s),
            (a1) => {
              const {
                tuple: [b, a2]
              } = f(a1)
              return setEither(a2)(s).fold(
                (e) => Tuple(Either.left(e), s),
                (s) => Tuple(Either.rightW<B, EA | EB>(b), s)
              )
            }
          )
        ).absolve()
      ),
    Synchronized: (_) => S.modifyEffect_(_, (a) => Effect.succeed(f(a)))
  })
}

/**
 * Atomically modifies the `XRef` with the specified function, which
 * computes a return value for the modification. This is a more powerful
 * version of `update`.
 *
 * @ets_data_first modify_
 */
export function modify<A, B>(f: (a: A) => Tuple<[B, A]>, __etsTrace?: string) {
  return <RA, RB, EA, EB>(
    self: XRef<RA, RB, EA, EB, A, A>
  ): Effect<RA & RB, EA | EB, B> => modify_(self, f)
}
