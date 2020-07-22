import { pipe } from "../../Function"
import * as R from "../Ref"
import * as S from "../Semaphore"
import { matchTag } from "../Utils"

import { RefMRE, concrete, Atomic, RefM } from "./XRefM"
import * as T from "./effect"

/**
 * Creates a new `ZRefM` with the specified value.
 */
export const makeRefM = <A>(a: A): T.Sync<RefM<A>> =>
  pipe(
    T.of,
    T.bind("ref", () => R.makeRef(a)),
    T.bind("semaphore", () => S.makeSemaphore(1)),
    T.map(({ ref, semaphore }) => new Atomic(ref, semaphore))
  )

/**
 * Atomically modifies the `RefM` with the specified function, which computes
 * a return value for the modification. This is a more powerful version of
 * `update`.
 */
export const modify = <R1, E1, B, A>(f: (a: A) => T.AsyncRE<R1, E1, [B, A]>) => <R, E>(
  self: RefMRE<R, E, A>
): T.AsyncRE<R & R1, E | E1, B> =>
  pipe(
    self,
    concrete,
    matchTag({
      Atomic: (atomic) =>
        pipe(
          atomic.ref.get,
          T.chain(f),
          T.chain(([b, a]) => pipe(atomic.ref.set(a), T.as(b))),
          S.withPermit(atomic.semaphore)
        ),
      Derived: (derived) =>
        S.withPermit(derived.value.semaphore)(
          pipe(
            derived.value.ref.get,
            T.chain((a) =>
              pipe(
                derived.getEither(a),
                T.chain(f),
                T.chain(([b, a]) =>
                  pipe(
                    derived.setEither(a),
                    T.chain((a) => derived.value.ref.set(a)),
                    T.as(b)
                  )
                )
              )
            )
          )
        ),
      DerivedAll: (derivedAll) =>
        S.withPermit(derivedAll.value.semaphore)(
          pipe(
            derivedAll.value.ref.get,
            T.chain((s) =>
              pipe(
                derivedAll.getEither(s),
                T.chain(f),
                T.chain(([b, a]) =>
                  pipe(
                    derivedAll.setEither(a)(s),
                    T.chain((a) => derivedAll.value.ref.set(a)),
                    T.as(b)
                  )
                )
              )
            )
          )
        )
    })
  )
