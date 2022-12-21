// ets_tracing: off

import "../../Operator/index.js"

import type { HashMap } from "../../Collections/Immutable/HashMap/index.js"
import type * as T from "../../Effect/index.js"
import * as E from "../../Either/index.js"
import { identity } from "../../Function/index.js"
import * as O from "../../Option/index.js"
import { AtomicReference } from "../../Support/AtomicReference/index.js"
import { STMEffect } from "../STM/_internal/primitives.js"
import * as STM from "../STM/core.js"
import { makeEntry } from "../STM/Entry/index.js"
import type { Journal, Todo } from "../STM/Journal/index.js"
import { emptyTodoMap } from "../STM/Journal/index.js"
import type { TxnId } from "../STM/TxnId/index.js"
import { Versioned } from "../STM/Versioned/index.js"

export const TRefTypeId = Symbol()
export type TRefTypeId = typeof TRefTypeId

/**
 * A `XTRef<EA, EB, A, B>` is a polymorphic, purely functional description of a
 * mutable reference that can be modified as part of a transactional effect. The
 * fundamental operations of a `XTRef` are `set` and `get`. `set` takes a value
 * of type `A` and transactionally sets the reference to a new value, potentially
 * failing with an error of type `EA`. `get` gets the current value of the reference
 * and returns a value of type `B`, potentially failing with an error of type `EB`.
 *
 * When the error and value types of the `XTRef` are unified, that is, it is a
 * `XTRef<E, E, A, A>`, the `ZTRef` also supports atomic `modify` and `update`
 * operations. All operations are guaranteed to be executed transactionally.
 *
 * NOTE: While `XTRef` provides the transactional equivalent of a mutable reference,
 * the value inside the `XTRef` should be immutable.
 */
export interface XTRef<EA, EB, A, B> {
  readonly _typeId: TRefTypeId
  readonly _EA: () => EA
  readonly _EB: () => EB
  readonly _A: (_: A) => void
  readonly _B: () => B

  fold<EC, ED, C, D>(
    ea: (ea: EA) => EC,
    eb: (ea: EB) => ED,
    ca: (c: C) => E.Either<EC, A>,
    bd: (b: B) => E.Either<ED, D>
  ): XTRef<EC, ED, C, D>

  foldAll<EC, ED, C, D>(
    ea: (ea: EA) => EC,
    eb: (ea: EB) => ED,
    ec: (ea: EB) => EC,
    ca: (c: C) => (b: B) => E.Either<EC, A>,
    bd: (b: B) => E.Either<ED, D>
  ): XTRef<EC, ED, C, D>

  readonly atomic: Atomic<unknown>
}

export interface TRef<A> extends XTRef<never, never, A, A> {}
export interface ETRef<E, A> extends XTRef<E, E, A, A> {}

export class Atomic<A> implements XTRef<never, never, A, A> {
  readonly _typeId: TRefTypeId = TRefTypeId
  readonly _tag = "Atomic"
  readonly _EA!: () => never
  readonly _EB!: () => never
  readonly _A!: (_: A) => void
  readonly _B!: () => A
  readonly atomic: Atomic<unknown> = this as Atomic<unknown>

  constructor(
    public versioned: Versioned<A>,
    readonly todo: AtomicReference<HashMap<TxnId, Todo>>
  ) {}

  fold<EC, ED, C, D>(
    _ea: (ea: never) => EC,
    _eb: (ea: never) => ED,
    ca: (c: C) => E.Either<EC, A>,
    bd: (b: A) => E.Either<ED, D>
  ): XTRef<EC, ED, C, D> {
    return new Derived(bd, ca, this, this.atomic)
  }

  foldAll<EC, ED, C, D>(
    _ea: (ea: never) => EC,
    _eb: (ea: never) => ED,
    _ec: (ea: never) => EC,
    ca: (c: C) => (b: A) => E.Either<EC, A>,
    bd: (b: A) => E.Either<ED, D>
  ): XTRef<EC, ED, C, D> {
    return new DerivedAll(bd, ca, this, this.atomic)
  }
}

