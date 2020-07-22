import { Ref } from "../Ref/XRef"
import { Semaphore, withPermit } from "../Semaphore"

import * as T from "./effect"

/**
 * A `XRefM<RA, RB, EA, EB, A, B>` is a polymorphic, purely functional
 * description of a mutable reference. The fundamental operations of a `XRefM`
 * are `set` and `get`. `set` takes a value of type `A` and sets the reference
 * to a new value, requiring an environment of type `RA` and potentially
 * failing with an error of type `EA`. `get` gets the current value of the
 * reference and returns a value of type `B`, requiring an environment of type
 * `RB` and potentially failing with an error of type `EB`.
 *
 * When the error and value types of the `XRefM` are unified, that is, it is a
 * `XRefM[E, E, A, A]`, the `XRefM` also supports atomic `modify` and `update`
 * operations.
 *
 * Unlike `ZRef`, `XRefM` allows performing effects within update operations,
 * at some cost to performance. Writes will semantically block other writers,
 * while multiple readers can read simultaneously.
 */
export interface XRefM<RA, RB, EA, EB, A, B> {
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
    ca: (_: C) => T.AsyncRE<RC, EC, A>,
    bd: (_: B) => T.AsyncRE<RD, ED, D>
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
    ca: (_: C) => (_: B) => T.AsyncRE<RC, EC, A>,
    bd: (_: B) => T.AsyncRE<RD, ED, D>
  ) => XRefM<RB & RA & RC, RB & RD, EC, ED, C, D>

  /**
   * Reads the value from the `XRefM`.
   */
  readonly get: T.AsyncRE<RB, EB, B>

  /**
   * Writes a new value to the `XRefM`, with a guarantee of immediate
   * consistency (at some cost to performance).
   */
  readonly set: (a: A) => T.AsyncRE<RA, EA, void>
}

export class Atomic<A> implements XRefM<unknown, unknown, never, never, A, A> {
  readonly _tag = "Atomic"

  constructor(readonly ref: Ref<A>, readonly semaphore: Semaphore) {}

  readonly foldM = <RC, RD, EC, ED, C, D>(
    _ea: (_: never) => EC,
    _eb: (_: never) => ED,
    ca: (_: C) => T.AsyncRE<RC, EC, A>,
    bd: (_: A) => T.AsyncRE<RD, ED, D>
  ): XRefM<RC, RD, EC, ED, C, D> =>
    new Derived<RC, RD, EC, ED, C, D, A>(
      this,
      (s) => bd(s),
      (a) => ca(a)
    )

  readonly foldAllM = <RC, RD, EC, ED, C, D>(
    _ea: (_: never) => EC,
    _eb: (_: never) => ED,
    _ec: (_: never) => EC,
    ca: (_: C) => (_: A) => T.AsyncRE<RC, EC, A>,
    bd: (_: A) => T.AsyncRE<RD, ED, D>
  ): XRefM<RC, RD, EC, ED, C, D> =>
    new DerivedAll<RC, RD, EC, ED, C, D, A>(
      this,
      (s) => bd(s),
      (a) => (s) => ca(a)(s)
    )

  readonly get: T.AsyncRE<unknown, never, A> = this.ref.get

  readonly set: (a: A) => T.AsyncRE<unknown, never, void> = (a) =>
    withPermit(this.semaphore)(this.set(a))
}

export class Derived<RA, RB, EA, EB, A, B, S> implements XRefM<RA, RB, EA, EB, A, B> {
  readonly _tag = "Derived"

  constructor(
    readonly value: Atomic<S>,
    readonly getEither: (s: S) => T.AsyncRE<RB, EB, B>,
    readonly setEither: (a: A) => T.AsyncRE<RA, EA, S>
  ) {}

  readonly foldM = <RC, RD, EC, ED, C, D>(
    ea: (_: EA) => EC,
    eb: (_: EB) => ED,
    ca: (_: C) => T.AsyncRE<RC, EC, A>,
    bd: (_: B) => T.AsyncRE<RD, ED, D>
  ): XRefM<RA & RC, RB & RD, EC, ED, C, D> =>
    new Derived<RA & RC, RB & RD, EC, ED, C, D, S>(
      this.value,
      (s) =>
        T.foldM_(
          this.getEither(s),
          (e) => T.fail(eb(e)),
          (a) => bd(a)
        ),
      (a) => T.chain_(ca(a), (a) => T.mapError_(this.setEither(a), ea))
    )

