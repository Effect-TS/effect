// ets_tracing: off
import * as Tp from "../Collections/Immutable/Tuple/index.js"
import * as E from "../Either/index.js"
import { identity, pipe } from "../Function/index.js"
import * as T from "./excl-effect.js"

export const TypeId = Symbol()
export type TypeId = typeof TypeId

export interface XFiberRef<EA, EB, A, B> {
  /**
   * Folds over the error and value types of the `FiberRef`. This is a highly
   * polymorphic method that is capable of arbitrarily transforming the error
   * and value types of the `FiberRef`. For most use cases one of the more
   * specific combinators implemented in terms of `fold` will be more ergonomic
   * but this method is extremely useful for implementing new combinators.
   */
  readonly fold: <EC, ED, C, D>(
    ea: (_: EA) => EC,
    eb: (_: EB) => ED,
    ca: (_: C) => E.Either<EC, A>,
    bd: (_: B) => E.Either<ED, D>
  ) => XFiberRef<EC, ED, C, D>

  /**
   * Folds over the error and value types of the `FiberRef`, allowing access
   * to the state in transforming the `set` value. This is a more powerful
   * version of `fold` but requires unifying the error types.
   */
  readonly foldAll: <EC, ED, C, D>(
    ea: (_: EA) => EC,
    eb: (_: EB) => ED,
    ec: (_: EB) => EC,
    ca: (_: C) => (_: B) => E.Either<EC, A>,
    bd: (_: B) => E.Either<ED, D>
  ) => XFiberRef<EC, ED, C, D>

  /**
   * Reads the value associated with the current fiber. Returns initial value if
   * no value was `set` or inherited from parent.
   */
  readonly get: T.IO<EB, B>

  /**
   * Returns an `IO` that runs with `value` bound to the current fiber.
   *
   * Guarantees that fiber data is properly restored via `bracket`.
   */
  readonly locally: <R, EC, C>(
    value: A,
    use: T.Effect<R, EC, C>
  ) => T.Effect<R, EA | EC, C>

  /**
   * Sets the value associated with the current fiber.
   */
  readonly set: (value: A) => T.IO<EA, void>
}

export class Runtime<A> implements XFiberRef<never, never, A, A> {
  readonly _tag = "Runtime"
  readonly _typeId: TypeId = TypeId
  readonly _EA!: () => never
  readonly _EB!: () => never
  readonly _A!: (_: A) => void
  readonly _B!: () => A

  constructor(
    readonly initial: A,
    readonly fork: (_: A) => A = identity,
    readonly join: (a: A, a1: A) => A = (_, a) => a
  ) {}

  fold<EC, ED, C, D>(
    _ea: (_: never) => EC,
    _eb: (_: never) => ED,
    ca: (_: C) => E.Either<EC, A>,
    bd: (_: A) => E.Either<ED, D>
  ): XFiberRef<EC, ED, C, D> {
    return new Derived((f) => f(this, bd, ca))
  }

  foldAll<EC, ED, C, D>(
    _ea: (_: never) => EC,
    _eb: (_: never) => ED,
    _ec: (_: never) => EC,
    ca: (_: C) => (_: A) => E.Either<EC, A>,
    bd: (_: A) => E.Either<ED, D>
  ): XFiberRef<EC, ED, C, D> {
    return new DerivedAll<EC, ED, C, D>((f) =>
      f(
        this,
        (s) => bd(s),
        (c) => (s) => ca(c)(s)
      )
    )
  }

  modify<B>(f: (a: A) => Tp.Tuple<[B, A]>): T.UIO<B> {
    return new T.IFiberRefModify(this, f)
  }

  get get(): T.UIO<A> {
    return this.modify((v) => Tp.tuple(v, v))
  }

  locally<R, EC, C>(a: A, use: T.Effect<R, EC, C>): T.Effect<R, EC, C> {
    return T.chain_(this.get, (oldValue) =>
      T.bracket_(
        this.set(a),
        () => use,
        () => this.set(oldValue)
      )
    )
  }

  set(value: A): T.UIO<void> {
    return this.modify(() => Tp.tuple(undefined, value))
  }
}