export class Derived<S, EA, EB, A, B> implements XTRef<EA, EB, A, B> {
  readonly _typeId: TRefTypeId = TRefTypeId
  readonly _tag = "Derived"
  readonly _EA!: () => EA
  readonly _EB!: () => EB
  readonly _A!: (_: A) => void
  readonly _B!: () => B

  constructor(
    readonly getEither: (s: S) => E.Either<EB, B>,
    readonly setEither: (a: A) => E.Either<EA, S>,
    readonly value: Atomic<S>,
    readonly atomic: Atomic<unknown>
  ) {}

  fold<EC, ED, C, D>(
    ea: (ea: EA) => EC,
    eb: (ea: EB) => ED,
    ca: (c: C) => E.Either<EC, A>,
    bd: (b: B) => E.Either<ED, D>
  ): XTRef<EC, ED, C, D> {
    return new Derived(
      (s) => E.fold_(this.getEither(s), (e) => E.left(eb(e)), bd),
      (c) =>
        E.chain_(ca(c), (a) =>
          E.fold_(this.setEither(a), (e) => E.left(ea(e)), E.right)
        ),
      this.value,
      this.atomic
    )
  }

  foldAll<EC, ED, C, D>(
    ea: (ea: EA) => EC,
    eb: (ea: EB) => ED,
    ec: (ea: EB) => EC,
    ca: (c: C) => (b: B) => E.Either<EC, A>,
    bd: (b: B) => E.Either<ED, D>
  ): XTRef<EC, ED, C, D> {
    return new DerivedAll(
      (s) => E.fold_(this.getEither(s), (e) => E.left(eb(e)), bd),
      (c) => (s) =>
        E.chain_(
          E.fold_(this.getEither(s), (e) => E.left(ec(e)), ca(c)),
          (a) => E.fold_(this.setEither(a), (e) => E.left(ea(e)), E.right)
        ),
      this.value,
      this.atomic
    )
  }
}

export class DerivedAll<S, EA, EB, A, B> implements XTRef<EA, EB, A, B> {
  readonly _typeId: TRefTypeId = TRefTypeId
  readonly _tag = "DerivedAll"
  readonly _EA!: () => EA
  readonly _EB!: () => EB
  readonly _A!: (_: A) => void
  readonly _B!: () => B

  constructor(
    readonly getEither: (s: S) => E.Either<EB, B>,
    readonly setEither: (a: A) => (s: S) => E.Either<EA, S>,
    readonly value: Atomic<S>,
    readonly atomic: Atomic<unknown>
  ) {}

  fold<EC, ED, C, D>(
    ea: (ea: EA) => EC,
    eb: (ea: EB) => ED,
    ca: (c: C) => E.Either<EC, A>,
    bd: (b: B) => E.Either<ED, D>
  ): XTRef<EC, ED, C, D> {
    return new DerivedAll(
      (s) => E.fold_(this.getEither(s), (e) => E.left(eb(e)), bd),
      (c) => (s) =>
        E.chain_(ca(c), (a) =>
          E.fold_(this.setEither(a)(s), (e) => E.left(ea(e)), E.right)
        ),
      this.value,
      this.atomic
    )
  }

  foldAll<EC, ED, C, D>(
    ea: (ea: EA) => EC,
    eb: (ea: EB) => ED,
    ec: (ea: EB) => EC,
    ca: (c: C) => (b: B) => E.Either<EC, A>,
    bd: (b: B) => E.Either<ED, D>
  ): XTRef<EC, ED, C, D> {
    return new DerivedAll(
      (s) => E.fold_(this.getEither(s), (e) => E.left(eb(e)), bd),
      (c) => (s) =>
        E.chain_(
          E.fold_(this.getEither(s), (e) => E.left(ec(e)), ca(c)),
          (a) => E.fold_(this.setEither(a)(s), (e) => E.left(ea(e)), E.right)
        ),
      this.value,
      this.atomic
    )
  }
}

