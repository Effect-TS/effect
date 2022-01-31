// ets_tracing: off

import * as Tp from "../Collections/Immutable/Tuple/index.js"
import * as absolve from "../Effect/absolve.js"
import * as E from "../Either/index.js"
import { identity, pipe } from "../Function/index.js"
import * as O from "../Option/index.js"
import { AtomicReference } from "../Support/AtomicReference/index.js"
import { matchTag } from "../Utils/index.js"
import * as A from "./atomic.js"
import * as T from "./effect.js"
import type { Ref, XRef } from "./XRef.js"
import { Atomic, concrete } from "./XRef.js"

/**
 * Creates a new `XRef` with the specified value.
 */
export function makeRef<A>(a: A): T.UIO<Ref<A>> {
  return T.succeedWith(() => new Atomic(new AtomicReference(a)))
}

/**
 * Creates a new `XRef` with the specified value.
 */
export function unsafeMakeRef<A>(a: A): Ref<A> {
  return new Atomic(new AtomicReference(a))
}

/**
 * Maps and filters the `get` value of the `XRef` with the specified partial
 * function, returning a `XRef` with a `get` value that succeeds with the
 * result of the partial function if it is defined or else fails with `None`.
 *
 * @ets_data_first collect_
 */
export function collect<B, C>(pf: (_: B) => O.Option<C>) {
  return <EA, EB, A>(self: XRef<EA, EB, A, B>): XRef<EA, O.Option<EB>, A, C> =>
    collect_(self, pf)
}

/**
 * Maps and filters the `get` value of the `XRef` with the specified partial
 * function, returning a `XRef` with a `get` value that succeeds with the
 * result of the partial function if it is defined or else fails with `None`.
 */
export function collect_<EA, EB, A, B, C>(
  self: XRef<EA, EB, A, B>,
  pf: (_: B) => O.Option<C>
): XRef<EA, O.Option<EB>, A, C> {
  return self.fold(identity, O.some, E.right, (b) => E.fromOption_(pf(b), () => O.none))
}

/**
 * Transforms the `set` value of the `XRef` with the specified function.
 *
 * @ets_data_first contramap_
 */
export function contramap<A, C>(f: (_: C) => A) {
  return <EA, EB, B>(self: XRef<EA, EB, A, B>): XRef<EA, EB, C, B> =>
    contramap_(self, f)
}

/**
 * Transforms the `set` value of the `XRef` with the specified function.
 */
export function contramap_<EA, EB, B, A, C>(
  self: XRef<EA, EB, A, B>,
  f: (_: C) => A
): XRef<EA, EB, C, B> {
  return contramapEither_(self, (c) => E.right(f(c)))
}

/**
 * Transforms the `set` value of the `XRef` with the specified fallible
 * function.
 *
 * @ets_data_first contramapEither_
 */
export function contramapEither<A, EC, C>(f: (_: C) => E.Either<EC, A>) {
  return <EA, EB, B>(self: XRef<EA, EB, A, B>): XRef<EC | EA, EB, C, B> =>
    contramapEither_(self, f)
}

/**
 * Transforms the `set` value of the `XRef` with the specified fallible
 * function.
 */
export function contramapEither_<A, EC, C, EA, EB, B>(
  self: XRef<EA, EB, A, B>,
  f: (_: C) => E.Either<EC, A>
): XRef<EC | EA, EB, C, B> {
  return dimapEither_(self, f, (x) => E.right(x))
}

/**
 * Transforms both the `set` and `get` values of the `XRef` with the
 * specified functions.
 *
 * @ets_data_first dimap_
 */
export function dimap<A, B, C, D>(f: (_: C) => A, g: (_: B) => D) {
  return <EA, EB>(self: XRef<EA, EB, A, B>): XRef<EA, EB, C, D> => dimap_(self, f, g)
}

/**
 * Transforms both the `set` and `get` values of the `XRef` with the
 * specified functions.
 */
export function dimap_<EA, EB, A, B, C, D>(
  self: XRef<EA, EB, A, B>,
  f: (_: C) => A,
  g: (_: B) => D
): XRef<EA, EB, C, D> {
  return dimapEither_(
    self,
    (c) => E.right(f(c)),
    (b) => E.right(g(b))
  )
}

/**
 * Transforms both the `set` and `get` values of the `XRef` with the
 * specified fallible functions.
 *
 * @ets_data_first dimapEither_
 */
