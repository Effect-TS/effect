import type { Chunk } from "../Collections/Immutable/Chunk/core"
import type { Effect, UIO } from "../Effect"
import type { Exit } from "../Exit"
import type * as FiberId from "../FiberId"
import type * as FiberRef from "../FiberRef"
import type { Option } from "../Option"
import type { Scope } from "../Scope"
import type { Trace } from "../Trace"
import type { TraceElement } from "../TraceElement"
import type { Status } from "./status"

// -----------------------------------------------------------------------------
// Model
// -----------------------------------------------------------------------------

export type Fiber<E, A> = Synthetic<E, A> | Runtime<E, A>

export interface CommonFiber<E, A> {
  /**
   * The identity of the fiber.
   */
  readonly id: FiberId.FiberId
  /**
   * Awaits the fiber, which suspends the awaiting fiber until the result of the
   * fiber has been determined.
   */
  readonly await: UIO<Exit<E, A>>
  /**
   * Retrieves the immediate children of the fiber.
   */
  readonly children: UIO<Chunk<Runtime<any, any>>>
  /**
   * Inherits values from all `FiberRef` instances into current fiber. This
   * will resume immediately.
   */
  readonly inheritRefs: UIO<void>
  /**
   * Tentatively observes the fiber, but returns immediately if it is not
   * already done.
   */
  readonly poll: UIO<Option<Exit<E, A>>>
  /**
   * Gets the value of the fiber ref for this fiber, or the initial value of the
   * fiber ref, if the fiber is not storing the ref.
   */
  readonly getRef: <K>(ref: FiberRef.Runtime<K>) => UIO<K>
  /**
   * Interrupts the fiber as if interrupted from the specified fiber. If the
   * fiber has already exited, the returned effect will resume immediately.
   * Otherwise, the effect will resume when the fiber exits.
   */
  readonly interruptAs: (fiberId: FiberId.FiberId) => UIO<Exit<E, A>>
}

/**
 * A synthetic fiber that is created from a pure value or that combines
 * existing fibers.
 */
export class Synthetic<E, A> implements CommonFiber<E, A> {
  readonly _tag = "Synthetic"

  readonly await: UIO<Exit<E, A>>

  constructor(
    readonly id: FiberId.FiberId,
    _await: UIO<Exit<E, A>>,
    readonly children: UIO<Chunk<Runtime<any, any>>>,
    readonly inheritRefs: UIO<void>,
    readonly poll: UIO<Option<Exit<E, A>>>,
    readonly getRef: <K>(ref: FiberRef.Runtime<K>) => UIO<K>,
    readonly interruptAs: (fiberId: FiberId.FiberId) => UIO<Exit<E, A>>
  ) {
    this.await = _await
  }
}

/**
 * A runtime fiber that is executing an effect. Runtime fibers have an
 * identity and a trace.
 */
export interface Runtime<E, A> extends CommonFiber<E, A> {
  readonly _tag: "Runtime"
  /**
   * The identity of the fiber.
   */
  readonly id: FiberId.Runtime
  /**
   * The location the fiber was forked from.
   */
  readonly location: TraceElement
  /**
   * The scope of the fiber.
   */
  readonly scope: Scope
  /**
   * The status of the fiber.
   */
  readonly status: UIO<Status>
  /**
   * The trace of the fiber.
   */
  readonly trace: UIO<Trace>
  /**
   * Evaluates the specified effect on the fiber. If this is not possible,
   * because the fiber has already ended life, then the specified alternate
   * effect will be executed instead.
   */
  readonly evalOn: (effect: UIO<any>, orElse: UIO<any>) => UIO<void>
  /**
   * A fully-featured, but much slower version of `evalOn`, which is useful
   * when environment and error are required.
   */
  readonly evalOnEffect: <R, E2, A2>(
    effect: Effect<R, E2, A2>,
    orElse: Effect<R, E2, A2>
  ) => Effect<R, E2, A2>
}
