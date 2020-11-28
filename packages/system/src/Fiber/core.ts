import type { UIO } from "../Effect/effect"
import type * as Exit from "../Exit/core"
import type { FiberRef } from "../FiberRef/fiberRef"
import type * as O from "../Option"
import type { Scope } from "../Scope"
import type { FiberID } from "./id"
import type { Status } from "./status"

export { equalsFiberID, FiberID, newFiberId, None } from "./id"

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
    readonly interruptors: ReadonlySet<FiberID>,
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
  getRef: <K>(fiberRef: FiberRef<K>) => UIO<K>
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

export interface Synthetic<E, A> extends CommonFiber<E, A> {
  _tag: "SyntheticFiber"
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
