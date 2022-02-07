// ets_tracing: off

import * as Tp from "../Collections/Immutable/Tuple/index.js"
import * as E from "../Either/index.js"
import { pipe } from "../Function/index.js"
import { matchTag } from "../Utils/index.js"
import * as T from "./excl-effect.js"
import type { XFiberRef } from "./fiberRef.js"
import { concrete } from "./fiberRef.js"

/**
 * Atomically modifies the `FiberRef` with the specified function, which computes
 * a return value for the modification. This is a more powerful version of
 * `update`.
 *
 * @ets_data_first modify_
 */
export function modify<A, B>(f: (a: A) => Tp.Tuple<[B, A]>) {
  return <EA, EB>(fiberRef: XFiberRef<EA, EB, A, A>): T.IO<EA | EB, B> =>
    modify_(fiberRef, f)
}

/**
 * Atomically modifies the `FiberRef` with the specified function, which computes
 * a return value for the modification. This is a more powerful version of
 * `update`.
 */
export function modify_<EA, EB, A, B>(
  fiberRef: XFiberRef<EA, EB, A, A>,
  f: (a: A) => Tp.Tuple<[B, A]>
): T.IO<EA | EB, B> {
  return pipe(
    fiberRef,
    concrete,
    matchTag({
      Runtime: (self) => self.modify(f),
      Derived: (self) =>
        self.use((value, getEither, setEither) =>
          pipe(
            value.modify((s) =>
              pipe(
                s,
                getEither,
                E.fold(
                  (e) => Tp.tuple(E.left(e), s),
                  (a1) =>
                    pipe(f(a1), ({ tuple: [b, a2] }) =>
                      pipe(
                        a2,
                        setEither,
                        E.fold(
                          (e) => Tp.tuple(E.left(e), s),
                          (s) => Tp.tuple(E.widenE<EA | EB>()(E.right(b)), s)
                        )
                      )
                    )
                )
              )
            ),
            T.absolve
          )
        ),
      DerivedAll: (self) =>
        self.use((value, getEither, setEither) =>
          pipe(
            value.modify((s) =>
              pipe(
                s,
                getEither,
                E.fold(
                  (e) => Tp.tuple(E.left(e), s),
                  (a1) =>
                    pipe(f(a1), ({ tuple: [b, a2] }) =>
                      pipe(
                        setEither(a2)(s),
                        E.fold(
                          (e) => Tp.tuple(E.left(e), s),
                          (s) => Tp.tuple(E.widenE<EA | EB>()(E.right(b)), s)
                        )
                      )
                    )
                )
              )
            ),
            T.absolve
          )
        )
    })
  )
}