export function dimapEither<A, B, C, EC, D, ED>(
  f: (_: C) => E.Either<EC, A>,
  g: (_: B) => E.Either<ED, D>
) {
  return <EA, EB>(self: XRef<EA, EB, A, B>): XRef<EC | EA, EB | ED, C, D> =>
    dimapEither_(self, f, g)
}

/**
 * Transforms both the `set` and `get` values of the `XRef` with the
 * specified fallible functions.
 */
export function dimapEither_<EA, EB, A, B, C, EC, D, ED>(
  self: XRef<EA, EB, A, B>,
  f: (_: C) => E.Either<EC, A>,
  g: (_: B) => E.Either<ED, D>
): XRef<EC | EA, ED | EB, C, D> {
  return self.fold(
    (ea: EA | EC) => ea,
    (eb: EB | ED) => eb,
    f,
    g
  )
}

/**
 * Transforms both the `set` and `get` errors of the `XRef` with the
 * specified functions.
 *
 * @ets_data_first dimapError_
 */
export function dimapError<EA, EB, EC, ED>(
  f: (_: EA) => EC,
  g: (_: EB) => ED
): <A, B>(self: XRef<EA, EB, A, B>) => XRef<EC, ED, A, B> {
  return (self) => dimapError_(self, f, g)
}

/**
 * Transforms both the `set` and `get` errors of the `XRef` with the
 * specified functions.
 */
export function dimapError_<A, B, EA, EB, EC, ED>(
  self: XRef<EA, EB, A, B>,
  f: (_: EA) => EC,
  g: (_: EB) => ED
): XRef<EC, ED, A, B> {
  return self.fold(f, g, E.right, E.right)
}

/**
 * Filters the `set` value of the `XRef` with the specified predicate,
 * returning a `XRef` with a `set` value that succeeds if the predicate is
 * satisfied or else fails with `None`.
 *
 * @ets_data_first filterInput_
 */
export function filterInput<A, A1 extends A>(f: (_: A1) => boolean) {
  return <EA, EB, B>(self: XRef<EA, EB, A, B>): XRef<O.Option<EA>, EB, A1, B> =>
    filterInput_(self, f)
}

/**
 * Filters the `set` value of the `XRef` with the specified predicate,
 * returning a `XRef` with a `set` value that succeeds if the predicate is
 * satisfied or else fails with `None`.
 */
export function filterInput_<EA, EB, B, A, A1 extends A>(
  self: XRef<EA, EB, A, B>,
  f: (_: A1) => boolean
): XRef<O.Option<EA>, EB, A1, B> {
  return self.fold(
    O.some,
    identity,
    (a) => (f(a) ? E.right(a) : E.left(O.none)),
    E.right
  )
}

/**
 * Filters the `get` value of the `XRef` with the specified predicate,
 * returning a `XRef` with a `get` value that succeeds if the predicate is
 * satisfied or else fails with `None`.
 *
 * @ets_data_first filterOutput_
 */
export function filterOutput<B>(f: (_: B) => boolean) {
  return <EA, EB, A>(_: XRef<EA, EB, A, B>): XRef<EA, O.Option<EB>, A, B> =>
    filterOutput_(_, f)
}

/**
 * Filters the `get` value of the `XRef` with the specified predicate,
 * returning a `XRef` with a `get` value that succeeds if the predicate is
 * satisfied or else fails with `None`.
 */
export function filterOutput_<EA, EB, A, B>(
  _: XRef<EA, EB, A, B>,
  f: (_: B) => boolean
): XRef<EA, O.Option<EB>, A, B> {
  return _.fold(identity, O.some, E.right, (b) => (f(b) ? E.right(b) : E.left(O.none)))
}

/**
 * Transforms the `get` value of the `XRef` with the specified function.
 *
 * @ets_data_first map_
 */
export function map<B, C>(f: (_: B) => C) {
  return <EA, EB, A>(_: XRef<EA, EB, A, B>): XRef<EA, EB, A, C> => map_(_, f)
}

/**
 * Transforms the `get` value of the `XRef` with the specified function.
 */
export function map_<EA, EB, A, B, C>(
  _: XRef<EA, EB, A, B>,
  f: (_: B) => C
): XRef<EA, EB, A, C> {
  return mapEither_(_, (b) => E.right(f(b)))
}

/**
 * Transforms the `get` value of the `XRef` with the specified fallible
 * function.
 *
 * @ets_data_first mapEither_
 */
export function mapEither<B, EC, C>(f: (_: B) => E.Either<EC, C>) {
  return <EA, EB, A>(_: XRef<EA, EB, A, B>): XRef<EA, EC | EB, A, C> => mapEither_(_, f)
}