function getOrMakeEntry<A>(self: Atomic<A>, journal: Journal) {
  if (journal.has(self)) {
    return journal.get(self)!
  }
  const entry = makeEntry(self, false)
  journal.set(self, entry)
  return entry
}

/**
 * Retrieves the value of the `XTRef`.
 */
export function get<EA, EB, A, B>(self: XTRef<EA, EB, A, B>): STM.STM<unknown, EB, B> {
  concrete(self)
  switch (self._tag) {
    case "Atomic": {
      return new STMEffect((journal) => {
        const entry = getOrMakeEntry(self, journal)
        return entry.use((_) => _.unsafeGet<B>())
      })
    }
    case "Derived": {
      return STM.chain_(get(self.value), (s) =>
        E.fold_(self.getEither(s), STM.fail, STM.succeed)
      )
    }
    case "DerivedAll": {
      return STM.chain_(get(self.value), (s) =>
        E.fold_(self.getEither(s), STM.fail, STM.succeed)
      )
    }
  }
}

/**
 * Unsafely retrieves the value of the `XTRef`.
 */
export function unsafeGet_<EA, EB, A, B>(
  self: XTRef<EA, EB, A, B>,
  journal: Journal
): A {
  return getOrMakeEntry(self.atomic, journal).use((_) => _.unsafeGet<A>())
}

/**
 * Sets the value of the `XTRef`.
 */
export function set_<EA, EB, A, B>(
  self: XTRef<EA, EB, A, B>,
  a: A
): STM.STM<unknown, EA, void> {
  concrete(self)
  switch (self._tag) {
    case "Atomic": {
      return new STMEffect((journal) => {
        const entry = getOrMakeEntry(self, journal)
        return entry.use((_) => _.unsafeSet(a))
      })
    }
    case "Derived": {
      return E.fold_(self.setEither(a), STM.fail, (s) => set_(self.value, s))
    }
    case "DerivedAll": {
      return STM.absolve(
        modify_(self.value, (s) =>
          E.fold_(
            self.setEither(a)(s),
            (e) => [E.leftW(e), s],
            (s) => [E.right(undefined), s]
          )
        )
      )
    }
  }
}

/**
 * Updates the value of the variable, returning a function of the specified
 * value.
 */
export function modify_<E, A, B>(
  self: ETRef<E, A>,
  f: (a: A) => readonly [B, A]
): STM.STM<unknown, E, B> {
  concrete(self)
  switch (self._tag) {
    case "Atomic": {
      return new STMEffect((journal) => {
        const entry = getOrMakeEntry(self, journal)
        const oldValue = entry.use((_) => _.unsafeGet<A>())
        const [retValue, newValue] = f(oldValue)
        entry.use((_) => _.unsafeSet(newValue))
        return retValue
      })
    }
    case "Derived": {
      return STM.absolve(
        modify_(self.value, (s) =>
          E.fold_(
            self.getEither(s),
            (e) => [E.leftW<E, B>(e), s],
            (a1) => {
              const [b, a2] = f(a1)
              return E.fold_(
                self.setEither(a2),
                (e) => [E.left(e), s],
                (s) => [E.right(b), s]
              )
            }
          )
        )
      )
    }
    case "DerivedAll": {
      return STM.absolve(
        modify_(self.value, (s) =>
          E.fold_(
            self.getEither(s),
            (e) => [E.leftW<E, B>(e), s],
            (a1) => {
              const [b, a2] = f(a1)
              return E.fold_(
                self.setEither(a2)(s),
                (e) => [E.left(e), s],
                (s) => [E.right(b), s]
              )
            }
          )
        )
      )
    }
  }
}

/**
 * Updates the value of the variable, returning a function of the specified
 * value.
 *
 * @ets_data_first modify_
 */
export function modify<A, B>(
  f: (a: A) => readonly [B, A]
): <E>(self: ETRef<E, A>) => STM.STM<unknown, E, B> {
  return (self) => modify_(self, f)
}

