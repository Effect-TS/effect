import type { Either } from "../../data/Either"
import type { STM } from "../STM"
import type { Atomic } from "./Atomic/Atomic"
import type { Derived } from "./Atomic/Derived"
import type { DerivedAll } from "./Atomic/DerivedAll"

export type TRef<A> = XTRef<never, never, A, A>
export type ETRef<E, A> = XTRef<E, E, A, A>

export const TRefSym = Symbol.for("@effect-ts/core/stm/TRef")
export type TRefSym = typeof TRefSym

export const _EA = Symbol.for("@effect-ts/core/stm/XTRef/_EA")
export type _EA = typeof _EA

export const _EB = Symbol.for("@effect-ts/core/stm/XTRef/_EB")
export type _EB = typeof _EB

export const _A = Symbol.for("@effect-ts/core/stm/XTRef/_A")
export type _A = typeof _A

export const _B = Symbol.for("@effect-ts/core/stm/XTRef/_B")
export type _B = typeof _B

/**
 * A `XTRef<EA, EB, A, B>` is a polymorphic, purely functional description of a
 * mutable reference that can be modified as part of a transactional effect. The
 * fundamental operations of a `XTRef` are `set` and `get`. `set` takes a value
 * of type `A` and transactionally sets the reference to a new value,
 * potentially failing with an error of type `EA`. `get` gets the current value
 * of the reference and returns a value of type `B`, potentially failing with an
 * error of type `EB`.
 *
 * When the error and value types of the `XTRef` are unified, that is, it is a
 * `XTRef<E, E, A, A>`, the `ZTRef` also supports atomic `modify` and `update`
 * operations. All operations are guaranteed to be executed transactionally.
 *
 * NOTE: While `XTRef` provides the transactional equivalent of a mutable
 * reference, the value inside the `XTRef` should be immutable.
 *
 * @tsplus type ets/XTRef
 */
export interface XTRef<EA, EB, A, B> {
  readonly [TRefSym]: TRefSym
  readonly [_EA]: () => EA
  readonly [_EB]: () => EB
  readonly [_A]: (_: A) => void
  readonly [_B]: () => B
}

export interface XTRefInternal<EA, EB, A, B> extends XTRef<EA, EB, A, B> {
  readonly atomic: Atomic<unknown>

  /**
   * Retrieves the value of the `XTRef`.
   */
  readonly _get: STM<unknown, EB, B>

  /**
   * Sets the value of the `XTRef`.
   */
  readonly _set: (a: A) => STM<unknown, EA, void>

  /**
   * Folds over the error and value types of the `XTRef`. This is a highly
   * polymorphic method that is capable of arbitrarily transforming the error
   * and value types of the `XTRef`. For most use cases one of the more specific
   * combinators implemented in terms of `fold` will be more ergonomic but this
   * method is extremely useful for implementing new combinators.
   */
  readonly _fold: <EC, ED, C, D>(
    ea: (ea: EA) => EC,
    eb: (ea: EB) => ED,
    ca: (c: C) => Either<EC, A>,
    bd: (b: B) => Either<ED, D>
  ) => XTRef<EC, ED, C, D>

  /**
   * Folds over the error and value types of the `XTRef`, allowing access to the
   * state in transforming the `set` value. This is a more powerful version of
   * `fold` but requires unifying the error types.
   */
  readonly _foldAll: <EC, ED, C, D>(
    ea: (ea: EA) => EC,
    eb: (ea: EB) => ED,
    ec: (ea: EB) => EC,
    ca: (c: C) => (b: B) => Either<EC, A>,
    bd: (b: B) => Either<ED, D>
  ) => XTRef<EC, ED, C, D>
}

/**
 * @tsplus type ets/XTRefOps
 */
export interface XTRefOps {}
export const TRef: XTRefOps = {}

/**
 * @tsplus unify ets/XTRef
 */
export function unifyXTRef<X extends XTRef<any, any, any, any>>(
  self: X
): XTRef<
  [X] extends [{ [k in typeof _EA]: () => infer EA }] ? EA : never,
  [X] extends [{ [k in typeof _EB]: () => infer EB }] ? EB : never,
  [X] extends [{ [k in typeof _A]: (_: infer A) => void }] ? A : never,
  [X] extends [{ [k in typeof _B]: () => infer B }] ? B : never
> {
  return self
}

/**
 * @tsplus macro remove
 */
export function concrete<EA, EB, A, B>(
  _: XTRef<EA, EB, A, B>
): asserts _ is XTRefInternal<EA, EB, A, B> {
  //
}

/**
 * @tsplus macro remove
 */
export function concreteId<EA, EB, A, B>(
  _: XTRef<EA, EB, A, B>
): asserts _ is  // @ts-expect-error
  | (Atomic<A> | Atomic<B>)
  | Derived<unknown, EA, EB, A, A>
  | DerivedAll<unknown, EA, EB, A, B> {
  //
}
