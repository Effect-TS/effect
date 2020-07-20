import * as E from "../../Either"
import { identity, pipe } from "../../Function"
import * as O from "../../Option"
import { absolve } from "../Effect/absolve"
import { chain } from "../Effect/chain"
import { Sync, SyncE } from "../Effect/effect"
import { effectTotal } from "../Effect/effectTotal"
import { AtomicReference } from "../Support/AtomicReference"

import { Ref, Atomic, XRef, ERef, concrete } from "./XRef"
import * as A from "./atomic"

/**
 * Creates a new `XRef` with the specified value.
 */
export const makeRef = <A>(a: A): Sync<Ref<A>> =>
  effectTotal(() => new Atomic(new AtomicReference(a)))

/**
 * Maps and filters the `get` value of the `XRef` with the specified partial
 * function, returning a `XRef` with a `get` value that succeeds with the
 * result of the partial function if it is defined or else fails with `None`.
 */
export const collect: <B, C>(
  pf: (_: B) => O.Option<C>
) => <EA, EB, A>(_: XRef<EA, EB, A, B>) => XRef<EA, O.Option<EB>, A, C> = (pf) => (_) =>
  _.fold(identity, O.some, E.right, (b) => E.fromOption_(pf(b), () => O.none))

/**
 * Transforms the `set` value of the `XRef` with the specified function.
 */
export const contramap: <A, C>(
  f: (_: C) => A
) => <EA, EB, B>(_: XRef<EA, EB, A, B>) => XRef<EA, EB, C, B> = (f) =>
  contramapEither((c) => E.rightW(f(c)))

/**
 * Transforms the `set` value of the `XRef` with the specified fallible
 * function.
 */
export const contramapEither: <A, EC, C, EA extends EC, EB>(
  f: (_: C) => E.Either<EC, A>
) => <B>(_: XRef<EA, EB, A, B>) => XRef<EC, EB, C, B> = <A, EC, C, EA extends EC, EB>(
  f: (_: C) => E.Either<EC, A>
) => <B>(_: XRef<EA, EB, A, B>): XRef<EC, EB, C, B> =>
  pipe(
    _,
    dimapEither(f, (x) => E.rightW<EB, B>(x))
  )

/**
 * Transforms both the `set` and `get` values of the `XRef` with the
 * specified functions.
 */
export const dimap: <A, B, C, D>(
  f: (_: C) => A,
  g: (_: B) => D
) => <EA, EB>(_: XRef<EA, EB, A, B>) => XRef<EA, EB, C, D> = <A, B, C, D>(
  f: (_: C) => A,
  g: (_: B) => D
) => <EA, EB>(_: XRef<EA, EB, A, B>): XRef<EA, EB, C, D> =>
  pipe(
    _,
    dimapEither(
      (c: C) => E.rightW<EA, A>(f(c)),
      (b: B) => E.rightW<EB, D>(g(b))
    )
  )

/**
 * Transforms both the `set` and `get` values of the `XRef` with the
 * specified fallible functions.
 */
export const dimapEither: <A, B, C, EC, D, ED>(
  f: (_: C) => E.Either<EC, A>,
  g: (_: B) => E.Either<ED, D>
) => <EA extends EC, EB extends ED>(_: XRef<EA, EB, A, B>) => XRef<EC, ED, C, D> = (
  f,
  g
) => (_) => _.fold(identity, identity, f, g)

/**
 * Transforms both the `set` and `get` errors of the `XRef` with the
 * specified functions.
 */
export const dimapError: <EA, EB, EC, ED>(
  f: (_: EA) => EC,
  g: (_: EB) => ED
) => <A, B>(_: XRef<EA, EB, A, B>) => XRef<EC, ED, A, B> = (f, g) => (_) =>
  _.fold(f, g, E.right, E.right)

/**
 * Filters the `set` value of the `XRef` with the specified predicate,
 * returning a `XRef` with a `set` value that succeeds if the predicate is
 * satisfied or else fails with `None`.
 */
export const filterInput: <A, A1 extends A>(
  f: (_: A1) => boolean
) => <EA, EB, B>(_: XRef<EA, EB, A, B>) => XRef<O.Option<EA>, EB, A1, B> = (f) => (_) =>
  _.fold(O.some, identity, (a) => (f(a) ? E.right(a) : E.left(O.none)), E.right)

/**
 * Filters the `get` value of the `XRef` with the specified predicate,
 * returning a `XRef` with a `get` value that succeeds if the predicate is
 * satisfied or else fails with `None`.
 */
export const filterOutput: <B>(
  f: (_: B) => boolean
) => <EA, EB, A>(_: XRef<EA, EB, A, B>) => XRef<EA, O.Option<EB>, A, B> = (f) => (_) =>
  _.fold(identity, O.some, E.right, (b) => (f(b) ? E.right(b) : E.left(O.none)))

