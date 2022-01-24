import type { Either } from "../../../data/Either"
import * as S from "../../Semaphore"
import { XRefInternal } from "../definition"
import * as T from "./operations/_internal/effect"
import * as STM from "./operations/_internal/stm"

export type Synchronized<A> = XSynchronized<unknown, unknown, never, never, A, A>

/**
 * A `XRef.Synchronized<RA, RB, EA, EB, A, B>` is a polymorphic, purely
 * functional description of a mutable reference. The fundamental operations
 * of a `XRef.Synchronized` are `set` and `get`. `set` takes a value of type
 * `A` and sets the reference to a new value, requiring an environment of type
 * `RA` and potentially failing with an error of type `EA`. `get` gets the
 * current value of the reference and returns a value of type `B`, requiring
 * an environment of type `RB` and potentially failing with an error of type
 * `EB`.
 *
 * When the error and value types of the `XRef.Synchronized` are unified, that
 * is, it is a `XRef.Synchronized<R, R, E, E, A, A>`, the `XRef.Synchronized`
 * also supports atomic `modify` and `update` operations.
 *
 * Unlike an ordinary `XRef`, a `XRef.Synchronized` allows performing effects
 * within update operations, at some cost to performance. Writes will
 * semantically block other writers, while multiple readers can read
 * simultaneously.
 *
 * `XRef.Synchronized` also supports composing multiple `XRef.Synchronized`
 * values together to form a single `XRef.Synchronized` value that can be
 * atomically updated using the `zip` operator. In this case reads and writes
 * will semantically block other readers and writers.
 */
export class XSynchronized<RA, RB, EA, EB, A, B> extends XRefInternal<
  RA,
  RB,
  EA,
  EB,
  A,
  B
> {
  readonly _tag = "Synchronized"

  constructor(
    readonly semaphores: Set<S.Semaphore>,
    readonly unsafeGet: T.Effect<RB, EB, B>,
    readonly unsafeSet: (a: A) => T.Effect<RA, EA, void> // readonly unsafeSetAsync: (a: A) => T.Effect<RA, EA, void>
  ) {
    super()
  }

  get get(): T.Effect<RB, EB, B> {
    if (this.semaphores.size === 1) {
      return this.unsafeGet
    } else {
      return this.withPermit(this.unsafeGet)
    }
  }

  set(a: A): T.Effect<RA, EA, void> {
    return this.withPermit(this.unsafeSet(a))
  }

  fold<EC, ED, C, D>(
    ea: (_: EA) => EC,
    eb: (_: EB) => ED,
    ca: (_: C) => Either<EC, A>,
    bd: (_: B) => Either<ED, D>
  ): XSynchronized<RA, RB, EC, ED, C, D> {
    return foldEffect_(
      this,
      ea,
      eb,
      (c) => T.fromEither(() => ca(c)),
      (b) => T.fromEither(() => bd(b))
    )
  }

  foldAll<EC, ED, C, D>(
    ea: (_: EA) => EC,
    eb: (_: EB) => ED,
    ec: (_: EB) => EC,
    ca: (_: C) => (_: B) => Either<EC, A>,
    bd: (_: B) => Either<ED, D>
  ): XSynchronized<RA & RB, RB, EC, ED, C, D> {
    return foldAllEffect_(
      this,
      ea,
      eb,
      ec,
      (c) => (b) => T.fromEither(() => ca(c)(b)),
      (b) => T.fromEither(() => bd(b))
    )
  }

  withPermit<R, E, A>(effect: T.Effect<R, E, A>): T.Effect<R, E, A> {
    return T.uninterruptibleMask(({ restore }) =>
      T.chain_(restore(STM.commit(STM.forEach_(this.semaphores, S.acquire))), () =>
        T.ensuring_(
          restore(effect),
          STM.commit(STM.forEach_(this.semaphores, S.release))
        )
      )
    )
  }
}

