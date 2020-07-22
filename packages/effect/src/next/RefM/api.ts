import * as E from "../../Either"
import { identity, pipe, tuple } from "../../Function"
import * as O from "../../Option"
import * as R from "../Ref"
import * as S from "../Semaphore"
import { matchTag } from "../Utils"

import { Atomic, concrete, RefM, XRefM } from "./XRefM"
import * as T from "./effect"

/**
 * Creates a new `XRefM` with the specified value.
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
export const modify = <R1, E1, B, A>(f: (a: A) => T.AsyncRE<R1, E1, [B, A]>) => <
  RA,
  RB,
  EA,
  EB
>(
  self: XRefM<RA, RB, EA, EB, A, A>
): T.AsyncRE<RA & RB & R1, EA | EB | E1, B> =>
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
export const getAndSet = <A>(a: A) => <RA, RB, EA, EB>(
  self: XRefM<RA, RB, EA, EB, A, A>
) =>
  pipe(
    self,
    modify((v) => T.succeedNow([v, a]))
  )

/**
 * Atomically modifies the `RefM` with the specified function, returning the
 * value immediately before modification.
 */
export const getAndUpdate = <R1, E1, A>(f: (a: A) => T.AsyncRE<R1, E1, A>) => <
  RA,
  RB,
  EA,
  EB
>(
  self: XRefM<RA, RB, EA, EB, A, A>
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
) => <RA, RB, EA, EB>(self: XRefM<RA, RB, EA, EB, A, A>) =>
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
) => <RA, RB, EA, EB>(self: XRefM<RA, RB, EA, EB, A, A>) =>
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
export const update = <R1, E1, A>(f: (a: A) => T.AsyncRE<R1, E1, A>) => <
  RA,
  RB,
  EA,
  EB
>(
  self: XRefM<RA, RB, EA, EB, A, A>
): T.AsyncRE<RA & RB & R1, E1 | EA | EB, void> =>
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
export const updateAndGet = <R1, E1, A>(f: (a: A) => T.AsyncRE<R1, E1, A>) => <
  RA,
  RB,
  EA,
  EB
>(
  self: XRefM<RA, RB, EA, EB, A, A>
): T.AsyncRE<RA & RB & R1, E1 | EA | EB, void> =>
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
  RA,
  RB,
  EA,
  EB
>(
  self: XRefM<RA, RB, EA, EB, A, A>
): T.AsyncRE<RA & RB & R1, E1 | EA | EB, void> =>
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
) => <RA, RB, EA, EB>(
  self: XRefM<RA, RB, EA, EB, A, A>
): T.AsyncRE<RA & RB & R1, E1 | EA | EB, A> =>
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

/**
 * Folds over the error and value types of the `XRefM`.
 */
export const fold = <EA, EB, A, B, EC, ED, C, D>(
  ea: (_: EA) => EC,
  eb: (_: EB) => ED,
  ca: (_: C) => E.Either<EC, A>,
  bd: (_: B) => E.Either<ED, D>
) => <RA, RB>(self: XRefM<RA, RB, EA, EB, A, B>): XRefM<RA, RB, EC, ED, C, D> =>
  self.foldM(
    ea,
    eb,
    (c) => T.fromEither(() => ca(c)),
    (b) => T.fromEither(() => bd(b))
  )

/**
 * Folds over the error and value types of the `XRefM`. This is a highly
 * polymorphic method that is capable of arbitrarily transforming the error
 * and value types of the `XRefM`. For most use cases one of the more
 * specific combinators implemented in terms of `foldM` will be more
 * ergonomic but this method is extremely useful for implementing new
 * combinators.
 */
export const foldM = <EA, EB, A, B, RC, RD, EC, ED, C, D>(
  ea: (_: EA) => EC,
  eb: (_: EB) => ED,
  ca: (_: C) => T.AsyncRE<RC, EC, A>,
  bd: (_: B) => T.AsyncRE<RD, ED, D>
) => <RA, RB>(
  self: XRefM<RA, RB, EA, EB, A, B>
): XRefM<RA & RC, RB & RD, EC, ED, C, D> => self.foldM(ea, eb, ca, bd)

/**
 * Folds over the error and value types of the `XRefM`, allowing access to
 * the state in transforming the `set` value. This is a more powerful version
 * of `foldM` but requires unifying the environment and error types.
 */
export const foldAllM = <EA, EB, A, B, RC, RD, EC, ED, C, D>(
  ea: (_: EA) => EC,
  eb: (_: EB) => ED,
  ec: (_: EB) => EC,
  ca: (_: C) => (_: B) => T.AsyncRE<RC, EC, A>,
  bd: (_: B) => T.AsyncRE<RD, ED, D>
) => <RA, RB>(
  self: XRefM<RA, RB, EA, EB, A, B>
): XRefM<RB & RA & RC, RB & RD, EC, ED, C, D> => self.foldAllM(ea, eb, ec, ca, bd)

/**
 * Maps and filters the `get` value of the `XRefM` with the specified
 * effectual partial function, returning a `XRefM` with a `get` value that
 * succeeds with the result of the partial function if it is defined or else
 * fails with `None`.
 */
export const collectM = <B, RC, EC, C>(f: (b: B) => O.Option<T.AsyncRE<RC, EC, C>>) => <
  RA,
  RB,
  EA,
  EB,
  A
>(
  self: XRefM<RA, RB, EA, EB, A, B>
): XRefM<RA, RB & RC, EA, O.Option<EB | EC>, A, C> =>
  self.foldM(
    identity,
    (_) => O.some(_ as EB | EC),
    (_: A) => T.succeedNow(_),
    (b) =>
      pipe(
        f(b),
        O.map((a) => T.asSomeError(a)),
        O.getOrElse(() => T.fail(O.none))
      )
  )

/**
 * Maps and filters the `get` value of the `XRefM` with the specified partial
 * function, returning a `XRefM` with a `get` value that succeeds with the
 * result of the partial function if it is defined or else fails with `None`.
 */
export const collect = <B, C>(f: (b: B) => O.Option<C>) => <RA, RB, EA, EB, A>(
  self: XRefM<RA, RB, EA, EB, A, B>
): XRefM<RA, RB, EA, O.Option<EB>, A, C> =>
  pipe(
    self,
    collectM((b) => pipe(f(b), O.map(T.succeedNow)))
  )

/**
 * Transforms both the `set` and `get` values of the `XRefM` with the
 * specified effectual functions.
 */
export const dimapM = <C, B, RC, EC, A, RD, ED, D>(
  f: (c: C) => T.AsyncRE<RC, EC, A>,
  g: (b: B) => T.AsyncRE<RD, ED, D>
) => <RA, RB, EA, EB>(self: XRefM<RA, RB, EA, EB, A, B>) =>
  self.foldM(
    (ea: EA | EC) => ea,
    (eb: EB | ED) => eb,
    f,
    g
  )

/**
 * Transforms both the `set` and `get` errors of the `XRefM` with the
 * specified functions.
 */
export const dimapError = <EA, EB, EC, ED>(f: (ea: EA) => EC, g: (eb: EB) => ED) => <
  RA,
  RB,
  A,
  B
>(
  self: XRefM<RA, RB, EA, EB, A, B>
): XRefM<RA, RB, EC, ED, A, B> =>
  pipe(
    self,
    fold(
      (ea) => f(ea),
      (eb) => g(eb),
      (a: A) => E.right(a),
      (b) => E.right(b)
    )
  )