  readonly foldAllM = <RC, RD, EC, ED, C, D>(
    ea: (_: EA) => EC,
    eb: (_: EB) => ED,
    ec: (_: EB) => EC,
    ca: (_: C) => (_: B) => T.AsyncRE<RC, EC, A>,
    bd: (_: B) => T.AsyncRE<RD, ED, D>
  ): XRefM<RB & RA & RC, RB & RD, EC, ED, C, D> =>
    new DerivedAll<RB & RA & RC, RB & RD, EC, ED, C, D, S>(
      this.value,
      (s) =>
        T.foldM_(
          this.getEither(s),
          (e) => T.fail(eb(e)),
          (a) => bd(a)
        ),
      (c) => (s) =>
        T.chain_(
          T.foldM_(this.getEither(s), (e) => T.fail(ec(e)), ca(c)),
          (a) => T.mapError_(this.setEither(a), ea)
        )
    )

  get: T.AsyncRE<RB, EB, B> = T.chain_(this.value.get, (a) => this.getEither(a))

  set: (a: A) => T.AsyncRE<RA, EA, void> = (a) =>
    withPermit(this.value.semaphore)(
      T.chain_(this.setEither(a), (a) => this.value.set(a))
    )
}

export class DerivedAll<RA, RB, EA, EB, A, B, S>
  implements XRefM<RA, RB, EA, EB, A, B> {
  readonly _tag = "DerivedAll"

  constructor(
    readonly value: Atomic<S>,
    readonly getEither: (s: S) => T.AsyncRE<RB, EB, B>,
    readonly setEither: (a: A) => (s: S) => T.AsyncRE<RA, EA, S>
  ) {}

  readonly foldM = <RC, RD, EC, ED, C, D>(
    ea: (_: EA) => EC,
    eb: (_: EB) => ED,
    ca: (_: C) => T.AsyncRE<RC, EC, A>,
    bd: (_: B) => T.AsyncRE<RD, ED, D>
  ): XRefM<RA & RC, RB & RD, EC, ED, C, D> =>
    new DerivedAll<RA & RC, RB & RD, EC, ED, C, D, S>(
      this.value,
      (s) =>
        T.foldM_(
          this.getEither(s),
          (e) => T.fail(eb(e)),
          (a) => bd(a)
        ),
      (a) => (s) => T.chain_(ca(a), (a) => T.mapError_(this.setEither(a)(s), ea))
    )

  readonly foldAllM = <RC, RD, EC, ED, C, D>(
    ea: (_: EA) => EC,
    eb: (_: EB) => ED,
    ec: (_: EB) => EC,
    ca: (_: C) => (_: B) => T.AsyncRE<RC, EC, A>,
    bd: (_: B) => T.AsyncRE<RD, ED, D>
  ): XRefM<RB & RA & RC, RB & RD, EC, ED, C, D> =>
    new DerivedAll<RB & RA & RC, RB & RD, EC, ED, C, D, S>(
      this.value,
      (s) =>
        T.foldM_(
          this.getEither(s),
          (e) => T.fail(eb(e)),
          (a) => bd(a)
        ),
      (c) => (s) =>
        T.chain_(
          T.foldM_(this.getEither(s), (e) => T.fail(ec(e)), ca(c)),
          (a) => T.mapError_(this.setEither(a)(s), ea)
        )
    )

  get: T.AsyncRE<RB, EB, B> = T.chain_(this.value.get, (a) => this.getEither(a))

  set: (a: A) => T.AsyncRE<RA, EA, void> = (a) =>
    withPermit(this.value.semaphore)(
      T.chain_(T.chain_(this.value.get, this.setEither(a)), (a) => this.value.set(a))
    )
}

export interface RefMRE<R, E, A> extends XRefM<R, R, E, E, A, A> {}
export interface RefME<E, A> extends XRefM<unknown, unknown, E, E, A, A> {}
export interface RefMR<R, A> extends XRefM<R, R, never, never, A, A> {}
export interface RefM<A> extends XRefM<unknown, unknown, never, never, A, A> {}

export const concrete = <RA, RB, EA, EB, A>(_: XRefM<RA, RB, EA, EB, A, A>) =>
  _ as
    | Atomic<A>
    | Derived<RA, RB, EA, EB, A, A, A>
    | DerivedAll<RA, RB, EA, EB, A, A, A>
