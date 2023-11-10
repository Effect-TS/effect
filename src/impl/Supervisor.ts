/**
 * A `Supervisor<T>` is allowed to supervise the launching and termination of
 * fibers, producing some visible value of type `T` from the supervision.
 *
 * @since 2.0.0
 */
import type { Context } from "../Context.js"
import type { Effect } from "../Effect.js"
import type { Exit } from "../Exit.js"
import type { Fiber } from "../Fiber.js"
import * as core from "../internal/core.js"
import * as circular from "../internal/layer/circular.js"
import * as internal from "../internal/supervisor.js"
import type { Layer } from "../Layer.js"
import type { MutableRef } from "../MutableRef.js"
import type { Option } from "../Option.js"
import type { SortedSet } from "../SortedSet.js"

import type { Supervisor } from "../Supervisor.js"

/**
 * @since 2.0.0
 * @category symbols
 */
export const SupervisorTypeId: unique symbol = internal.SupervisorTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export type SupervisorTypeId = typeof SupervisorTypeId

/**
 * @since 2.0.0
 * @category context
 */
export const addSupervisor: <A>(supervisor: Supervisor<A>) => Layer<never, never, never> = circular.addSupervisor

/**
 * Creates a new supervisor that tracks children in a set.
 *
 * @since 2.0.0
 * @category constructors
 */
export const fibersIn: (
  ref: MutableRef<SortedSet<Fiber.RuntimeFiber<any, any>>>
) => Effect<never, never, Supervisor<SortedSet<Fiber.RuntimeFiber<any, any>>>> = internal.fibersIn

/**
 * Creates a new supervisor that constantly yields effect when polled
 *
 * @since 2.0.0
 * @category constructors
 */
export const fromEffect: <A>(effect: Effect<never, never, A>) => Supervisor<A> = internal.fromEffect

/**
 * A supervisor that doesn't do anything in response to supervision events.
 *
 * @since 2.0.0
 * @category constructors
 */
export const none: Supervisor<void> = internal.none

/**
 * Creates a new supervisor that tracks children in a set.
 *
 * @since 2.0.0
 * @category constructors
 */
export const track: Effect<never, never, Supervisor<Array<Fiber.RuntimeFiber<any, any>>>> = internal.track

/**
 * Unsafely creates a new supervisor that tracks children in a set.
 *
 * @since 2.0.0
 * @category unsafe
 */
export const unsafeTrack: () => Supervisor<Array<Fiber.RuntimeFiber<any, any>>> = internal.unsafeTrack

/**
 * @since 2.0.0
 * @category constructors
 */
export abstract class AbstractSupervisor<T> implements Supervisor<T> {
  /**
   * @since 2.0.0
   */
  abstract value(): Effect<never, never, T>

  /**
   * @since 2.0.0
   */
  onStart<R, E, A>(
    _context: Context<R>,
    _effect: Effect<R, E, A>,
    _parent: Option<Fiber.RuntimeFiber<any, any>>,
    _fiber: Fiber.RuntimeFiber<E, A>
  ): void {
    //
  }

  /**
   * @since 2.0.0
   */
  onEnd<E, A>(
    _value: Exit<E, A>,
    _fiber: Fiber.RuntimeFiber<E, A>
  ): void {
    //
  }

  /**
   * @since 2.0.0
   */
  onEffect<E, A>(
    _fiber: Fiber.RuntimeFiber<E, A>,
    _effect: Effect<any, any, any>
  ): void {
    //
  }

  /**
   * @since 2.0.0
   */
  onSuspend<E, A>(
    _fiber: Fiber.RuntimeFiber<E, A>
  ): void {
    //
  }

  /**
   * @since 2.0.0
   */
  onResume<E, A>(
    _fiber: Fiber.RuntimeFiber<E, A>
  ): void {
    //
  }

  /**
   * @since 2.0.0
   */
  map<B>(f: (a: T) => B): Supervisor<B> {
    return new internal.ProxySupervisor(this, () => core.map(this.value(), f))
  }

  /**
   * @since 2.0.0
   */
  zip<A>(
    right: Supervisor<A>
  ): Supervisor<[T, A]> {
    return new internal.Zip(this, right)
  }

  /**
   * @since 2.0.0
   */
  onRun<E, A, X>(execution: () => X, _fiber: Fiber.RuntimeFiber<E, A>): X {
    return execution()
  }

  /**
   * @since 2.0.0
   */
  readonly [SupervisorTypeId]: {
    _T: (_: never) => never
  } = internal.supervisorVariance
}
