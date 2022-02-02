// ets_tracing: off

import type { Ref } from "../Ref/XRef.js"
import * as semaphore from "../Semaphore/index.js"
import * as T from "./effect.js"

/**
 * A `XRefM[RA, RB, EA, EB, A, B]` is a polymorphic, purely functional
 * description of a mutable reference. The fundamental operations of a `XRefM`
 * are `set` and `get`. `set` takes a value of type `A` and sets the reference
 * to a new value, requiring an environment of type `RA` and potentially
 * failing with an error of type `EA`. `get` gets the current value of the
 * reference and returns a value of type `B`, requiring an environment of type
 * `RB` and potentially failing with an error of type `EB`.
 *
 * When the error and value types of the `XRefM` are unified, that is, it is a
 * `XRefM<R, R, E, E, A, A>`, the `XRefM` also supports atomic `modify` and
 * `update` operations.
 *
 * Unlike an ordinary `ZRef`, a `XRefM` allows performing effects within update
 * operations, at some cost to performance. Writes will semantically block
 * other writers, while multiple readers can read simultaneously.
 */
export interface XRefM<RA, RB, EA, EB, A, B> {
  readonly _RA: (_: RA) => void
  readonly _RB: (_: RB) => void
  readonly _EA: () => EA
  readonly _EB: () => EB
  readonly _A: (_: A) => void
  readonly _B: () => B

  /**
   * Folds over the error and value types of the `XRefM`. This is a highly
   * polymorphic method that is capable of arbitrarily transforming the error
   * and value types of the `XRefM`. For most use cases one of the more
   * specific combinators implemented in terms of `foldM` will be more
   * ergonomic but this method is extremely useful for implementing new
   * combinators.
   */
  readonly foldM: <RC, RD, EC, ED, C, D>(
    ea: (_: EA) => EC,
    eb: (_: EB) => ED,
    ca: (_: C) => T.Effect<RC, EC, A>,
    bd: (_: B) => T.Effect<RD, ED, D>
  ) => XRefM<RA & RC, RB & RD, EC, ED, C, D>

  /**
   * Folds over the error and value types of the `XRefM`, allowing access to
   * the state in transforming the `set` value. This is a more powerful version
   * of `foldM` but requires unifying the environment and error types.
   */
  readonly foldAllM: <RC, RD, EC, ED, C, D>(
    ea: (_: EA) => EC,
    eb: (_: EB) => ED,
    ec: (_: EB) => EC,
    ca: (_: C) => (_: B) => T.Effect<RC, EC, A>,
    bd: (_: B) => T.Effect<RD, ED, D>
  ) => XRefM<RB & RA & RC, RB & RD, EC, ED, C, D>

  /**
   * Reads the value from the `XRefM`.
   */
  readonly get: T.Effect<RB, EB, B>

  /**
   * Writes a new value to the `XRefM`, with a guarantee of immediate
   * consistency (at some cost to performance).
   */
  readonly set: (a: A) => T.Effect<RA, EA, void>
}

export class AtomicM<A> implements XRefM<unknown, unknown, never, never, A, A> {
  readonly _tag = "AtomicM"

  readonly _RA!: (_: unknown) => void
  readonly _RB!: (_: unknown) => void
  readonly _EA!: () => never
  readonly _EB!: () => never
  readonly _A!: (_: A) => void
  readonly _B!: () => A

  constructor(readonly ref: Ref<A>, readonly semaphore: semaphore.Semaphore) {
    this.foldM = this.foldM.bind(this)
    this.foldAllM = this.foldAllM.bind(this)
    this.set = this.set.bind(this)
  }

  foldM<RC, RD, EC, ED, C, D>(
    _ea: (_: never) => EC,
    _eb: (_: never) => ED,
    ca: (_: C) => T.Effect<RC, EC, A>,
    bd: (_: A) => T.Effect<RD, ED, D>
  ): XRefM<RC, RD, EC, ED, C, D> {
    return new DerivedM<RC, RD, EC, ED, C, D>((f) =>
      f(
        this,
        (s) => bd(s),
        (a) => ca(a)
      )
    )
  }

  foldAllM<RC, RD, EC, ED, C, D>(
    _ea: (_: never) => EC,
    _eb: (_: never) => ED,
    _ec: (_: never) => EC,
    ca: (_: C) => (_: A) => T.Effect<RC, EC, A>,
    bd: (_: A) => T.Effect<RD, ED, D>
  ): XRefM<RC, RD, EC, ED, C, D> {
    return new DerivedAllM<RC, RD, EC, ED, C, D>((f) =>
      f(
        this,
        (s) => bd(s),
        (a) => (s) => ca(a)(s)
      )
    )
  }

  get get(): T.Effect<unknown, never, A> {
    return this.ref.get
  }

  set(a: A): T.Effect<unknown, never, void> {
    return semaphore.withPermit(this.semaphore)(this.ref.set(a))
  }
}

export class DerivedM<RA, RB, EA, EB, A, B> implements XRefM<RA, RB, EA, EB, A, B> {
  readonly _tag = "DerivedM"

  readonly _RA!: (_: RA) => void
  readonly _RB!: (_: RB) => void
  readonly _EA!: () => EA
  readonly _EB!: () => EB
  readonly _A!: (_: A) => void
  readonly _B!: () => B

  constructor(
    readonly use: <X>(
      f: <S>(
        value: AtomicM<S>,
        getEither: (s: S) => T.Effect<RB, EB, B>,
        setEither: (a: A) => T.Effect<RA, EA, S>
      ) => X
    ) => X
  ) {
    this.foldM = this.foldM.bind(this)
    this.foldAllM = this.foldAllM.bind(this)
    this.set = this.set.bind(this)
  }

