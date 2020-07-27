import * as E from "../../Either"
import { identity, pipe, tuple } from "../../Function"
import * as O from "../../Option"
import { makeUnbounded } from "../Queue/make"
import { Dequeue } from "../Queue/xqueue"
import * as R from "../Ref"
import * as S from "../Semaphore"
import { matchTag } from "../Utils"

import { Atomic, concrete, RefM, XRefM } from "./XRefM"
import * as T from "./effect"
import * as M from "./managed"

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
 * Creates a new `XRefM` with the specified value.
 */
export const unsafeMakeRefM = <A>(a: A): RefM<A> => {
  const ref = R.unsafeMakeRef(a)
  const semaphore = S.unsafeMakeSemaphore(1)
  return new Atomic(ref, semaphore)
}

/**
 * Creates a new `RefM` with the specified value in the context of a
 * `Managed.`
 */
export const makeManagedRefM = <A>(a: A): M.Sync<RefM<A>> =>
  pipe(makeRefM(a), T.toManaged())

/**
 * Creates a new `RefM` and a `Dequeue` that will emit every change to the
 * `RefM`.
 */
export const dequeueRef = <A>(a: A): T.Sync<[RefM<A>, Dequeue<A>]> =>
  pipe(
    T.of,
    T.bind("ref", () => makeRefM(a)),
    T.bind("queue", () => makeUnbounded<A>()),
    T.map(({ queue, ref }) => [
      pipe(
        ref,
        tapInput((a) => queue.offer(a))
      ),
      queue
    ])
  )

/**
 * Atomically modifies the `RefM` with the specified function, which computes
 * a return value for the modification. This is a more powerful version of
 * `update`.
 */
export const modify_ = <RA, RB, EA, EB, R1, E1, B, A>(
  self: XRefM<RA, RB, EA, EB, A, A>,
  f: (a: A) => T.AsyncRE<R1, E1, [B, A]>
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
): T.AsyncRE<RA & RB & R1, EA | EB | E1, B> => modify_(self, f)

/**
 * Writes a new value to the `RefM`, returning the value immediately before
 * modification.
 */
export const getAndSet_ = <RA, RB, EA, EB, A>(
  self: XRefM<RA, RB, EA, EB, A, A>,
  a: A
) =>
  pipe(
    self,
    modify((v) => T.succeedNow([v, a]))
  )

/**
 * Writes a new value to the `RefM`, returning the value immediately before
 * modification.
 */
export const getAndSet = <A>(a: A) => <RA, RB, EA, EB>(
  self: XRefM<RA, RB, EA, EB, A, A>
) => getAndSet_(self, a)

/**
 * Atomically modifies the `RefM` with the specified function, returning the
 * value immediately before modification.
 */