/**
 * Updates the value of the variable, returning a function of the specified
 * value.
 */
export function modifySome_<E, A, B>(
  self: ETRef<E, A>,
  b: B,
  f: (a: A) => O.Option<readonly [B, A]>
): STM.STM<unknown, E, B> {
  return modify_(self, (a) => O.fold_(f(a), () => [b, a], identity))
}

/**
 * Updates the value of the variable, returning a function of the specified
 * value.
 *
 * @ets_data_first modifySome_
 */
export function modifySome<A, B>(
  b: B,
  f: (a: A) => O.Option<readonly [B, A]>
): <E>(self: ETRef<E, A>) => STM.STM<unknown, E, B> {
  return (self) => modifySome_(self, b, f)
}

/**
 * Sets the value of the `XTRef` and returns the old value.
 */
export function getAndSet_<EA, A>(self: ETRef<EA, A>, a: A): STM.STM<unknown, EA, A> {
  concrete(self)
  switch (self._tag) {
    case "Atomic": {
      return new STMEffect((journal) => {
        const entry = getOrMakeEntry(self, journal)
        const oldValue = entry.use((_) => _.unsafeGet<A>())
        entry.use((_) => _.unsafeSet(a))
        return oldValue
      })
    }
    default: {
      return modify_(self, (_) => [_, a])
    }
  }
}

/**
 * Sets the value of the `XTRef` and returns the old value.
 *
 * @ets_data_first getAndSet_
 */
export function getAndSet<A>(
  a: A
): <EA>(self: ETRef<EA, A>) => STM.STM<unknown, EA, A> {
  return (self) => getAndSet_(self, a)
}

/**
 * Updates the value of the variable and returns the old value.
 */
export function getAndUpdate_<EA, A>(
  self: ETRef<EA, A>,
  f: (a: A) => A
): STM.STM<unknown, EA, A> {
  concrete(self)
  switch (self._tag) {
    case "Atomic": {
      return new STMEffect((journal) => {
        const entry = getOrMakeEntry(self, journal)
        const oldValue = entry.use((_) => _.unsafeGet<A>())
        entry.use((_) => _.unsafeSet(f(oldValue)))
        return oldValue
      })
    }
    default: {
      return modify_(self, (_) => [_, f(_)])
    }
  }
}

/**
 * Updates the value of the variable and returns the old value.
 *
 * @ets_data_first getAndUpdate_
 */
export function getAndUpdate<A>(
  f: (a: A) => A
): <EA>(self: ETRef<EA, A>) => STM.STM<unknown, EA, A> {
  return (self) => getAndUpdate_(self, f)
}

/**
 * Updates some values of the variable but leaves others alone, returning the
 * old value.
 */
export function getAndUpdateSome_<EA, A>(
  self: ETRef<EA, A>,
  f: (a: A) => O.Option<A>
): STM.STM<unknown, EA, A> {
  concrete(self)
  switch (self._tag) {
    case "Atomic": {
      return new STMEffect((journal) => {
        const entry = getOrMakeEntry(self, journal)
        const oldValue = entry.use((_) => _.unsafeGet<A>())
        const v = f(oldValue)
        if (O.isSome(v)) {
          entry.use((_) => _.unsafeSet(v.value))
        }
        return oldValue
      })
    }
    default: {
      return modify_(self, (_) =>
        O.fold_(
          f(_),
          () => [_, _],
          (v) => [_, v]
        )
      )
    }
  }
}

/**
 * Updates some values of the variable but leaves others alone, returning the
 * old value.
 *
 * @ets_data_first getAndUpdateSome_
 */
export function getAndUpdateSome<A>(
  f: (a: A) => O.Option<A>
): <EA>(self: ETRef<EA, A>) => STM.STM<unknown, EA, A> {
  return (self) => getAndUpdateSome_(self, f)
}

/**
 * Sets the value of the `XTRef`.
 *
 * @ets_data_first set_
 */
export function set<A>(
  a: A
): <EA, EB, B>(self: XTRef<EA, EB, A, B>) => STM.STM<unknown, EA, void> {
  return (self) => set_(self, a)
}

