import type { Effect, IO } from "../../Effect"
import type { Either } from "../../Either"
import type { Managed } from "../../Managed/definition"
import { _A, _B, _EA, _EB } from "./commons"

export const FiberRefSym: unique symbol = Symbol.for("@effect-ts/core/FiberRef")
export type FiberRefSym = typeof FiberRefSym
export const FiberRefRuntimeSym: unique symbol = Symbol.for(
  "@effect-ts/core/FiberRefRuntime"
)
export type FiberRefRuntimeSym = typeof FiberRefRuntimeSym

/**
 * A `FiberRef` is Effect-TS's equivalent of Java's `ThreadLocal`. The value of a
 * `FiberRef` is automatically propagated to child fibers when they are forked
 * and merged back in to the value of the parent fiber after they are joined.
 *
 * By default the value of the child fiber will replace the value of the parent
 * fiber on join but you can specify your own logic for how values should be
 * merged.
 */
export type FiberRef<A> = XFiberRef<never, never, A, A>

export declare namespace FiberRef {
  type Runtime<A> = XFiberRefRuntime<never, never, A, A>
}

export interface XFiberRef<EA, EB, A, B> {
  readonly [FiberRefSym]: FiberRefSym

  readonly [_EA]: (_: never) => EA
  readonly [_EB]: (_: never) => EB
  readonly [_A]: (_: A) => void
  readonly [_B]: (_: never) => B
}

export interface XFiberRefRuntime<EA, EB, A, B> extends XFiberRef<EA, EB, A, B> {
  readonly [FiberRefRuntimeSym]: FiberRefRuntimeSym
}

export abstract class XFiberRefInternal<EA, EB, A, B>
  implements XFiberRefRuntime<EA, EB, A, B>
{
  readonly [FiberRefSym]: FiberRefSym = FiberRefSym;
  readonly [FiberRefRuntimeSym]: FiberRefRuntimeSym = FiberRefRuntimeSym;

  readonly [_EA]: (_: never) => EA;
  readonly [_EB]: (_: never) => EB;
  readonly [_A]: (_: A) => void;
  readonly [_B]: (_: never) => B

  /**
   * Returns the initial value or error.
   */
  abstract get initialValue(): Either<EB, B>

  /**
   * Reads the value associated with the current fiber. Returns initial value if
   * no value was `set` or inherited from parent.
   */
  abstract get: IO<EB, B>

  /**
   * Sets the value associated with the current fiber.
   */
  abstract set(value: A, __trace?: string): IO<EA, void>

  /**
   * Folds over the error and value types of the `FiberRef`. This is a highly
   * polymorphic method that is capable of arbitrarily transforming the error
   * and value types of the `FiberRef`. For most use cases one of the more
   * specific combinators implemented in terms of `fold` will be more ergonomic
   * but this method is extremely useful for implementing new combinators.
   */
  abstract fold<EC, ED, C, D>(
    ea: (ea: EA) => EC,
    eb: (eb: EB) => ED,
    ca: (c: C) => Either<EC, A>,
    bd: (b: B) => Either<ED, D>
  ): XFiberRef<EC, ED, C, D>

  /**
   * Folds over the error and value types of the `FiberRef`, allowing access to
   * the state in transforming the `set` value. This is a more powerful version
   * of `fold` but requires unifying the error types.
   */
  abstract foldAll<EC, ED, C, D>(
    ea: (ea: EA) => EC,
    eb: (eb: EB) => ED,
    ec: (eb: EB) => EC,
    ca: (c: C) => (b: B) => Either<EC, A>,
    bd: (b: B) => Either<ED, D>
  ): XFiberRef<EC, ED, C, D>

  /**
   * Returns an `IO` that runs with `value` bound to the current fiber.
   *
   * Guarantees that fiber data is properly restored via `acquireRelease`.
   */
  abstract locally(
    value: A,
    __trace?: string
  ): <R, EC, C>(use: Effect<R, EC, C>) => Effect<R, EA | EC, C>

  /**
   * Returns a managed effect that sets the value associated with the curent
   * fiber to the specified value as its `acquire` action and restores it to its
   * original value as its `release` action.
   */
  abstract locallyManaged(value: A, __trace?: string): Managed<unknown, EA, void>
}
