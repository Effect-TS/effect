// ets_tracing: off

import * as Tp from "../Collections/Immutable/Tuple/index.js"
import * as E from "../Either/index.js"
import { identity, pipe } from "../Function/index.js"
import type * as M from "../Managed/managed.js"
import * as O from "../Option/index.js"
import * as Q from "../Queue/index.js"
import * as R from "../Ref/index.js"
import * as S from "../Semaphore/index.js"
import { matchTag } from "../Utils/index.js"
import * as T from "./effect.js"
import type { RefM, XRefM } from "./XRefM.js"
import { AtomicM, concrete } from "./XRefM.js"

/**
 * Creates a new `XRefM` with the specified value.
 */
export function makeRefM<A>(a: A): T.UIO<RefM<A>> {
  return pipe(
    T.do,
    T.bind("ref", () => R.makeRef(a)),
    T.bind("semaphore", () => S.makeSemaphore(1)),
    T.map(({ ref, semaphore }) => new AtomicM(ref, semaphore))
  )
}

/**
 * Creates a new `XRefM` with the specified value.
 */
export function unsafeMakeRefM<A>(a: A): RefM<A> {
  const ref = R.unsafeMakeRef(a)
  const semaphore = S.unsafeMakeSemaphore(1)
  return new AtomicM(ref, semaphore)
}

/**
 * Creates a new `RefM` with the specified value in the context of a
 * `Managed.`
 */
export function makeManagedRefM<A>(a: A): M.UIO<RefM<A>> {
  return pipe(makeRefM(a), T.toManaged)
}

/**
 * Creates a new `RefM` and a `Dequeue` that will emit every change to the
 * `RefM`.
 */
export function dequeueRef<A>(a: A): T.UIO<[RefM<A>, Q.Dequeue<A>]> {
  return pipe(
    T.do,
    T.bind("ref", () => makeRefM(a)),
    T.bind("queue", () => Q.makeUnbounded<A>()),
    T.map(({ queue, ref }) => [tapInput_(ref, (a) => Q.offer_(queue, a)), queue])
  )
}

/**
 * Atomically modifies the `RefM` with the specified function, which computes
 * a return value for the modification. This is a more powerful version of
 * `update`.
 */
export function modify_<RA, RB, EA, EB, R1, E1, B, A>(
  self: XRefM<RA, RB, EA, EB, A, A>,
  f: (a: A) => T.Effect<R1, E1, Tp.Tuple<[B, A]>>
): T.Effect<RA & RB & R1, EA | EB | E1, B> {
  return pipe(
    self,
    concrete,
    matchTag({
      AtomicM: (atomic) =>
        pipe(
          atomic.ref.get,
          T.chain(f),
          T.chain(({ tuple: [b, a] }) => pipe(atomic.ref.set(a), T.as(b))),
          S.withPermit(atomic.semaphore)
        ),
      DerivedM: (derived) =>
        derived.use((value, getEither, setEither) =>
          pipe(
            value.ref.get,
            T.chain((a) =>
              pipe(
                getEither(a),
                T.chain(f),
                T.chain(({ tuple: [b, a] }) =>
                  pipe(
                    setEither(a),
                    T.chain((a) => value.ref.set(a)),
                    T.as(b)
                  )
                )
              )
            ),
            S.withPermit(value.semaphore)
          )
        ),
      DerivedAllM: (derivedAll) =>
        derivedAll.use((value, getEither, setEither) =>
          pipe(
            value.ref.get,
            T.chain((s) =>
              pipe(
                getEither(s),
                T.chain(f),
                T.chain(({ tuple: [b, a] }) =>
                  pipe(
                    setEither(a)(s),
                    T.chain((a) => value.ref.set(a)),
                    T.as(b)
                  )
                )
              )
            ),
            S.withPermit(value.semaphore)
          )
        )
    })
  )
}

/**
 * Atomically modifies the `RefM` with the specified function, which computes
 * a return value for the modification. This is a more powerful version of
 * `update`.
 */
export function modify<R1, E1, B, A>(f: (a: A) => T.Effect<R1, E1, Tp.Tuple<[B, A]>>) {
  return <RA, RB, EA, EB>(
    self: XRefM<RA, RB, EA, EB, A, A>
  ): T.Effect<RA & RB & R1, EA | EB | E1, B> => modify_(self, f)
}

/**
 * Reads the value from the `XRefM`.
 */
