import type { Either } from "../../data/Either"
import type { Effect } from "../Effect/definition"
import type { Atomic } from "./Atomic/Atomic"
import type { Derived } from "./Atomic/Derived"
import type { DerivedAll } from "./Atomic/DerivedAll"
import type { XSynchronized } from "./Synchronized/definition"

export type Ref<A> = XRef<unknown, unknown, never, never, A, A>

export const XRefId = Symbol.for("@effect-ts/core/XRef")
export type XRefId = typeof XRefId

export const _RA = Symbol.for("@effect-ts/core/XRef/_RA")
export type _RA = typeof _RA

export const _RB = Symbol.for("@effect-ts/core/XRef/_RB")
export type _RB = typeof _RB

export const _EA = Symbol.for("@effect-ts/core/XRef/_EA")
export type _EA = typeof _EA

export const _EB = Symbol.for("@effect-ts/core/XRef/_EB")
export type _EB = typeof _EB

export const _A = Symbol.for("@effect-ts/core/XRef/_A")
export type _A = typeof _A

export const _B = Symbol.for("@effect-ts/core/XRef/_B")
export type _B = typeof _B

/**
 * A `XRef<RA, RB, EA, EB, A, B>` is a polymorphic, purely functional
 * description of a mutable reference. The fundamental operations of a `XRef`
 * are `set` and `get`. `set` takes a value of type `A` and sets the reference
 * to a new value, requiring an environment of type `RA` and potentially failing
 * with an error of type `EA`. `get` gets the current value of the reference and
 * returns a value of type `B`, requiring an environment of type `RB` and
 * potentially failing with an error of type `EB`.
 *
 * When the error and value types of the `XRef` are unified, that is, it is a
 * `XRef<R, R, E, E, A, A>`, the `XRef` also supports atomic `modify` and
 * `update` operations. All operations are guaranteed to be safe for concurrent
 * access.
 *
 * By default, `XRef` is implemented in terms of compare and swap operations for
 * maximum performance and does not support performing effects within update
 * operations. If you need to perform effects within update operations you can
 * create a `XRef.Synchronized`, a specialized type of `XRef` that supports
 * performing effects within update operations at some cost to performance. In
 * this case writes will semantically block other writers, while multiple
 * readers can read simultaneously.
 *
 * `XRef.Synchronized` also supports composing multiple `XRef.Synchronized`
 * values together to form a single `XRef.Synchronized` value that can be
 * atomically updated using the `zip` operator. In this case reads and writes
 * will semantically block other readers and writers.
 *
 * NOTE: While `XRef` provides the functional equivalent of a mutable reference,
 * the value inside the `XRef` should normally be immutable since compare and
 * swap operations are not safe for mutable values that do not support
 * concurrent access. If you do need to use a mutable value `XRef.Synchronized`
 * will guarantee that access to the value is properly synchronized.
 *
 * @tsplus type ets/XRef
 */
export interface XRef<RA, RB, EA, EB, A, B> {
  readonly [XRefId]: XRefId
  readonly [_RA]: (_: RA) => void
  readonly [_RB]: (_: RB) => void
  readonly [_EA]: () => EA
  readonly [_EB]: () => EB
  readonly [_A]: (_: A) => void
  readonly [_B]: () => B
}

export abstract class XRefInternal<RA, RB, EA, EB, A, B>
  implements XRef<RA, RB, EA, EB, A, B>
{
  readonly [XRefId]: XRefId = XRefId;
  readonly [_RA]!: (_: RA) => void;
  readonly [_RB]!: (_: RB) => void;
  readonly [_EA]!: () => EA;
  readonly [_EB]!: () => EB;
  readonly [_A]!: (_: A) => void;
  readonly [_B]!: () => B

  /**
   * Reads the value from the `XRef`.
   */
  abstract get _get(): Effect<RB, EB, B>

  /**
   * Writes a new value to the `XRef`, with a guarantee of immediate
   * consistency (at some cost to performance).
   */
  abstract _set(a: A): Effect<RA, EA, void>

  /**
   * Folds over the error and value types of the `XRef`. This is a highly
   * polymorphic method that is capable of arbitrarily transforming the error
   * and value types of the `XRef`. For most use cases one of the more specific
   * combinators implemented in terms of `fold` will be more ergonomic but this
   * method is extremely useful for implementing new combinators.
   */
  abstract _fold<EC, ED, C, D>(
    ea: (_: EA) => EC,
    eb: (_: EB) => ED,
    ca: (_: C) => Either<EC, A>,
    bd: (_: B) => Either<ED, D>
  ): XRef<RA, RB, EC, ED, C, D>

  /**
   * Folds over the error and value types of the `XRef`, allowing access to
   * the state in transforming the `set` value. This is a more powerful version
   * of `fold` but requires unifying the error types.
   */
  abstract _foldAll<EC, ED, C, D>(
    ea: (_: EA) => EC,
    eb: (_: EB) => ED,
    ec: (_: EB) => EC,
    ca: (_: C) => (_: B) => Either<EC, A>,
    bd: (_: B) => Either<ED, D>
  ): XRef<RA & RB, RB, EC, ED, C, D>
}

/**
 * @tsplus type ets/XRefOps
 */
export interface XRefOps {}
export const Ref: XRefOps = {}

/**
 * @tsplus unify ets/XRef
 */
export function unifyXRef<X extends XRef<any, any, any, any, any, any>>(
  self: X
): XRef<
  [X] extends [{ [k in typeof _RA]: (_: infer RA) => void }] ? RA : never,
  [X] extends [{ [k in typeof _RB]: (_: infer RB) => void }] ? RB : never,
  [X] extends [{ [k in typeof _EA]: () => infer EA }] ? EA : never,
  [X] extends [{ [k in typeof _EB]: () => infer EB }] ? EB : never,
  [X] extends [{ [k in typeof _A]: (_: infer A) => void }] ? A : never,
  [X] extends [{ [k in typeof _B]: () => infer B }] ? B : never
> {
  return self
}

/**
 * Cast to a sealed union in case of ERef (where it make sense)
 *
 * @tsplus macro identity
 */
export function concrete<RA, RB, EA, EB, A, B>(self: XRef<RA, RB, EA, EB, A, B>) {
  return self as
    | Atomic<A | B>
    | DerivedAll<EA, EB, A, B>
    | Derived<EA, EB, A, A>
    | XSynchronized<RA, RB, EA, EB, A, B>
}
