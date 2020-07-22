import * as E from "../../Either"
import { pipe } from "../../Function"
import { absolve } from "../Effect/absolve"
import { chain } from "../Effect/chain"
import { Sync, SyncE } from "../Effect/effect"
import { effectTotal } from "../Effect/effectTotal"
import { fail } from "../Effect/fail"
import { succeedNow } from "../Effect/succeedNow"
import { AtomicReference } from "../Support/AtomicReference"

import { modify } from "./atomic"

export interface XRef<EA, EB, A, B> {
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
  readonly get: SyncE<EB, B>

  /**
   * Writes a new value to the `XRef`, with a guarantee of immediate
   * consistency (at some cost to performance).
   */
  readonly set: (a: A) => SyncE<EA, void>
}

export class Atomic<A> implements XRef<never, never, A, A> {
  readonly _tag = "Atomic"

  readonly fold = <EC, ED, C, D>(
    _ea: (_: never) => EC,
    _eb: (_: never) => ED,
    ca: (_: C) => E.Either<EC, A>,
    bd: (_: A) => E.Either<ED, D>
  ): XRef<EC, ED, C, D> =>
    new Derived<EC, ED, C, D, A>(
      this,
      (s) => bd(s),
      (c) => ca(c)
    )

  readonly foldAll = <EC, ED, C, D>(
    _ea: (_: never) => EC,
    _eb: (_: never) => ED,
    _ec: (_: never) => EC,
    ca: (_: C) => (_: A) => E.Either<EC, A>,
    bd: (_: A) => E.Either<ED, D>
  ): XRef<EC, ED, C, D> =>
    new DerivedAll<EC, ED, C, D, A>(
      this,
      (s) => bd(s),
      (c) => (s) => ca(c)(s)
    )

  constructor(readonly value: AtomicReference<A>) {}

  get get(): Sync<A> {
    return effectTotal(() => this.value.get)
  }

  readonly set = (a: A): Sync<void> => {
    return effectTotal(() => {
      this.value.set(a)
    })
  }
}

export class Derived<EA, EB, A, B, S> implements XRef<EA, EB, A, B> {
  readonly _tag = "Derived"

  constructor(
    readonly value: Atomic<S>,
    readonly getEither: (s: S) => E.Either<EB, B>,
    readonly setEither: (a: A) => E.Either<EA, S>
  ) {}

  readonly fold = <EC, ED, C, D>(
    ea: (_: EA) => EC,
    eb: (_: EB) => ED,
    ca: (_: C) => E.Either<EC, A>,
    bd: (_: B) => E.Either<ED, D>
  ): XRef<EC, ED, C, D> =>
    new Derived<EC, ED, C, D, S>(
      this.value,
      (s) => E.fold_(this.getEither(s), (e) => E.left(eb(e)), bd),
      (c) =>
        E.chain_(ca(c), (a) =>
          E.fold_(this.setEither(a), (e) => E.left(ea(e)), E.right)
        )
    )

  readonly foldAll = <EC, ED, C, D>(
    ea: (_: EA) => EC,
    eb: (_: EB) => ED,
    ec: (_: EB) => EC,
    ca: (_: C) => (_: B) => E.Either<EC, A>,
    bd: (_: B) => E.Either<ED, D>
  ): XRef<EC, ED, C, D> =>
    new DerivedAll<EC, ED, C, D, S>(
      this.value,
      (s) =>
        E.fold_(this.getEither(s), (e) => E.left(eb(e)), E.right) as E.Either<ED, D>,
      (c) => (s) =>
        pipe(
          this.getEither(s),
          E.fold((e) => E.leftW<EC, A>(ec(e)), ca(c)),
          E.chain((a) =>
            pipe(
              this.setEither(a),
              E.fold((e) => E.left(ea(e)), E.right)
            )
          )
        )
    )

  readonly get: SyncE<EB, B> = pipe(
    this.value.get,
    chain((s) => E.fold_(this.getEither(s), fail, succeedNow))
  )

  readonly set: (a: A) => SyncE<EA, void> = (a) =>
    E.fold_(this.setEither(a), fail, this.value.set)
}

export class DerivedAll<EA, EB, A, B, S> implements XRef<EA, EB, A, B> {
  readonly _tag = "DerivedAll"

  constructor(
    readonly value: Atomic<S>,
    readonly getEither: (s: S) => E.Either<EB, B>,
    readonly setEither: (a: A) => (s: S) => E.Either<EA, S>
  ) {}

  readonly fold = <EC, ED, C, D>(
    ea: (_: EA) => EC,
    eb: (_: EB) => ED,
    ca: (_: C) => E.Either<EC, A>,
    bd: (_: B) => E.Either<ED, D>
  ): XRef<EC, ED, C, D> =>
    new DerivedAll(
      this.value,
      (s) => E.fold_(this.getEither(s), (e) => E.left(eb(e)), bd),
      (c) => (s) =>
        E.chain_(ca(c), (a) =>
          E.fold_(this.setEither(a)(s), (e) => E.left(ea(e)), E.right)
        )
    )

  readonly foldAll = <EC, ED, C, D>(
    ea: (_: EA) => EC,
    eb: (_: EB) => ED,
    ec: (_: EB) => EC,
    ca: (_: C) => (_: B) => E.Either<EC, A>,
    bd: (_: B) => E.Either<ED, D>
  ): XRef<EC, ED, C, D> =>
    new DerivedAll(
      this.value,
      (s) => E.fold_(this.getEither(s), (e) => E.left(eb(e)), bd),
      (c) => (s) =>
        pipe(
          this.getEither(s),
          E.fold((e) => E.leftW<EC, A>(ec(e)), ca(c)),
          E.chain((a) => E.fold_(this.setEither(a)(s), (e) => E.left(ea(e)), E.right))
        )
    )

  readonly get: SyncE<EB, B> = pipe(
    this.value.get,
    chain((a) => E.fold_(this.getEither(a), fail, succeedNow))
  )

  readonly set: (a: A) => SyncE<EA, void> = (a) =>
    pipe(
      this.value,
      modify((s) =>
        E.fold_(
          this.setEither(a)(s),
          (e) => [E.left(e), s] as [E.Either<EA, void>, S],
          (s) => [E.right(undefined), s] as [E.Either<EA, void>, S]
        )
      ),
      absolve
    )
}

/**
 * A Ref that can fail with error E
 */
export interface ERef<E, A> extends XRef<E, E, A, A> {}

/**
 * A Ref that cannot fail
 */
export interface Ref<A> extends ERef<never, A> {}

/**
 * Cast to a sealed union in case of ERef (where it make sense)
 */
export const concrete = <EA, EB, A>(self: XRef<EA, EB, A, A>) =>
  self as Atomic<A> | DerivedAll<EA, EB, A, A, A> | Derived<EA, EB, A, A, A>