export function get<RA, RB, EA, EB, A, B>(self: XRefM<RA, RB, EA, EB, A, B>) {
  return self.get
}

/**
 * Writes a new value to the `RefM`, returning the value immediately before
 * modification.
 */
export function getAndSet_<RA, RB, EA, EB, A>(self: XRefM<RA, RB, EA, EB, A, A>, a: A) {
  return modify_(self, (v) => T.succeed(Tp.tuple(v, a)))
}

/**
 * Writes a new value to the `RefM`, returning the value immediately before
 * modification.
 */
export function getAndSet<A>(a: A) {
  return <RA, RB, EA, EB>(self: XRefM<RA, RB, EA, EB, A, A>) => getAndSet_(self, a)
}

/**
 * Atomically modifies the `RefM` with the specified function, returning the
 * value immediately before modification.
 */
export function getAndUpdate_<RA, RB, EA, EB, R1, E1, A>(
  self: XRefM<RA, RB, EA, EB, A, A>,
  f: (a: A) => T.Effect<R1, E1, A>
) {
  return modify_(self, (v) => T.map_(f(v), (r) => Tp.tuple(v, r)))
}

/**
 * Atomically modifies the `RefM` with the specified function, returning the
 * value immediately before modification.
 */
export function getAndUpdate<R1, E1, A>(f: (a: A) => T.Effect<R1, E1, A>) {
  return <RA, RB, EA, EB>(self: XRefM<RA, RB, EA, EB, A, A>) => getAndUpdate_(self, f)
}

/**
 * Atomically modifies the `RefM` with the specified function, returning the
 * value immediately before modification.
 */
export function getAndUpdateSome_<RA, RB, EA, EB, R1, E1, A>(
  self: XRefM<RA, RB, EA, EB, A, A>,
  f: (a: A) => O.Option<T.Effect<R1, E1, A>>
) {
  return modify_(self, (v) =>
    pipe(
      f(v),
      O.getOrElse(() => T.succeed(v)),
      T.map((r) => Tp.tuple(v, r))
    )
  )
}

/**
 * Atomically modifies the `RefM` with the specified function, returning the
 * value immediately before modification.
 */
export function getAndUpdateSome<R1, E1, A>(
  f: (a: A) => O.Option<T.Effect<R1, E1, A>>
) {
  return <RA, RB, EA, EB>(self: XRefM<RA, RB, EA, EB, A, A>) =>
    getAndUpdateSome_(self, f)
}

/**
 * Atomically modifies the `RefM` with the specified function, which computes
 * a return value for the modification if the function is defined in the current value
 * otherwise it returns a default value.
 * This is a more powerful version of `updateSome`.
 */
export function modifySome_<RA, RB, EA, EB, R1, E1, A, B>(
  self: XRefM<RA, RB, EA, EB, A, A>,
  def: B,
  f: (a: A) => O.Option<T.Effect<R1, E1, Tp.Tuple<[B, A]>>>
) {
  return modify_(self, (v) => O.getOrElse_(f(v), () => T.succeed(Tp.tuple(def, v))))
}

/**
 * Atomically modifies the `RefM` with the specified function, which computes
 * a return value for the modification if the function is defined in the current value
 * otherwise it returns a default value.
 * This is a more powerful version of `updateSome`.
 */
export function modifySome<B>(def: B) {
  return <R1, E1, A>(f: (a: A) => O.Option<T.Effect<R1, E1, Tp.Tuple<[B, A]>>>) =>
    <RA, RB, EA, EB>(self: XRefM<RA, RB, EA, EB, A, A>) =>
      modifySome_(self, def, f)
}

/**
 * Atomically modifies the `RefM` with the specified function.
 */
export function update_<RA, RB, EA, EB, R1, E1, A>(
  self: XRefM<RA, RB, EA, EB, A, A>,
  f: (a: A) => T.Effect<R1, E1, A>
): T.Effect<RA & RB & R1, E1 | EA | EB, void> {
  return modify_(self, (v) => T.map_(f(v), (r) => Tp.tuple(undefined, r)))
}

/**
 * Atomically modifies the `RefM` with the specified function.
 */
export function update<R1, E1, A>(f: (a: A) => T.Effect<R1, E1, A>) {
  return <RA, RB, EA, EB>(
    self: XRefM<RA, RB, EA, EB, A, A>
  ): T.Effect<RA & RB & R1, E1 | EA | EB, void> => update_(self, f)
}

