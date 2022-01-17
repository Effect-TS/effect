import * as Tp from "../../Collections/Immutable/Tuple"
import * as E from "../../Either"
import { matchTag_ } from "../../Utils"
import * as A from "../Atomic/operations/modify"
import type { XRef } from "../definition"
import { concrete } from "../definition"
import * as S from "../Synchronized/operations/modifyEffect"
import * as T from "./_internal/effect"

/**
 * Atomically modifies the `XRef` with the specified function, which
 * computes a return value for the modification. This is a more powerful
 * version of `update`.
 */
export function modify_<RA, RB, EA, EB, A, B>(
  self: XRef<RA, RB, EA, EB, A, A>,
  f: (a: A) => Tp.Tuple<[B, A]>,
  __trace?: string
): T.Effect<RA & RB, EA | EB, B> {
  return matchTag_(concrete(self), {
    Atomic: (_) => A.modify_(_, f, __trace),
    Derived: (_) =>
      _.use((value, getEither, setEither) =>
        T.absolve(
          A.modify_(value, (s) =>
            E.fold_(
              getEither(s),
              (e) => Tp.tuple(E.left(e), s),
              (a1) => {
                const {
                  tuple: [b, a2]
                } = f(a1)
                return E.fold_(
                  setEither(a2),
                  (e) => Tp.tuple(E.left(e), s),
                  (s) => Tp.tuple(E.widenE<EA | EB>()(E.right(b)), s)
                )
              }
            )
          ),
          __trace
        )
      ),
    DerivedAll: (_) =>
      _.use((value, getEither, setEither) =>
        T.absolve(
          A.modify_(value, (s) =>
            E.fold_(
              getEither(s),
              (e) => Tp.tuple(E.left(e), s),
              (a1) => {
                const {
                  tuple: [b, a2]
                } = f(a1)
                return E.fold_(
                  setEither(a2)(s),
                  (e) => Tp.tuple(E.left(e), s),
                  (s) => Tp.tuple(E.widenE<EA | EB>()(E.right(b)), s)
                )
              }
            )
          ),
          __trace
        )
      ),
    Synchronized: (_) => S.modifyEffect_(_, (a) => T.succeedNow(f(a), __trace))
  })
}

/**
 * Atomically modifies the `XRef` with the specified function, which
 * computes a return value for the modification. This is a more powerful
 * version of `update`.
 *
 * @ets_data_first modify_
 */
export function modify<A, B>(f: (a: A) => Tp.Tuple<[B, A]>, __trace?: string) {
  return <RA, RB, EA, EB>(
    self: XRef<RA, RB, EA, EB, A, A>
  ): T.Effect<RA & RB, EA | EB, B> => modify_(self, f, __trace)
}