export class Derived<EA, EB, A, B> implements XFiberRef<EA, EB, A, B> {
  readonly _tag = "Derived"
  readonly _typeId: TypeId = TypeId
  readonly _EA!: () => EA
  readonly _EB!: () => EB
  readonly _A!: (_: A) => void
  readonly _B!: () => B

  constructor(
    readonly use: <X>(
      f: <S>(
        value: Runtime<S>,
        getEither: (s: S) => E.Either<EB, B>,
        setEither: (a: A) => E.Either<EA, S>
      ) => X
    ) => X
  ) {}

  fold<EC, ED, C, D>(
    ea: (_: EA) => EC,
    eb: (_: EB) => ED,
    ca: (_: C) => E.Either<EC, A>,
    bd: (_: B) => E.Either<ED, D>
  ): XFiberRef<EC, ED, C, D> {
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
  ): XFiberRef<EC, ED, C, D> {
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
        T.chain((s) => pipe(getEither(s), E.fold(T.fail, T.succeed)))
      )
    )
  }

  locally<R, EC, C>(a: A, use: T.Effect<R, EC, C>): T.Effect<R, EA | EC, C> {
    return this.use((value, _getEither, setEither) =>
      T.chain_(value.get, (old) =>
        E.fold_(
          setEither(a),
          (e) => T.fail(e) as T.IO<EA | EC, never>,
          (s) =>
            pipe(
              value.set(s),
              T.bracket(
                () => use,
                () => value.set(old)
              )
            )
        )
      )
    )
  }

  set(a: A): T.IO<EA, void> {
    return this.use((value, _getEither, setEither) =>
      E.fold_(setEither(a), T.fail, (s) => value.set(s))
    )
  }
}

export class DerivedAll<EA, EB, A, B> implements XFiberRef<EA, EB, A, B> {
  readonly _tag = "DerivedAll"
  readonly _typeId: TypeId = TypeId
  readonly _EA!: () => EA
  readonly _EB!: () => EB
  readonly _A!: (_: A) => void
  readonly _B!: () => B

  constructor(
    readonly use: <X>(
      f: <S>(
        value: Runtime<S>,
        getEither: (s: S) => E.Either<EB, B>,
        setEither: (a: A) => (s: S) => E.Either<EA, S>
      ) => X
    ) => X
  ) {}

  fold<EC, ED, C, D>(
    ea: (_: EA) => EC,
    eb: (_: EB) => ED,
    ca: (_: C) => E.Either<EC, A>,
    bd: (_: B) => E.Either<ED, D>
  ): XFiberRef<EC, ED, C, D> {
    return this.use(
      (value, getEither, setEither) =>
        new DerivedAll<EC, ED, C, D>((f) =>
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
  ): XFiberRef<EC, ED, C, D> {
    return this.use(
      (value, getEither, setEither) =>
        new DerivedAll<EC, ED, C, D>((f) =>
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
        T.chain((s) => pipe(getEither(s), E.fold(T.fail, T.succeed)))
      )
    )
  }

  locally<R, EC, C>(a: A, use: T.Effect<R, EC, C>): T.Effect<R, EA | EC, C> {
    return this.use((value, _getEither, setEither) =>
      T.chain_(value.get, (old) =>
        E.fold_(
          setEither(a)(old),
          (e) => T.fail(e) as T.IO<EA | EC, never>,
          (s) =>
            pipe(
              value.set(s),
              T.bracket(
                () => use,
                () => value.set(old)
              )
            )
        )
      )
    )
  }

  set(a: A): T.IO<EA, void> {
    return this.use((value, _getEither, setEither) =>
      T.absolve(
        value.modify((s) =>
          E.fold_(
            setEither(a)(s),
            (e) => Tp.tuple(E.leftW<EA, void>(e), s),
            (s) => Tp.tuple(E.right(undefined), s)
          )
        )
      )
    )
  }
}

export interface FiberRef<A> extends XFiberRef<never, never, A, A> {}

/**
 * @ets_optimize identity
 */
export function concrete<EA, EB, A, B>(_: XFiberRef<EA, EB, A, B>) {
  return _ as Runtime<A | B> | Derived<EA, EB, A, B> | DerivedAll<EA, EB, A, B>
}