/**
 * Atomically modifies the `RefM` with the specified function.
 */
export function updateAndGet_<RA, RB, EA, EB, R1, E1, A>(
  self: XRefM<RA, RB, EA, EB, A, A>,
  f: (a: A) => T.Effect<R1, E1, A>
): T.Effect<RA & RB & R1, E1 | EA | EB, void> {
  return modify_(self, (v) =>
    pipe(
      f(v),
      T.map((r) => Tp.tuple(r, r))
    )
  )
}

/**
 * Atomically modifies the `RefM` with the specified function.
 */
export function updateAndGet<R1, E1, A>(f: (a: A) => T.Effect<R1, E1, A>) {
  return <RA, RB, EA, EB>(
    self: XRefM<RA, RB, EA, EB, A, A>
  ): T.Effect<RA & RB & R1, E1 | EA | EB, void> => updateAndGet_(self, f)
}

/**
 * Atomically modifies the `RefM` with the specified function.
 */
export function updateSome_<RA, RB, EA, EB, R1, E1, A>(
  self: XRefM<RA, RB, EA, EB, A, A>,
  f: (a: A) => O.Option<T.Effect<R1, E1, A>>
): T.Effect<RA & RB & R1, E1 | EA | EB, void> {
  return modify_(self, (v) =>
    pipe(
      f(v),
      O.getOrElse(() => T.succeed(v)),
      T.map((r) => Tp.tuple(undefined, r))
    )
  )
}

/**
 * Atomically modifies the `RefM` with the specified function.
 */
export function updateSome<R1, E1, A>(f: (a: A) => O.Option<T.Effect<R1, E1, A>>) {
  return <RA, RB, EA, EB>(
    self: XRefM<RA, RB, EA, EB, A, A>
  ): T.Effect<RA & RB & R1, E1 | EA | EB, void> => updateSome_(self, f)
}

/**
 * Atomically modifies the `RefM` with the specified function.
 */
export function updateSomeAndGet_<RA, RB, EA, EB, R1, E1, A>(
  self: XRefM<RA, RB, EA, EB, A, A>,
  f: (a: A) => O.Option<T.Effect<R1, E1, A>>
): T.Effect<RA & RB & R1, E1 | EA | EB, A> {
  return modify_(self, (v) =>
    pipe(
      f(v),
      O.getOrElse(() => T.succeed(v)),
      T.map((r) => Tp.tuple(r, r))
    )
  )
}

/**
 * Atomically modifies the `RefM` with the specified function.
 */
export function updateSomeAndGet<R1, E1, A>(
  f: (a: A) => O.Option<T.Effect<R1, E1, A>>
) {
  return <RA, RB, EA, EB>(
    self: XRefM<RA, RB, EA, EB, A, A>
  ): T.Effect<RA & RB & R1, E1 | EA | EB, A> => updateSomeAndGet_(self, f)
}

/**
 * Folds over the error and value types of the `XRefM`.
 */
export function fold_<RA, RB, EA, EB, A, B, EC, ED, C = A, D = B>(
  self: XRefM<RA, RB, EA, EB, A, B>,
  ea: (_: EA) => EC,
  eb: (_: EB) => ED,
  ca: (_: C) => E.Either<EC, A>,
  bd: (_: B) => E.Either<ED, D>
): XRefM<RA, RB, EC, ED, C, D> {
  return self.foldM(
    ea,
    eb,
    (c) => T.fromEither(() => ca(c)),
    (b) => T.fromEither(() => bd(b))
  )
}

/**
 * Folds over the error and value types of the `XRefM`.
 */
export function fold<EA, EB, A, B, EC, ED, C = A, D = B>(
  ea: (_: EA) => EC,
  eb: (_: EB) => ED,
  ca: (_: C) => E.Either<EC, A>,
  bd: (_: B) => E.Either<ED, D>
) {
  return <RA, RB>(self: XRefM<RA, RB, EA, EB, A, B>): XRefM<RA, RB, EC, ED, C, D> =>
    self.foldM(
      ea,
      eb,
      (c) => T.fromEither(() => ca(c)),
      (b) => T.fromEither(() => bd(b))
    )
}

