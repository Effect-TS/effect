import { pipe, tuple } from "../../Function"
import * as O from "../../Option"
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
          ),
          S.withPermit(derived.value.semaphore)
        ),
      DerivedAll: (derivedAll) =>
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
          ),
          S.withPermit(derivedAll.value.semaphore)
        )
    })
  )

/**
 * Writes a new value to the `RefM`, returning the value immediately before
 * modification.
 */
export const getAndSet = <A>(a: A) => <R, E>(self: RefMRE<R, E, A>) =>
  pipe(
    self,
    modify((v) => T.succeedNow([v, a]))
  )

/**
 * Atomically modifies the `RefM` with the specified function, returning the
 * value immediately before modification.
 */
export const getAndUpdate = <R1, E1, A>(f: (a: A) => T.AsyncRE<R1, E1, A>) => <R, E>(
  self: RefMRE<R, E, A>
) =>
  pipe(
    self,
    modify((v) =>
      pipe(
        f(v),
        T.map((r) => [v, r])
      )
    )
  )

/**
 * Atomically modifies the `RefM` with the specified function, returning the
 * value immediately before modification.
 */
export const getAndUpdateSome = <R1, E1, A>(
  f: (a: A) => O.Option<T.AsyncRE<R1, E1, A>>
) => <R, E>(self: RefMRE<R, E, A>) =>
  pipe(
    self,
    modify((v) =>
      pipe(
        f(v),
        O.getOrElse(() => T.succeedNow(v)),
        T.map((r) => [v, r])
      )
    )
  )

/**
 * Atomically modifies the `RefM` with the specified function, which computes
 * a return value for the modification if the function is defined in the current value
 * otherwise it returns a default value.
 * This is a more powerful version of `updateSome`.
 */
export const modifySome = <B>(def: B) => <R1, E1, A>(
  f: (a: A) => O.Option<T.AsyncRE<R1, E1, [B, A]>>
) => <R, E>(self: RefMRE<R, E, A>) =>
  pipe(
    self,
    modify((v) =>
      pipe(
        f(v),
        O.getOrElse(() => T.succeedNow(tuple(def, v)))
      )
    )
  )

/**
 * Atomically modifies the `RefM` with the specified function.
 */
export const update = <R1, E1, A>(f: (a: A) => T.AsyncRE<R1, E1, A>) => <R, E>(
  self: RefMRE<R, E, A>
): T.AsyncRE<R & R1, E1 | E, void> =>
  pipe(
    self,
    modify((v) =>
      pipe(
        f(v),
        T.map((r) => [undefined, r])
      )
    )
  )

/**
 * Atomically modifies the `RefM` with the specified function.
 */
export const updateAndGet = <R1, E1, A>(f: (a: A) => T.AsyncRE<R1, E1, A>) => <R, E>(
  self: RefMRE<R, E, A>
): T.AsyncRE<R & R1, E1 | E, void> =>
  pipe(
    self,
    modify((v) =>
      pipe(
        f(v),
        T.map((r) => [r, r])
      )
    )
  )

/**
 * Atomically modifies the `RefM` with the specified function.
 */
export const updateSome = <R1, E1, A>(f: (a: A) => O.Option<T.AsyncRE<R1, E1, A>>) => <
  R,
  E
>(
  self: RefMRE<R, E, A>
): T.AsyncRE<R & R1, E1 | E, void> =>
  pipe(
    self,
    modify((v) =>
      pipe(
        f(v),
        O.getOrElse(() => T.succeedNow(v)),
        T.map((r) => [undefined, r])
      )
    )
  )

/**
 * Atomically modifies the `RefM` with the specified function.
 */
export const updateSomeAndGet = <R1, E1, A>(
  f: (a: A) => O.Option<T.AsyncRE<R1, E1, A>>
) => <R, E>(self: RefMRE<R, E, A>): T.AsyncRE<R & R1, E1 | E, A> =>
  pipe(
    self,
    modify((v) =>
      pipe(
        f(v),
        O.getOrElse(() => T.succeedNow(v)),
        T.map((r) => [r, r])
      )
    )
  )