export const getAndUpdate_ = <RA, RB, EA, EB, R1, E1, A>(
  self: XRefM<RA, RB, EA, EB, A, A>,
  f: (a: A) => T.AsyncRE<R1, E1, A>
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
export const getAndUpdate = <R1, E1, A>(f: (a: A) => T.AsyncRE<R1, E1, A>) => <
  RA,
  RB,
  EA,
  EB
>(
  self: XRefM<RA, RB, EA, EB, A, A>
) => getAndUpdate_(self, f)

/**
 * Atomically modifies the `RefM` with the specified function, returning the
 * value immediately before modification.
 */
export const getAndUpdateSome_ = <RA, RB, EA, EB, R1, E1, A>(
  self: XRefM<RA, RB, EA, EB, A, A>,
  f: (a: A) => O.Option<T.AsyncRE<R1, E1, A>>
) =>
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
 * Atomically modifies the `RefM` with the specified function, returning the
 * value immediately before modification.
 */
export const getAndUpdateSome = <R1, E1, A>(
  f: (a: A) => O.Option<T.AsyncRE<R1, E1, A>>
) => <RA, RB, EA, EB>(self: XRefM<RA, RB, EA, EB, A, A>) => getAndUpdateSome_(self, f)

/**
 * Atomically modifies the `RefM` with the specified function, which computes
 * a return value for the modification if the function is defined in the current value
 * otherwise it returns a default value.
 * This is a more powerful version of `updateSome`.
 */
export const modifySome_ = <RA, RB, EA, EB, R1, E1, A, B>(
  self: XRefM<RA, RB, EA, EB, A, A>,
  def: B,
  f: (a: A) => O.Option<T.AsyncRE<R1, E1, [B, A]>>
) =>
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
 * Atomically modifies the `RefM` with the specified function, which computes
 * a return value for the modification if the function is defined in the current value
 * otherwise it returns a default value.
 * This is a more powerful version of `updateSome`.
 */
export const modifySome = <B>(def: B) => <R1, E1, A>(
  f: (a: A) => O.Option<T.AsyncRE<R1, E1, [B, A]>>
) => <RA, RB, EA, EB>(self: XRefM<RA, RB, EA, EB, A, A>) => modifySome_(self, def, f)

/**
 * Atomically modifies the `RefM` with the specified function.
 */
export const update_ = <RA, RB, EA, EB, R1, E1, A>(
  self: XRefM<RA, RB, EA, EB, A, A>,
  f: (a: A) => T.AsyncRE<R1, E1, A>
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
export const update = <R1, E1, A>(f: (a: A) => T.AsyncRE<R1, E1, A>) => <
  RA,
  RB,
  EA,
  EB
>(
  self: XRefM<RA, RB, EA, EB, A, A>
): T.AsyncRE<RA & RB & R1, E1 | EA | EB, void> => update_(self, f)

/**
 * Atomically modifies the `RefM` with the specified function.
 */
export const updateAndGet_ = <RA, RB, EA, EB, R1, E1, A>(
  self: XRefM<RA, RB, EA, EB, A, A>,
  f: (a: A) => T.AsyncRE<R1, E1, A>
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
export const updateAndGet = <R1, E1, A>(f: (a: A) => T.AsyncRE<R1, E1, A>) => <
  RA,
  RB,
  EA,
  EB
>(
  self: XRefM<RA, RB, EA, EB, A, A>
): T.AsyncRE<RA & RB & R1, E1 | EA | EB, void> => updateAndGet_(self, f)

/**
 * Atomically modifies the `RefM` with the specified function.
 */
export const updateSome_ = <RA, RB, EA, EB, R1, E1, A>(
  self: XRefM<RA, RB, EA, EB, A, A>,
  f: (a: A) => O.Option<T.AsyncRE<R1, E1, A>>
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
export const updateSome = <R1, E1, A>(f: (a: A) => O.Option<T.AsyncRE<R1, E1, A>>) => <
  RA,
  RB,
  EA,
  EB
>(
  self: XRefM<RA, RB, EA, EB, A, A>
): T.AsyncRE<RA & RB & R1, E1 | EA | EB, void> => updateSome_(self, f)

/**
 * Atomically modifies the `RefM` with the specified function.
 */
export const updateSomeAndGet_ = <RA, RB, EA, EB, R1, E1, A>(
  self: XRefM<RA, RB, EA, EB, A, A>,
  f: (a: A) => O.Option<T.AsyncRE<R1, E1, A>>
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
 * Atomically modifies the `RefM` with the specified function.
 */
export const updateSomeAndGet = <R1, E1, A>(
  f: (a: A) => O.Option<T.AsyncRE<R1, E1, A>>
) => <RA, RB, EA, EB>(
  self: XRefM<RA, RB, EA, EB, A, A>
): T.AsyncRE<RA & RB & R1, E1 | EA | EB, A> => updateSomeAndGet_(self, f)

/**
 * Folds over the error and value types of the `XRefM`.
 */
export const fold_ = <RA, RB, EA, EB, A, B, EC, ED, C = A, D = B>(
  self: XRefM<RA, RB, EA, EB, A, B>,
  ea: (_: EA) => EC,
  eb: (_: EB) => ED,
  ca: (_: C) => E.Either<EC, A>,
  bd: (_: B) => E.Either<ED, D>
): XRefM<RA, RB, EC, ED, C, D> =>
  self.foldM(
    ea,
    eb,
    (c) => T.fromEither(() => ca(c)),
    (b) => T.fromEither(() => bd(b))
  )

/**
 * Folds over the error and value types of the `XRefM`.
 */
export const fold = <EA, EB, A, B, EC, ED, C = A, D = B>(
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
export const foldM_ = <RA, RB, EA, EB, A, B, RC, RD, EC, ED, C = A, D = B>(
  self: XRefM<RA, RB, EA, EB, A, B>,
  ea: (_: EA) => EC,
  eb: (_: EB) => ED,
  ca: (_: C) => T.AsyncRE<RC, EC, A>,
  bd: (_: B) => T.AsyncRE<RD, ED, D>
): XRefM<RA & RC, RB & RD, EC, ED, C, D> => self.foldM(ea, eb, ca, bd)

/**
 * Folds over the error and value types of the `XRefM`. This is a highly
 * polymorphic method that is capable of arbitrarily transforming the error
 * and value types of the `XRefM`. For most use cases one of the more
 * specific combinators implemented in terms of `foldM` will be more
 * ergonomic but this method is extremely useful for implementing new
 * combinators.
 */
export const foldM = <EA, EB, A, B, RC, RD, EC, ED, C = A, D = B>(
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
export const foldAllM_ = <RA, RB, EA, EB, A, B, RC, RD, EC, ED, C = A, D = B>(
  self: XRefM<RA, RB, EA, EB, A, B>,
  ea: (_: EA) => EC,
  eb: (_: EB) => ED,
  ec: (_: EB) => EC,
  ca: (_: C) => (_: B) => T.AsyncRE<RC, EC, A>,
  bd: (_: B) => T.AsyncRE<RD, ED, D>
): XRefM<RB & RA & RC, RB & RD, EC, ED, C, D> => self.foldAllM(ea, eb, ec, ca, bd)

/**
 * Folds over the error and value types of the `XRefM`, allowing access to
 * the state in transforming the `set` value. This is a more powerful version
 * of `foldM` but requires unifying the environment and error types.
 */
export const foldAllM = <EA, EB, A, B, RC, RD, EC, ED, C = A, D = B>(
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
export const collectM_ = <RA, RB, EA, EB, A, B, RC, EC, C>(
  self: XRefM<RA, RB, EA, EB, A, B>,
  f: (b: B) => O.Option<T.AsyncRE<RC, EC, C>>
): XRefM<RA, RB & RC, EA, O.Option<EB | EC>, A, C> =>
  self.foldM(
    identity,
    (_) => O.some<EB | EC>(_),
    (_) => T.succeedNow(_),
    (b) =>
      pipe(
        f(b),
        O.map((a) => T.asSomeError(a)),
        O.getOrElse(() => T.fail(O.none))
      )
  )

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
): XRefM<RA, RB & RC, EA, O.Option<EB | EC>, A, C> => collectM_(self, f)

/**
 * Maps and filters the `get` value of the `XRefM` with the specified partial
 * function, returning a `XRefM` with a `get` value that succeeds with the
 * result of the partial function if it is defined or else fails with `None`.
 */
export const collect_ = <RA, RB, EA, EB, A, B, C>(
  self: XRefM<RA, RB, EA, EB, A, B>,
  f: (b: B) => O.Option<C>
): XRefM<RA, RB, EA, O.Option<EB>, A, C> =>
  pipe(
    self,
    collectM((b) => pipe(f(b), O.map(T.succeedNow)))
  )

/**
 * Maps and filters the `get` value of the `XRefM` with the specified partial
 * function, returning a `XRefM` with a `get` value that succeeds with the
 * result of the partial function if it is defined or else fails with `None`.
 */
export const collect = <B, C>(f: (b: B) => O.Option<C>) => <RA, RB, EA, EB, A>(
  self: XRefM<RA, RB, EA, EB, A, B>
): XRefM<RA, RB, EA, O.Option<EB>, A, C> => collect_(self, f)

/**
 * Transforms both the `set` and `get` values of the `XRefM` with the
 * specified effectual functions.
 */
export const dimapM_ = <RA, RB, EA, EB, B, RC, EC, A, RD, ED, C = A, D = B>(
  self: XRefM<RA, RB, EA, EB, A, B>,
  f: (c: C) => T.AsyncRE<RC, EC, A>,
  g: (b: B) => T.AsyncRE<RD, ED, D>
) =>
  self.foldM(
    (ea: EA | EC) => ea,
    (eb: EB | ED) => eb,
    f,
    g
  )

/**
 * Transforms both the `set` and `get` values of the `XRefM` with the
 * specified effectual functions.
 */
export const dimapM = <B, RC, EC, A, RD, ED, C = A, D = B>(
  f: (c: C) => T.AsyncRE<RC, EC, A>,
  g: (b: B) => T.AsyncRE<RD, ED, D>
) => <RA, RB, EA, EB>(self: XRefM<RA, RB, EA, EB, A, B>) => dimapM_(self, f, g)

/**
 * Transforms both the `set` and `get` errors of the `XRefM` with the
 * specified functions.
 */
export const dimapError_ = <RA, RB, A, B, EA, EB, EC, ED>(
  self: XRefM<RA, RB, EA, EB, A, B>,
  f: (ea: EA) => EC,
  g: (eb: EB) => ED
): XRefM<RA, RB, EC, ED, A, B> =>
  pipe(
    self,
    fold(
      (ea) => f(ea),
      (eb) => g(eb),
      (a) => E.right(a),
      (b) => E.right(b)
    )
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
): XRefM<RA, RB, EC, ED, A, B> => dimapError_(self, f, g)

/**
 * Filters the `set` value of the `XRefM` with the specified effectual
 * predicate, returning a `XRefM` with a `set` value that succeeds if the
 * predicate is satisfied or else fails with `None`.
 */
export const filterInputM_ = <RA, RB, EA, EB, B, A, RC, EC, A1 extends A = A>(
  self: XRefM<RA, RB, EA, EB, A, B>,
  f: (a: A1) => T.AsyncRE<RC, EC, boolean>
): XRefM<RA & RC, RB, O.Option<EC | EA>, EB, A1, B> =>
  pipe(
    self,
    foldM(
      (ea) => O.some<EA | EC>(ea),
      identity,
      (a: A1) =>
        T.ifM(T.asSomeError(f(a)))(() => T.succeedNow(a))(() =>
          T.fail<O.Option<EA | EC>>(O.none)
        ),
      T.succeedNow
    )
  )

/**
 * Filters the `set` value of the `XRefM` with the specified effectual
 * predicate, returning a `XRefM` with a `set` value that succeeds if the
 * predicate is satisfied or else fails with `None`.
 */
export const filterInputM = <A, RC, EC, A1 extends A = A>(
  f: (a: A1) => T.AsyncRE<RC, EC, boolean>
) => <RA, RB, EA, EB, B>(
  self: XRefM<RA, RB, EA, EB, A, B>
): XRefM<RA & RC, RB, O.Option<EC | EA>, EB, A1, B> => filterInputM_(self, f)

/**
 * Filters the `set` value of the `XRefM` with the specified effectual
 * predicate, returning a `XRefM` with a `set` value that succeeds if the
 * predicate is satisfied or else fails with `None`.
 */
export const filterInput_ = <RA, RB, EA, EB, B, A, A1 extends A = A>(
  self: XRefM<RA, RB, EA, EB, A, B>,
  f: (a: A1) => boolean
): XRefM<RA, RB, O.Option<EA>, EB, A1, B> =>
  pipe(
    self,
    filterInputM((a) => T.succeedNow(f(a)))
  )

/**
 * Filters the `set` value of the `XRefM` with the specified effectual
 * predicate, returning a `XRefM` with a `set` value that succeeds if the
 * predicate is satisfied or else fails with `None`.
 */
export const filterInput = <A, A1 extends A = A>(f: (a: A1) => boolean) => <
  RA,
  RB,
  EA,
  EB,
  B
>(
  self: XRefM<RA, RB, EA, EB, A, B>
): XRefM<RA, RB, O.Option<EA>, EB, A1, B> => filterInput_(self, f)

/**
 * Filters the `get` value of the `XRefM` with the specified effectual predicate,
 * returning a `XRefM` with a `get` value that succeeds if the predicate is
 * satisfied or else fails with `None`.
 */
export const filterOutputM_ = <RA, RB, EA, EB, A, B, RC, EC>(
  self: XRefM<RA, RB, EA, EB, A, B>,
  f: (b: B) => T.AsyncRE<RC, EC, boolean>
): XRefM<RA, RB & RC, EA, O.Option<EC | EB>, A, B> =>
  pipe(
    self,
    foldM(
      (ea) => ea,
      (eb) => O.some<EB | EC>(eb),
      (a) => T.succeedNow(a),
      (b) => T.ifM(T.asSomeError(f(b)))(() => T.succeedNow(b))(() => T.fail(O.none))
    )
  )

/**
 * Filters the `get` value of the `XRefM` with the specified effectual predicate,
 * returning a `XRefM` with a `get` value that succeeds if the predicate is
 * satisfied or else fails with `None`.
 */
export const filterOutputM = <B, RC, EC>(f: (b: B) => T.AsyncRE<RC, EC, boolean>) => <
  RA,
  RB,
  EA,
  EB,
  A
>(
  self: XRefM<RA, RB, EA, EB, A, B>
): XRefM<RA, RB & RC, EA, O.Option<EC | EB>, A, B> => filterOutputM_(self, f)

/**
 * Filters the `get` value of the `XRefM` with the specified predicate,
 * returning a `XRefM` with a `get` value that succeeds if the predicate is
 * satisfied or else fails with `None`.
 */
export const filterOutput_ = <RA, RB, EA, EB, A, B>(
  self: XRefM<RA, RB, EA, EB, A, B>,
  f: (b: B) => boolean
): XRefM<RA, RB, EA, O.Option<EB>, A, B> =>
  pipe(
    self,
    filterOutputM((b) => T.succeedNow(f(b)))
  )

/**
 * Filters the `get` value of the `XRefM` with the specified predicate,
 * returning a `XRefM` with a `get` value that succeeds if the predicate is
 * satisfied or else fails with `None`.
 */
export const filterOutput = <B>(f: (b: B) => boolean) => <RA, RB, EA, EB, A>(
  self: XRefM<RA, RB, EA, EB, A, B>
): XRefM<RA, RB, EA, O.Option<EB>, A, B> => filterOutput_(self, f)

/**
 * Transforms the `get` value of the `XRefM` with the specified effectual
 * function.
 */
export const mapM_ = <RA, RB, EA, EB, A, B, RC, EC, C>(
  self: XRefM<RA, RB, EA, EB, A, B>,
  f: (b: B) => T.AsyncRE<RC, EC, C>
) => pipe(self, dimapM(T.succeedNow, f))

/**
 * Transforms the `get` value of the `XRefM` with the specified effectual
 * function.
 */
export const mapM = <B, RC, EC, C>(f: (b: B) => T.AsyncRE<RC, EC, C>) => <
  RA,
  RB,
  EA,
  EB,
  A
>(
  self: XRefM<RA, RB, EA, EB, A, B>
) => mapM_(self, f)

/**
 * Transforms the `set` value of the `XRefM` with the specified effectual
 * function.
 */
export const contramapM_ = <RA, RB, EA, EB, B, A, RC, EC, C>(
  self: XRefM<RA, RB, EA, EB, A, B>,
  f: (c: C) => T.AsyncRE<RC, EC, A>
): XRefM<RA & RC, RB, EC | EA, EB, C, B> => pipe(self, dimapM(f, T.succeedNow))

/**
 * Transforms the `set` value of the `XRefM` with the specified effectual
 * function.
 */
export const contramapM = <A, RC, EC, C>(f: (c: C) => T.AsyncRE<RC, EC, A>) => <
  RA,
  RB,
  EA,
  EB,
  B
>(
  self: XRefM<RA, RB, EA, EB, A, B>
): XRefM<RA & RC, RB, EC | EA, EB, C, B> => contramapM_(self, f)

/**
 * Transforms the `set` value of the `XRefM` with the specified function.
 */
export const contramap_ = <RA, RB, EA, EB, B, C, A>(
  self: XRefM<RA, RB, EA, EB, A, B>,
  f: (c: C) => A
): XRefM<RA, RB, EA, EB, C, B> =>
  pipe(
    self,
    contramapM((c) => T.succeedNow(f(c)))
  )

/**
 * Transforms the `set` value of the `XRefM` with the specified function.
 */
export const contramap = <C, A>(f: (c: C) => A) => <RA, RB, EA, EB, B>(
  self: XRefM<RA, RB, EA, EB, A, B>
): XRefM<RA, RB, EA, EB, C, B> => contramap_(self, f)

/**
 * Transforms the `get` value of the `XRefM` with the specified function.
 */
export const map_ = <RA, RB, EA, EB, A, B, C>(
  self: XRefM<RA, RB, EA, EB, A, B>,
  f: (b: B) => C
) =>
  pipe(
    self,
    mapM((b) => T.succeedNow(f(b)))
  )

/**
 * Transforms the `get` value of the `XRefM` with the specified function.
 */
export const map = <B, C>(f: (b: B) => C) => <RA, RB, EA, EB, A>(
  self: XRefM<RA, RB, EA, EB, A, B>
) => map_(self, f)

/**
 * Returns a read only view of the `XRefM`.
 */
export const readOnly = <RA, RB, EA, EB, A, B>(
  self: XRefM<RA, RB, EA, EB, A, B>
): XRefM<RA, RB, EA, EB, never, B> => self

/**
 * Returns a read only view of the `XRefM`.
 */
export const writeOnly = <RA, RB, EA, EB, A, B>(
  self: XRefM<RA, RB, EA, EB, A, B>
): XRefM<RA, RB, EA, void, A, never> =>
  pipe(
    self,
    fold(
      identity,
      (): void => undefined,
      E.right,
      () => E.left<void>(undefined)
    )
  )

/**
 * Performs the specified effect every time a value is written to this
 * `XRefM`.
 */
export const tapInput_ = <RA, RB, EA, EB, B, A, RC, EC, A1 extends A = A>(
  self: XRefM<RA, RB, EA, EB, A, B>,
  f: (a: A1) => T.AsyncRE<RC, EC, any>
) =>
  pipe(
    self,
    contramapM((c: A1) => pipe(f(c), T.as(c)))
  )

/**
 * Performs the specified effect every time a value is written to this
 * `XRefM`.
 */
export const tapInput = <A, RC, EC, A1 extends A = A>(
  f: (a: A1) => T.AsyncRE<RC, EC, any>
) => <RA, RB, EA, EB, B>(self: XRefM<RA, RB, EA, EB, A, B>) => tapInput_(self, f)

/**
 * Performs the specified effect every time a value is written to this
 * `XRefM`.
 */
export const tapOutput_ = <RA, RB, EA, EB, A, B, RC, EC>(
  self: XRefM<RA, RB, EA, EB, A, B>,
  f: (b: B) => T.AsyncRE<RC, EC, any>
) =>
  pipe(
    self,
    mapM((b) => pipe(f(b), T.as(b)))
  )

/**
 * Performs the specified effect every time a value is written to this
 * `XRefM`.
 */
export const tapOutput = <B, RC, EC>(f: (b: B) => T.AsyncRE<RC, EC, any>) => <
  RA,
  RB,
  EA,
  EB,
  A
>(
  self: XRefM<RA, RB, EA, EB, A, B>
) => tapOutput_(self, f)
