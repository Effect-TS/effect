/**
 * @since 2.0.0
 */
import type { Effect } from "./Effect.js"
import type { Exit } from "./Exit.js"
import type { FiberId } from "./FiberId.js"
import type { FiberStatus } from "./FiberStatus.js"
import type { HashSet } from "./HashSet.js"
import type { FiberTypeId, RuntimeFiber, RuntimeFiberTypeId } from "./impl/Fiber.js"
import type { Option } from "./Option.js"
import type { Pipeable } from "./Pipeable.js"

/**
 * @since 2.0.0
 * @internal
 */
export * from "./impl/Fiber.js"
/**
 * @since 2.0.0
 * @internal
 */
export * from "./internal/Jumpers/Fiber.js"

/**
 * A fiber is a lightweight thread of execution that never consumes more than a
 * whole thread (but may consume much less, depending on contention and
 * asynchronicity). Fibers are spawned by forking effects, which run
 * concurrently with the parent effect.
 *
 * Fibers can be joined, yielding their result to other fibers, or interrupted,
 * which terminates the fiber, safely releasing all resources.
 *
 * @since 2.0.0
 * @category models
 */
export interface Fiber<E, A> extends Fiber.Variance<E, A>, Pipeable {
  /**
   * The identity of the fiber.
   */
  id(): FiberId

  /**
   * Awaits the fiber, which suspends the awaiting fiber until the result of the
   * fiber has been determined.
   */
  await(): Effect<never, never, Exit<E, A>>

  /**
   * Retrieves the immediate children of the fiber.
   */
  children(): Effect<never, never, Array<Fiber.Runtime<any, any>>>

  /**
   * Inherits values from all `FiberRef` instances into current fiber. This
   * will resume immediately.
   */
  inheritAll(): Effect<never, never, void>

  /**
   * Tentatively observes the fiber, but returns immediately if it is not
   * already done.
   */
  poll(): Effect<never, never, Option<Exit<E, A>>>

  /**
   * In the background, interrupts the fiber as if interrupted from the
   * specified fiber. If the fiber has already exited, the returned effect will
   * resume immediately. Otherwise, the effect will resume when the fiber exits.
   */
  interruptAsFork(fiberId: FiberId): Effect<never, never, void>
}

/**
 * @since 2.0.0
 */
export declare namespace Fiber {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./impl/Fiber.js"

  /**
   * @since 2.0.0
   * @category models
   */
  export type Runtime<E, A> = RuntimeFiber<E, A>

  /**
   * @since 2.0.0
   * @category models
   */
  export interface Variance<E, A> {
    readonly [FiberTypeId]: {
      readonly _E: (_: never) => E
      readonly _A: (_: never) => A
    }
  }

  /**
   * @since 2.0.0
   */
  export interface RuntimeVariance<E, A> {
    readonly [RuntimeFiberTypeId]: {
      readonly _E: (_: never) => E
      readonly _A: (_: never) => A
    }
  }

  /**
   * @since 2.0.0
   * @category models
   */
  export interface Dump {
    /**
     * The fiber's unique identifier.
     */
    readonly id: FiberId.Runtime
    /**
     * The status of the fiber.
     */
    readonly status: FiberStatus
  }

  /**
   * A record containing information about a `Fiber`.
   *
   * @since 2.0.0
   * @category models
   */
  export interface Descriptor {
    /**
     * The fiber's unique identifier.
     */
    readonly id: FiberId
    /**
     * The status of the fiber.
     */
    readonly status: FiberStatus
    /**
     * The set of fibers attempting to interrupt the fiber or its ancestors.
     */
    readonly interruptors: HashSet<FiberId>
  }
}
