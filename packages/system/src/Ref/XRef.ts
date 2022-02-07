// ets_tracing: off

import * as Tp from "../Collections/Immutable/Tuple/index.js"
import * as E from "../Either/index.js"
import { pipe } from "../Function/index.js"
import type { AtomicReference } from "../Support/AtomicReference/index.js"
import * as atomic from "./atomic.js"
import * as T from "./effect.js"

export const TypeId = Symbol()
export type TypeId = typeof TypeId

/**
 * A `XRef<EA, EB, A, B>` is a polymorphic, purely functional
 * description of a mutable reference. The fundamental operations of a `XRef`
 * are `set` and `get`. `set` takes a value of type `A` and sets the reference
 * to a new value, potentially failing with an error of type `EA`.
 * `get` gets the current value of the reference and returns a value of type `B`,
 * potentially failing with an error of type `EB`.
 *
 * When the error and value types of the `XRef` are unified, that is, it is a
 * `XRef[E, E, A, A]`, the `XRef` also supports atomic `modify` and
 * `update` operations.
 *
 * By default, `XRef` is implemented in terms of compare and swap operations
 * for maximum performance and does not support performing effects within
 * update operations. If you need to perform effects within update operations
 * you can create a `XRefM`, a specialized type of `XRef` that supports
 * performing effects within update operations at some cost to performance. In
 * this case writes will semantically block other writers, while multiple
 * readers can read simultaneously.
 *
 * NOTE: While `XRef` provides the functional equivalent of a mutable
 * reference, the value inside the `XRef` should normally be immutable.
 */
export interface XRef<EA, EB, A, B> {
  readonly _typeId: TypeId
  readonly _EA: () => EA
  readonly _EB: () => EB
  readonly _A: (_: A) => void
  readonly _B: () => B

  /**
   * Folds over the error and value types of the `XRef`. This is a highly
   * polymorphic method that is capable of arbitrarily transforming the error
   * and value types of the `XRef`. For most use cases one of the more specific
   * combinators implemented in terms of `fold` will be more ergonomic but this
   * method is extremely useful for implementing new combinators.
   */
  readonly fold: <EC, ED, C, D>(
    ea: (_: EA) => EC,
    eb: (_: EB) => ED,
    ca: (_: C) => E.Either<EC, A>,
    bd: (_: B) => E.Either<ED, D>
  ) => XRef<EC, ED, C, D>

  /**
   * Folds over the error and value types of the `XRef`, allowing access to
   * the state in transforming the `set` value. This is a more powerful version
   * of `fold` but requires unifying the error types.
   */
  readonly foldAll: <EC, ED, C, D>(
    ea: (_: EA) => EC,
    eb: (_: EB) => ED,
    ec: (_: EB) => EC,
    ca: (_: C) => (_: B) => E.Either<EC, A>,
    bd: (_: B) => E.Either<ED, D>
  ) => XRef<EC, ED, C, D>

  /**
   * Reads the value from the `XRef`.
   */
  readonly get: T.IO<EB, B>

  /**
   * Writes a new value to the `XRef`, with a guarantee of immediate
   * consistency (at some cost to performance).
   */
  readonly set: (a: A) => T.IO<EA, void>
}

export class Atomic<A> implements XRef<never, never, A, A> {
  readonly _tag = "Atomic"
  readonly _typeId: TypeId = TypeId
  readonly _EA!: () => never
  readonly _EB!: () => never
  readonly _A!: (_: A) => void
  readonly _B!: () => A

  constructor(readonly value: AtomicReference<A>) {
    this.fold = this.fold.bind(this)
    this.foldAll = this.foldAll.bind(this)
    this.set = this.set.bind(this)
  }

  fold<EC, ED, C, D>(
    _ea: (_: never) => EC,
    _eb: (_: never) => ED,
    ca: (_: C) => E.Either<EC, A>,
    bd: (_: A) => E.Either<ED, D>
  ): XRef<EC, ED, C, D> {
    return new Derived<EC, ED, C, D>((f) =>
      f(
        this,
        (s) => bd(s),
        (c) => ca(c)
      )
    )
  }

  foldAll<EC, ED, C, D>(
    _ea: (_: never) => EC,
    _eb: (_: never) => ED,
    _ec: (_: never) => EC,
    ca: (_: C) => (_: A) => E.Either<EC, A>,
    bd: (_: A) => E.Either<ED, D>
  ): XRef<EC, ED, C, D> {
    return new DerivedAll<EC, ED, C, D>((f) =>
      f(
        this,
        (s) => bd(s),
        (c) => (s) => ca(c)(s)
      )
    )
  }

  get get(): T.UIO<A> {
    return T.succeedWith(() => this.value.get)
  }

  set(a: A): T.UIO<void> {
    return T.succeedWith(() => {
      this.value.set(a)
    })
  }
}

export class Derived<EA, EB, A, B> implements XRef<EA, EB, A, B> {
  readonly _tag = "Derived"
  readonly _typeId: TypeId = TypeId
  readonly _EA!: () => EA
  readonly _EB!: () => EB
  readonly _A!: (_: A) => void
  readonly _B!: () => B

  constructor(
    readonly use: <X>(
      f: <S>(
        value: Atomic<S>,
        getEither: (s: S) => E.Either<EB, B>,
        setEither: (a: A) => E.Either<EA, S>
      ) => X
    ) => X
  ) {
    this.fold = this.fold.bind(this)
    this.foldAll = this.foldAll.bind(this)
    this.set = this.set.bind(this)
  }