/**
 * Folds over the error and value types of the `XRef.Synchronized`. This is
 * a highly polymorphic method that is capable of arbitrarily transforming
 * the error and value types of the `XRef.Synchronized`. For most use cases
 * one of the more specific combinators implemented in terms of `foldEffect`
 * will be more ergonomic but this method is extremely useful for
 * implementing new combinators.
 */
export function foldEffect_<RA, RB, RC, RD, EA, EB, EC, ED, A, B, C, D>(
  self: XSynchronized<RA, RB, EA, EB, A, B>,
  ea: (_: EA) => EC,
  eb: (_: EB) => ED,
  ca: (_: C) => T.Effect<RC, EC, A>,
  bd: (_: B) => T.Effect<RD, ED, D>
): XSynchronized<RA & RC, RB & RD, EC, ED, C, D> {
  return new XSynchronized(
    self.semaphores,
    T.foldEffect_(self.unsafeGet, (e) => T.failNow(eb(e)), bd),
    (c) => T.chain_(ca(c), (a) => T.mapError_(self.unsafeSet(a), ea))
  )
}

/**
 * Folds over the error and value types of the `XRef.Synchronized`. This is
 * a highly polymorphic method that is capable of arbitrarily transforming
 * the error and value types of the `XRef.Synchronized`. For most use cases
 * one of the more specific combinators implemented in terms of `foldEffect`
 * will be more ergonomic but this method is extremely useful for
 * implementing new combinators.
 *
 * @ets_data_first foldEffect_
 */
export function foldEffect<RC, RD, EA, EB, EC, ED, A, B, C, D>(
  ea: (_: EA) => EC,
  eb: (_: EB) => ED,
  ca: (_: C) => T.Effect<RC, EC, A>,
  bd: (_: B) => T.Effect<RD, ED, D>
) {
  return <RA, RB>(
    self: XSynchronized<RA, RB, EA, EB, A, B>
  ): XSynchronized<RA & RC, RB & RD, EC, ED, C, D> => foldEffect_(self, ea, eb, ca, bd)
}

/**
 * Folds over the error and value types of the `XRef.Synchronized`, allowing
 * access to the state in transforming the `set` value. This is a more
 * powerful version of `foldEffect` but requires unifying the environment and
 * error types.
 */
export function foldAllEffect_<RA, RB, RC, RD, EA, EB, EC, ED, A, B, C, D>(
  self: XSynchronized<RA, RB, EA, EB, A, B>,
  ea: (_: EA) => EC,
  eb: (_: EB) => ED,
  ec: (_: EB) => EC,
  ca: (_: C) => (_: B) => T.Effect<RC, EC, A>,
  bd: (_: B) => T.Effect<RD, ED, D>
): XSynchronized<RA & RB & RC, RB & RD, EC, ED, C, D> {
  return new XSynchronized(
    self.semaphores,
    T.foldEffect_(self.get, (e) => T.failNow(eb(e)), bd),
    (c) =>
      T.foldEffect_(
        self.get,
        (e) => T.failNow(ec(e)),
        (b) => T.chain_(ca(c)(b), (a) => T.mapError_(self.unsafeSet(a), ea))
      )
  )
}

/**
 * Folds over the error and value types of the `XRef.Synchronized`, allowing
 * access to the state in transforming the `set` value. This is a more
 * powerful version of `foldEffect` but requires unifying the environment and
 * error types.
 *
 * @ets_data_first foldAllEffect_
 */
export function foldAllEffect<RC, RD, EA, EB, EC, ED, A, B, C, D>(
  ea: (_: EA) => EC,
  eb: (_: EB) => ED,
  ec: (_: EB) => EC,
  ca: (_: C) => (_: B) => T.Effect<RC, EC, A>,
  bd: (_: B) => T.Effect<RD, ED, D>
) {
  return <RA, RB>(
    self: XSynchronized<RA, RB, EA, EB, A, B>
  ): XSynchronized<RA & RB & RC, RB & RD, EC, ED, C, D> =>
    foldAllEffect_(self, ea, eb, ec, ca, bd)
}
