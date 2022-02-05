// ets_tracing: off

import { chain_ } from "../Effect/core.js"
import { done } from "../Effect/done.js"
import type { IO, UIO } from "../Effect/effect.js"
import { tap_ } from "../Effect/tap.js"
import type * as Exit from "../Exit/core.js"
import type * as FR from "../FiberRef/fiberRef.js"
import type * as O from "../Option/index.js"
import type { Scope } from "../Scope/index.js"
import type { FiberID } from "./id.js"
import type { Status } from "./status.js"

export { equalsFiberID, FiberID, newFiberId, None } from "./id.js"

/**
 * A record containing information about a `Fiber`.
 *
 * @param id            The fiber's unique identifier
 * @param interruptors  The set of fibers attempting to interrupt the fiber or its ancestors.
 * @param children      The fiber's forked children.
 */
export class Descriptor {
  constructor(
    readonly id: FiberID,
    readonly status: Status,
    readonly interruptors: readonly FiberID[],
    readonly interruptStatus: InterruptStatus,
    readonly scope: Scope<Exit.Exit<any, any>>
  ) {}
}

/**
 * A fiber is a lightweight thread of execution that never consumes more than a
 * whole thread (but may consume much less, depending on contention and
 * asynchronicity). Fibers are spawned by forking effects, which run
 * concurrently with the parent effect.
 *
 * Fibers can be joined, yielding their result to other fibers, or interrupted,
 * which terminates the fiber, safely releasing all resources.
 */
export type Fiber<E, A> = Runtime<E, A> | Synthetic<E, A>

export interface CommonFiber<E, A> {
  /**
   * Awaits the fiber, which suspends the awaiting fiber until the result of the
   * fiber has been determined.
   */
  await: UIO<Exit.Exit<E, A>>
  /**
   * Gets the value of the fiber ref for this fiber, or the initial value of
   * the fiber ref, if the fiber is not storing the ref.
   */
  getRef: <K>(fiberRef: FR.Runtime<K>) => UIO<K>
  /**
   * Inherits values from all {@link FiberRef} instances into current fiber.
   * This will resume immediately.
   */
  inheritRefs: UIO<void>
  /**
   * Interrupts the fiber as if interrupted from the specified fiber. If the
   * fiber has already exited, the returned effect will resume immediately.
   * Otherwise, the effect will resume when the fiber exits.
   */
  interruptAs(fiberId: FiberID): UIO<Exit.Exit<E, A>>
  /**
   * Tentatively observes the fiber, but returns immediately if it is not already done.
   */
  poll: UIO<O.Option<Exit.Exit<E, A>>>
}

export interface Runtime<E, A> extends CommonFiber<E, A> {
  _tag: "RuntimeFiber"
  /**
   * The identity of the fiber.
   */
  id: FiberID

  readonly scope: Scope<Exit.Exit<E, A>>
  /**
   * The status of the fiber.
   */
  readonly status: UIO<Status>
}

export class Synthetic<E, A> implements CommonFiber<E, A> {
  readonly _tag = "SyntheticFiber"

  readonly await: UIO<Exit.Exit<E, A>>

  constructor(
    _await: UIO<Exit.Exit<E, A>>,
    readonly getRef: <K>(fiberRef: FR.Runtime<K>) => UIO<K>,
    readonly inheritRefs: UIO<void>,
    readonly interruptAs: (fiberId: FiberID) => UIO<Exit.Exit<E, A>>,
    readonly poll: UIO<O.Option<Exit.Exit<E, A>>>
  ) {
    this.await = _await
  }
}

/**
 * InterruptStatus tracks interruptability of the current stack region
 */
export class InterruptStatus {
  constructor(readonly isInterruptible: boolean) {}

  get isUninteruptible(): boolean {
    return !this.isInterruptible
  }

  get toBoolean(): boolean {
    return this.isInterruptible
  }
}

/**
 * Interruptible region
 */
export const interruptible = new InterruptStatus(true)

/**
 * Uninterruptible region
 */
export const uninterruptible = new InterruptStatus(false)

/**
 * Create InterruptStatus from a boolean value
 */
export const interruptStatus = (b: boolean) => (b ? interruptible : uninterruptible)

/**
 * Joins the fiber, which suspends the joining fiber until the result of the
 * fiber has been determined. Attempting to join a fiber that has erred will
 * result in a catchable error. Joining an interrupted fiber will result in an
 * "inner interruption" of this fiber, unlike interruption triggered by another
 * fiber, "inner interruption" can be caught and recovered.
 */
export function join<E, A>(fiber: Fiber<E, A>): IO<E, A> {
  return tap_(chain_(fiber.await, done), () => fiber.inheritRefs)
}