  foldM<RC, RD, EC, ED, C, D>(
    ea: (_: EA) => EC,
    eb: (_: EB) => ED,
    ca: (_: C) => T.Effect<RC, EC, A>,
    bd: (_: B) => T.Effect<RD, ED, D>
  ): XRefM<RA & RC, RB & RD, EC, ED, C, D> {
    return this.use(
      (value, getEither, setEither) =>
        new DerivedM<RA & RC, RB & RD, EC, ED, C, D>((f) =>
          f(
            value,
            (s) =>
              T.foldM_(
                getEither(s),
                (e) => T.fail(eb(e)),
                (a) => bd(a)
              ),
            (a) => T.chain_(ca(a), (a) => T.mapError_(setEither(a), ea))
          )
        )
    )
  }

  foldAllM<RC, RD, EC, ED, C, D>(
    ea: (_: EA) => EC,
    eb: (_: EB) => ED,
    ec: (_: EB) => EC,
    ca: (_: C) => (_: B) => T.Effect<RC, EC, A>,
    bd: (_: B) => T.Effect<RD, ED, D>
  ): XRefM<RB & RA & RC, RB & RD, EC, ED, C, D> {
    return this.use(
      (value, getEither, setEither) =>
        new DerivedAllM<RB & RA & RC, RB & RD, EC, ED, C, D>((f) =>
          f(
            value,
            (s) =>
              T.foldM_(
                getEither(s),
                (e) => T.fail(eb(e)),
                (a) => bd(a)
              ),
            (c) => (s) =>
              T.chain_(
                T.foldM_(getEither(s), (e) => T.fail(ec(e)), ca(c)),
                (a) => T.mapError_(setEither(a), ea)
              )
          )
        )
    )
  }

  get get(): T.Effect<RB, EB, B> {
    return this.use((value, getEither) => T.chain_(value.get, (a) => getEither(a)))
  }

  set(a: A): T.Effect<RA, EA, void> {
    return this.use((value, _, setEither) =>
      semaphore.withPermit(value.semaphore)(T.chain_(setEither(a), (a) => value.set(a)))
    )
  }
}

export class DerivedAllM<RA, RB, EA, EB, A, B> implements XRefM<RA, RB, EA, EB, A, B> {
  readonly _tag = "DerivedAllM"

  readonly _RA!: (_: RA) => void
  readonly _RB!: (_: RB) => void
  readonly _EA!: () => EA
  readonly _EB!: () => EB
  readonly _A!: (_: A) => void
  readonly _B!: () => B

  constructor(
    readonly use: <X>(
      f: <S>(
        value: AtomicM<S>,
        getEither: (s: S) => T.Effect<RB, EB, B>,
        setEither: (a: A) => (s: S) => T.Effect<RA, EA, S>
      ) => X
    ) => X
  ) {
    this.foldM = this.foldM.bind(this)
    this.foldAllM = this.foldAllM.bind(this)
    this.set = this.set.bind(this)
  }

  foldM<RC, RD, EC, ED, C, D>(
    ea: (_: EA) => EC,
    eb: (_: EB) => ED,
    ca: (_: C) => T.Effect<RC, EC, A>,
    bd: (_: B) => T.Effect<RD, ED, D>
  ): XRefM<RA & RC, RB & RD, EC, ED, C, D> {
    return this.use(
      (value, getEither, setEither) =>
        new DerivedAllM<RA & RC, RB & RD, EC, ED, C, D>((f) =>
          f(
            value,
            (s) =>
              T.foldM_(
                getEither(s),
                (e) => T.fail(eb(e)),
                (a) => bd(a)
              ),
            (a) => (s) => T.chain_(ca(a), (a) => T.mapError_(setEither(a)(s), ea))
          )
        )
    )
  }

  foldAllM<RC, RD, EC, ED, C, D>(
    ea: (_: EA) => EC,
    eb: (_: EB) => ED,
    ec: (_: EB) => EC,
    ca: (_: C) => (_: B) => T.Effect<RC, EC, A>,
    bd: (_: B) => T.Effect<RD, ED, D>
  ): XRefM<RB & RA & RC, RB & RD, EC, ED, C, D> {
    return this.use(
      (value, getEither, setEither) =>
        new DerivedAllM<RB & RA & RC, RB & RD, EC, ED, C, D>((f) =>
          f(
            value,
            (s) =>
              T.foldM_(
                getEither(s),
                (e) => T.fail(eb(e)),
                (a) => bd(a)
              ),
            (c) => (s) =>
              T.chain_(
                T.foldM_(getEither(s), (e) => T.fail(ec(e)), ca(c)),
                (a) => T.mapError_(setEither(a)(s), ea)
              )
          )
        )
    )
  }

  get get(): T.Effect<RB, EB, B> {
    return this.use((value, getEither) => T.chain_(value.get, (a) => getEither(a)))
  }

  set(a: A): T.Effect<RA, EA, void> {
    return this.use((value, _, setEither) =>
      semaphore.withPermit(value.semaphore)(
        T.chain_(T.chain_(value.get, setEither(a)), (a) => value.set(a))
      )
    )
  }
}

export interface RefM<A> extends XRefM<unknown, unknown, never, never, A, A> {}

export const concrete = <RA, RB, EA, EB, A, B>(_: XRefM<RA, RB, EA, EB, A, B>) =>
  _ as
    | AtomicM<A | B>
    | DerivedM<RA, RB, EA, EB, A, B>
    | DerivedAllM<RA, RB, EA, EB, A, B>