/**
 * Folds over the error and value types of the `XRefM`. This is a highly
 * polymorphic method that is capable of arbitrarily transforming the error
 * and value types of the `XRefM`. For most use cases one of the more
 * specific combinators implemented in terms of `foldM` will be more
 * ergonomic but this method is extremely useful for implementing new
 * combinators.
 */
export function foldM_<RA, RB, EA, EB, A, B, RC, RD, EC, ED, C = A, D = B>(
  self: XRefM<RA, RB, EA, EB, A, B>,
  ea: (_: EA) => EC,
  eb: (_: EB) => ED,
  ca: (_: C) => T.Effect<RC, EC, A>,
  bd: (_: B) => T.Effect<RD, ED, D>
): XRefM<RA & RC, RB & RD, EC, ED, C, D> {
  return self.foldM(ea, eb, ca, bd)
}

/**
 * Folds over the error and value types of the `XRefM`. This is a highly
 * polymorphic method that is capable of arbitrarily transforming the error
 * and value types of the `XRefM`. For most use cases one of the more
 * specific combinators implemented in terms of `foldM` will be more
 * ergonomic but this method is extremely useful for implementing new
 * combinators.
 */
export function foldM<EA, EB, A, B, RC, RD, EC, ED, C = A, D = B>(
  ea: (_: EA) => EC,
  eb: (_: EB) => ED,
  ca: (_: C) => T.Effect<RC, EC, A>,
  bd: (_: B) => T.Effect<RD, ED, D>
) {
  return <RA, RB>(
    self: XRefM<RA, RB, EA, EB, A, B>
  ): XRefM<RA & RC, RB & RD, EC, ED, C, D> => self.foldM(ea, eb, ca, bd)
}

/**
 * Folds over the error and value types of the `XRefM`, allowing access to
 * the state in transforming the `set` value. This is a more powerful version
 * of `foldM` but requires unifying the environment and error types.
 */
export function foldAllM_<RA, RB, EA, EB, A, B, RC, RD, EC, ED, C = A, D = B>(
  self: XRefM<RA, RB, EA, EB, A, B>,
  ea: (_: EA) => EC,
  eb: (_: EB) => ED,
  ec: (_: EB) => EC,
  ca: (_: C) => (_: B) => T.Effect<RC, EC, A>,
  bd: (_: B) => T.Effect<RD, ED, D>
): XRefM<RB & RA & RC, RB & RD, EC, ED, C, D> {
  return self.foldAllM(ea, eb, ec, ca, bd)
}

/**
 * Folds over the error and value types of the `XRefM`, allowing access to
 * the state in transforming the `set` value. This is a more powerful version
 * of `foldM` but requires unifying the environment and error types.
 */
export function foldAllM<EA, EB, A, B, RC, RD, EC, ED, C = A, D = B>(
  ea: (_: EA) => EC,
  eb: (_: EB) => ED,
  ec: (_: EB) => EC,
  ca: (_: C) => (_: B) => T.Effect<RC, EC, A>,
  bd: (_: B) => T.Effect<RD, ED, D>
) {
  return <RA, RB>(
    self: XRefM<RA, RB, EA, EB, A, B>
  ): XRefM<RB & RA & RC, RB & RD, EC, ED, C, D> => self.foldAllM(ea, eb, ec, ca, bd)
}

/**
 * Maps and filters the `get` value of the `XRefM` with the specified
 * effectual partial function, returning a `XRefM` with a `get` value that
 * succeeds with the result of the partial function if it is defined or else
 * fails with `None`.
 */
export function collectM_<RA, RB, EA, EB, A, B, RC, EC, C>(
  self: XRefM<RA, RB, EA, EB, A, B>,
  f: (b: B) => O.Option<T.Effect<RC, EC, C>>
): XRefM<RA, RB & RC, EA, O.Option<EB | EC>, A, C> {
  return self.foldM(
    identity,
    (_) => O.some<EB | EC>(_),
    (_) => T.succeed(_),
    (b) =>
      pipe(
        f(b),
        O.map((a) => T.asSomeError(a)),
        O.getOrElse(() => T.fail(O.none))
      )
  )
}

/**
 * Maps and filters the `get` value of the `XRefM` with the specified
 * effectual partial function, returning a `XRefM` with a `get` value that
 * succeeds with the result of the partial function if it is defined or else
 * fails with `None`.
 */
