import type { Context } from "./Context.js"
import type { Effect } from "./Effect.js"
import type { Exit } from "./Exit.js"
import type { Fiber } from "./Fiber.js"
import type { Option } from "./Option.js"
import type { SupervisorTypeId } from "./Supervisor.impl.js"

export * from "./internal/Jumpers/Supervisor.js"
export * from "./Supervisor.impl.js"

/**
 * @since 2.0.0
 * @category models
 */
export interface Supervisor<T> extends Supervisor.Variance<T> {
  /**
   * Returns an `Effect` that succeeds with the value produced by this
   * supervisor. This value may change over time, reflecting what the supervisor
   * produces as it supervises fibers.
   */
  value(): Effect<never, never, T>

  /**
   * Supervises the start of a `Fiber`.
   */
  onStart<R, E, A>(
    context: Context<R>,
    effect: Effect<R, E, A>,
    parent: Option<Fiber.RuntimeFiber<any, any>>,
    fiber: Fiber.RuntimeFiber<E, A>
  ): void

  /**
   * Supervises the end of a `Fiber`.
   */
  onEnd<E, A>(value: Exit<E, A>, fiber: Fiber.RuntimeFiber<E, A>): void

  /**
   * Supervises the execution of an `Effect` by a `Fiber`.
   */
  onEffect<E, A>(fiber: Fiber.RuntimeFiber<E, A>, effect: Effect<any, any, any>): void

  /**
   * Supervises the suspension of a computation running within a `Fiber`.
   */
  onSuspend<E, A>(fiber: Fiber.RuntimeFiber<E, A>): void

  /**
   * Supervises the resumption of a computation running within a `Fiber`.
   */
  onResume<E, A>(fiber: Fiber.RuntimeFiber<E, A>): void

  /**
   * Maps this supervisor to another one, which has the same effect, but whose
   * value has been transformed by the specified function.
   */
  map<B>(f: (a: T) => B): Supervisor<B>

  /**
   * Returns a new supervisor that performs the function of this supervisor, and
   * the function of the specified supervisor, producing a tuple of the outputs
   * produced by both supervisors.
   */
  zip<A>(right: Supervisor<A>): Supervisor<readonly [T, A]>
}

/**
 * @since 2.0.0
 */
export declare namespace Supervisor {
  /**
   * @since 2.0.0
   * @category models
   */
  export interface Variance<T> {
    readonly [SupervisorTypeId]: {
      readonly _T: (_: never) => T
    }
  }

  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./Supervisor.impl.js"
}