/**
 * Transforms the `get` value of the `XRef` with the specified function.
 */
export const map: <B, C>(
  f: (_: B) => C
) => <EA, EB, A>(_: XRef<EA, EB, A, B>) => XRef<EA, EB, A, C> = (f) =>
  mapEither((b) => E.rightW(f(b)))

/**
 * Transforms the `get` value of the `XRef` with the specified fallible
 * function.
 */
export const mapEither: <B, EC, C>(
  f: (_: B) => E.Either<EC, C>
) => <EA, EB extends EC, A>(_: XRef<EA, EB, A, B>) => XRef<EA, EC, A, C> = (f) =>
  dimapEither((a) => E.rightW(a), f)

/**
 * Returns a read only view of the `XRef`.
 */
export const readOnly: <EA, EB, A, B>(
  _: XRef<EA, EB, A, B>
) => XRef<EA, EB, never, B> = (_) => _

/**
 * Returns a write only view of the `XRef`.
 */
export const writeOnly: <EA, EB, A, B>(
  _: XRef<EA, EB, A, B>
) => XRef<EA, void, A, never> = (_) =>
  _.fold(
    identity,
    () => undefined,
    E.right,
    () => E.left(undefined)
  )

/**
 * Atomically modifies the `XRef` with the specified function, which
 * computes a return value for the modification. This is a more powerful
 * version of `update`.
 */
export const modify = <B, A>(f: (a: A) => [B, A]) => <E>(
  self: ERef<E, A>
): SyncE<E, B> => {
  const _self = concrete(self)
  switch (_self._tag) {
    case "Atomic": {
      return A.modify(f)(_self)
    }
    case "Derived": {
      return pipe(
        _self.value,
        A.modify((s) => {
          return E.fold_(
            _self.getEither(s),
            (e) => [E.left(e), s] as [E.Either<E, never>, A],
            (a1) => {
              const [b, a2] = f(a1)

              return E.fold_(
                _self.setEither(a2),
                (e) => [E.left(e), s] as [E.Either<E, never>, A],
                (s) => [E.right(b), s] as [E.Either<E, never>, A]
              )
            }
          )
        }),
        absolve
      )
    }
    case "DerivedAll": {
      return pipe(
        _self.value,
        A.modify((s) => {
          return E.fold_(
            _self.getEither(s),
            (e) => [E.left(e), s] as [E.Either<E, never>, A],
            (a1) => {
              const [b, a2] = f(a1)

              return E.fold_(
                _self.setEither(a2)(s),
                (e) => [E.left(e), s] as [E.Either<E, never>, A],
                (s) => [E.right(b), s] as [E.Either<E, never>, A]
              )
            }
          )
        }),
        absolve
      )
    }
  }
}

/**
 * Atomically modifies the `XRef` with the specified partial function,
 * which computes a return value for the modification if the function is
 * defined on the current value otherwise it returns a default value. This
 * is a more powerful version of `updateSome`.
 */
export const modifySome = <B>(def: B) => <A>(f: (a: A) => O.Option<[B, A]>) => <E>(
  self: ERef<E, A>
): SyncE<E, B> => {
  const _self = concrete(self)
  switch (_self._tag) {
    case "Atomic": {
      return A.modifySome(def)(f)(_self)
    }
    default: {
      return pipe(
        _self,
        modify((a) => O.getOrElse_(f(a), () => [def, a] as [B, A]))
      )
    }
  }
}

/**
 * Atomically writes the specified value to the `XRef`, returning the value
 * immediately before modification.
 */
export const getAndSet = <A>(a: A) => <E>(self: ERef<E, A>) => {
  const _self = concrete(self)
  switch (_self._tag) {
    case "Atomic": {
      return A.getAndSet(a)(_self)
    }
    default: {
      return pipe(
        self,
        modify((v) => [v, a])
      )
    }
  }
}

/**
 * Atomically modifies the `XRef` with the specified function, returning
 * the value immediately before modification.
 */
export const getAndUpdate = <A>(f: (a: A) => A) => <E>(self: ERef<E, A>) => {
  const _self = concrete(self)
  switch (_self._tag) {
    case "Atomic": {
      return A.getAndUpdate(f)(_self)
    }
    default: {
      return pipe(
        _self,
        modify((v) => [v, f(v)])
      )
    }
  }
}

/**
 * Atomically modifies the `XRef` with the specified partial function,
 * returning the value immediately before modification. If the function is
 * undefined on the current value it doesn't change it.
 */
export const getAndUpdateSome = <A>(f: (a: A) => O.Option<A>) => <E>(
  self: ERef<E, A>
) => {
  const _self = concrete(self)
  switch (_self._tag) {
    case "Atomic": {
      return A.getAndUpdateSome(f)(_self)
    }
    default: {
      return pipe(
        _self,
        modify((v) => [v, O.getOrElse_(f(v), () => v)])
      )
    }
  }
}