/**
 * Transforms the `get` value of the `XRef` with the specified fallible
 * function.
 */
export function mapEither_<EA, EB, A, B, EC, C>(
  _: XRef<EA, EB, A, B>,
  f: (_: B) => E.Either<EC, C>
): XRef<EA, EC | EB, A, C> {
  return dimapEither_(_, (a) => E.right(a), f)
}

/**
 * Returns a read only view of the `XRef`.
 *
 * @ets_optimize identity
 */
export function readOnly<EA, EB, A, B>(_: XRef<EA, EB, A, B>): XRef<EA, EB, never, B> {
  return _
}

/**
 * Returns a write only view of the `XRef`.
 */
export function writeOnly<EA, EB, A, B>(
  _: XRef<EA, EB, A, B>
): XRef<EA, void, A, never> {
  return _.fold(
    identity,
    () => undefined,
    E.right,
    () => E.left(undefined)
  )
}

/**
 * Atomically modifies the `XRef` with the specified function, which
 * computes a return value for the modification. This is a more powerful
 * version of `update`.
 *
 * @ets_data_first modify_
 */
export function modify<B, A>(f: (a: A) => Tp.Tuple<[B, A]>) {
  return <EA, EB>(self: XRef<EA, EB, A, A>): T.IO<EA | EB, B> => modify_(self, f)
}

/**
 * Atomically modifies the `XRef` with the specified function, which
 * computes a return value for the modification. This is a more powerful
 * version of `update`.
 */
