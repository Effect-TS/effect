import * as Tp from "../../Collections/Immutable/Tuple"
import type { IO } from "../../Effect"
import { absolve as effectabsolve } from "../../Effect/operations/absolve"
import * as E from "../../Either/core"
import { matchTag_ } from "../../Utils"
import type { XFiberRef } from "../definition"
import { concrete } from "../definition/concrete"

/**
 * Atomically modifies the `XFiberRef` with the specified function, which
 * computes a return value for the modification. This is a more powerful
 * version of `update`.
 */
export function modify_<EA, EB, B, A>(
  self: XFiberRef<EA, EB, A, A>,
  f: (a: A) => Tp.Tuple<[B, A]>,
  __trace?: string
): IO<EA | EB, B> {
  return matchTag_(concrete(self), {
    Runtime: (_) => _.modify(f, __trace),
    Derived: (_) =>
      _.use((value, getEither, setEither) =>
        effectabsolve(
          value.modify(
            (s) =>
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
                    (s2) => Tp.tuple(E.widenE<EA | EB>()(E.right(b)), s2)
                  )
                }
              ),
            __trace
          )
        )
      ),
    DerivedAll: (_) =>
      _.use((value, _, getEither, setEither) =>
        effectabsolve(
          value.modify((s) =>
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
                  (s2) => Tp.tuple(E.widenE<EA | EB>()(E.right(b)), s2)
                )
              }
            )
          ),
          __trace
        )
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
export function modify<B, A>(f: (a: A) => Tp.Tuple<[B, A]>, __trace?: string) {
  return <EA, EB>(self: XFiberRef<EA, EB, A, A>): IO<EA | EB, B> =>
    modify_(self, f, __trace)
}