  fold<EC, ED, C, D>(
    ea: (_: EA) => EC,
    eb: (_: EB) => ED,
    ca: (_: C) => E.Either<EC, A>,
    bd: (_: B) => E.Either<ED, D>
  ): XRef<EC, ED, C, D> {
    return this.use(
      (value, getEither, setEither) =>
        new Derived<EC, ED, C, D>((f) =>
          f(
            value,
            (s) => E.fold_(getEither(s), (e) => E.left(eb(e)), bd),
            (c) =>
              E.chain_(ca(c), (a) =>
                E.fold_(setEither(a), (e) => E.left(ea(e)), E.right)
              )
          )
        )
    )
  }

  foldAll<EC, ED, C, D>(
    ea: (_: EA) => EC,
    eb: (_: EB) => ED,
    ec: (_: EB) => EC,
    ca: (_: C) => (_: B) => E.Either<EC, A>,
    _bd: (_: B) => E.Either<ED, D>
  ): XRef<EC, ED, C, D> {
    return this.use(
      (value, getEither, setEither) =>
        new DerivedAll<EC, ED, C, D>((f) =>
          f(
            value,
            (s) =>
              E.fold_(getEither(s), (e) => E.left(eb(e)), E.right) as E.Either<ED, D>,
            (c) => (s) =>
              pipe(
                getEither(s),
                E.fold((e) => E.widenA<A>()(E.left(ec(e))), ca(c)),
                E.chain((a) =>
                  pipe(
                    setEither(a),
                    E.fold((e) => E.left(ea(e)), E.right)
                  )
                )
              )
          )
        )
    )
  }

  get get(): T.IO<EB, B> {
    return this.use((value, getEither) =>
      pipe(
        value.get,
        T.chain((s) => E.fold_(getEither(s), T.fail, T.succeed))
      )
    )
  }

  set(a: A): T.IO<EA, void> {
    return this.use((value, _, setEither) => E.fold_(setEither(a), T.fail, value.set))
  }
}

export class DerivedAll<EA, EB, A, B> implements XRef<EA, EB, A, B> {
  readonly _tag = "DerivedAll"
  readonly _typeId: TypeId = TypeId
  readonly _EA!: () => EA
  readonly _EB!: () => EB
  readonly _A!: (_: A) => void
  readonly _B!: () => B

  constructor(
    readonly use: <X>(
      f: <S>(
        value: Atomic<S>,
        getEither: (s: S) => E.Either<EB, B>,
        setEither: (a: A) => (s: S) => E.Either<EA, S>
      ) => X
    ) => X
  ) {
    this.fold = this.fold.bind(this)
    this.foldAll = this.foldAll.bind(this)
    this.set = this.set.bind(this)
  }

  fold<EC, ED, C, D>(
    ea: (_: EA) => EC,
    eb: (_: EB) => ED,
    ca: (_: C) => E.Either<EC, A>,
    bd: (_: B) => E.Either<ED, D>
  ): XRef<EC, ED, C, D> {
    return this.use(
      (value, getEither, setEither) =>
        new DerivedAll((f) =>
          f(
            value,
            (s) => E.fold_(getEither(s), (e) => E.left(eb(e)), bd),
            (c) => (s) =>
              E.chain_(ca(c), (a) =>
                E.fold_(setEither(a)(s), (e) => E.left(ea(e)), E.right)
              )
          )
        )
    )
  }

  foldAll<EC, ED, C, D>(
    ea: (_: EA) => EC,
    eb: (_: EB) => ED,
    ec: (_: EB) => EC,
    ca: (_: C) => (_: B) => E.Either<EC, A>,
    bd: (_: B) => E.Either<ED, D>
  ): XRef<EC, ED, C, D> {
    return this.use(
      (value, getEither, setEither) =>
        new DerivedAll((f) =>
          f(
            value,
            (s) => E.fold_(getEither(s), (e) => E.left(eb(e)), bd),
            (c) => (s) =>
              pipe(
                getEither(s),
                E.fold((e) => E.widenA<A>()(E.left(ec(e))), ca(c)),
                E.chain((a) => E.fold_(setEither(a)(s), (e) => E.left(ea(e)), E.right))
              )
          )
        )
    )
  }

  get get(): T.IO<EB, B> {
    return this.use((value, getEither) =>
      pipe(
        value.get,
        T.chain((a) => E.fold_(getEither(a), T.fail, T.succeed))
      )
    )
  }

  set(a: A): T.IO<EA, void> {
    return this.use((value, _, setEither) =>
      pipe(
        atomic.modify(value, (s) =>
          E.fold_(
            setEither(a)(s),
            (e) => Tp.tuple(E.leftW<EA, void>(e), s),
            (s) => Tp.tuple(E.right(undefined), s)
          )
        ),
        T.absolve
      )
    )
  }
}

/**
 * A Ref that cannot fail and requires no environment
 */
export interface Ref<A> extends XRef<never, never, A, A> {}

/**
 * Cast to a sealed union in case of ERef (where it make sense)
 *
 * @ets_optimize identity
 */
export function concrete<EA, EB, A, B>(self: XRef<EA, EB, A, B>) {
  return self as Atomic<A | B> | DerivedAll<EA, EB, A, B> | Derived<EA, EB, A, A>
}