/**
 * Updates the value of the variable.
 */
export function update_<E, A>(
  self: ETRef<E, A>,
  f: (a: A) => A
): STM.STM<unknown, E, void> {
  concrete(self)
  switch (self._tag) {
    case "Atomic": {
      return new STMEffect((journal) => {
        const entry = getOrMakeEntry(self, journal)
        const newValue = f(entry.use((_) => _.unsafeGet<A>()))
        entry.use((_) => _.unsafeSet(newValue))
      })
    }
    default:
      return modify_(self, (a) => [undefined, f(a)])
  }
}

/**
 * Updates the value of the variable.
 *
 * @ets_data_first update_
 */
export function update<A>(
  f: (a: A) => A
): <E>(self: ETRef<E, A>) => STM.STM<unknown, E, void> {
  return (self) => update_(self, f)
}

/**
 * Updates some values of the variable but leaves others alone.
 */
export function updateSome_<E, A>(
  self: ETRef<E, A>,
  f: (a: A) => O.Option<A>
): STM.STM<unknown, E, void> {
  return update_(self, (a) => O.fold_(f(a), () => a, identity))
}

/**
 * Updates some values of the variable but leaves others alone.
 *
 * @ets_data_first updateSome_
 */
export function updateSome<A>(
  f: (a: A) => O.Option<A>
): <E>(self: ETRef<E, A>) => STM.STM<unknown, E, void> {
  return (self) => updateSome_(self, f)
}

/**
 * Updates some values of the variable but leaves others alone.
 */
export function updateSomeAndGet_<E, A>(
  self: ETRef<E, A>,
  f: (a: A) => O.Option<A>
): STM.STM<unknown, E, A> {
  return updateAndGet_(self, (a) => O.fold_(f(a), () => a, identity))
}

/**
 * Updates some values of the variable but leaves others alone.
 *
 * @ets_data_first updateSomeAndGet_
 */
export function updateSomeAndGet<A>(
  f: (a: A) => O.Option<A>
): <E>(self: ETRef<E, A>) => STM.STM<unknown, E, A> {
  return (self) => updateSomeAndGet_(self, f)
}

/**
 * Updates the value of the variable and returns the new value.
 */
export function updateAndGet_<EA, A>(
  self: ETRef<EA, A>,
  f: (a: A) => A
): STM.STM<unknown, EA, A> {
  concrete(self)
  switch (self._tag) {
    case "Atomic": {
      return new STMEffect((journal) => {
        const entry = getOrMakeEntry(self, journal)
        const oldValue = entry.use((_) => _.unsafeGet<A>())
        const x = f(oldValue)
        entry.use((_) => _.unsafeSet(x))
        return x
      })
    }
    default: {
      return modify_(self, (_) => {
        const x = f(_)
        return [x, x]
      })
    }
  }
}

/**
 * Updates the value of the variable and returns the new value.
 *
 * @ets_data_first getAndUpdate_
 */
export function updateAndGet<A>(
  f: (a: A) => A
): <EA>(self: ETRef<EA, A>) => STM.STM<unknown, EA, A> {
  return (self) => updateAndGet_(self, f)
}

/**
 * @ets_optimize remove
 */
export function concrete<EA, EB, A, B>(
  _: XTRef<EA, EB, A, B>
): asserts _ is
  | Atomic<any>
  | Derived<any, any, any, any, any>
  | DerivedAll<any, any, any, any, any> {
  //
}

/**
 * Makes a new `XTRef` that is initialized to the specified value.
 */
export function makeWith<A>(a: () => A): STM.STM<unknown, never, TRef<A>> {
  return new STMEffect((journal) => {
    const value = a()
    const versioned = new Versioned(value)
    const todo = new AtomicReference(emptyTodoMap)
    const tref = new Atomic(versioned, todo)
    journal.set(tref, makeEntry(tref, true))
    return tref
  })
}

/**
 * Makes a new `XTRef` that is initialized to the specified value.
 */