export function collectM<B, RC, EC, C>(f: (b: B) => O.Option<T.Effect<RC, EC, C>>) {
  return <RA, RB, EA, EB, A>(
    self: XRefM<RA, RB, EA, EB, A, B>
  ): XRefM<RA, RB & RC, EA, O.Option<EB | EC>, A, C> => collectM_(self, f)
}

/**
 * Maps and filters the `get` value of the `XRefM` with the specified partial
 * function, returning a `XRefM` with a `get` value that succeeds with the
 * result of the partial function if it is defined or else fails with `None`.
 */
export function collect_<RA, RB, EA, EB, A, B, C>(
  self: XRefM<RA, RB, EA, EB, A, B>,
  f: (b: B) => O.Option<C>
): XRefM<RA, RB, EA, O.Option<EB>, A, C> {
  return collectM_(self, (b) => pipe(f(b), O.map(T.succeed)))
}

/**
 * Maps and filters the `get` value of the `XRefM` with the specified partial
 * function, returning a `XRefM` with a `get` value that succeeds with the
 * result of the partial function if it is defined or else fails with `None`.
 */
export function collect<B, C>(f: (b: B) => O.Option<C>) {
  return <RA, RB, EA, EB, A>(
    self: XRefM<RA, RB, EA, EB, A, B>
  ): XRefM<RA, RB, EA, O.Option<EB>, A, C> => collect_(self, f)
}

/**
 * Transforms both the `set` and `get` values of the `XRefM` with the
 * specified effectual functions.
 */
export function dimapM_<RA, RB, EA, EB, B, RC, EC, A, RD, ED, C = A, D = B>(
  self: XRefM<RA, RB, EA, EB, A, B>,
  f: (c: C) => T.Effect<RC, EC, A>,
  g: (b: B) => T.Effect<RD, ED, D>
) {
  return self.foldM(
    (ea: EA | EC) => ea,
    (eb: EB | ED) => eb,
    f,
    g
  )
}

/**
 * Transforms both the `set` and `get` values of the `XRefM` with the
 * specified effectual functions.
 */
export function dimapM<B, RC, EC, A, RD, ED, C = A, D = B>(
  f: (c: C) => T.Effect<RC, EC, A>,
  g: (b: B) => T.Effect<RD, ED, D>
) {
  return <RA, RB, EA, EB>(self: XRefM<RA, RB, EA, EB, A, B>) => dimapM_(self, f, g)
}

/**
 * Transforms both the `set` and `get` errors of the `XRefM` with the
 * specified functions.
 */
export function dimapError_<RA, RB, A, B, EA, EB, EC, ED>(
  self: XRefM<RA, RB, EA, EB, A, B>,
  f: (ea: EA) => EC,
  g: (eb: EB) => ED
): XRefM<RA, RB, EC, ED, A, B> {
  return fold_(
    self,
    (ea) => f(ea),
    (eb) => g(eb),
    (a) => E.right(a),
    (b) => E.right(b)
  )
}

/**
 * Transforms both the `set` and `get` errors of the `XRefM` with the
 * specified functions.
 */
export function dimapError<EA, EB, EC, ED>(f: (ea: EA) => EC, g: (eb: EB) => ED) {
  return <RA, RB, A, B>(
    self: XRefM<RA, RB, EA, EB, A, B>
  ): XRefM<RA, RB, EC, ED, A, B> => dimapError_(self, f, g)
}

/**
 * Filters the `set` value of the `XRefM` with the specified effectual
 * predicate, returning a `XRefM` with a `set` value that succeeds if the
 * predicate is satisfied or else fails with `None`.
 */
export function filterInputM_<RA, RB, EA, EB, B, A, RC, EC, A1 extends A = A>(
  self: XRefM<RA, RB, EA, EB, A, B>,
  f: (a: A1) => T.Effect<RC, EC, boolean>
): XRefM<RA & RC, RB, O.Option<EC | EA>, EB, A1, B> {
  return foldM_(
    self,
    (ea) => O.some<EA | EC>(ea),
    identity,
    (a: A1) =>
      T.ifM_(
        T.asSomeError(f(a)),
        () => T.succeed(a),
        () => T.fail<O.Option<EA | EC>>(O.none)
      ),
    T.succeed
  )
}

/**
 * Filters the `set` value of the `XRefM` with the specified effectual
 * predicate, returning a `XRefM` with a `set` value that succeeds if the
 * predicate is satisfied or else fails with `None`.
 */
