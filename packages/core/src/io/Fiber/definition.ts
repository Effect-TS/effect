import type { Chunk } from "../../collection/immutable/Chunk"
import type { HashSet } from "../../collection/immutable/HashSet"
import type { Option } from "../../data/Option"
import type * as UT from "../../data/Utils/types"
import { _A, _E } from "../../support/Symbols"
import type { Effect, UIO } from "../Effect"
import type { Exit } from "../Exit"
import type { FiberId } from "../FiberId"
import type { FiberRef } from "../FiberRef"
import type { InterruptStatus } from "../InterruptStatus"
import type { Trace } from "../Trace"
import type { TraceElement } from "../TraceElement"
import type { FiberStatus } from "./status"

export const FiberSym = Symbol.for("@effect-ts/core/io/Fiber")
export type FiberSym = typeof FiberSym

/**
 * A fiber is a lightweight thread of execution that never consumes more than a
 * whole thread (but may consume much less, depending on contention and
 * asynchronicity). Fibers are spawned by forking ZIO effects, which run
 * concurrently with the parent effect.
 *
 * Fibers can be joined, yielding their result to other fibers, or interrupted,
 * which terminates the fiber, safely releasing all resources.
 *
 * @tsplus type ets/Fiber
 */
export interface Fiber<E, A> {
  readonly [FiberSym]: FiberSym
  readonly [_E]: () => E
  readonly [_A]: () => A
}

export type RealFiber<E, A> = Fiber.Runtime<E, A> | Fiber.Synthetic<E, A>

export declare namespace Fiber {
  type Runtime<E, A> = RuntimeFiber<E, A>
  type Synthetic<E, A> = SyntheticFiber<E, A>

  interface Descriptor {
    /**
     * The unique identifier of the `Fiber`.
     */
    readonly id: FiberId
    /**
     * The status of the `Fiber`.
     */
    readonly status: FiberStatus
    /**
     * The set of fibers attempting to interrupt the fiber or its ancestors.
     */
    readonly interrupters: HashSet<FiberId>
    /**
     * The interrupt status of the `Fiber`.
     */
    readonly interruptStatus: InterruptStatus
  }
}

/**
 * @tsplus unify ets/Fiber
 */
export function unifyFiber<X extends Fiber<any, any>>(
  self: X
): Fiber<UT._E<X>, UT._A<X>> {
  return self
}

/**
 * @tsplus type ets/FiberOps
 */
export interface FiberOps {}
export const Fiber: FiberOps = {}

/**
 * @tsplus macro remove
 */
export function realFiber<E, A>(fiber: Fiber<E, A>): asserts fiber is RealFiber<E, A> {
  //
}

export interface BaseFiber<E, A> extends Fiber<E, A> {
  /**
   * The identity of the fiber.
   */
  readonly _id: FiberId

  /**
   * Awaits the fiber, which suspends the awaiting fiber until the result of the
   * fiber has been determined.
   */
  readonly _await: UIO<Exit<E, A>>

  /**
   * Retrieves the immediate children of the fiber.
   */
  readonly _children: UIO<Chunk<Fiber.Runtime<any, any>>>

  /**
   * Inherits values from all `FiberRef` instances into current fiber. This
   * will resume immediately.
   */
  readonly _inheritRefs: UIO<void>

  /**
   * Tentatively observes the fiber, but returns immediately if it is not
   * already done.
   */
  readonly _poll: UIO<Option<Exit<E, A>>>

  /**
   * Gets the value of the fiber ref for this fiber, or the initial value of the
   * fiber ref, if the fiber is not storing the ref.
   */
  readonly _getRef: <K>(ref: FiberRef<K>) => UIO<K>

  /**
   * Interrupts the fiber as if interrupted from the specified fiber. If the
   * fiber has already exited, the returned effect will resume immediately.
   * Otherwise, the effect will resume when the fiber exits.
   */
  readonly _interruptAs: (fiberId: FiberId) => UIO<Exit<E, A>>
}

/**
 * A runtime fiber that is executing an effect. Runtime fibers have an
 * identity and a trace.
 *
 * @tsplus type ets/RuntimeFiber
 */
export interface RuntimeFiber<E, A> extends BaseFiber<E, A> {
  readonly _tag: "RuntimeFiber"

  /**
   * The identity of the fiber.
   */
  readonly _id: FiberId.Runtime

  /**
   * The location the fiber was forked from.
   */
  readonly _location: TraceElement

  /**
   * The status of the fiber.
   */
  readonly _status: UIO<FiberStatus>

  /**
   * The trace of the fiber.
   */
  readonly _trace: UIO<Trace>

  /**
   * Evaluates the specified effect on the fiber. If this is not possible,
   * because the fiber has already ended life, then the specified alternate
   * effect will be executed instead.
   */
  readonly _evalOn: (effect: UIO<any>, orElse: UIO<any>) => UIO<void>

  /**
   * A fully-featured, but much slower version of `evalOn`, which is useful
   * when environment and error are required.
   */
  readonly _evalOnEffect: <R, E2, A2>(
    effect: Effect<R, E2, A2>,
    orElse: Effect<R, E2, A2>
  ) => Effect<R, E2, A2>
}

/**
 * A synthetic fiber that is created from a pure value or that combines
 * existing fibers.
 *
 * @tsplus type ets/SyntheticFiber
 */
export class SyntheticFiber<E, A> implements BaseFiber<E, A> {
  readonly _tag = "SyntheticFiber";

  readonly [FiberSym]: FiberSym = FiberSym;
  readonly [_E]!: () => E;
  readonly [_A]!: () => A

  constructor(
    readonly _id: FiberId,
    readonly _await: UIO<Exit<E, A>>,
    readonly _children: UIO<Chunk<Fiber.Runtime<any, any>>>,
    readonly _inheritRefs: UIO<void>,
    readonly _poll: UIO<Option<Exit<E, A>>>,
    readonly _getRef: <K>(ref: FiberRef<K>) => UIO<K>,
    readonly _interruptAs: (fiberId: FiberId) => UIO<Exit<E, A>>
  ) {}
}

export function makeSynthetic<E, A>(_: {
  readonly id: FiberId
  readonly await: UIO<Exit<E, A>>
  readonly children: UIO<Chunk<Fiber.Runtime<any, any>>>
  readonly inheritRefs: UIO<void>
  readonly poll: UIO<Option<Exit<E, A>>>
  readonly getRef: <K>(ref: FiberRef<K>) => UIO<K>
  readonly interruptAs: (fiberId: FiberId) => UIO<Exit<E, A>>
}): Fiber<E, A> {
  return new SyntheticFiber(
    _.id,
    _.await,
    _.children,
    _.inheritRefs,
    _.poll,
    _.getRef,
    _.interruptAs
  )
}