export function make<A>(a: A): STM.STM<unknown, never, TRef<A>> {
  return new STMEffect((journal) => {
    const value = a
    const versioned = new Versioned(value)
    const todo = new AtomicReference(emptyTodoMap)
    const tref = new Atomic(versioned, todo)
    journal.set(tref, makeEntry(tref, true))
    return tref
  })
}

/**
 * Unsafely makes a new `XTRef` that is initialized to the specified value.
 */
export function unsafeMake<A>(a: A): TRef<A> {
  const value = a
  const versioned = new Versioned(value)
  const todo = new AtomicReference(emptyTodoMap)
  return new Atomic(versioned, todo)
}

/**
 * Makes a new `XTRef` that is initialized to the specified value.
 */
export function makeCommitWith<A>(a: () => A): T.UIO<TRef<A>> {
  return STM.commit(makeWith(a))
}

/**
 * Makes a new `XTRef` that is initialized to the specified value.
 */
export function makeCommit<A>(a: A): T.UIO<TRef<A>> {
  return STM.commit(make(a))
}

/**
 * Folds over the error and value types of the `XTRef`. This is a highly
 * polymorphic method that is capable of arbitrarily transforming the error
 * and value types of the `XTRef`. For most use cases one of the more
 * specific combinators implemented in terms of `fold` will be more ergonomic
 * but this method is extremely useful for implementing new combinators.
 */
export function fold_<EA, EB, A, B, EC, ED, C, D>(
  self: XTRef<EA, EB, A, B>,
  ea: (ea: EA) => EC,
  eb: (ea: EB) => ED,
  ca: (c: C) => E.Either<EC, A>,
  bd: (b: B) => E.Either<ED, D>
): XTRef<EC, ED, C, D> {
  return self.fold(ea, eb, ca, bd)
}

/**
 * Folds over the error and value types of the `XTRef`. This is a highly
 * polymorphic method that is capable of arbitrarily transforming the error
 * and value types of the `XTRef`. For most use cases one of the more
 * specific combinators implemented in terms of `fold` will be more ergonomic
 * but this method is extremely useful for implementing new combinators.
 *
 * @ets_data_first fold_
 */
export function fold<EA, EB, A, B, EC, ED, C, D>(
  ea: (ea: EA) => EC,
  eb: (ea: EB) => ED,
  ca: (c: C) => E.Either<EC, A>,
  bd: (b: B) => E.Either<ED, D>
): (self: XTRef<EA, EB, A, B>) => XTRef<EC, ED, C, D> {
  return (self) => fold_(self, ea, eb, ca, bd)
}

/**
 * Folds over the error and value types of the `XTRef`, allowing access to
 * the state in transforming the `set` value. This is a more powerful version
 * of `fold` but requires unifying the error types.
 */
export function foldAll_<EA, EB, A, B, EC, ED, C, D>(
  self: XTRef<EA, EB, A, B>,
  ea: (ea: EA) => EC,
  eb: (ea: EB) => ED,
  ec: (ea: EB) => EC,
  ca: (c: C) => (b: B) => E.Either<EC, A>,
  bd: (b: B) => E.Either<ED, D>
): XTRef<EC, ED, C, D> {
  return self.foldAll(ea, eb, ec, ca, bd)
}

/**
 * Folds over the error and value types of the `XTRef`, allowing access to
 * the state in transforming the `set` value. This is a more powerful version
 * of `fold` but requires unifying the error types.
 *
 * @ets_data_first foldAll_
 */
export function foldAll<EA, EB, A, B, EC, ED, C, D>(
  ea: (ea: EA) => EC,
  eb: (ea: EB) => ED,
  ec: (ea: EB) => EC,
  ca: (c: C) => (b: B) => E.Either<EC, A>,
  bd: (b: B) => E.Either<ED, D>
): (self: XTRef<EA, EB, A, B>) => XTRef<EC, ED, C, D> {
  return (self) => self.foldAll(ea, eb, ec, ca, bd)
}
