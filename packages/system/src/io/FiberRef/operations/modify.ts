import { Tuple } from "../../../collection/immutable/Tuple"
import { Either } from "../../../data/Either/core"
import { matchTag_ } from "../../../data/Utils"
import type { IO } from "../../Effect"
import type { XFiberRef } from "../definition"
import { concrete } from "../definition/concrete"

/**
 * Atomically modifies the `XFiberRef` with the specified function, which
 * computes a return value for the modification. This is a more powerful
 * version of `update`.
 */
export function modify_<EA, EB, B, A>(
  self: XFiberRef<EA, EB, A, A>,
  f: (a: A) => Tuple<[B, A]>,
  __etsTrace?: string
): IO<EA | EB, B> {
  return matchTag_(concrete(self), {
    Runtime: (_) => _.modify(f),
    Derived: (_) =>
      _.use((value, getEither, setEither) =>
        value
          .modify((s) =>
            getEither(s).fold(
              (e) => Tuple(Either.left(e), s),
              (a1) => {
                const {
                  tuple: [b, a2]
                } = f(a1)
                return setEither(a2).fold(
                  (e) => Tuple(Either.left(e), s),
                  (s2) => Tuple(Either.rightW<B, EA | EB>(b), s2)
                )
              }
            )
          )
          .absolve()
      ),
    DerivedAll: (_) =>
      _.use((value, _, getEither, setEither) =>
        value
          .modify((s) =>
            getEither(s).fold(
              (e) => Tuple(Either.left(e), s),
              (a1) => {
                const {
                  tuple: [b, a2]
                } = f(a1)
                return setEither(a2)(s).fold(
                  (e) => Tuple(Either.left(e), s),
                  (s2) => Tuple(Either.rightW<B, EA | EB>(b), s2)
                )
              }
            )
          )
          .absolve()
      )
  })
}

/**
 * Atomically modifies the `XFiberRef` with the specified function, which
 * computes a return value for the modification. This is a more powerful
 * version of `update`.
 *
 * @ets_data_first modify_
 */
export function modify<B, A>(f: (a: A) => Tuple<[B, A]>, __etsTrace?: string) {
  return <EA, EB>(self: XFiberRef<EA, EB, A, A>): IO<EA | EB, B> => modify_(self, f)
}