/**
 * Atomically modifies the `XRef` with the specified function.
 */
export const update = <A>(f: (a: A) => A) => <E>(self: ERef<E, A>): SyncE<E, void> => {
  const _self = concrete(self)
  switch (_self._tag) {
    case "Atomic": {
      return A.update(f)(_self)
    }
    default: {
      return pipe(
        _self,
        modify((v) => [undefined, f(v)])
      )
    }
  }
}

/**
 * Atomically modifies the `XRef` with the specified function and returns
 * the updated value.
 */
export const updateAndGet = <A>(f: (a: A) => A) => <E>(
  self: ERef<E, A>
): SyncE<E, A> => {
  const _self = concrete(self)
  switch (_self._tag) {
    case "Atomic": {
      return A.updateAndGet(f)(_self)
    }
    default: {
      return pipe(
        _self,
        modify((v) => pipe(f(v), (result) => [result, result])),
        chain(() => self.get)
      )
    }
  }
}

/**
 * Atomically modifies the `XRef` with the specified partial function. If
 * the function is undefined on the current value it doesn't change it.
 */
export const updateSome = <A>(f: (a: A) => O.Option<A>) => <E>(
  self: ERef<E, A>
): SyncE<E, void> => {
  const _self = concrete(self)
  switch (_self._tag) {
    case "Atomic": {
      return A.updateSome(f)(_self)
    }
    default: {
      return pipe(
        _self,
        modify((v) => [undefined, O.getOrElse_(f(v), () => v)])
      )
    }
  }
}

/**
 * Atomically modifies the `XRef` with the specified partial function. If
 * the function is undefined on the current value it returns the old value
 * without changing it.
 */
export const updateSomeAndGet = <A>(f: (a: A) => O.Option<A>) => <E>(
  self: ERef<E, A>
): SyncE<E, A> => {
  const _self = concrete(self)
  switch (_self._tag) {
    case "Atomic": {
      return A.updateSomeAndGet(f)(_self)
    }
    default: {
      return pipe(
        _self,
        modify((v) =>
          pipe(
            f(v),
            O.getOrElse(() => v),
            (result) => [result, result]
          )
        )
      )
    }
  }
}

/**
 * Unsafe update value in a Ref<A>
 */
export const unsafeUpdate = <A>(f: (a: A) => A) => (self: Ref<A>) => {
  const _self = concrete(self)
  switch (_self._tag) {
    case "Atomic": {
      return A.unsafeUpdate(f)(_self)
    }
    case "Derived": {
      return pipe(
        _self.value,
        A.unsafeUpdate((s) =>
          pipe(_self.setEither(f(E.merge(_self.getEither(s)))), E.merge)
        )
      )
    }
    case "DerivedAll": {
      return pipe(
        _self.value,
        A.unsafeUpdate((s) =>
          pipe(_self.setEither(f(E.merge(_self.getEither(s))))(s), E.merge)
        )
      )
    }
  }
}

/**
 * Folds over the error and value types of the `XRef`. This is a highly
 * polymorphic method that is capable of arbitrarily transforming the error
 * and value types of the `XRef`. For most use cases one of the more specific
 * combinators implemented in terms of `fold` will be more ergonomic but this
 * method is extremely useful for implementing new combinators.
 */
export const fold = <EA, EB, A, B, EC, ED, C, D>(
  ea: (_: EA) => EC,
  eb: (_: EB) => ED,
  ca: (_: C) => E.Either<EC, A>,
  bd: (_: B) => E.Either<ED, D>
) => (self: XRef<EA, EB, A, B>): XRef<EC, ED, C, D> => self.fold(ea, eb, ca, bd)

/**
 * Folds over the error and value types of the `XRef`, allowing access to
 * the state in transforming the `set` value. This is a more powerful version
 * of `fold` but requires unifying the error types.
 */
export const foldAll = <EA, EB, A, B, EC, ED, C, D>(
  ea: (_: EA) => EC,
  eb: (_: EB) => ED,
  ec: (_: EB) => EC,
  ca: (_: C) => (_: B) => E.Either<EC, A>,
  bd: (_: B) => E.Either<ED, D>
) => (self: XRef<EA, EB, A, B>): XRef<EC, ED, C, D> => self.foldAll(ea, eb, ec, ca, bd)

/**
 * Reads the value from the `XRef`.
 */
export const get = <EA, EB, A, B>(self: XRef<EA, EB, A, B>) => self.get

/**
 * Writes a new value to the `XRef`, with a guarantee of immediate
 * consistency (at some cost to performance).
 */
export const set = <A>(a: A) => <EA, EB, B>(self: XRef<EA, EB, A, B>) => self.set(a)