export function filterInputM<A, RC, EC, A1 extends A = A>(
  f: (a: A1) => T.Effect<RC, EC, boolean>
) {
  return <RA, RB, EA, EB, B>(
    self: XRefM<RA, RB, EA, EB, A, B>
  ): XRefM<RA & RC, RB, O.Option<EC | EA>, EB, A1, B> => filterInputM_(self, f)
}

/**
 * Filters the `set` value of the `XRefM` with the specified effectual
 * predicate, returning a `XRefM` with a `set` value that succeeds if the
 * predicate is satisfied or else fails with `None`.
 */
export function filterInput_<RA, RB, EA, EB, B, A, A1 extends A = A>(
  self: XRefM<RA, RB, EA, EB, A, B>,
  f: (a: A1) => boolean
): XRefM<RA, RB, O.Option<EA>, EB, A1, B> {
  return filterInputM_(self, (a) => T.succeed(f(a)))
}

/**
 * Filters the `set` value of the `XRefM` with the specified effectual
 * predicate, returning a `XRefM` with a `set` value that succeeds if the
 * predicate is satisfied or else fails with `None`.
 */
export function filterInput<A, A1 extends A = A>(f: (a: A1) => boolean) {
  return <RA, RB, EA, EB, B>(
    self: XRefM<RA, RB, EA, EB, A, B>
  ): XRefM<RA, RB, O.Option<EA>, EB, A1, B> => filterInput_(self, f)
}

/**
 * Filters the `get` value of the `XRefM` with the specified effectual predicate,
 * returning a `XRefM` with a `get` value that succeeds if the predicate is
 * satisfied or else fails with `None`.
 */
export function filterOutputM_<RA, RB, EA, EB, A, B, RC, EC>(
  self: XRefM<RA, RB, EA, EB, A, B>,
  f: (b: B) => T.Effect<RC, EC, boolean>
): XRefM<RA, RB & RC, EA, O.Option<EC | EB>, A, B> {
  return foldM_(
    self,
    (ea) => ea,
    (eb) => O.some<EB | EC>(eb),
    (a) => T.succeed(a),
    (b) =>
      T.ifM_(
        T.asSomeError(f(b)),
        () => T.succeed(b),
        () => T.fail(O.none)
      )
  )
}

/**
 * Filters the `get` value of the `XRefM` with the specified effectual predicate,
 * returning a `XRefM` with a `get` value that succeeds if the predicate is
 * satisfied or else fails with `None`.
 */
export function filterOutputM<B, RC, EC>(f: (b: B) => T.Effect<RC, EC, boolean>) {
  return <RA, RB, EA, EB, A>(
    self: XRefM<RA, RB, EA, EB, A, B>
  ): XRefM<RA, RB & RC, EA, O.Option<EC | EB>, A, B> => filterOutputM_(self, f)
}

/**
 * Filters the `get` value of the `XRefM` with the specified predicate,
 * returning a `XRefM` with a `get` value that succeeds if the predicate is
 * satisfied or else fails with `None`.
 */
export function filterOutput_<RA, RB, EA, EB, A, B>(
  self: XRefM<RA, RB, EA, EB, A, B>,
  f: (b: B) => boolean
): XRefM<RA, RB, EA, O.Option<EB>, A, B> {
  return filterOutputM_(self, (b) => T.succeed(f(b)))
}

/**
 * Filters the `get` value of the `XRefM` with the specified predicate,
 * returning a `XRefM` with a `get` value that succeeds if the predicate is
 * satisfied or else fails with `None`.
 */
export function filterOutput<B>(f: (b: B) => boolean) {
  return <RA, RB, EA, EB, A>(
    self: XRefM<RA, RB, EA, EB, A, B>
  ): XRefM<RA, RB, EA, O.Option<EB>, A, B> => filterOutput_(self, f)
}

/**
 * Transforms the `get` value of the `XRefM` with the specified effectual
 * function.
 */
export function mapM_<RA, RB, EA, EB, A, B, RC, EC, C>(
  self: XRefM<RA, RB, EA, EB, A, B>,
  f: (b: B) => T.Effect<RC, EC, C>
) {
  return dimapM_(self, T.succeed, f)
}

/**
 * Transforms the `get` value of the `XRefM` with the specified effectual
 * function.
 */
export function mapM<B, RC, EC, C>(f: (b: B) => T.Effect<RC, EC, C>) {
  return <RA, RB, EA, EB, A>(self: XRefM<RA, RB, EA, EB, A, B>) => mapM_(self, f)
}