export function modify_<EA, EB, B, A>(
  self: XRef<EA, EB, A, A>,
  f: (a: A) => Tp.Tuple<[B, A]>
): T.IO<EA | EB, B> {
  return pipe(
    self,
    concrete,
    matchTag({
      Atomic: (_) => A.modify(_, f),
      Derived: (self) =>
        self.use((value, getEither, setEither) =>
          pipe(
            A.modify(value, (s) =>
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
            absolve.absolve
          )
        ),
      DerivedAll: (self) =>
        self.use((value, getEither, setEither) =>
          pipe(
            A.modify(value, (s) =>
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
            absolve.absolve
          )
        )
    })
  )
}

/**
 * Atomically modifies the `XRef` with the specified partial function,
 * which computes a return value for the modification if the function is
 * defined on the current value otherwise it returns a default value. This
 * is a more powerful version of `updateSome`.
 *
 * @ets_data_first modifySome_
 */
export function modifySome<B, A>(def: B, f: (a: A) => O.Option<Tp.Tuple<[B, A]>>) {
  return <EA, EB>(self: XRef<EA, EB, A, A>): T.IO<EA | EB, B> =>
    modifySome_(self, def, f)
}

/**
 * Atomically modifies the `XRef` with the specified partial function,
 * which computes a return value for the modification if the function is
 * defined on the current value otherwise it returns a default value. This
 * is a more powerful version of `updateSome`.
 */
export function modifySome_<EA, EB, A, B>(
  self: XRef<EA, EB, A, A>,
  def: B,
  f: (a: A) => O.Option<Tp.Tuple<[B, A]>>
): T.IO<EA | EB, B> {
  return pipe(
    self,
    concrete,
    matchTag({ Atomic: (_) => A.modifySome(_, def, f) }, (_) =>
      modify_(_, (a) => O.getOrElse_(f(a), () => Tp.tuple(def, a)))
    )
  )
}

/**
 * Atomically writes the specified value to the `XRef`, returning the value
 * immediately before modification.
 *
 * @ets_data_first getAndSet_
 */
export function getAndSet<A>(a: A) {
  return <EA, EB>(self: XRef<EA, EB, A, A>): T.IO<EA | EB, A> => getAndSet_(self, a)
}

/**
 * Atomically writes the specified value to the `XRef`, returning the value
 * immediately before modification.
 */
export function getAndSet_<EA, EB, A>(
  self: XRef<EA, EB, A, A>,
  a: A
): T.IO<EA | EB, A> {
  return pipe(
    self,
    concrete,
    matchTag({ Atomic: (_) => A.getAndSet(_, a) }, (_) =>
      modify_(_, (v) => Tp.tuple(v, a))
    )
  )
}

/**
 * Atomically modifies the `XRef` with the specified function, returning
 * the value immediately before modification.
 *
 * @ets_data_first getAndUpdate_
 */
export function getAndUpdate<A>(f: (a: A) => A) {
  return <EA, EB>(self: XRef<EA, EB, A, A>) => getAndUpdate_(self, f)
}

/**
 * Atomically modifies the `XRef` with the specified function, returning
 * the value immediately before modification.
 */
export function getAndUpdate_<EA, EB, A>(
  self: XRef<EA, EB, A, A>,
  f: (a: A) => A
): T.IO<EA | EB, A> {
  return pipe(
    self,
    concrete,
    matchTag(
      { Atomic: (_) => A.getAndUpdate(_, f) },
      modify((v) => Tp.tuple(v, f(v)))
    )
  )
}

/**
 * Atomically modifies the `XRef` with the specified partial function,
 * returning the value immediately before modification. If the function is
 * undefined on the current value it doesn't change it.
 *
 * @ets_data_first getAndUpdateSome_
 */
export function getAndUpdateSome<A>(f: (a: A) => O.Option<A>) {
  return <EA, EB>(self: XRef<EA, EB, A, A>) => getAndUpdateSome_(self, f)
}

/**
 * Atomically modifies the `XRef` with the specified partial function,
 * returning the value immediately before modification. If the function is
 * undefined on the current value it doesn't change it.
 */
export function getAndUpdateSome_<EA, EB, A>(
  self: XRef<EA, EB, A, A>,
  f: (a: A) => O.Option<A>
): T.IO<EA | EB, A> {
  return pipe(
    self,
    concrete,
    matchTag({ Atomic: (_) => A.getAndUpdateSome(_, f) }, (_) =>
      modify_(_, (v) =>
        pipe(
          f(v),
          O.getOrElse(() => v),
          (a) => Tp.tuple(v, a)
        )
      )
    )
  )
}

/**
 * Atomically modifies the `XRef` with the specified function.
 *
 * @ets_data_first update_
 */
export function update<A>(f: (a: A) => A) {
  return <EA, EB>(self: XRef<EA, EB, A, A>): T.IO<EA | EB, void> => update_(self, f)
}

/**
 * Atomically modifies the `XRef` with the specified function.
 */
export function update_<EA, EB, A>(
  self: XRef<EA, EB, A, A>,
  f: (a: A) => A
): T.IO<EA | EB, void> {
  return pipe(
    self,
    concrete,
    matchTag({ Atomic: (_) => A.update(_, f) }, (_) =>
      modify_(_, (v) => Tp.tuple(undefined, f(v)))
    )
  )
}

/**
 * Atomically modifies the `XRef` with the specified function and returns
 * the updated value.
 *
 * @ets_data_first updateAndGet_
 */
export function updateAndGet<A>(f: (a: A) => A) {
  return <EA, EB>(self: XRef<EA, EB, A, A>): T.IO<EA | EB, A> => updateAndGet_(self, f)
}

/**
 * Atomically modifies the `XRef` with the specified function and returns
 * the updated value.
 */
export function updateAndGet_<EA, EB, A>(
  self: XRef<EA, EB, A, A>,
  f: (a: A) => A
): T.IO<EA | EB, A> {
  return pipe(
    self,
    concrete,
    matchTag({ Atomic: (_) => A.updateAndGet(_, f) }, (self) =>
      pipe(
        modify_(self, (v) => pipe(f(v), (result) => Tp.tuple(result, result))),
        T.chain(() => self.get)
      )
    )
  )
}

/**
 * Atomically modifies the `XRef` with the specified partial function. If
 * the function is undefined on the current value it doesn't change it.
 *
 * @ets_data_first updateSome_
 */
export function updateSome<A>(f: (a: A) => O.Option<A>) {
  return <EA, EB>(self: XRef<EA, EB, A, A>): T.IO<EA | EB, void> => updateSome_(self, f)
}

/**
 * Atomically modifies the `XRef` with the specified partial function. If
 * the function is undefined on the current value it doesn't change it.
 */
export function updateSome_<EA, EB, A>(
  self: XRef<EA, EB, A, A>,
  f: (a: A) => O.Option<A>
): T.IO<EA | EB, void> {
  return pipe(
    self,
    concrete,
    matchTag(
      { Atomic: (_) => A.updateSome(_, f) },
      modify((v) =>
        pipe(
          f(v),
          O.getOrElse(() => v),
          (a) => Tp.tuple(undefined, a)
        )
      )
    )
  )
}

/**
 * Atomically modifies the `XRef` with the specified partial function. If
 * the function is undefined on the current value it returns the old value
 * without changing it.
 *
 * @ets_data_first updateSomeAndGet_
 */
export function updateSomeAndGet<A>(f: (a: A) => O.Option<A>) {
  return <EA, EB>(self: XRef<EA, EB, A, A>): T.IO<EA | EB, A> =>
    updateSomeAndGet_(self, f)
}

/**
 * Atomically modifies the `XRef` with the specified partial function. If
 * the function is undefined on the current value it returns the old value
 * without changing it.
 */
export function updateSomeAndGet_<EA, EB, A>(
  self: XRef<EA, EB, A, A>,
  f: (a: A) => O.Option<A>
): T.IO<EA | EB, A> {
  return pipe(
    self,
    concrete,
    matchTag({ Atomic: (_) => A.updateSomeAndGet(_, f) }, (_) =>
      modify_(_, (v) =>
        pipe(
          f(v),
          O.getOrElse(() => v),
          (result) => Tp.tuple(result, result)
        )
      )
    )
  )
}

/**
 * Folds over the error and value types of the `XRef`. This is a highly
 * polymorphic method that is capable of arbitrarily transforming the error
 * and value types of the `XRef`. For most use cases one of the more specific
 * combinators implemented in terms of `fold` will be more ergonomic but this
 * method is extremely useful for implementing new combinators.
 *
 * @ets_data_first fold_
 */
export function fold<EA, EB, A, B, EC, ED, C = A, D = B>(
  ea: (_: EA) => EC,
  eb: (_: EB) => ED,
  ca: (_: C) => E.Either<EC, A>,
  bd: (_: B) => E.Either<ED, D>
) {
  return (self: XRef<EA, EB, A, B>): XRef<EC, ED, C, D> => self.fold(ea, eb, ca, bd)
}

/**
 * Folds over the error and value types of the `XRef`. This is a highly
 * polymorphic method that is capable of arbitrarily transforming the error
 * and value types of the `XRef`. For most use cases one of the more specific
 * combinators implemented in terms of `fold` will be more ergonomic but this
 * method is extremely useful for implementing new combinators.
 */
export function fold_<EA, EB, A, B, EC, ED, C = A, D = B>(
  self: XRef<EA, EB, A, B>,
  ea: (_: EA) => EC,
  eb: (_: EB) => ED,
  ca: (_: C) => E.Either<EC, A>,
  bd: (_: B) => E.Either<ED, D>
): XRef<EC, ED, C, D> {
  return self.fold(ea, eb, ca, bd)
}

/**
 * Folds over the error and value types of the `XRef`, allowing access to
 * the state in transforming the `set` value. This is a more powerful version
 * of `fold` but requires unifying the error types.
 *
 * @ets_data_first foldAll_
 */
export function foldAll<EA, EB, A, B, EC, ED, C = A, D = B>(
  ea: (_: EA) => EC,
  eb: (_: EB) => ED,
  ec: (_: EB) => EC,
  ca: (_: C) => (_: B) => E.Either<EC, A>,
  bd: (_: B) => E.Either<ED, D>
) {
  return (self: XRef<EA, EB, A, B>): XRef<EC, ED, C, D> =>
    self.foldAll(ea, eb, ec, ca, bd)
}

/**
 * Folds over the error and value types of the `XRef`, allowing access to
 * the state in transforming the `set` value. This is a more powerful version
 * of `fold` but requires unifying the error types.
 */
export function foldAll_<EA, EB, A, B, EC, ED, C = A, D = B>(
  self: XRef<EA, EB, A, B>,
  ea: (_: EA) => EC,
  eb: (_: EB) => ED,
  ec: (_: EB) => EC,
  ca: (_: C) => (_: B) => E.Either<EC, A>,
  bd: (_: B) => E.Either<ED, D>
): XRef<EC, ED, C, D> {
  return self.foldAll(ea, eb, ec, ca, bd)
}

/**
 * Reads the value from the `XRef`.
 */
export function get<EA, EB, A, B>(self: XRef<EA, EB, A, B>) {
  return self.get
}

/**
 * Writes a new value to the `XRef`, with a guarantee of immediate
 * consistency (at some cost to performance).
 *
 * @ets_data_first set_
 */
export function set<A>(a: A) {
  return <EA, EB, B>(self: XRef<EA, EB, A, B>) => self.set(a)
}

/**
 * Writes a new value to the `XRef`, with a guarantee of immediate
 * consistency (at some cost to performance).
 */
export function set_<EA, EB, B, A>(self: XRef<EA, EB, A, B>, a: A) {
  return self.set(a)
}