/**
 * Transforms the `set` value of the `XRefM` with the specified effectual
 * function.
 */
export function contramapM_<RA, RB, EA, EB, B, A, RC, EC, C>(
  self: XRefM<RA, RB, EA, EB, A, B>,
  f: (c: C) => T.Effect<RC, EC, A>
): XRefM<RA & RC, RB, EC | EA, EB, C, B> {
  return dimapM_(self, f, T.succeed)
}

/**
 * Transforms the `set` value of the `XRefM` with the specified effectual
 * function.
 */
export function contramapM<A, RC, EC, C>(f: (c: C) => T.Effect<RC, EC, A>) {
  return <RA, RB, EA, EB, B>(
    self: XRefM<RA, RB, EA, EB, A, B>
  ): XRefM<RA & RC, RB, EC | EA, EB, C, B> => contramapM_(self, f)
}

/**
 * Transforms the `set` value of the `XRefM` with the specified function.
 */
export function contramap_<RA, RB, EA, EB, B, C, A>(
  self: XRefM<RA, RB, EA, EB, A, B>,
  f: (c: C) => A
): XRefM<RA, RB, EA, EB, C, B> {
  return contramapM_(self, (c) => T.succeed(f(c)))
}

/**
 * Transforms the `set` value of the `XRefM` with the specified function.
 */
export function contramap<C, A>(f: (c: C) => A) {
  return <RA, RB, EA, EB, B>(
    self: XRefM<RA, RB, EA, EB, A, B>
  ): XRefM<RA, RB, EA, EB, C, B> => contramap_(self, f)
}

/**
 * Transforms the `get` value of the `XRefM` with the specified function.
 */
export function map_<RA, RB, EA, EB, A, B, C>(
  self: XRefM<RA, RB, EA, EB, A, B>,
  f: (b: B) => C
) {
  return mapM_(self, (b) => T.succeed(f(b)))
}

/**
 * Transforms the `get` value of the `XRefM` with the specified function.
 */
export function map<B, C>(f: (b: B) => C) {
  return <RA, RB, EA, EB, A>(self: XRefM<RA, RB, EA, EB, A, B>) => map_(self, f)
}

/**
 * Returns a read only view of the `XRefM`.
 */
export function readOnly<RA, RB, EA, EB, A, B>(
  self: XRefM<RA, RB, EA, EB, A, B>
): XRefM<RA, RB, EA, EB, never, B> {
  return self
}

/**
 * Returns a read only view of the `XRefM`.
 */
export function writeOnly<RA, RB, EA, EB, A, B>(
  self: XRefM<RA, RB, EA, EB, A, B>
): XRefM<RA, RB, EA, void, A, never> {
  return fold_(
    self,
    identity,
    (): void => undefined,
    E.right,
    () => E.left<void>(undefined)
  )
}

/**
 * Performs the specified effect every time a value is written to this
 * `XRefM`.
 */
export function tapInput_<RA, RB, EA, EB, B, A, RC, EC, X, A1 extends A = A>(
  self: XRefM<RA, RB, EA, EB, A, B>,
  f: (a: A1) => T.Effect<RC, EC, X>
) {
  return contramapM_(self, (c: A1) => pipe(f(c), T.as(c)))
}

/**
 * Performs the specified effect every time a value is written to this
 * `XRefM`.
 */
export function tapInput<A, RC, EC, X, A1 extends A = A>(
  f: (a: A1) => T.Effect<RC, EC, X>
) {
  return <RA, RB, EA, EB, B>(self: XRefM<RA, RB, EA, EB, A, B>) => tapInput_(self, f)
}

/**
 * Performs the specified effect every time a value is read to this
 * `XRefM`.
 */
export function tapOutput_<RA, RB, EA, EB, A, B, RC, EC, X>(
  self: XRefM<RA, RB, EA, EB, A, B>,
  f: (b: B) => T.Effect<RC, EC, X>
) {
  return mapM_(self, (b) => pipe(f(b), T.as(b)))
}

/**
 * Performs the specified effect every time a value is read to this
 * `XRefM`.
 */
export function tapOutput<B, RC, EC, X>(f: (b: B) => T.Effect<RC, EC, X>) {
  return <RA, RB, EA, EB, A>(self: XRefM<RA, RB, EA, EB, A, B>) => tapOutput_(self, f)
}
